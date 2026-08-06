import { FUNDA_FEED_MODE, FUNDA_SEARCH_TIMEOUT_MS, FUNDA_DETAIL_TIMEOUT_MS } from "@/lib/config/fundaFeed";
import type { B2bLocatie, B2bKenmerken, B2bWoningtype, B2bEnergielabel } from "@/types/b2b";

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
  prijs: number | null; // ruwe waarde -- nodig om zelf nog eens hard tegen budgetMax te filteren
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
    prijs: 489000,
    prijsLabel: "€ 489.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/boezemsingel24/480/360",
  },
  {
    titel: "Zwart Janstraat 51, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-zwart-janstraat-51/00000002/",
    prijs: 525000,
    prijsLabel: "€ 525.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/zwartjanstraat51/480/360",
  },
  {
    titel: "Bergselaan 142, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-bergselaan-142/00000003/",
    prijs: 425000,
    prijsLabel: "€ 425.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/bergselaan142/480/360",
  },
  {
    titel: "Kralingse Plaslaan 88, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-kralingse-plaslaan-88/00000004/",
    prijs: 389000,
    prijsLabel: "€ 389.000 k.k.",
    fotoUrl: "https://picsum.photos/seed/kralingseplaslaan88/480/360",
  },
  {
    titel: "Vroesenlaan 21, Rotterdam",
    url: "https://www.funda.nl/detail/koop/rotterdam/huis-vroesenlaan-21/00000005/",
    prijs: 465000,
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

// exterior_space_type -- "garden" (tuin) en "balcony" (balkon) waren al live
// geverifieerd. BUGFIX (nieuwe diagnose-sessie, filterpaneel dit keer
// uitgelezen via de checkbox-id's in de DOM i.p.v. alleen de resulterende
// URL): dakterras bleek NIET "roof_terrace" te zijn zoals eerder aangenomen
// -- de daadwerkelijke checkbox-waarde is "terrace" (bevestigd: 947
// resultaten onder "Dakterras" in het filterpaneel, en de URL na aanvinken
// werd exterior_space_type=terrace). Elke zoekopdracht met dakterras aan
// werd dus stilzwijgend NIET gefilterd -- zelfde patroon als eerder bij
// selected_area en de topposities.
//
// bedrooms/accessibility/garage_type/energy_label/floor_area zijn in
// dezelfde sessie NIEUW live geverifieerd (checkbox- en veld-id's in het
// filterpaneel gecontroleerd, daarna handmatig ingevuld/aangevinkt en de
// resulterende URL afgelezen): "bedrooms=2-" voor minimum slaapkamers
// (voorheen HELEMAAL niet meegegeven -- dit was de gemelde bug "filter op 2
// slaapkamers geeft ook 1 slaapkamer terug"), "floor_area=80-" voor minimum
// woonoppervlak, "accessibility=lift" voor lift, "energy_label=A,B,C" voor
// energielabel (komma-lijst, meerdere waarden toegestaan -- zie
// ENERGIELABEL_NAAR_FUNDA_WAARDEN hieronder voor de "X of beter"-vertaling).
// garage_type kent losse subtypes (aangebouwd/garagebox/vrijstaand/
// inpandig/ondergronds) zonder één generieke "heeft garage"-optie; voor ons
// simpele garage-aan/uit-kenmerk vragen we ze allemaal op (comma-lijst) --
// elke garage telt.
const GARAGE_TYPE_WAARDEN = "lean_to,lock_up,garage_and_carport,built_in,underground";

// Funda's eigen 12 energielabel-checkboxes, van beste naar slechtste (live
// geverifieerd via het filterpaneel). Ons eigen B2bEnergielabel is bewust
// een vereenvoudiging tot 7 waarden (A t/m G, zie types/b2b.ts) -- "A of
// beter" dekt bij het filteren dus automatisch ook alle A+ t/m A+++++
// mee, dat onderscheid is voor de meeste gebruikers niet zinvol.
const ENERGIELABEL_VOLGORDE_FUNDA = ["A+++++", "A++++", "A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"];
const ENERGIELABEL_AANTAL_FUNDA_WAARDEN: Record<B2bEnergielabel, number> = { A: 6, B: 7, C: 8, D: 9, E: 10, F: 11, G: 12 };
function energielabelNaarFundaWaarden(label: B2bEnergielabel): string {
  return ENERGIELABEL_VOLGORDE_FUNDA.slice(0, ENERGIELABEL_AANTAL_FUNDA_WAARDEN[label]).join(",");
}

function kenmerkenNaarParams(kenmerken: B2bKenmerken | undefined): URLSearchParams {
  const params = new URLSearchParams();
  if (!kenmerken) return params;

  if (kenmerken.woningtype) {
    const w = WONINGTYPE_PARAMS[kenmerken.woningtype];
    params.set("object_type", w.objectType);
    if (w.orientation) params.set("object_type_house_orientation", w.orientation);
  }
  if (kenmerken.minKamers && kenmerken.minKamers > 0) params.set("rooms", `${kenmerken.minKamers}-`);
  if (kenmerken.minSlaapkamers && kenmerken.minSlaapkamers > 0) params.set("bedrooms", `${kenmerken.minSlaapkamers}-`);
  if (kenmerken.minWoonoppervlak && kenmerken.minWoonoppervlak > 0) params.set("floor_area", `${kenmerken.minWoonoppervlak}-`);
  if (kenmerken.minEnergielabel) params.set("energy_label", energielabelNaarFundaWaarden(kenmerken.minEnergielabel));
  if (kenmerken.lift) params.set("accessibility", "lift");
  if (kenmerken.garage) params.set("garage_type", GARAGE_TYPE_WAARDEN);

  const buiten: string[] = [];
  if (kenmerken.tuin) buiten.push("garden");
  if (kenmerken.balkon) buiten.push("balcony");
  if (kenmerken.dakterras) buiten.push("terrace");
  if (buiten.length > 0) params.set("exterior_space_type", buiten.join(","));

  return params;
}

// selected_area -- BUGFIX (live geverifieerd door de "Selecteer buurten"-
// verfijning zelf handmatig te bedienen en de resulterende URL af te lezen):
// de eerdere aanname (["plaatsSlug","wijkSlug"], als JSON-array) bleek FOUT.
// Funda negeert die tweede array-waarde stilzwijgend en zoekt gewoon in de
// hele plaats -- geen crash, geen foutcode, maar ook geen wijkfilter (dit was
// de oorzaak van "Kralingen Oost" die ook Overschie en de rest van Rotterdam
// liet zien: elke zoekopdracht met een wijk viel feitelijk terug op de hele
// stad). De echte, live geverifieerde vorm is één string met een slash:
// selected_area=rotterdam/kralingen-oost (bevestigd: 47 resultaten, allemaal
// in Kralingen Oost, i.p.v. de 3.388 van heel Rotterdam).
function bouwZoekUrl(locatie: B2bLocatie, budgetMax: number | null, kenmerken: B2bKenmerken | undefined): string {
  const gebied = locatie.wijkSlug ? `${locatie.plaatsSlug}/${locatie.wijkSlug}` : locatie.plaatsSlug;
  const params = kenmerkenNaarParams(kenmerken);
  params.set("selected_area", gebied);
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

// SCRAPEDO_TOKEN (optioneel): als deze env var gezet is, gaat elke fetch naar
// funda.nl via Scrape.do's proxy. EERST ScraperAPI overwogen, maar die bleek
// bij nader inzien alleen een 7-dagen-proef te zijn (geen blijvend gratis
// niveau, live gecontroleerd op hun eigen pricing-pagina) -- Scrape.do heeft
// wél een "gratis-voor-altijd" niveau (1.000 credits/mnd, geen kaart nodig,
// live geverifieerd via hun documentatie/pricing).
//
// super=true (Residential/mobile-proxynetwerk), GEEN render: onze eigen
// diagnose liet zien dat een doodgewone fetch (geen JavaScript, geen browser)
// vanaf een NIET-datacenter-IP gewoon 299 resultaten teruggaf -- dit is dus
// een IP-reputatieblokkade, geen JS-uitdaging. super=true lost precies dát
// op (10 credits/verzoek), en is goedkoper en sneller dan render=true erbij
// zetten (25 credits/verzoek, spint een headless browser op die we hier niet
// nodig hebben). Zonder deze env var blijft dit een directe fetch,
// die vanaf Vercel dus altijd 0 resultaten oplevert (zie de diagnose-log
// verderop) totdat het token is toegevoegd.
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

function viaScrapeDo(url: string): string {
  const params = new URLSearchParams({
    token: SCRAPEDO_TOKEN!,
    url,
    super: "true",
  });
  return `https://api.scrape.do/?${params.toString()}`;
}

async function fetchMetTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const daadwerkelijkeUrl = SCRAPEDO_TOKEN ? viaScrapeDo(url) : url;
    return await fetch(daadwerkelijkeUrl, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });
  } finally {
    clearTimeout(timer);
  }
}

// BUGFIX (live geverifieerd, zie het gesprek hierover -- "Burgwallen Oost"
// in Amsterdam gaf ook woningen uit andere wijken/plaatsen terug): de oude
// aanpak scrapete ALLE "/detail/koop/.../.../<id>/"-links los uit de ruwe
// HTML, inclusief funda's eigen "Toppositie"-blok (data-testid=
// "top-position-wrapper") bovenaan elke zoekresultatenpagina -- betaalde
// plaatsingen die NIET aan het gekozen gebiedsfilter gebonden zijn en dus
// van overal in Nederland kunnen komen. Dat blok staat op ELKE zoekpagina
// (niet iets specifieks voor Amsterdam/wijken), wat verklaart waarom dit met
// meerdere wijken gebeurde.
//
// Funda zet daarnaast standaard een schema.org ItemList (JSON-LD) op de
// pagina met precies de daadwerkelijke, al door het gebiedsfilter beperkte
// resultatenlijst (live geverifieerd: voor "amsterdam/burgwallen-oost" gaf
// dit blok exact de 14 resultaten die de pagina zelf ook toont, ZONDER de 3
// topposities) -- gestructureerde data i.p.v. ruwe anchor-tags scrapen, dus
// robuuster tegen zowel de topposities-vervuiling als toekomstige opmaak-
// wijzigingen. Bij het uitblijven van dit blok (paginastructuur gewijzigd)
// valt dit terug op de oude anchor-regex, liever een kleine kans op
// vervuilde resultaten dan helemaal niets.
function extractDetailLinks(html: string, limiet: number): string[] {
  const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items: unknown = data?.itemListElement;
      if (Array.isArray(items) && items.length > 0) {
        const urls = items
          .map((item) => (item as { url?: unknown })?.url)
          .filter((url): url is string => typeof url === "string" && url.includes("/detail/koop/"));
        if (urls.length > 0) return [...new Set(urls)].slice(0, limiet);
      }
    } catch {
      continue;
    }
  }

  // Fallback: geen bruikbaar ItemList-blok gevonden -- oude aanpak, met het
  // bekende risico dat het topposities-blok hier weer in mee kan komen.
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

function naarPrijsGetal(prijs: number | string | undefined): number | null {
  if (prijs == null) return null;
  const bedrag = typeof prijs === "string" ? Number(prijs) : prijs;
  return Number.isFinite(bedrag) && bedrag > 0 ? bedrag : null;
}

function formatPrijs(bedrag: number | null): string | null {
  if (bedrag == null) return null;
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
    const prijs = naarPrijsGetal(ld.offers?.price);

    return {
      titel,
      url: detailUrl,
      prijs,
      prijsLabel: formatPrijs(prijs),
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
    `[fundaFeed] modus=${FUNDA_FEED_MODE} proxy=${SCRAPEDO_TOKEN ? "scrape.do" : "geen (directe fetch, wordt vermoedelijk geblokkeerd vanaf Vercel)"} locatie=${locatie.plaatsSlug}${locatie.wijkSlug ? "/" + locatie.wijkSlug : ""}`
  );

  // BUGFIX: "budget verlaagd, maar oude/te dure resultaten bleven ertussen
  // staan" bleek deels ook hier te zitten -- Funda's eigen price-URL-param
  // vertrouwen we niet blindelings (zie eerdere ontdekking dat selected_area
  // ook al eens stilzwijgend werd genegeerd). Daarom hard nafilteren op
  // budgetMax, voor zowel mock- als live-modus, ongeacht wat de bron zelf al
  // deed -- een woning boven budget hoort hier nooit uit te komen.
  const bijBudget = (item: FundaFeedItem): boolean => budgetMax == null || budgetMax <= 0 || item.prijs == null || item.prijs <= budgetMax;

  if (FUNDA_FEED_MODE !== "live") {
    return MOCK_ITEMS.filter(bijBudget).slice(0, limiet);
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
    return resultaten.filter((item): item is FundaFeedItem => item !== null).filter(bijBudget);
  } catch (err) {
    console.error("[fundaFeed] ophalen/parsen mislukt (funda.nl is geen officiële, ondersteunde koppeling):", err);
    return [];
  }
}
