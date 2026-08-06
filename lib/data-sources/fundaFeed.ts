import { FUNDA_FEED_MODE, FUNDA_FEED_BASE_URL, FUNDA_FEED_TIMEOUT_MS } from "@/lib/config/fundaFeed";
import type { B2bLocatie, B2bKenmerken } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Adapter voor de niet-officiële Funda partner-RSS-feed (zie de uitleg in
// lib/config/fundaFeed.ts). Geeft per (plaats, budgetMax) de nieuwste
// woningaanbiedingen terug -- de feed zelf levert al maximaal ~15 items per
// zoekopdracht, wat voor een dossier met een specifieke, smalle zoekopdracht
// (budget + plaats) doorgaans ruim voldoende is.
//
// BEWUST geen npm-XML-parser: dit is een klein, plat RSS 2.0-document (title/
// link/description/pubDate per <item>), een lichte regex-extractie is hier
// voldoende en scheelt een nieuwe dependency. Elke stap is defensief: een
// onverwacht/gewijzigd formaat levert gewoon minder of geen items op, nooit
// een crash -- want dit is een ongedocumenteerde, niet-ondersteunde feed die
// zonder waarschuwing kan veranderen.
// -----------------------------------------------------------------------------

export interface FundaFeedItem {
  titel: string;
  url: string;
  prijsLabel: string | null;
  fotoUrl: string | null;
}

// Vaste, kosteloze voorbeelddata voor mock-modus (standaard) -- zodat de
// matchfunctie in de UI en met demo-data te testen is zonder ooit een
// aanroep naar Funda te doen. 5 stuks (i.p.v. eerder 2), zodat de "direct 3
// tot 5 woningen"-weergave ook in mock-modus realistisch oogt.
const MOCK_ITEMS: FundaFeedItem[] = [
  {
    titel: "Boezemsingel 24, Rotterdam",
    url: "https://www.funda.nl/koop/rotterdam/huis-00000001-boezemsingel-24/",
    prijsLabel: "€ 489.000 k.k.",
    fotoUrl: null,
  },
  {
    titel: "Zwart Janstraat 51, Rotterdam",
    url: "https://www.funda.nl/koop/rotterdam/huis-00000002-zwart-janstraat-51/",
    prijsLabel: "€ 525.000 k.k.",
    fotoUrl: null,
  },
  {
    titel: "Bergselaan 142, Rotterdam",
    url: "https://www.funda.nl/koop/rotterdam/huis-00000003-bergselaan-142/",
    prijsLabel: "€ 425.000 k.k.",
    fotoUrl: null,
  },
  {
    titel: "Kralingse Plaslaan 88, Rotterdam",
    url: "https://www.funda.nl/koop/rotterdam/huis-00000004-kralingse-plaslaan-88/",
    prijsLabel: "€ 389.000 k.k.",
    fotoUrl: null,
  },
  {
    titel: "Vroesenlaan 21, Rotterdam",
    url: "https://www.funda.nl/koop/rotterdam/huis-00000005-vroesenlaan-21/",
    prijsLabel: "€ 465.000 k.k.",
    fotoUrl: null,
  },
];

// Vertaalt de gestructureerde kenmerken (#3, zie types/b2b.ts) naar extra
// pad-segmenten in dezelfde "zo="-padstructuur die Funda's publieke
// zoek-URLs gebruiken (bv. /rotterdam/tussenwoning/tuin/). Dit is, net als de
// rest van deze feed, EMPIRISCH NIET GEVERIFIEERD tegen de live feed -- het
// is de meest plausibele aanname op basis van Funda's publieke URL-schema.
// Faalt dit segment stil (verkeerde/genegeerde filter), dan levert de feed
// gewoon bredere of geen resultaten op, nooit een crash (zie haalFundaMatches
// hieronder). energielabelAB wordt bewust NIET meegegeven: geen betrouwbaar
// vermoeden van het juiste padsegment, en een verkeerd segment kan een hele
// zoekopdracht onterecht leeglaten.
function kenmerkenSegmenten(kenmerken: B2bKenmerken | undefined): string[] {
  if (!kenmerken) return [];
  const segmenten: string[] = [];
  if (kenmerken.woningtype) segmenten.push(kenmerken.woningtype);
  if (kenmerken.minKamers && kenmerken.minKamers > 0) segmenten.push(`${kenmerken.minKamers}-kamers`);
  if (kenmerken.minSlaapkamers && kenmerken.minSlaapkamers > 0) segmenten.push(`${kenmerken.minSlaapkamers}-slaapkamers`);
  if (kenmerken.tuin) segmenten.push("tuin");
  if (kenmerken.balkon) segmenten.push("balkon");
  if (kenmerken.dakterras) segmenten.push("dakterras");
  if (kenmerken.garage) segmenten.push("garage");
  if (kenmerken.lift) segmenten.push("lift");
  return segmenten;
}

function bouwZoekpad(locatie: B2bLocatie, budgetMax: number | null, kenmerken: B2bKenmerken | undefined): string {
  const delen = [locatie.plaatsSlug];
  if (locatie.wijkSlug) delen.push(locatie.wijkSlug);
  if (budgetMax && budgetMax > 0) delen.push(`0-${Math.round(budgetMax)}`);
  delen.push(...kenmerkenSegmenten(kenmerken));
  return `/${delen.join("/")}/`;
}

function bouwFeedUrl(locatie: B2bLocatie, budgetMax: number | null, kenmerken: B2bKenmerken | undefined): string {
  const params = new URLSearchParams({ type: "koop", zo: bouwZoekpad(locatie, budgetMax, kenmerken) });
  return `${FUNDA_FEED_BASE_URL}/?${params.toString()}`;
}

function extractTag(itemXml: string, tag: string): string | null {
  const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return null;
  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1].trim();
  return value || null;
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function parseRssItems(xml: string): FundaFeedItem[] {
  const items: FundaFeedItem[] = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const itemXml of itemMatches) {
    const titelRaw = extractTag(itemXml, "title");
    const url = extractTag(itemXml, "link");
    if (!titelRaw || !url) continue;

    const beschrijving = extractTag(itemXml, "description");
    // Deze feed heeft geen los, gestructureerd fotoveld gegarandeerd -- pak
    // een eventuele <enclosure>/<media:content> als die er wel is, anders
    // blijft fotoUrl null en toont de UI een neutrale illustratie.
    const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
    const mediaMatch = itemXml.match(/<media:content[^>]*url=["']([^"']+)["']/i);
    const fotoUrl = enclosureMatch?.[1] ?? mediaMatch?.[1] ?? null;

    // Prijs staat niet los in deze feed -- het eerste "€ ..."-patroon in
    // titel/beschrijving is de beste, eerlijke gok (blijft null als het er
    // niet in staat, nooit een verzonnen bedrag).
    const prijsBron = `${titelRaw} ${beschrijving ?? ""}`;
    const prijsMatch = prijsBron.match(/€\s?[\d.,]+(?:\s?k\.k\.)?/i);

    items.push({
      titel: decodeEntities(titelRaw),
      url: decodeEntities(url),
      prijsLabel: prijsMatch ? prijsMatch[0].trim() : null,
      fotoUrl,
    });
  }
  return items;
}

async function fetchMetTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Kooprapport/1.0 (+https://kooprapport.nl)" },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function haalFundaMatches(
  locatie: B2bLocatie,
  budgetMax: number | null,
  kenmerken?: B2bKenmerken,
  limiet = 15
): Promise<FundaFeedItem[]> {
  if (FUNDA_FEED_MODE !== "live") {
    return MOCK_ITEMS.slice(0, limiet);
  }

  try {
    const url = bouwFeedUrl(locatie, budgetMax, kenmerken);
    const res = await fetchMetTimeout(url, FUNDA_FEED_TIMEOUT_MS);
    if (!res.ok) {
      console.error(`[fundaFeed] HTTP ${res.status} bij ophalen van ${url}`);
      return [];
    }
    const xml = await res.text();
    return parseRssItems(xml).slice(0, limiet);
  } catch (err) {
    console.error("[fundaFeed] ophalen/parsen mislukt (mogelijk is de niet-officiële feed niet meer bereikbaar):", err);
    return [];
  }
}
