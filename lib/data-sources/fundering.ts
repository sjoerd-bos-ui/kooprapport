import type { AddressMeta, FunderingData, FunderingsRisicoNiveau } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { withResilience } from "@/lib/adapters/withResilience";
import { resolveBuurtcode } from "@/lib/services/buurtcodeLookup";

// -----------------------------------------------------------------------------
// Funderingsrisico — een VOORZICHTIGE INDICATIE, geen funderingsonderzoek en
// geen harde conclusie (zie ook de toelichting bij FunderingData in
// types/report.ts).
//
// Twee bronnen, gecombineerd:
//
// 1) Het bevestigde BAG-bouwjaar (building.data.bouwjaar) van DEZE woning —
//    na ca. 1970 is funderen op beton(palen) standaard, wat het bekende
//    risico op houten-paalfunderingsproblematiek sterk verlaagt.
//
// 2) De officiële, publieke KCAF/RVO-dataset "Indicatieve aandachtsgebieden
//    funderingsproblematiek" (via PDOK, gratis en zonder sleutel), die per
//    postcodegebied (pc6) een eigen classificatie publiceert op basis van de
//    daadwerkelijke bodemgesteldheid: "Kwetsbaar gebied" (slappe, minder
//    draagkrachtige bodem — veen/rivierklei), "Niet kwetsbaar gebied"
//    (bv. hogere zandgronden) of "Stedelijk gebied" (bodemindeling niet goed
//    te maken door bebouwingsdichtheid — dus onbekend, niet "veilig").
//    Bron: https://www.pdok.nl/introductie/-/article/indicatieve-aandachtsgebieden-funderingsproblematiek
//    (RVO/KCAF, publiek domein).
//
// Dit blijft uitdrukkelijk GEEN grondwater- of bouwtechnische inspectiedata
// over dit specifieke pand — beide bronnen zijn zelf ook al indicatief
// (de PDOK-dataset toont dat expliciet in haar eigen omschrijving: "doet
// geen uitspraken over de specifieke staat van funderingen in specifieke
// gebieden"). Vandaar de behoedzame formulering ("kan wijzen op", "mogelijk")
// en de expliciete disclaimer in de UI. Zonder bevestigd bouwjaar is er geen
// basis: dan is niveau bewust null, geen gok.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "fundering";
const SOURCE_LABEL = "Funderingsrisico-indicatie (bouwjaar + KCAF/RVO bodemgesteldheid)";

const PDOK_AANDACHTSGEBIED_BASE =
  "https://api.pdok.nl/rvo/indicatieve-aandachtsgebieden-funderingsproblematiek/ogc/v1/collections/indgebfunderingsproblematiek/items";

type BodemClassificatie = "kwetsbaar" | "niet-kwetsbaar" | "stedelijk" | "onbekend";

interface AandachtsgebiedFeature {
  properties?: {
    legenda?: string; // bv. "Kwetsbaar gebied - 80-100 %"
    fgr?: string; // fysisch-geografische regio, bv. "Veenweidegebied", "Hogere Zandgronden"
    percvoor1970?: number; // % panden (BAG) in dit postcodegebied gebouwd voor 1970
    gemeente?: string;
  };
}

interface AandachtsgebiedResult {
  classificatie: BodemClassificatie;
  bodemtype: string | null; // fgr, alleen betekenisvol als classificatie niet "stedelijk"/"onbekend" is
  percentageVoor1970Postcode: number | null;
}

// "Kwetsbaar gebied - 80-100 %" -> "kwetsbaar". Leest bewust alleen het
// eerste woord-paar vóór het streepje; de KCAF-dataset kent precies drie
// varianten hiervan (zie collectie-omschrijving/voorbeelddata), plus een
// zeldzame "Niet indeelbaar" (dan: onbekend).
function parseClassificatie(legenda: string | undefined): BodemClassificatie {
  if (!legenda) return "onbekend";
  const tekst = legenda.toLowerCase();
  if (tekst.startsWith("kwetsbaar")) return "kwetsbaar";
  if (tekst.startsWith("niet kwetsbaar")) return "niet-kwetsbaar";
  if (tekst.startsWith("stedelijk")) return "stedelijk";
  return "onbekend";
}

// Bevraagt de officiële KCAF/RVO-kaart rechtstreeks op postcode (pc6) — geen
// coördinaten- of buurtcode-opzoeking nodig, dus werkt ook zonder
// locatieserverId. Geeft null terug bij elke fout of als het postcodegebied
// niet in de dataset voorkomt (nette fallback, geen gok) — nooit een throw.
async function fetchAandachtsgebied(postcode: string): Promise<AandachtsgebiedResult | null> {
  try {
    const url = `${PDOK_AANDACHTSGEBIED_BASE}?f=json&limit=1&pc6=${encodeURIComponent(postcode)}`;
    const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
    if (!res.ok) return null;

    const body: { features?: AandachtsgebiedFeature[] } = await res.json();
    const feature = body.features?.[0];
    const props = feature?.properties;
    if (!props) return null;

    return {
      classificatie: parseClassificatie(props.legenda),
      bodemtype: props.fgr && props.fgr !== "Niet indeelbaar" ? props.fgr : null,
      percentageVoor1970Postcode: props.percvoor1970 != null ? Math.round(props.percvoor1970) : null,
    };
  } catch {
    return null;
  }
}

// Combineert beide signalen tot één voorzichtig niveau. Bouwjaar >= 1970
// weegt zwaar (beton-fundering is dan standaard) — ongeacht bodem. Bij een
// ouder bouwjaar geeft de officiële bodemclassificatie de doorslag; is die
// onbekend (geen postcode-match, of "Stedelijk gebied" waar KCAF zelf de
// bodem niet kan indelen), dan valt het terug op de oorspronkelijke
// bouwjaar-only vuistregel — nooit "laag" gokken bij ontbrekende bodemdata.
function bepaalNiveau(bouwjaar: number, classificatie: BodemClassificatie): FunderingsRisicoNiveau {
  if (bouwjaar >= 1970) return "laag";
  if (classificatie === "niet-kwetsbaar") return "laag";
  if (classificatie === "kwetsbaar") return "hoog";
  if (classificatie === "stedelijk") return "midden";
  // classificatie === "onbekend": geen officiële bodemdata voor dit
  // postcodegebied gevonden — terugvallen op bouwjaar alleen.
  return bouwjaar < 1945 ? "hoog" : "midden";
}

function buildLabel(niveau: FunderingsRisicoNiveau): string {
  switch (niveau) {
    case "laag":
      // Komma i.p.v. punt: dit label wordt elders (samenvatting.ts) volledig
      // lowercase ingevoegd in "Funderingsrisico: ${label}." — een punt
      // middenin zou daar als een afgebroken, verkeerd-hoofdlettergebruikte
      // tweede zin lezen. Een komma houdt het één doorlopende zin.
      return "Laag, we zien geen duidelijke signalen van funderingsrisico.";
    case "midden":
      return "Midden, extra aandacht is hier wel verstandig.";
    case "hoog":
      return "Hoog, een funderingsonderzoek is het overwegen waard.";
  }
}

// Toon: korte, actieve zinnen ("we kijken naar...", "daarom..."), geen
// juridisch/formeel "Deze indicatie is gebaseerd op..." meer — zelfde feiten
// en dezelfde vertakking per niveau/classificatie als voorheen, alleen
// leesbaarder en menselijker geformuleerd (Mavo-niveau).
function buildToelichting(
  niveau: FunderingsRisicoNiveau,
  bouwjaar: number,
  classificatie: BodemClassificatie
): string {
  if (niveau === "laag") {
    if (bouwjaar >= 1970) {
      return `We kijken naar het bouwjaar (${bouwjaar}) en de officiële bodemclassificatie van het KCAF/RVO. Dit huis is gebouwd ná 1970, en vanaf toen werd bouwen op betonpalen de standaard. Dat verkleint het risico op de bekende problemen met houten paalfunderingen flink.`;
    }
    // Bewust NIET het bouwjaar-argument gebruiken als reden voor "laag": bij
    // een pre-1970 bouwjaar is uitsluitend de bodemclassificatie doorslaggevend.
    return `We kijken naar het bouwjaar (${bouwjaar}) en de officiële bodemclassificatie van het KCAF/RVO. Dit huis is van vóór 1970, maar de bodem hier geldt niet als kwetsbaar voor de bekende problemen met houten paalfunderingen. Daarom valt het risico toch laag uit.`;
  }
  if (niveau === "midden") {
    if (classificatie === "stedelijk") {
      return `We kijken naar het bouwjaar (${bouwjaar}). Voor dit gebied kan de officiële KCAF/RVO-kaart de bodem niet goed indelen. Dat komt vaker voor in dichtbebouwde buurten, maar levert dus ook geen duidelijk signaal op. Extra aandacht is dan verstandig, zeker als je twijfelt over de fundering.`;
    }
    return `We kijken naar het bouwjaar (${bouwjaar}). Voor dit postcodegebied heeft de officiële KCAF/RVO-kaart geen bodemgegevens, dus hebben we geen extra signaal. Extra aandacht is dan verstandig, zeker als je twijfelt over de fundering.`;
  }
  // niveau === "hoog" — twee heel verschillende onderbouwingen mogelijk (zie
  // bepaalNiveau): óf de bodem is écht als "kwetsbaar" geclassificeerd, óf er
  // is helemaal GEEN bodemdata (classificatie "onbekend") en is "hoog" puur
  // een voorzichtige aanname op basis van een bouwjaar vóór 1945. Niet door
  // elkaar halen: bij "onbekend" mag hier nooit gesuggereerd worden dat de
  // bodem écht als kwetsbaar is geclassificeerd (zie eerdere bugfix).
  if (classificatie === "kwetsbaar") {
    return `We kijken naar het bouwjaar (${bouwjaar}) en de officiële bodemclassificatie van het KCAF/RVO. In deze periode werden vaak houten paalfunderingen gebruikt, en de bodem hier geldt ook als kwetsbaar voor dat type fundering. Daarom valt het risico hoger uit.`;
  }
  return `We kijken naar het bouwjaar (${bouwjaar}). Dat valt vóór 1945, de periode waarin veel huizen op houten palen werden gebouwd. Voor dit gebied hebben we geen bodemgegevens, dus houden we voor de zekerheid het hogere risiconiveau aan.`;
}

// Bewust NIET het bodemtype en het percentage herhalen die al als losse,
// verifieerbare velden getoond worden (zie FunderingData.bodemclassificatie /
// .percentageVoor1970Postcode) — hier alleen de interpretatie: wat de
// classificatie betekent en wat je ermee kunt.
// Geeft de duiding nu als drie losse, korte onderdelen terug i.p.v. één
// samengevoegde alinea — zelfde inhoud, alleen zo dat de UI het als aparte
// kaartjes kan tonen ("Wat het betekent" / "Wat we niet weten" / "Advies")
// in plaats van één lange tekst. buildDuidingTekst() plakt ze voor bv. de
// PDF-export nog wel samen tot één string.
function buildDuidingOnderdelen(
  classificatie: BodemClassificatie,
  gemeentenaam: string | null
): { kern: string; caveat: string; advies: string } {
  const regio = gemeentenaam ? ` in ${gemeentenaam}` : "";
  const kern =
    classificatie === "kwetsbaar"
      ? 'De bodem in dit postcodegebied is door het KCAF/RVO geclassificeerd als "kwetsbaar gebied". Dat betekent een minder draagkrachtige bodem, met een grotere kans op problemen bij houten paalfunderingen.'
      : classificatie === "niet-kwetsbaar"
        ? 'De bodem in dit postcodegebied is door het KCAF/RVO geclassificeerd als "niet kwetsbaar gebied", wat het risico op de bekende houten-paalfunderingsproblematiek verlaagt.'
        : classificatie === "stedelijk"
          ? "Voor dit postcodegebied kon het KCAF/RVO de bodemgesteldheid niet goed indelen (dichte stedelijke bebouwing). Dat betekent onbekend, niet per se veilig."
          : "Voor dit postcodegebied is geen officiële bodemclassificatie beschikbaar in de KCAF/RVO-kaart; deze indicatie steunt dan uitsluitend op het bouwjaar.";
  const caveat =
    "Niemand kan het werkelijke funderingstype of de actuele grondwaterstand ter plekke met zekerheid vaststellen voor dit specifieke pand.";
  const advies = `Bij twijfel${regio} is een funderingsonderzoek door een erkend bureau de enige harde manier om dit vast te stellen. Sommige gemeenten met bekende funderingsproblematiek (o.a. Gouda, Schiedam, Zaanstad, Dordrecht) hebben ook een funderingsloket met lokale kaarten.`;

  return { kern, caveat, advies };
}

// Altijd-betekenisvolle omschrijving voor het "bodemgesteldheid"-veld in de
// UI. BEWUST NIET "Onbekend" voor "stedelijk": in dichtbebouwde postcode-
// gebieden (verreweg de meeste Nederlandse adressen!) kan de KCAF/RVO-kaart
// zelf de bodem niet indelen — dat is een geldige, betekenisvolle uitkomst
// van de bron, geen ontbrekend gegeven aan onze kant. "Onbekend" zou hier
// ten onrechte een datafout suggereren. Alleen bij een postcode die
// helemaal niet in de kaart voorkomt (classificatie "onbekend") is er
// werkelijk niets om te tonen — dan blijft dit veld null en toont de UI zijn
// eigen "geen data"-melding.
function buildBodemclassificatieLabel(
  classificatie: BodemClassificatie,
  bodemtype: string | null
): string | null {
  if (classificatie === "kwetsbaar") return `Kwetsbaar gebied${bodemtype ? ` (${bodemtype})` : ""}`;
  if (classificatie === "niet-kwetsbaar") return `Niet kwetsbaar gebied${bodemtype ? ` (${bodemtype})` : ""}`;
  if (classificatie === "stedelijk") return "Stedelijk gebied, bodem niet te bepalen";
  return null;
}

// Classificatie-specifieke uitleg bij bodemclassificatie — vooral belangrijk
// bij "stedelijk": zonder deze zin oogt "bodem niet te bepalen" als een
// datafout, terwijl het een geldige, betekenisvolle uitkomst van de
// KCAF/RVO-kaart is (dichte stedelijke bebouwing kan niet worden ingedeeld).
// Altijd in de pas met buildBodemclassificatieLabel: beide null bij
// "onbekend", beide gezet in de andere drie gevallen.
function buildBodemclassificatieUitleg(classificatie: BodemClassificatie): string | null {
  if (classificatie === "kwetsbaar") {
    return "Deze bodem geldt als minder draagkrachtig. Dat geeft een grotere kans op problemen bij houten paalfunderingen.";
  }
  if (classificatie === "niet-kwetsbaar") {
    return "Deze bodem geldt niet als kwetsbaar voor de bekende houten-paalfunderingsproblematiek.";
  }
  if (classificatie === "stedelijk") {
    return "In dichtbebouwde gebieden kan de KCAF/RVO-kaart de bodem niet indelen. Dat is een geldige uitkomst, geen ontbrekend gegeven.";
  }
  return null;
}

async function fetchLive(address: AddressMeta, bouwjaar: number | null | undefined): Promise<FunderingData> {
  if (bouwjaar == null) {
    // Eerlijke fallback: geen bevestigd bouwjaar, dus geen basis voor een
    // indicatie — geen gok naar "gemiddeld" niveau.
    return {
      niveau: null,
      label: null,
      toelichting: null,
      duiding: null,
      duidingKern: null,
      duidingCaveat: null,
      duidingAdvies: null,
      bouwjaarGebruikt: null,
      bodemclassificatie: null,
      bodemclassificatieUitleg: null,
      percentageVoor1970Postcode: null,
    };
  }

  // Beide opzoekingen zijn onafhankelijk en falen elk stil (catch -> null):
  // de gemeentenaam is puur voor lokale context in de duiding, en zonder
  // bodemclassificatie valt bepaalNiveau() terug op bouwjaar alleen.
  const [aandachtsgebied, buurt] = await Promise.all([
    fetchAandachtsgebied(address.postcode).catch(() => null),
    resolveBuurtcode(address).catch(() => null),
  ]);

  const classificatie = aandachtsgebied?.classificatie ?? "onbekend";
  const niveau = bepaalNiveau(bouwjaar, classificatie);
  const { kern, caveat, advies } = buildDuidingOnderdelen(classificatie, buurt?.gemeentenaam ?? null);

  return {
    niveau,
    label: buildLabel(niveau),
    toelichting: buildToelichting(niveau, bouwjaar, classificatie),
    duiding: `${kern} ${caveat} ${advies}`,
    duidingKern: kern,
    duidingCaveat: caveat,
    duidingAdvies: advies,
    bouwjaarGebruikt: bouwjaar,
    bodemclassificatie: buildBodemclassificatieLabel(classificatie, aandachtsgebied?.bodemtype ?? null),
    bodemclassificatieUitleg: buildBodemclassificatieUitleg(classificatie),
    percentageVoor1970Postcode: aandachtsgebied?.percentageVoor1970Postcode ?? null,
  };
}

function missingFields(data: FunderingData): string[] {
  return data.niveau == null ? ["niveau"] : [];
}

function isEmpty(data: FunderingData): boolean {
  return data.niveau == null;
}

// Publiek adapter-entrypunt. Altijd "live": beide onderliggende bronnen
// (PDOK-kaart en de al-bestaande PDOK-opzoeking voor de gemeentenaam) zijn
// gratis en zonder sleutel, dus geen aparte mock-modus nodig — bij een
// ontbrekend bouwjaar geeft withResilience een eerlijke "niet
// beschikbaar"-status terug, nooit een gegokt niveau.
//
// bouwjaar wordt bewust als apart argument meegegeven i.p.v. hier zelf
// (opnieuw) opgehaald: building.data.bouwjaar is al bevestigd door de
// BAG-adapter (zie reportService.ts), dus hergebruiken i.p.v. dupliceren.
export async function fetchFundering(
  address: AddressMeta,
  bouwjaar: number | null | undefined
): Promise<SourceResult<FunderingData>> {
  return withResilience(() => fetchLive(address, bouwjaar), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "confirmed",
    timeoutMs: 8000,
    isEmpty,
    missingFields,
  });
}
