import { FUNDA_FEED_MODE, FUNDA_SEARCH_TIMEOUT_MS, FUNDA_DETAIL_TIMEOUT_MS } from "@/lib/config/fundaFeed";
import type { B2bLocatie, B2bKenmerken, B2bWoningtype } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Directe adapter voor de publieke funda.nl-pagina's (zie de uitleg in
// lib/config/fundaFeed.ts voor waarom dit de partner-RSS-feed en de
// Apify-actor vervangt). Twee stappen:
//   1. De zoekresultatenpagina ophalen en daaruit de woninglinks halen
//      (gewone server-side fetch, geen JavaScript-rendering nodig -- live
//      geverifieerd: de links staan gewoon in de ruwe HTML).
//   2. Per woning de detailpagina ophalen en het schema.org JSON-LD-blok
//      uitlezen dat funda.nl daar standaard in zet (live geverifieerd: bevat
//      een betrouwbare prijs, adres en foto -- in tegenstelling tot de
//      geteste Apify-actor, waar het prijsveld structureel leeg bleef).
//
// URL-parameters (selected_area, price, rooms, exterior_space_type,
// object_type, object_type_house_orientation) zijn LIVE GEVERIFIEERD door de
// filters handmatig in de Funda-UI te bedienen en de resulterende URL af te
// lezen -- niet gegokt, met uitzondering van de expliciet gemarkeerde
// plekken hieronder (die zijn wél een educated guess, en dat is ook zo
// gedocumenteerd). Nog steeds geen officiële/ondersteunde koppeling: elke
// stap faalt defensief (minder/geen matches), nooit een crash.
// -----------------------------------------------------------------------------

export interface FundaFeedItem {
  titel: string;
  url: string;
  prijsLabel: string | null;
  fotoUrl: string | null;
}

// Vaste, kosteloze voorbeelddata voor mock-modus (standaard) -- zodat de
// matchfunctie in de UI en met demo-data te testen is zonder ooit een
// aanroep naar Funda te doen. fotoUrl wijst naar picsum.photos (stabiele,
// gratis foto-placeholder-dienst, vast seed per adres).
const MOCK_ITEMS: FundaFeedItem[] = [
  {
    titel: "Boezemsingel 24, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-boezemsingel-24/00000001/",
    prijsLabel: "€ 489.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/boezemsingel24/480/360",
  },
  {
    titel: "Zwart Janstraat 51, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-zwart-janstraat-51/00000002/",
    prijsLabel: "€ 525.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/zwartjanstraat51/480/360",
  },
  {
    titel: "Bergselaan 142, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-bergselaan-142/00000003/",
    prijsLabel: "€ 425.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/bergselaan142/480/360",
  },
  {
    titel: "Kralingse Plaslaan 88, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-kralingse-plaslaan-88/00000004/",
    prijsLabel: "€ 389.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/kralingseplaslaan88/480/360",
  },
  {
    titel: "Vroesenlaan 21, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-vroesenlaan-21/00000005/",
    prijsLabel: "€ 465.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/vroesenlaan21/480/360",
  },
];

// object_type + object_type_house_orientation -- "house"/"apartment" en
// "terraced" (tussenwoning) zijn live geverifieerd. De overige oriëntaties
// (hoekwoning/2-onder-1-kap/vrijstaand) zijn NIET los getest -- dit zijn de
// meest voor de hand liggende Engelse tegenhangers naar analogie van
// "terraced", maar geen garantie.
const WONINGTYPE_PARAMS: Record<B2bWoningtype, { objectType: string; orientation?: string }> = {
  tussenwoning: { objectType: "house", orientation: "terraced" },
  hoekwoning: { objectType: "house", orientation: "corner" },
  "2-onder-1-kapwoning": { objectType: "house", orientation: "semi_detached" },
  "vrijstaande-woning": { objectType: "house", orientation: "detached" },
  appartement: { objectType: "apartment" },
};

// exterior_space_type -- "garden" (tuin) en "balcony" (balkon) zijn live
// geverifieerd (comma-separated in de URL). "roof_terrace" voor dakterras is
// NIET los getest, is de meest voor de hand liggende waarde naar analogie.
// garage/lift zijn bewust NIET meegenomen: geen filter hiervoor gevonden in
// de Funda-UI binnen de tijd die daarvoor stond -- liever weglaten dan een
// verkeerd geraden parameter die een zoekopdracht onterecht leegtrekt.
function kenmerkenNaarParams(kenmerken: B2bKenmerken | undefined): URLSearchParams {
  const params = new URLSearchParams();
  if (!kenmerken) return params;

  if (kenmerken.woningtype) {
    const w = WONINGTYPE_PARAMS[kenmerken.woningtype];
    params.set("object_type", w.objectType);
    if (w.orientation) params.set("object_type_house_orientation", w.orientation);
  }
  if (kenmerken.minKamers && kenmerken.minKamers > 0) params.set("rooms", `${kenmerken.minKamers}-`);

  const buiten: string[] = [];
  if (kenmerken.tuin) buiten.push("garden");
  if (kenmerken.balkon) buiten.push("balcony");
  if (kenmerken.dakterras) buiten.push("roof_terrace");
  if (buiten.length > 0) params.set("exterior_space_type", buiten.join(","));

  return params;
}

// selected_area -- LIVE geverifieerd voor een enkele plaats
// (selected_area=["rotterdam"]). Voor een wijk is dit NIET los geverifieerd
// -- de aanname (["plaatsSlug","wijkSlug"], zoals Funda's "Selecteer
// buurten"-verfijning suggereert) is een educated guess. Faalt dit, dan
// levert de zoekopdracht gewoon 0 resultaten op, nooit een crash.
function bouwZoekUrl(locatie: B2bLocatie, budgetMax: number | null, kenmerken: B2bKenmerken | undefined): string {
  const gebieden = locatie.wijkSlug ? [locatie.plaatsSlug, locatie.wijkSlug] : [locatie.plaatsSlug];
  const params = kenmerkenNaarParams(kenmerken);
  params.set("selected_area", JSON.stringify(gebieden));
  if (budgetMax && budgetMax > 0) params.set("price", `0-${Math.round(budgetMax)}`);
  return `https://www.funda.nl/zoeken/koop?${params.toString()}`;
}

// LIVE GEVONDEN (diagnose-sessie): een custom UA ("Kooprapport/1.0") die
// zichzelf als bot aankondigt, aangeroepen vanaf een Vercel-serverless-IP
// (AWS-datacenterblok), is precies het patroon dat bot-bescherming (bv.
// DataDome, veelgebruikt bij grote NL-vastgoedsites) het eerst blokkeert --
// vaak met een 200-status maar een lege/CAPTCHA-pagina in plaats van een
// echte foutcode, dus zonder dat dit ooit als error werd gelogd. Een gewone
// fetch vanaf een niet-datacenter-adres met dezelfde URL gaf wel gewoon 299
// resultaten terug (live geverifieerd). Een gangbare browser-UA alleen bleek
// NIET genoeg (live geverifieerd: nog steeds Funda's blokkadepagina "Je bent
// bijna op de pagina die je zoekt") -- dit is dus een IP-reputatieblokkade,
// geen UA-check, en dat los je met headers alleen niet op.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
};

// SCRAPERAPI_KEY (optioneel): als deze env var gezet is, gaat elke fetch naar
// funda.nl via ScraperAPI's proxy (render=true, dus met JS-rendering -- dat
// is wat nodig is om langs Funda's DataDome-achtige botcheck te komen, een
// gewone headless fetch met nette headers bleek niet genoeg). Zonder deze
// env var valt dit terug op de directe fetch hierboven, die vanaf Vercel dus
// altijd 0 resultaten oplevert (zie de diagnose-log verderop) totdat de
// sleutel is toegevoegd. country_code=nl kost geen extra credits en helpt om
// als Nederlandse bezoeker over te komen.
const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY;

function viaScraperApi(url: string): string {
  const params = new URLSearchParams({
    api_key: SCRAPERAPI_KEY!,
    url,
    render: "true",
    country_code: "nl",
  });
  return `https://api.scraperapi.com/?${params.toString()}`;
}

async function fetchMetTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const daadwerkelijkeUrl = SCRAPERAPI_KEY ? viaScraperApi(url) : url;
    return await fetch(daadwerkelijkeUrl, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });
  } finally {
    clearTimeout(timer);
  }
}

// De zoekresultatenpagina is een gewone server-gerenderde pagina (geen
// client-side rendering nodig) -- de detaillinks staan al in de ruwe HTML,
// live geverifieerd. Dedupliceren omdat dezelfde advertentie soms meerdere
// keren op één pagina linkt (bv. in een "topadvertentie"-blok bovenaan).
function extractDetailLinks(html: string, limiet: number): string[] {
  const matches = html.match(/\/detail\/koop\/[a-z0-9-]+\/[a-z0-9-]+\/\d+\//gi) ?? [];
  const uniek = [...new Set(matches)];
  return uniek.slice(0, limiet).map((pad) => `https://www.funda.nl${pad}`);
}

interface FundaJsonLd {
  name?: string;
  address?: { streetAddress?: string; addressLocality?: string };
  offers?: { price?: number | string; priceCurrency?: string };
  image?: string;
}

function extractJsonLd(html: string): FundaJsonLd | null {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const data = JSON.parse(m[1]);
      // Funda's listing-JSON-LD heeft een "offers"-blok met de prijs -- dat
      // is het blok dat we nodig hebben (er kunnen ook andere ld+json-
      // blokken op de pagina staan, bv. voor breadcrumbs, die slaan we over).
      if (data?.offers?.price != null) return data as FundaJsonLd;
    } catch {
      continue;
    }
  }
  return null;
}

function formatPrijs(prijs: number | string | undefined): string | null {
  if (prijs == null) return null;
  const bedrag = typeof prijs === "string" ? Number(prijs) : prijs;
  if (!Number.isFinite(bedrag) || bedrag <= 0) return null;
  // "k.k." is een aanname (kosten koper is verreweg het gangbaarst bij
  // bestaande bouw) -- de JSON-LD zelf specificeert v.o.n./k.k. niet apart.
  return `${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag)} k.k.`;
}

async function haalListingDetails(detailUrl: string): Promise<FundaFeedItem | null> {
  try {
    const res = await fetchMetTimeout(detailUrl, FUNDA_DETAIL_TIMEOUT_MS);
    if (!res.ok) return null;
    const html = await res.text();
    const ld = extractJsonLd(html);
    if (!ld) return null;

    const straat = ld.address?.streetAddress ?? ld.name ?? "";
    const plaats = ld.address?.addressLocality ?? "";
    const titel = [straat, plaats].filter(Boolean).join(", ") || ld.name || "Woning";

    return {
      titel,
      url: detailUrl,
      prijsLabel: formatPrijs(ld.offers?.price),
      fotoUrl: ld.image ?? null,
    };
  } catch {
    return null;
  }
}

// TIJDELIJKE DIAGNOSE-LOGGING (bewust altijd aan, ook in mock-modus): tot nu
// toe was "geen nieuwe matches" volledig stil in beide gevallen (mock-modus
// EN live-modus-met-0-resultaten loggen namelijk geen van beide iets), dus
// die twee waren via de runtime-logs niet van elkaar te onderscheiden. Dit
// maakt in elk geval meteen zichtbaar welke modus daadwerkelijk actief is op
// de lopende deployment, en bij live-modus ook of de zoekpagina uberhaupt
// echte woninglinks teruggeeft. Mag na de eerste geslaagde live-run weer
// verwijderd/afgezwakt worden.
export async function haalFundaMatches(
  locatie: B2bLocatie,
  budgetMax: number | null,
  kenmerken?: B2bKenmerken,
  limiet = 15
): Promise<FundaFeedItem[]> {
  console.log(
    `[fundaFeed] modus=${FUNDA_FEED_MODE} proxy=${SCRAPERAPI_KEY ? "scraperapi" : "geen (directe fetch, wordt vermoedelijk geblokkeerd vanaf Vercel)"} locatie=${locatie.plaatsSlug}${locatie.wijkSlug ? "/" + locatie.wijkSlug : ""}`
  );

  if (FUNDA_FEED_MODE !== "live") {
    return MOCK_ITEMS.slice(0, limiet);
  }

  try {
    const zoekUrl = bouwZoekUrl(locatie, budgetMax, kenmerken);
    const res = await fetchMetTimeout(zoekUrl, FUNDA_SEARCH_TIMEOUT_MS);
    console.log(`[fundaFeed] LIVE zoekaanvraag ${zoekUrl} -> HTTP ${res.status}`);
    if (!res.ok) {
      console.error(`[fundaFeed] HTTP ${res.status} bij ophalen van ${zoekUrl}`);
      return [];
    }
    const html = await res.text();
    const links = extractDetailLinks(html, limiet);
    console.log(`[fundaFeed] LIVE ${links.length} woninglink(s) gevonden op de zoekpagina (${html.length} tekens HTML)`);
    if (links.length === 0) {
      // Waarschijnlijkste oorzaak van 0 links bij een 200-status: een
      // bot-detectiepagina i.p.v. de echte zoekresultaten -- de eerste
      // paar honderd tekens (zonder scripts/styles) laten meestal meteen
      // zien of dat hier aan de hand is (bv. "Even geduld", "verify you
      // are human", "Access Denied", een cookie-muur, etc.).
      const snippet = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ").slice(0, 500);
      console.error(`[fundaFeed] LIVE 0 links -- vermoedelijk bot-blokkade of gewijzigde paginastructuur. HTML-snippet: ${snippet}`);
      return [];
    }

    const resultaten = await Promise.all(links.map(haalListingDetails));
    return resultaten.filter((item): item is FundaFeedItem => item !== null);
  } catch (err) {
    console.error("[fundaFeed] ophalen/parsen mislukt (funda.nl is geen officiële, ondersteunde koppeling):", err);
    return [];
  }
}
