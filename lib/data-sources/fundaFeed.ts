import { FUNDA_FEED_MODE, FUNDA_FEED_BASE_URL, FUNDA_FEED_TIMEOUT_MS } from "@/lib/config/fundaFeed";

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
// aanroep naar Funda te doen.
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
];

function bouwZoekpad(plaats: string, budgetMax: number | null): string {
  const p = plaats.trim().toLowerCase().replace(/\s+/g, "-");
  if (budgetMax && budgetMax > 0) return `/${p}/0-${Math.round(budgetMax)}/`;
  return `/${p}/`;
}

function bouwFeedUrl(plaats: string, budgetMax: number | null): string {
  const params = new URLSearchParams({ type: "koop", zo: bouwZoekpad(plaats, budgetMax) });
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

export async function haalFundaMatches(plaats: string, budgetMax: number | null): Promise<FundaFeedItem[]> {
  if (FUNDA_FEED_MODE !== "live") {
    return MOCK_ITEMS;
  }

  try {
    const url = bouwFeedUrl(plaats, budgetMax);
    const res = await fetchMetTimeout(url, FUNDA_FEED_TIMEOUT_MS);
    if (!res.ok) {
      console.error(`[fundaFeed] HTTP ${res.status} bij ophalen van ${url}`);
      return [];
    }
    const xml = await res.text();
    return parseRssItems(xml).slice(0, 15);
  } catch (err) {
    console.error("[fundaFeed] ophalen/parsen mislukt (mogelijk is de niet-officiële feed niet meer bereikbaar):", err);
    return [];
  }
}
