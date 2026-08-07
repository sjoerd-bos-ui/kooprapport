import { FUNDA_FEED_MODE, FUNDA_SEARCH_TIMEOUT_MS, FUNDA_DETAIL_TIMEOUT_MS } from "@/lib/config/fundaFeed";
import type { B2bLocatie, B2bKenmerken, B2bWoningtype, B2bEnergielabel, B2bMatchVerificatie } from "@/types/b2b";

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
  // Snapshot van de kenmerken-verificatie op scrapemoment (zie
  // B2bMatchVerificatie in types/b2b.ts) -- de aanroeper slaat dit mee op
  // zodat een BESTAANDE match later opnieuw getoetst kan worden. Optioneel
  // (ontbreekt bij mock-items -- geen echte scrape, dus niets om vast te
  // leggen; aanroepers vallen dan terug op `null`).
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

// object_type + object_type_house_orientation -- ALLE waarden hieronder zijn
// nu live geverifieerd (diagnose-sessie: "veel data komt niet overeen met
// Funda") door in het filterpaneel op "Woonhuis" > "Specificeer" te klikken
// en per oriëntatie-checkbox het daadwerkelijke id uit te lezen
// (checkbox-object_type_house_orientation-<waarde>).
//
// BUGFIX: "2-onder-1-kapwoning" gebruikte tot nu toe "semi_detached" -- dat
// bleek NIET 2-onder-1-kapwoning te zijn, maar Funda's aparte categorie
// "Halfvrijstaande woning" (een woning met maar aan één kant een buurwoning,
// wat iets anders is dan een 2-onder-1-kapwoning). De echte waarde voor
// 2-onder-1-kapwoning is "double". Dit verklaart (samen met de
// topposities-bugfix hieronder) de gemelde klacht "ik kies een woningtype en
// krijg toch iets anders": met de foute waarde zocht de app feitelijk op een
// compleet andere, veel zeldzamere categorie, wat al snel op 0 échte
// resultaten uitkwam.
const WONINGTYPE_PARAMS: Record<B2bWoningtype, { objectType: string; orientation?: string }> = {
  tussenwoning: { objectType: "house", orientation: "terraced" },
  hoekwoning: { objectType: "house", orientation: "corner" },
  "2-onder-1-kapwoning": { objectType: "house", orientation: "double" },
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
// Geëxporteerd (i.p.v. alleen intern gebruikt): lib/services/matchScore.ts
// hergebruikt dezelfde volgorde/drempels om te bepalen of een woning het
// gevraagde energielabel niet alleen haalt maar ook overtreft.
export const ENERGIELABEL_VOLGORDE_FUNDA = ["A+++++", "A++++", "A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"];
export const ENERGIELABEL_AANTAL_FUNDA_WAARDEN: Record<B2bEnergielabel, number> = { A: 6, B: 7, C: 8, D: 9, E: 10, F: 11, G: 12 };
function energielabelNaarFundaWaarden(label: B2bEnergielabel): string {
  return ENERGIELABEL_VOLGORDE_FUNDA.slice(0, ENERGIELABEL_AANTAL_FUNDA_WAARDEN[label]).join(",");
}

// `kenmerkenFlexibel` (matching-model, koperVoorkeuren.kenmerkenFlexibel):
// als de koper heeft aangegeven dat een woning die op één punt net niet
// voldoet nog steeds interessant is, laten we de buitenruimte-filter
// (tuin/balkon/dakterras) hier bewust WEG i.p.v. hem gewoon mee te sturen --
// Funda's eigen filter is een harde uitsluiting, dus als we die erin laten
// staan komt een net-niet-match nooit eens in de resultatenlijst terecht om
// lokaal te kunnen scoren/toetsen. voldoetAanKenmerken() hieronder blijft
// wél lokaal controleren en telt hoeveel van tuin/balkon/dakterras
// daadwerkelijk ontbreken -- bij "flexibel" wordt hooguit ÉÉN ontbrekend
// kenmerk getolereerd (zie voldoetAanKenmerken), niet allemaal.
// Overige kenmerken (woningtype, slaapkamers, energielabel, garage, lift)
// blijven altijd hard -- daar is nooit over "een puntje minder" gesproken.
function kenmerkenNaarParams(kenmerken: B2bKenmerken | undefined, kenmerkenFlexibel = false): URLSearchParams {
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

  if (!kenmerkenFlexibel) {
    const buiten: string[] = [];
    if (kenmerken.tuin) buiten.push("garden");
    if (kenmerken.balkon) buiten.push("balcony");
    if (kenmerken.dakterras) buiten.push("terrace");
    if (buiten.length > 0) params.set("exterior_space_type", buiten.join(","));
  }

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
// BUGFIX (dezelfde diagnose-sessie): budgetMin werd HIER NOOIT meegegeven --
// alleen budgetMax kwam in de price-parameter terecht ("0-<budgetMax>"), dus
// een ondergrens (bv. "€300k - €500k") deed op Funda-niveau helemaal niets.
// Dat is de directe verklaring voor de gemelde klacht "ik kies 300-500k en
// krijg een woning van 289": die woning voldeed op Funda's eigen resultaten
// gewoon aan "tot 500k" (het enige dat werd doorgegeven). Live geverifieerd
// dat Funda's price-parameter een simpel "<min>-<max>"-bereik is, waarbij
// beide kanten optioneel zijn (price=300000-500000, price=300000- en
// price=0-500000 zijn alle drie handmatig getest en gaven exact de
// verwachte, aftelbare resultaten).
// `pagina` -- LIVE GEVERIFIEERD (matching-model-sessie, Chrome): Funda's
// eigen paginaknoppen linken naar `?...&page=2`, `&page=3` enz. (pagina 1 is
// gewoon de URL zonder page-parameter); `page=2` gaf ook daadwerkelijk 15
// nieuwe, andere woning-URL's terug via hetzelfde ld+json ItemList-blok.
// Nodig om een grotere kandidatenpool te kunnen scoren/kiezen dan de ±15
// resultaten van de eerste pagina alleen (zie MAX_ZICHTBARE_MATCHEN).
// Vaste marge (10%) voor "budget is bespreekbaar" (koperVoorkeuren.
// budgetFlexibel, zie types/b2b.ts) -- toegepast op zowel de Funda-URL zelf
// (anders komt een net-boven-budget-woning nooit in de resultatenlijst
// terecht) als de lokale nafiltering (bijBudget) en de herverificatie van
// bestaande matches (ruimVerouderdeMatchenOp in b2bStore.ts), zodat alle drie
// dezelfde marge hanteren. Geëxporteerd om die laatste twee consistent te
// houden i.p.v. het getal op drie plekken te dupliceren.
export const BUDGET_FLEXIBEL_MARGE = 0.1;

function bouwZoekUrl(
  locatie: B2bLocatie,
  budgetMin: number | null,
  budgetMax: number | null,
  kenmerken: B2bKenmerken | undefined,
  pagina = 1,
  opties: { budgetFlexibel?: boolean; kenmerkenFlexibel?: boolean } = {}
): string {
  const gebied = locatie.wijkSlug ? `${locatie.plaatsSlug}/${locatie.wijkSlug}` : locatie.plaatsSlug;
  const params = kenmerkenNaarParams(kenmerken, opties.kenmerkenFlexibel);
  params.set("selected_area", gebied);
  const min = budgetMin && budgetMin > 0 ? Math.round(budgetMin) : null;
  let max = budgetMax && budgetMax > 0 ? Math.round(budgetMax) : null;
  if (max != null && opties.budgetFlexibel) max = Math.round(max * (1 + BUDGET_FLEXIBEL_MARGE));
  if (min != null || max != null) params.set("price", `${min ?? 0}-${max ?? ""}`);
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
// -- en die pikt dan het Toppositie-blok op (data-testid=
// "top-position-wrapper", betaalde plaatsingen die NOOIT aan het gebieds-,
// prijs- of ander filter gebonden zijn, live bevestigd: 3 appartementen van
// overal in Nederland op een pagina met 0 échte, gefilterde resultaten).
// Dat is de directe verklaring voor "ik kies vrijstaand en krijg toch
// appartementen": een streng samengestelde zoekopdracht (locatie + budget +
// woningtype + slaapkamers + energielabel samen) komt vaak op 0 échte
// treffers uit, en dan werden stilzwijgend de 3 topposities als "match"
// opgeslagen -- volledig losstaand van de opgegeven criteria.
//
// Fix: het topposities-blok wordt nu ALTIJD eerst uit de HTML geknipt
// (verwijderTopposities hieronder) vóórdat de fallback-regex draait. Blijft
// er na het knippen niets bruikbaars over (het echte, veelvoorkomende
// 0-resultaten-geval), dan is de uitkomst nu terecht een lege lijst i.p.v.
// verzonnen matches.
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

// -----------------------------------------------------------------------------
// Lokale nafiltering ("vangnet") -- diagnose-sessie "veel data komt niet
// overeen met Funda": tot nu toe werd alleen de prijs nog eens hard tegen
// budgetMax gecontroleerd (zie bijBudget in haalFundaMatches). Woningtype,
// slaapkamers, woonoppervlak en energielabel van de daadwerkelijk
// gescrapete woning werden NOOIT teruggecontroleerd tegen de kenmerken van
// de zoekopdracht -- als de Funda-URL (om welke reden dan ook: een verkeerde
// parameterwaarde zoals de 2-onder-1-kap-bug hierboven, een gewijzigde
// Funda-indeling, of de topposities-vervuiling) iets anders teruggaf dan
// gevraagd, werd dat gewoon voor zoete koek aangenomen.
//
// Deze functie leest dezelfde weergavegegevens die een bezoeker ook gewoon
// op de detailpagina ziet (live geverifieerd op meerdere woningen, zowel
// appartement als huis): het iconenblokje direct onder de prijs
// ("<n> slaapkamers", "<n> m² wonen", "<label> energielabel") en het @type-
// veld uit de JSON-LD ("Huis" vs "Appartement"). Als een waarde niet te
// vinden/parsen is, wordt dat NOOIT als afwijzingsgrond gebruikt (dat zou
// onze eigen scrape-beperkingen afstraffen i.p.v. een echte mismatch) --
// alleen een daadwerkelijk TEGENSTRIJDIGE waarde leidt tot afwijzing.
// Geëxporteerd (i.p.v. alleen intern gebruikt): b2bStore.ts slaat dit als
// snapshot op bij elke match (B2bWoningMatch.verificatie) en gebruikt
// dezelfde voldoetAanKenmerken() hieronder om BESTAANDE matches bij een
// volgende verversing opnieuw te toetsen -- zie de uitleg bij
// B2bWoningMatch.verificatie in types/b2b.ts voor waarom dat nodig is.
export type LokaleVerificatie = B2bMatchVerificatie;

// Buitenruimte-detectie (tuin/balkon/dakterras) -- LIVE GEVERIFIEERD (klacht
// "balkon naar tuin switchen laat oude matches staan"): Funda's "Kenmerken"-
// tabel op de detailpagina heeft een dt/dd-paar per rij (bv.
// `<dt ...>Tuin</dt><dd ...><span>Achtertuin en voortuin</span></dd>`),
// gecontroleerd via de daadwerkelijke DOM op meerdere woningen. Twee dingen
// live bevestigd, niet gegokt:
//   1. De rij "Tuin" is alleen aanwezig als de woning ook echt een tuin
//      heeft; ontbreekt hij, dan heeft de woning er geen (bevestigd op
//      meerdere appartementen zonder tuin).
//   2. Funda combineert balkon EN dakterras in één rij "Balkon/dakterras",
//      met een tekstwaarde die het specifieke type noemt ("Balkon aanwezig",
//      "Dakterras aanwezig") -- vandaar de losse balkon/dakterras-substring-
//      check op dezelfde rij i.p.v. twee aparte dt's.
// Regex i.p.v. exacte class-match (in tegenstelling tot de spans hieronder):
// deze dt/dd-rijen hebben een langere, minder stabiele Tailwind-classlist, dus
// alleen op de dt-teksten zelf gematcht en de dd-inhoud van omliggende tags
// ontdaan -- robuuster tegen kleine opmaakwijzigingen.
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

// LIVE GEVERIFIEERD (Chrome-DOM, matching-model-sessie) op zowel een huis als
// een appartement: "Bouwjaar", "Perceel" (ontbreekt bij appartementen -- geen
// eigen grond, dus terecht geen dt-rij), "Vraagprijs per m²" en de
// buurtvergelijking "Gem. vraagprijs / m²" zijn allemaal dt/dd-rijen van
// hetzelfde type als Tuin/Balkon-dakterras hierboven. Prijs-per-m² komt als
// "€ 4.643" terug, vandaar dezelfde eurotekst-opschoning als naarPrijsGetal.
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
  const m2Match = html.match(
    /<span class="md:font-semibold">(\d+)\s*m²<\/span><span class="ml-1 hidden text-neutral-50 md:inline-block">wonen<\/span>/i
  );
  const labelMatch = html.match(
    /<span class="md:font-semibold">([^<]*)<\/span><span class="ml-1 hidden text-neutral-50 md:inline-block">energielabel<\/span>/i
  );

  return {
    woningtypeFamilie,
    slaapkamers: slaapMatch ? Number(slaapMatch[1]) : null,
    woonoppervlak: m2Match ? Number(m2Match[1]) : null,
    energielabel: labelMatch ? labelMatch[1].trim() : null,
    ...leesBuitenruimte(html),
    ...leesExtraKenmerken(html),
  };
}

// true = deze woning voldoet (of kon niet met zekerheid worden afgekeurd),
// false = aantoonbaar in strijd met een expliciet ingestelde kenmerk, dus
// wordt uit de matches gehouden. Geëxporteerd: b2bStore.ts hergebruikt dit
// om BESTAANDE, opgeslagen matches (via hun verificatie-snapshot) opnieuw te
// toetsen, niet alleen nieuw gescrapete kandidaten.
export function voldoetAanKenmerken(verificatie: LokaleVerificatie, kenmerken: B2bKenmerken | undefined, kenmerkenFlexibel = false): boolean {
  if (!kenmerken) return true;

  if (kenmerken.woningtype && verificatie.woningtypeFamilie) {
    const verwacht = kenmerken.woningtype === "appartement" ? "appartement" : "huis";
    if (verificatie.woningtypeFamilie !== verwacht) return false;
  }

  if (kenmerken.minSlaapkamers && verificatie.slaapkamers != null) {
    if (verificatie.slaapkamers < kenmerken.minSlaapkamers) return false;
  }

  if (kenmerken.minWoonoppervlak && verificatie.woonoppervlak != null) {
    if (verificatie.woonoppervlak < kenmerken.minWoonoppervlak) return false;
  }

  if (kenmerken.minEnergielabel && verificatie.energielabel) {
    const rang = ENERGIELABEL_VOLGORDE_FUNDA.indexOf(verificatie.energielabel);
    // Niet te herkennen label-tekst (onverwacht formaat) -- niet afwijzen,
    // zie de uitleg hierboven.
    if (rang !== -1 && rang >= ENERGIELABEL_AANTAL_FUNDA_WAARDEN[kenmerken.minEnergielabel]) return false;
  }

  // BUGFIX (klacht "balkon naar tuin switchen laat oude matches staan"):
  // tuin/balkon/dakterras werden hier nooit gecontroleerd. Bewust `!== true`
  // i.p.v. `=== false`: dat wijst ook BESTAANDE, VOOR deze fix opgeslagen
  // matches af (hun verificatie-snapshot mist deze velden nog helemaal, dus
  // `undefined`) -- exact dezelfde eenmalige "voor de zekerheid als
  // verouderd behandelen"-aanpak als bij een volledig ontbrekende snapshot
  // (zie ruimVerouderdeMatchenOp in b2bStore.ts). Voor NIEUW gescrapete
  // matches is dit veld altijd een echte boolean (nooit undefined, zie
  // leesBuitenruimte hierboven), dus daar betekent dit gewoon "heeft het
  // kenmerk aantoonbaar niet".
  //
  // MATCHING-MODEL: bij kenmerkenFlexibel (koperVoorkeuren, "op één puntje
  // na nog interessant?") wordt maximaal ÉÉN ontbrekend buitenruimte-kenmerk
  // getolereerd i.p.v. meteen afgewezen -- de bijbehorende strafpunten komen
  // van berekenMatchScore() in lib/services/matchScore.ts, niet hier. Twee of
  // meer ontbrekende kenmerken blijft altijd een afwijzing, ook flexibel.
  const ontbrekend = [
    kenmerken.tuin && verificatie.heeftTuin !== true,
    kenmerken.balkon && verificatie.heeftBalkon !== true,
    kenmerken.dakterras && verificatie.heeftDakterras !== true,
  ].filter(Boolean).length;
  if (kenmerkenFlexibel) {
    if (ontbrekend > 1) return false;
  } else if (ontbrekend > 0) {
    return false;
  }

  return true;
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

async function haalListingDetails(
  detailUrl: string,
  kenmerken: B2bKenmerken | undefined,
  kenmerkenFlexibel = false
): Promise<FundaFeedItem | null> {
  try {
    const res = await fetchMetTimeout(detailUrl, FUNDA_DETAIL_TIMEOUT_MS);
    if (!res.ok) return null;
    const html = await res.text();
    const ld = extractJsonLd(html);
    if (!ld) return null;

    // Vangnet: ongeacht wat de zoekpagina/URL-parameters al (zouden moeten)
    // hebben gefilterd, wordt de daadwerkelijk gescrapete woning hier nog
    // eens hard tegen de kenmerken van de zoekopdracht gehouden. Zie
    // voldoetAanKenmerken() hierboven voor de precieze regels.
    const verificatie = leesLokaleVerificatieData(html, ld);
    if (!voldoetAanKenmerken(verificatie, kenmerken, kenmerkenFlexibel)) return null;

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

// TIJDELIJKE DIAGNOSE-LOGGING (bewust altijd aan, ook in mock-modus): tot nu
// toe was "geen nieuwe matches" volledig stil in beide gevallen (mock-modus
// EN live-modus-met-0-resultaten loggen namelijk geen van beide iets), dus
// die twee waren via de runtime-logs niet van elkaar te onderscheiden. Dit
// maakt in elk geval meteen zichtbaar welke modus daadwerkelijk actief is op
// de lopende deployment, en bij live-modus ook of de zoekpagina uberhaupt
// echte woninglinks teruggeeft. Mag na de eerste geslaagde live-run weer
// verwijderd/afgezwakt worden.
//
// BUGFIX (diagnose-sessie "wat hebben we maandelijks nodig"): dit haalde
// voorheen de detailpagina van ELKE gevonden link op, ook van woningen die
// al als match bekend waren van een vorige ronde (dedupe gebeurde pas
// daarna, bij de aanroeper) -- bij de dagelijkse cron kostte dat élke dag
// opnieuw proxy-verzoeken aan dezelfde, allang bekende woningen. `bekendeUrls`
// laat de aanroeper de al opgeslagen matches meegeven zodat de detailpagina
// van die links helemaal wordt overgeslagen -- de link blijft wel meetellen
// voor `limiet` (zelfde resultatenselectie als voorheen), alleen het dure
// detailpagina-verzoek wordt bespaard.
export interface KoperVoorkeurenVoorZoeken {
  budgetFlexibel?: boolean;
  kenmerkenFlexibel?: boolean;
}

// BUGFIX (klacht "Kralingen Crooswijk geeft nog steeds 0 matches zonder
// extra filter" -- bleek NIET meer de slug te zijn, die klopt inmiddels
// live geverifieerd; root cause via de Vercel-productielogs: de Bright
// Data-zoekaanvraag zelf timede een keer uit (AbortError) VOORDAT er ook
// maar een HTTP-status binnenkwam). Het resultaat was hierdoor
// ononderscheidbaar van een oprechte "0 woningen voldoen" -- de aanroeper
// (en dus de makelaar) kreeg gewoon een lege lijst te zien, geen signaal
// dat het zoeken zelf mislukt was. `fout` maakt dat onderscheid nu
// expliciet: true = het zoeken zelf is niet gelukt (netwerk/proxy/timeout),
// de aanroeper hoort dit anders te tonen dan "geen passende woningen".
export interface FundaZoekResultaat {
  items: FundaFeedItem[];
  fout: boolean;
}

export async function haalFundaMatches(
  locatie: B2bLocatie,
  budgetMin: number | null,
  budgetMax: number | null,
  kenmerken: B2bKenmerken | undefined,
  limiet = 15,
  bekendeUrls: Set<string> = new Set(),
  koperVoorkeuren?: KoperVoorkeurenVoorZoeken | null
): Promise<FundaZoekResultaat> {
  const budgetFlexibel = Boolean(koperVoorkeuren?.budgetFlexibel);
  const kenmerkenFlexibel = Boolean(koperVoorkeuren?.kenmerkenFlexibel);

  console.log(
    // BUGFIX (diagnose-sessie "het klopt allemaal niet"): deze regel liet
    // altijd "scrape.do" zien zodra SCRAPEDO_TOKEN gezet was, ook nadat
    // Bright Data er als voorkeursoptie bij kwam (fetchMetTimeout kiest
    // Bright Data > Scrape.do > direct) -- de log klopte dus niet meer met
    // wat er echt gebeurde, wat verder diagnosticeren onnodig lastig maakte.
    `[fundaFeed] modus=${FUNDA_FEED_MODE} proxy=${
      BRIGHTDATA_API_TOKEN && BRIGHTDATA_ZONE
        ? "bright-data"
        : SCRAPEDO_TOKEN
          ? "scrape.do"
          : "geen (directe fetch, wordt vermoedelijk geblokkeerd vanaf Vercel)"
    } locatie=${locatie.plaatsSlug}${locatie.wijkSlug ? "/" + locatie.wijkSlug : ""}${
      budgetFlexibel || kenmerkenFlexibel
        ? ` flexibel=${[budgetFlexibel && "budget", kenmerkenFlexibel && "kenmerken"].filter(Boolean).join("+")}`
        : ""
    }`
  );

  // BUGFIX: "budget verlaagd, maar oude/te dure resultaten bleven ertussen
  // staan" bleek deels ook hier te zitten -- Funda's eigen price-URL-param
  // vertrouwen we niet blindelings (zie eerdere ontdekking dat selected_area
  // ook al eens stilzwijgend werd genegeerd). Daarom hard nafilteren op
  // zowel budgetMin als budgetMax, voor zowel mock- als live-modus, ongeacht
  // wat de bron zelf al deed -- een woning buiten budget hoort hier nooit
  // uit te komen. BUGFIX (diagnose-sessie "budget klopt niet"): budgetMin
  // ontbrak hier eerder volledig, zowel in de Funda-URL (zie bouwZoekUrl)
  // als in deze nafiltering -- dat was de directe oorzaak van "ik kies
  // 300-500k en krijg een woning van 289".
  //
  // MATCHING-MODEL: bij budgetFlexibel wordt dezelfde marge (10%,
  // BUDGET_FLEXIBEL_MARGE) toegepast als in de Funda-URL zelf (zie
  // bouwZoekUrl) -- anders zou een net-boven-budget-woning wel door Funda's
  // eigen filter komen, maar hier alsnog stilzwijgend worden weggegooid.
  // berekenMatchScore() in lib/services/matchScore.ts telt de daadwerkelijke
  // overschrijding later als strafpunten mee, dus dit is geen vrijbrief --
  // gewoon niet meer een harde uitsluiting.
  const budgetMaxMetMarge = budgetMax && budgetMax > 0 && budgetFlexibel ? Math.round(budgetMax * (1 + BUDGET_FLEXIBEL_MARGE)) : budgetMax;
  const bijBudget = (item: FundaFeedItem): boolean => {
    if (item.prijs == null) return true;
    if (budgetMin && budgetMin > 0 && item.prijs < budgetMin) return false;
    if (budgetMaxMetMarge && budgetMaxMetMarge > 0 && item.prijs > budgetMaxMetMarge) return false;
    return true;
  };

  if (FUNDA_FEED_MODE !== "live") {
    return { items: MOCK_ITEMS.filter(bijBudget).slice(0, limiet), fout: false };
  }

  // Paginering (matching-model): LIVE GEVERIFIEERD dat Funda's `&page=2`,
  // `&page=3` werkt en daadwerkelijk nieuwe, andere woning-URL's teruggeeft
  // via hetzelfde ld+json ItemList-blok als pagina 1 (zie bouwZoekUrl) --
  // nodig om uit een grotere pool te kunnen kiezen dan de ±15 resultaten
  // van pagina 1 alleen. Elke pagina kost 1 proxy-verzoek ongeacht hoeveel
  // links daarna al bekend blijken (dat wordt pas ná dit blok bepaald) --
  // MAX_PAGINAS is dus een bewuste, harde kostengrens.
  //
  // BUGFIX (klacht "Funda vindt 196 woningen, wij maar 25"): stond op 3,
  // wat bij Funda's ~15 resultaten/pagina neerkwam op een harde grens van
  // ±45 ruwe links, ongeacht hoe groot de daadwerkelijke markt in die wijk
  // is. Opgehoogd naar 8 (±120 ruwe links) zodat de aanroeper (via een
  // grotere `limiet`, zie matches-verversen/route.ts en
  // cron/matches-controleren/route.ts) een substantieel groter deel van de
  // markt kan laten scannen vóórdat het scoremodel de beste selectie maakt
  // -- scannen (dit getal) is bewust losgekoppeld van tonen
  // (MAX_ZICHTBARE_MATCHEN in types/b2b.ts, toegepast via kapMatchenOpMax
  // op score). Nog steeds geen garantie dat ALLE beschikbare woningen
  // gezien worden bij een echt grote markt (196 zou zelf al 196
  // detailpagina-proxyverzoeken kosten in één refresh) -- zie VOORTGANG.md
  // voor een efficiëntere vervolgstap (kenmerken al van de zoekpagina zelf
  // aflezen i.p.v. altijd een detailpagina nodig te hebben).
  const MAX_PAGINAS = 8;
  const links: string[] = [];
  let paginasOpgehaald = 0;
  // BUGFIX (klacht "Kralingen Crooswijk geeft nog steeds 0 matches zonder
  // extra filter" -- de wijk-slug zelf bleek inmiddels correct, live
  // geverifieerd; de daadwerkelijke oorzaak stond in de productielogs: de
  // Bright Data-zoekaanvraag timede één keer uit (AbortError, VOORDAT er
  // ook maar een HTTP-status binnenkwam). Zo'n mislukte aanvraag leverde
  // hierdoor exact hetzelfde resultaat op als een oprechte "0 woningen
  // voldoen" -- voor de aanroeper (en dus de makelaar) niet te
  // onderscheiden. `heeftFout` maakt dat nu expliciet, maar ALLEEN als er
  // aan het einde nog niets bruikbaars is gevonden -- faalt een latere
  // pagina nadat eerdere pagina's al links opleverden, dan is dat gewoon
  // "klaar met pagineren", geen fout.
  let heeftFout = false;

  for (let pagina = 1; pagina <= MAX_PAGINAS && links.length < limiet; pagina++) {
    const zoekUrl = bouwZoekUrl(locatie, budgetMin, budgetMax, kenmerken, pagina, { budgetFlexibel, kenmerkenFlexibel });
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
          // Waarschijnlijkste oorzaak van 0 links bij een 200-status: ofwel
          // een oprechte 0-resultaten-pagina (geen ld+json meer aanwezig,
          // zie extractDetailLinks), ofwel een bot-detectiepagina i.p.v. de
          // echte zoekresultaten -- de eerste paar honderd tekens (zonder
          // scripts/styles) laten meestal meteen zien welke van de twee het
          // is (bv. "Even geduld", "verify you are human", "Access Denied",
          // een cookie-muur, etc.).
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
    const resultaten = await Promise.all(nieuweLinks.map((url) => haalListingDetails(url, kenmerken, kenmerkenFlexibel)));
    const afgekeurd = resultaten.filter((item) => item === null).length;
    if (afgekeurd > 0) {
      console.log(`[fundaFeed] LIVE ${afgekeurd}/${nieuweLinks.length} link(s) afgekeurd door lokale kenmerken-verificatie of prijs`);
    }
    return { items: resultaten.filter((item): item is FundaFeedItem => item !== null).filter(bijBudget), fout: false };
  } catch (err) {
    console.error("[fundaFeed] detailpagina's ophalen/parsen mislukt:", err);
    return { items: [], fout: true };
  }
}
