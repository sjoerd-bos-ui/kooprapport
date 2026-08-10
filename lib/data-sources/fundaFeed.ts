import { FUNDA_FEED_MODE, FUNDA_SEARCH_TIMEOUT_MS, FUNDA_DETAIL_TIMEOUT_MS } from "@/lib/config/fundaFeed";
import type { B2bKoperVoorkeuren, B2bMatchVerificatie, B2bWoningtypeVoorkeur } from "@/types/b2b";
import { B2B_BUDGET_OPTIES } from "@/types/b2b";

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
// URL-parameters (selected_area, price, object_type,
// object_type_house_orientation) zijn LIVE GEVERIFIEERD door de filters
// handmatig in de Funda-UI te bedienen en de resulterende URL af te lezen --
// niet gegokt, met uitzondering van de expliciet gemarkeerde plekken
// hieronder (die zijn wél een educated guess, en dat is ook zo
// gedocumenteerd). Nog steeds geen officiële/ondersteunde koppeling: elke
// stap faalt defensief (minder/geen matches), nooit een crash.
//
// MATCHINGMODEL V2 (zie het Cowork-gesprek hierover, "matchingsproces onder
// de loep"): dit bestand zocht voorheen op basis van een los B2bZoekopdracht-
// object (budgetMin/budgetMax/locatie/kenmerken) MET harde Funda-URL-filters
// per kenmerk. Dat is vervangen door de volledige B2bKoperVoorkeuren-
// vragenlijst (types/b2b.ts) als ENIGE invoer, en de harde kenmerken-filters
// zijn bewust LOSGELATEN op alles behalve locatie en budget: het nieuwe
// 100-puntensysteem (lib/services/matchScore.ts) geeft juist gedeeltelijke
// punten voor "net niet" (bv. 1 kamer minder, 10% onder het gevraagde
// oppervlak, één energielabel slechter) -- een harde Funda-filter zou die
// kandidaten nooit eens LATEN VINDEN om ze zo te kunnen scoren. Alleen
// locatie (waar zoeken) en budget (met marge, zie BUDGET_SCORE_MARGE) blijven
// harde zoekfilters, plus een BREDE woningtype-familiefilter (huis/
// appartement) puur om te voorkomen dat een koper die alleen huizen wil
// evenveel scan-budget kwijt is aan irrelevante appartementen (zie
// objectTypeFamilieFilter hieronder) -- de FIJNMAZIGE typewens (tussenwoning
// vs hoekwoning vs vrijstaand) wordt niet meer als harde Funda-filter
// gebruikt, alleen nog als scorecomponent.
// -----------------------------------------------------------------------------

export interface FundaFeedItem {
  titel: string;
  url: string;
  prijs: number | null; // ruwe waarde -- nodig om zelf nog eens hard tegen budgetMax te filteren
  prijsLabel: string | null;
  fotoUrl: string | null;
  // Snapshot van de lokale verificatie (zie B2bMatchVerificatie in
  // types/b2b.ts) -- de aanroeper slaat dit mee op zodat een BESTAANDE match
  // later opnieuw gescoord kan worden. Optioneel (ontbreekt bij mock-items --
  // geen echte scrape, dus niets om vast te leggen; aanroepers vallen dan
  // terug op `null`).
  verificatie?: B2bMatchVerificatie | null;
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

// Live geverifieerd (matchingmodel-v2-sessie, Funda-filterpaneel "Woningtype"
// > checkboxes Woonhuis/Appartement aangevinkt): object_type accepteert een
// kommagelijst ("object_type=house,apartment" gaf exact 3.321 = 606 (Woonhuis)
// + 2.715 (Appartement)). We filteren hier bewust alleen op FAMILIE (huis vs
// appartement), niet op het fijnmazige subtype (tussenwoning/hoekwoning/
// vrijstaand/studio) -- zie de bestandstoelichting hierboven.
const HUIS_WONINGTYPES: B2bWoningtypeVoorkeur[] = ["terraced", "corner", "semi_detached", "detached"];
const APPARTEMENT_WONINGTYPES: B2bWoningtypeVoorkeur[] = ["apartment", "studio"];

function objectTypeFamilieFilter(woningtypes: B2bWoningtypeVoorkeur[]): string | null {
  const wilHuis = woningtypes.some((w) => HUIS_WONINGTYPES.includes(w));
  const wilAppartement = woningtypes.some((w) => APPARTEMENT_WONINGTYPES.includes(w));
  const families: string[] = [];
  if (wilHuis) families.push("house");
  if (wilAppartement) families.push("apartment");
  // Leeg, of alleen "other" gekozen: geen zinvolle familie bekend, dus geen
  // filter -- breed zoeken is hier veiliger dan per ongeluk alles uitsluiten.
  return families.length > 0 ? families.join(",") : null;
}

// Energielabel-ordening (beste naar slechtste), Funda's eigen 12
// checkboxwaarden (live geverifieerd via het filterpaneel in een vorige
// sessie). Geëxporteerd: matchScore.ts gebruikt dezelfde volgorde om
// energielabels ordinaal te vergelijken (Component 7).
export const ENERGIELABEL_VOLGORDE_FUNDA = ["A+++++", "A++++", "A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"];

// selected_area -- LIVE GEVERIFIEERD (vorige sessie): een wijk-niveau gebied
// heeft een verplicht "wijk-"-voorvoegsel (rotterdam/wijk-kralingen-
// crooswijk), een buurt-niveau gebied een kale slug (rotterdam/kralingen-
// oost), en een plaats-niveau gebied gewoon de plaatsslug (schiedam). Deze
// waarden komen al kant-en-klaar uit plaatsLookup.ts (B2bLocatie.wijkSlug) of
// de vaste gebied-slugs (GEBIED_SLUGS hieronder) -- hier alleen nog
// samenvoegen.
//
// MULTI-GEBIED (LIVE GEVERIFIEERD, matchingmodel-v2-sessie): Funda's "+
// locatie toevoegen"-knop naast de locatie-chip bleek een simpele
// KOMMAGELIJST binnen ÉÉN selected_area-parameter te produceren
// (selected_area=rotterdam/wijk-kralingen-crooswijk,capelle-aan-den-ijssel
// gaf 531 = 284 + 247 resultaten, listings van beide gebieden door elkaar) --
// geen aparte requests per gebied nodig, dus geen extra proxykosten voor tot
// 3 gekozen voorkeurlocaties.
// BESCHIKBAARHEID (Sjoerd: "laten we alleen woningen tonen die de status
// 'beschikbaar' hebben"): LIVE GEVERIFIEERD in Funda's eigen "Alle filters"-
// paneel -- een "Beschikbaarheid"-blok met drie losse opties (Beschikbaar/
// In onderhandeling/Verkocht), standaard staan Beschikbaar EN In
// onderhandeling allebei aan. Alleen "Beschikbaar" aanvinken en op "Toon
// resultaten" klikken zet de URL om naar "?availability=available" (de
// resultaatteller kwam daarbij exact overeen met de teller achter die ene
// checkbox, dus dit is een echt server-side Funda-filter, geen giswerk).
// Hiermee filtert Funda zelf onderhandeling/verkocht er al uit -- geen losse
// scrape-/matchScore-logica nodig om dit hierna nog eens te checken.
function bouwZoekUrl(gebiedSlugs: string[], budgetMax: number | null, objectType: string | null, pagina = 1): string {
  const params = new URLSearchParams();
  params.set("selected_area", gebiedSlugs.join(","));
  params.set("availability", "available");
  if (objectType) params.set("object_type", objectType);
  if (budgetMax != null && budgetMax > 0) params.set("price", `0-${Math.round(budgetMax)}`);
  if (pagina > 1) params.set("page", String(pagina));
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

// PROXY-KEUZE (bijgewerkt na diagnose-sessie "gratis alternatief zoeken"):
// Scrape.do's gratis niveau (1.000 credits/mnd, 10 credits/verzoek in
// super=true-modus) bleek in de praktijk veel te krap -- elke zoekopdracht
// kost 1 zoekpagina + tot 15 detailpagina's, dus ±100-160 credits per
// "Ververs"-klik, en dat niveau raakte binnen een paar dagen normaal gebruik
// (plus deze diagnose-sessies) al op (live bevestigd: HTTP 401, Scrape.do's
// eigen documentatie noemt dat expliciet "you have no credits").
//
// Bright Data's Web Unlocker API heeft een RUIMER gratis-voor-altijd niveau:
// 5.000 verzoeken/maand, geen creditcard nodig (live geverifieerd zojuist op
// brightdata.com/pricing/web-unlocker, niet gegokt) -- dat is >30x zoveel
// verzoeken/maand als Scrape.do's gratis niveau in de praktijk opleverde.
// Vereist een (gratis) account bij Bright Data en een Web Unlocker-zone; de
// API-key + zone-naam komen als BRIGHTDATA_API_TOKEN / BRIGHTDATA_ZONE in de
// Vercel-omgevingsvariabelen (aanmaken kan alleen de accounthouder zelf, zie
// VOORTGANG.md).
//
// Voorkeursvolgorde: Bright Data (gratis, ruimste niveau) > Scrape.do (mocht
// dat account nog gebruikt worden) > kale directe fetch (levert vanaf Vercel
// zo goed als zeker 0 resultaten op, zie de IP-reputatie-uitleg hierboven --
// blijft toch de laatste, nooit-crashende terugval).
const BRIGHTDATA_API_TOKEN = process.env.BRIGHTDATA_API_TOKEN;
const BRIGHTDATA_ZONE = process.env.BRIGHTDATA_ZONE;
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN;

// format:"raw" -- live geverifieerd via Bright Data's eigen documentatie
// (docs.brightdata.com/scraping-automation/web-unlocker/send-your-first-
// request): geeft de kale HTML van de doelpagina terug als response-body,
// dus res.text() hieronder werkt ongewijzigd door voor de rest van dit
// bestand (dezelfde regex-gebaseerde parsing als voorheen).
async function viaBrightData(url: string, signal: AbortSignal): Promise<Response> {
  return fetch("https://api.brightdata.com/request", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BRIGHTDATA_API_TOKEN}`,
    },
    body: JSON.stringify({ zone: BRIGHTDATA_ZONE, url, format: "raw" }),
  });
}

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
    if (BRIGHTDATA_API_TOKEN && BRIGHTDATA_ZONE) {
      return await viaBrightData(url, controller.signal);
    }
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
// wijzigingen.
//
// TWEEDE BUGFIX (diagnose-sessie "veel data komt niet overeen met Funda"):
// het ItemList-blok ONTBREEKT VOLLEDIG zodra een zoekopdracht ECHT 0
// resultaten heeft (live geverifieerd: elke combinatie van filters die op
// Funda's eigen pagina "0 koopwoningen binnen jouw zoekwensen" oplevert,
// heeft ook helemaal GEEN ld+json-scripts meer op de pagina staan). De oude
// fallback greep dan terug op de kale anchor-regex over de VOLLEDIGE pagina
// -- en die pikt dan het Toppositie-blok op. Fix: het topposities-blok wordt
// nu ALTIJD eerst uit de HTML geknipt (verwijderTopposities hieronder)
// vóórdat de fallback-regex draait.
function verwijderTopposities(html: string): string {
  const marker = 'data-testid="top-position-wrapper"';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return html;

  const openStart = html.lastIndexOf("<div", markerIdx);
  if (openStart === -1) return html;

  // Simpele haakjes-teller over <div>/</div> om het complete, omvattende
  // blok te vinden -- geen volledige HTML-parser nodig voor dit ene, aan de
  // voorkant al bekende blok, en robuuster dan een vaste lengte gokken.
  let i = openStart;
  let diepte = 0;
  while (i < html.length) {
    if (html.startsWith("<div", i)) {
      diepte++;
      i += 4;
    } else if (html.startsWith("</div>", i)) {
      diepte--;
      i += 6;
      if (diepte === 0) break;
    } else {
      i++;
    }
  }
  if (diepte !== 0) return html; // onverwachte structuur -- niet blind knippen

  return html.slice(0, openStart) + html.slice(i);
}

function extractDetailLinks(html: string, limiet: number): string[] {
  const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items: unknown = data?.itemListElement;
      if (Array.isArray(items) && items.length > 0 && data["@type"] !== "BreadcrumbList") {
        const urls = items
          .map((item) => (item as { url?: unknown })?.url)
          .filter((url): url is string => typeof url === "string" && url.includes("/detail/koop/"));
        if (urls.length > 0) return [...new Set(urls)].slice(0, limiet);
      }
    } catch {
      continue;
    }
  }

  // Fallback: geen bruikbaar ItemList-blok gevonden. Topposities er eerst
  // uit knippen (zie hierboven) -- als er dan niets meer over is, is dat
  // hoogstwaarschijnlijk gewoon een oprechte 0-resultaten-pagina.
  const schoneHtml = verwijderTopposities(html);
  const matches = schoneHtml.match(/\/detail\/koop\/[a-z0-9-]+\/[a-z0-9-]+\/\d+\//gi) ?? [];
  const uniek = [...new Set(matches)];
  return uniek.slice(0, limiet).map((pad) => `https://www.funda.nl${pad}`);
}

interface FundaJsonLd {
  "@type"?: string | string[];
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

// Matchingmodel v2, Component 2 (locatiescore): het BreadcrumbList-JSON-LD-
// blok op de detailpagina bevat Funda's EIGEN, al toegekende wijk/buurtnaam
// (live geverifieerd: "Reserveboezemstraat 5" -> Home > Rotterdam > "Nieuw
// Crooswijk" > straatnaam -- positie 3 van 4, dus altijd de voorlaatste
// entry vóór de straatnaam zelf). Betrouwbaarder dan zelf uit het adres
// proberen af te leiden.
function extractBreadcrumbGebied(html: string): string | null {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const data = JSON.parse(m[1]);
      if (data?.["@type"] === "BreadcrumbList" && Array.isArray(data.itemListElement)) {
        const items = data.itemListElement as { position?: number; item?: { name?: string } }[];
        if (items.length >= 3) {
          const naam = items[items.length - 2]?.item?.name;
          return typeof naam === "string" && naam.trim() ? naam.trim() : null;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// Lokale verificatie ("vangnet" + scoregegevens) -- leest dezelfde
// weergavegegevens die een bezoeker ook gewoon op de detailpagina ziet (live
// geverifieerd op meerdere woningen, zowel appartement als huis).
// -----------------------------------------------------------------------------
export type LokaleVerificatie = B2bMatchVerificatie;

// Buitenruimte-detectie (tuin/balkon/dakterras) -- LIVE GEVERIFIEERD: Funda's
// "Kenmerken"-tabel op de detailpagina heeft een dt/dd-paar per rij (bv.
// `<dt ...>Tuin</dt><dd ...><span>Achtertuin en voortuin</span></dd>`). De
// rij "Tuin" is alleen aanwezig als de woning ook echt een tuin heeft;
// ontbreekt hij, dan heeft de woning er geen. Funda combineert balkon EN
// dakterras in één rij "Balkon/dakterras", met een tekstwaarde die het
// specifieke type noemt.
function leesBuitenruimte(html: string): { heeftTuin: boolean; heeftBalkon: boolean; heeftDakterras: boolean } {
  const heeftTuin = /<dt[^>]*>\s*Tuin\s*<\/dt>/i.test(html);

  const balkonDakterrasMatch = html.match(/<dt[^>]*>\s*Balkon\/dakterras\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i);
  const buitenTekst = balkonDakterrasMatch
    ? balkonDakterrasMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase()
    : "";

  return {
    heeftTuin,
    heeftBalkon: buitenTekst.includes("balkon"),
    heeftDakterras: buitenTekst.includes("dakterras"),
  };
}

// LIVE GEVERIFIEERD (Chrome-DOM) op zowel een huis als een appartement:
// "Bouwjaar", "Perceel" (ontbreekt bij appartementen -- geen eigen grond, dus
// terecht geen dt-rij), "Vraagprijs per m²" en de buurtvergelijking "Gem.
// vraagprijs / m²" zijn allemaal dt/dd-rijen van hetzelfde type als Tuin/
// Balkon-dakterras hierboven. Prijs-per-m² komt als "€ 4.643" terug, vandaar
// dezelfde eurotekst-opschoning als naarPrijsGetal.
function leesDtWaarde(html: string, label: string): string | null {
  const match = html.match(new RegExp(`<dt[^>]*>\\s*${label}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "i"));
  if (!match) return null;
  const tekst = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return tekst || null;
}

function leesGetal(tekst: string | null): number | null {
  if (!tekst) return null;
  const cijfers = tekst.replace(/[^\d]/g, "");
  if (!cijfers) return null;
  const getal = Number(cijfers);
  return Number.isFinite(getal) && getal > 0 ? getal : null;
}

function leesExtraKenmerken(html: string): {
  bouwjaar: number | null;
  perceeloppervlak: number | null;
  vraagprijsPerM2: number | null;
  buurtgemiddeldePrijsPerM2: number | null;
} {
  return {
    bouwjaar: leesGetal(leesDtWaarde(html, "Bouwjaar")),
    perceeloppervlak: leesGetal(leesDtWaarde(html, "Perceel")),
    vraagprijsPerM2: leesGetal(leesDtWaarde(html, "Vraagprijs per m²")),
    buurtgemiddeldePrijsPerM2: leesGetal(leesDtWaarde(html, "Gem\\. vraagprijs \\/ m²")),
  };
}

// Matchingmodel v2 -- ALLES hieronder LIVE GEVERIFIEERD op meerdere
// detailpagina's (Reserveboezemstraat 5, Oostmaaslaan 511, Buizenwerf 235,
// Voorschoterlaan 101) vóór implementatie:
//   - "Aantal kamers" toont BEIDE getallen in één string, bv. "4 kamers
//     (3 slaapkamers)" -- het eerste getal is het TOTAAL.
//   - "Voorzieningen" is een kommagescheiden lijst (bv. "Lift, mechanische
//     ventilatie, en TV kabel") -- lift wordt hieruit gelezen.
//   - "Gelegen op" toont "Begane grond" of "<n>e woonlaag".
//   - Eigen parkeerplek: alleen aanwezig als de losse "Soort garage"/
//     "Capaciteit"-rijen bestaan. "Soort parkeergelegenheid" (buurtniveau)
//     staat er altijd, en beschrijft de algemene parkeersituatie.
//   - "Soort woonhuis" (huizen, bv. "Herenhuis, tussenwoning") / "Soort
//     appartement" (appartementen, bv. "Portiekflat (appartement)") bevat
//     het fijnmazige subtype.
function leesKamers(html: string): number | null {
  const tekst = leesDtWaarde(html, "Aantal kamers");
  const match = tekst?.match(/(\d+)\s*kamers?/i);
  return match ? Number(match[1]) : null;
}

function leesLift(html: string): boolean {
  const tekst = leesDtWaarde(html, "Voorzieningen");
  return tekst ? /\blift\b/i.test(tekst) : false;
}

function leesWoonlaag(html: string): number | null {
  const tekst = leesDtWaarde(html, "Gelegen op");
  if (!tekst) return null;
  if (/begane\s*grond/i.test(tekst)) return 0;
  const match = tekst.match(/(\d+)e\s*woonlaag/i);
  return match ? Number(match[1]) : null;
}

function leesParkeren(html: string): { heeftEigenParkeerplek: boolean; parkeerOmschrijving: string | null } {
  const eigenGarage = leesDtWaarde(html, "Soort garage");
  const capaciteit = leesDtWaarde(html, "Capaciteit");
  return {
    heeftEigenParkeerplek: Boolean(eigenGarage) || Boolean(capaciteit && /\d/.test(capaciteit)),
    parkeerOmschrijving: leesDtWaarde(html, "Soort parkeergelegenheid"),
  };
}

function leesWoningsubtypeRuw(html: string): string | null {
  return leesDtWaarde(html, "Soort woonhuis") ?? leesDtWaarde(html, "Soort appartement");
}

// BUGFIX (Sjoerd: "'Woonoppervlak kon niet worden vastgesteld' geeft die
// melding vaker"): woonoppervlak kwam tot nu toe UITSLUITEND uit de
// iconenrij bovenaan de pagina (m2Match hieronder) -- een fragiele,
// class-naam-afhankelijke match die stopt te werken zodra Funda die rij ooit
// anders opbouwt. Live gevonden (via een aparte fetch op een echte woning,
// "Albinusstraat 12"): de Kenmerken-tabel heeft ONDER "Oppervlakten en
// inhoud" > "Gebruiksoppervlakten" een eigen "Wonen"-rij (bv. "158 m²"),
// exact hetzelfde dt/dd-patroon dat al bewezen betrouwbaar is voor Bouwjaar/
// Perceel/Vraagprijs per m² (leesExtraKenmerken hierboven). Twee
// onafhankelijke bronnen voor hetzelfde cijfer -- dt/dd-tabel als voorkeur
// (het beproefde patroon), iconenrij als terugval, dus één van de twee moet
// het bijna altijd kunnen ophalen. Kon geen van beide ondubbelzinnig de ruwe
// (ongehydrateerde) HTML tonen om dit definitief te bevestigen -- deze
// toevoeging is dus een robuustheidsverbetering, niet een 100% bevestigde
// rootcause-fix; als de melding hierna nog vaak voorkomt, is een concreet
// voorbeeldadres de volgende stap.
function leesWoonoppervlak(html: string): number | null {
  const uitTabel = leesGetal(leesDtWaarde(html, "Wonen"));
  if (uitTabel != null) return uitTabel;
  const m2Match = html.match(
    /<span class="md:font-semibold">(\d+)\s*m²<\/span><span class="ml-1 hidden text-neutral-50 md:inline-block">wonen<\/span>/i
  );
  return m2Match ? Number(m2Match[1]) : null;
}

function leesLokaleVerificatieData(html: string, ld: FundaJsonLd): LokaleVerificatie {
  const types = Array.isArray(ld["@type"]) ? ld["@type"] : ld["@type"] ? [ld["@type"]] : [];
  const woningtypeFamilie: LokaleVerificatie["woningtypeFamilie"] = types.includes("Huis")
    ? "huis"
    : types.includes("Appartement")
      ? "appartement"
      : null;

  const slaapMatch = html.match(
    /<span class="md:font-semibold">(\d+)<\/span><span class="ml-1 hidden text-neutral-50 md:inline-block">slaapkamers<\/span>/i
  );
  const labelMatch = html.match(
    /<span class="md:font-semibold">([^<]*)<\/span><span class="ml-1 hidden text-neutral-50 md:inline-block">energielabel<\/span>/i
  );

  const { heeftEigenParkeerplek, parkeerOmschrijving } = leesParkeren(html);

  return {
    woningtypeFamilie,
    slaapkamers: slaapMatch ? Number(slaapMatch[1]) : null,
    woonoppervlak: leesWoonoppervlak(html),
    energielabel: labelMatch ? labelMatch[1].trim() : null,
    ...leesBuitenruimte(html),
    ...leesExtraKenmerken(html),
    kamers: leesKamers(html),
    heeftLift: leesLift(html),
    woonlaag: leesWoonlaag(html),
    heeftEigenParkeerplek,
    parkeerOmschrijving,
    woningsubtypeRuw: leesWoningsubtypeRuw(html),
    gebiedRuw: extractBreadcrumbGebied(html),
    plaatsnaam: ld.address?.addressLocality ?? null,
    // BUGFIX (zie de toelichting bij `status` in types/b2b.ts): live
    // geverifieerd dat dit gewoon een dt/dd-rij "Status" is, zelfde patroon
    // als Bouwjaar/Aantal kamers hierboven -- geen aparte parsing nodig.
    status: leesDtWaarde(html, "Status"),
  };
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

    const verificatie = leesLokaleVerificatieData(html, ld);

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
      verificatie,
    };
  } catch {
    return null;
  }
}

export interface FundaZoekResultaat {
  items: FundaFeedItem[];
  fout: boolean;
}

// Matchingmodel v2, Component 1 (budgetscore): tiers op 100%/105%/110% van
// het gekozen maximum (zie het opgegeven puntensysteem) -- de Funda-
// zoekopdracht zelf scant daarom bewust tot 110% boven het gekozen maximum,
// anders zouden de 15- en 10-puntentussenstappen nooit een kandidaat te zien
// krijgen. Boven de 110% is er sowieso 0 punten op dit onderdeel, dus verder
// scannen heeft geen zin. Gedeeld met matchScore.ts (dezelfde marge moet
// hier en bij het scoren gebruikt worden, anders vindt de zoekopdracht
// kandidaten die het scoremodel meteen weer afwijst als "nooit gezien").
export const BUDGET_ZOEK_MARGE = 0.1;

function afgeleidBudgetMax(voorkeuren: B2bKoperVoorkeuren): number | null {
  const optie = B2B_BUDGET_OPTIES.find((o) => o.waarde === voorkeuren.maxKoopprijs);
  if (!optie?.max) return null;
  return Math.round(optie.max * (1 + BUDGET_ZOEK_MARGE));
}

// Matchingmodel v2, Component 2 (locatiescore) -- vertaalt de tot 3 gekozen,
// landelijke B2bLocatie-voorkeuren naar 1-3 daadwerkelijke Funda-
// zoekgebieden. Elke B2bLocatie komt al rechtstreeks uit de live PDOK-
// autocomplete (LocatieAutocomplete.tsx/plaatsLookup.ts) en bevat dus al de
// exacte Funda-slug -- geen vertaaltabel meer nodig (was voorheen wel nodig
// toen dit een vaste 10-regio-lijst was, zie gebiedIndeling.ts voor de
// geschiedenis daarvan).
function afgeleideGebiedSlugs(voorkeuren: B2bKoperVoorkeuren): string[] {
  const slugs = new Set<string>();
  for (const locatie of voorkeuren.voorkeurLocaties) {
    slugs.add(locatie.wijkSlug ? `${locatie.plaatsSlug}/${locatie.wijkSlug}` : locatie.plaatsSlug);
  }
  return [...slugs];
}

// TIJDELIJKE DIAGNOSE-LOGGING (bewust altijd aan, ook in mock-modus): tot nu
// toe was "geen nieuwe matches" volledig stil in beide gevallen, dus die twee
// waren via de runtime-logs niet van elkaar te onderscheiden. Dit maakt in
// elk geval meteen zichtbaar welke modus daadwerkelijk actief is op de
// lopende deployment.
//
// `bekendeUrls` laat de aanroeper de al opgeslagen matches meegeven zodat de
// detailpagina van die links helemaal wordt overgeslagen -- de link blijft
// wel meetellen voor `limiet`, alleen het dure detailpagina-verzoek wordt
// bespaard.
export async function haalFundaMatches(
  voorkeuren: B2bKoperVoorkeuren,
  limiet = 15,
  bekendeUrls: Set<string> = new Set()
): Promise<FundaZoekResultaat> {
  const gebiedSlugs = afgeleideGebiedSlugs(voorkeuren);
  const budgetMax = afgeleidBudgetMax(voorkeuren);
  const objectType = objectTypeFamilieFilter(voorkeuren.woningtypes);

  console.log(
    `[fundaFeed] modus=${FUNDA_FEED_MODE} proxy=${
      BRIGHTDATA_API_TOKEN && BRIGHTDATA_ZONE
        ? "bright-data"
        : SCRAPEDO_TOKEN
          ? "scrape.do"
          : "geen (directe fetch, wordt vermoedelijk geblokkeerd vanaf Vercel)"
    } gebieden=${gebiedSlugs.join("|") || "(geen)"} budgetMax=${budgetMax ?? "onbeperkt"} objectType=${objectType ?? "(geen filter)"}`
  );

  if (gebiedSlugs.length === 0) {
    // Zou niet moeten voorkomen (voorkeurLocaties is minimaal 1 item, zie
    // koperVoorkeurenValidatie.ts) -- defensief gehouden voor het geval van
    // oudere, vóór matchingmodel-v2 opgeslagen dossiers. Geen oprechte fout
    // (dus geen `fout: true`), gewoon niets gevonden.
    console.log("[fundaFeed] geen bruikbaar zoekgebied afgeleid uit de koper-voorkeuren -- overgeslagen");
    return { items: [], fout: false };
  }

  const bijBudget = (item: FundaFeedItem): boolean => {
    if (item.prijs == null || budgetMax == null) return true;
    return item.prijs <= budgetMax;
  };

  if (FUNDA_FEED_MODE !== "live") {
    return { items: MOCK_ITEMS.filter(bijBudget).slice(0, limiet), fout: false };
  }

  // Paginering: LIVE GEVERIFIEERD dat Funda's `&page=2`, `&page=3` werkt en
  // daadwerkelijk nieuwe, andere woning-URL's teruggeeft via hetzelfde
  // ld+json ItemList-blok als pagina 1. Elke pagina kost 1 proxy-verzoek
  // ongeacht hoeveel links daarna al bekend blijken -- MAX_PAGINAS is dus een
  // bewuste, harde kostengrens.
  const MAX_PAGINAS = 8;
  const links: string[] = [];
  let paginasOpgehaald = 0;
  let heeftFout = false;

  for (let pagina = 1; pagina <= MAX_PAGINAS && links.length < limiet; pagina++) {
    const zoekUrl = bouwZoekUrl(gebiedSlugs, budgetMax, objectType, pagina);
    try {
      const res = await fetchMetTimeout(zoekUrl, FUNDA_SEARCH_TIMEOUT_MS);
      console.log(`[fundaFeed] LIVE zoekaanvraag (pagina ${pagina}) ${zoekUrl} -> HTTP ${res.status}`);
      if (!res.ok) {
        console.error(`[fundaFeed] HTTP ${res.status} bij ophalen van ${zoekUrl}`);
        if (links.length === 0) heeftFout = true;
        break;
      }
      paginasOpgehaald++;
      const html = await res.text();
      const paginaLinks = extractDetailLinks(html, limiet - links.length);
      if (paginaLinks.length === 0) {
        if (pagina === 1) {
          const snippet = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ").slice(0, 500);
          console.log(`[fundaFeed] LIVE 0 links op pagina 1. HTML-snippet: ${snippet}`);
        }
        break; // geen (verdere) resultaten -- volgende pagina's leveren dan ook niets op
      }
      for (const link of paginaLinks) if (!links.includes(link)) links.push(link);
    } catch (err) {
      console.error(`[fundaFeed] LIVE zoekaanvraag (pagina ${pagina}) mislukt (netwerk/timeout):`, err);
      if (links.length === 0) heeftFout = true;
      break;
    }
  }

  console.log(`[fundaFeed] LIVE ${links.length} woninglink(s) gevonden over ${paginasOpgehaald} pagina('s)${heeftFout ? " -- ZOEKFOUT" : ""}`);
  if (links.length === 0) return { items: [], fout: heeftFout };

  const nieuweLinks = links.filter((url) => !bekendeUrls.has(url));
  const overgeslagen = links.length - nieuweLinks.length;
  if (overgeslagen > 0) {
    console.log(`[fundaFeed] LIVE ${overgeslagen}/${links.length} link(s) al bekend -- detailpagina overgeslagen (credits bespaard)`);
  }
  if (nieuweLinks.length === 0) return { items: [], fout: false };

  try {
    const resultaten = await Promise.all(nieuweLinks.map((url) => haalListingDetails(url)));
    const mislukt = resultaten.filter((item) => item === null).length;
    if (mislukt > 0) {
      console.log(`[fundaFeed] LIVE ${mislukt}/${nieuweLinks.length} link(s) niet leesbaar (detailpagina-fout)`);
    }
    return { items: resultaten.filter((item): item is FundaFeedItem => item !== null).filter(bijBudget), fout: false };
  } catch (err) {
    console.error("[fundaFeed] detailpagina's ophalen/parsen mislukt:", err);
    return { items: [], fout: true };
  }
}
