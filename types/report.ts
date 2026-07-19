import type { SourceResult } from "@/types/dataSource";

// Drie afzonderlijke velden, zoals BAG ze ook modelleert: huisnummer (numeriek,
// verplicht), huisletter (één letter direct na het nummer, bv. de "A" in
// "12A") en huisnummertoevoeging (vrije code, bv. de "2" in "12-2" of "bis").
// Door dit niet tot één los "toevoeging"-veld te versimpelen, kan de matching
// tegen BAG-objecten exact zijn i.p.v. giswerk.
export interface AddressMeta {
  straat: string;
  huisnummer: string;
  huisletter?: string;
  toevoeging?: string;
  postcode: string;
  plaats: string;
  slug: string;
  label: string;
  // Alleen aanwezig bij een adres dat via de live PDOK Locatieserver is
  // gekozen (niet bij de lokale MOCK_ADDRESSES-fallback). locatieserverId is
  // het "id" van de suggestie zelf (bv. "adr-xxxx"), altijd aanwezig in een
  // suggest-respons — de betrouwbare route om, via de lookup-service,
  // adresseerbaarObjectId (het BAG-object-ID) op te zoeken voor het bouwjaar
  // (zie lib/services/bouwjaarLookup.ts). adresseerbaarObjectId zelf komt
  // soms al direct mee met de suggestie, als snelkoppeling.
  locatieserverId?: string;
  adresseerbaarObjectId?: string;
}

// -----------------------------------------------------------------------------
// Canonieke interne datastructuur van het rapport.
//
// Elke databron-adapter (lib/data-sources/*.ts) mapt zijn eigen, afwijkende
// brondata naar dit ene model. Componenten kennen alleen dit model — nooit
// een BagApiResponse, EpOnlineApiResponse of AltumReferenceApiResponse.
//
// Indeling: building (BAG/Kadaster/PDOK), energy (EP-Online), market
// (modelgeschatte woningwaarde van DEZE woning, Altum AI AVM), nearbySales
// (Altum AI Woningreferentie API, bron: Kadaster — transacties in de buurt).
//
// "market" en "nearbySales" zijn bewust twee aparte domeinen, geen
// samengevoegde "marktanalyse": de modelschatting van één woning is geen
// wijk-marktindex, en verkopen in de buurt zeggen op zichzelf niets over de
// modelwaarde van dit adres. Waar de twee elkaar wél iets te vertellen hebben
// (bv. "hoe verhoudt de geschatte waarde zich tot recente buurtverkopen"),
// gebeurt dat expliciet en alleen als beide daadwerkelijk data hebben — zie
// lib/services/insights.ts.
// -----------------------------------------------------------------------------

export interface BuildingData {
  bouwjaar?: number;
  gebruiksdoel?: string;
  woningtype?: string; // = het officiële BAG-gebruiksdoel (bv. "Woonfunctie"), niet een afgeleide classificatie
  oppervlakteM2?: number; // = officiële BAG-gebruiksoppervlakte van het verblijfsobject, geen schatting
  inhoudM3?: number; // niet aanwezig in BAG; alleen indicatief, en alleen gezet als oppervlakteM2 bevestigd is
  aantalVerblijfsobjecten?: number; // vereist aparte pand->verblijfsobjecten-relatie
  pandStatus?: string;
}

export interface EnergyData {
  klasse?: string; // alleen gezet bij een bevestigde, geldige EP-Online-registratie — nooit geschat
  registratiedatum?: string;
  geldigTot?: string;
  isolatie?: {
    dak: string;
    gevel: string;
    vloer: string;
    beglazing: string;
  }; // ontbreekt regelmatig in de publieke EP-Online-dataset
}

// Modelgeschatte marktwaarde van uitsluitend DEZE woning (Altum AI Woningwaarde
// API / AVM — Automated Valuation Model), géén WOZ-waarde, géén officiële
// taxatie en géén bevestigde verkoopprijs. Er bestaat geen gratis/officiële
// WOZ-API (zie git-geschiedenis van dit bestand voor de eerdere WOZ-poging) en
// geen gratis bron voor de laatste verkoopprijs (Kadaster Koopsommenregister
// is uitsluitend een betaald, handmatig product) — Altum's AVM is de bron die
// hiervoor is gekozen: een verifieerbaar, herleidbaar model met een expliciete
// bandbreedte/betrouwbaarheidsmaat, nooit als hard feit gepresenteerd.
export interface MarketData {
  geschatteWaarde: number; // Output.PriceEstimation
  bandbreedteMin?: number; // ondergrens van Output.Confidence, indien te ontleden
  bandbreedteMax?: number; // bovengrens van Output.Confidence, indien te ontleden
  betrouwbaarheidstekst?: string; // ruwe toelichting van Altum, bv. "90% Confidence Interval is 327363-429880."
  waarderingsdatum: string; // Output.ValuationDate, omgezet naar ISO (YYYY-MM-DD)
  // Output.Rooms — kamertal zoals Altum's eigen AVM-brondata dit kent. Dit
  // veld kwam al binnen bij elke woningwaarde-aanroep maar werd tot nu toe
  // genegeerd. BEWUST NIET een BAG-geregistreerd, officieel bevestigd gegeven
  // (zoals building.oppervlakteM2) — dus in de UI met een duidelijke
  // bronvermelding tonen, niet los tussen de "officieel bevestigd"-BAG-velden.
  rooms?: number;
  // Output.Volume — Altum's eigen inhoudsschatting (m³), gebaseerd op hun
  // AVM-model. Vervangt de oude, zelf-berekende "inhoudM3"-vuistregel op
  // BuildingData (die puur oppervlakte x aanname was) door een echte
  // modelwaarde uit een bron die dit specifiek schat.
  volume?: number;
}

// Vorm zoals de bron ("buurtverkopen") die aanlevert — nog niet vergeleken
// met dit specifieke adres. Die vergelijking (vergelijkbaar/deltaPct) is
// geen brongegeven maar een berekening t.o.v. de eigen woning, en gebeurt
// pas ná het ophalen in de enrichmentstap (lib/services/insights.ts) — een
// externe bron kent onze woning niet.
export interface NearbySaleRaw {
  adres: string;
  verkoopdatum: string;
  verkoopprijs: number;
  oppervlakteM2: number;
  prijsPerM2: number;
  // Altum AI's Woningreferentie API levert de transactieprijs bewust als
  // bandbreedte, geen exact bedrag (privacy/licentie) — verkoopprijs hierboven
  // is dan het midden van die bandbreedte. Zijn min/max bekend, dan tonen we
  // die erbij i.p.v. het gemiddelde als hard feit te presenteren.
  verkoopprijsMin?: number;
  verkoopprijsMax?: number;
}

export interface NearbySale extends NearbySaleRaw {
  vergelijkbaar: boolean; // vergelijkbare oppervlakte t.o.v. deze woning (bekend? anders false)
  deltaPct?: number; // % verschil t.o.v. de prijs/m² van deze woning — alleen als die bekend is
}

export interface NearbySalesDataRaw {
  aantalLaatste12Maanden: number;
  gemiddeldePrijsPerM2?: number; // niet te berekenen zonder verkopen
  verkopen: NearbySaleRaw[];
  // Standaard zoeken we alleen binnen de eigen buurt en de laatste 12
  // maanden. Zijn er dan te weinig vergelijkbare verkopen (< 5), dan
  // verruimen we automatisch (grotere omgeving en/of langere periode, tot
  // max. 5 jaar terug) — zie fetchPremiumOnUnlock() in reportService.ts.
  // zoekvensterMaanden is dan het daadwerkelijk gebruikte aantal maanden
  // (niet meer noodzakelijk 12), verruimd geeft aan of dat is gebeurd, zodat
  // de UI dit eerlijk kan melden i.p.v. stilzwijgend "12 maanden" te blijven
  // beweren terwijl er breder is gezocht.
  zoekvensterMaanden: number;
  verruimd: boolean;
}

export interface NearbySalesData {
  aantalLaatste12Maanden: number;
  gemiddeldePrijsPerM2?: number;
  verkopen: NearbySale[];
  zoekvensterMaanden: number;
  verruimd: boolean;
}

// Buurtprofiel / leefomgeving — CBS (StatLine) en de politie-wijkcijfers als
// leidende bron, per buurt. Bewust GEEN losse cijferberg: elke categorie is
// één korte, feitelijke duidingstekst (1-2 zinnen), samengesteld uit de
// onderliggende CBS-cijfers, nooit marketingtaal en nooit een gok. Ontbreekt
// een cijfer, dan wordt die zin simpelweg weggelaten i.p.v. "onbekend"
// halverwege een zin te proppen; blijft een hele categorie zonder bruikbaar
// cijfer over, dan is het veld null en toont de UI de gebruikelijke "niet
// beschikbaar"-melding (zie ReportSection/DataUnavailableNotice).
//
// Indeling volgt de gevraagde gratis/premium-knip:
//   - veiligheid + sociaal + samenvatting: gratis
//   - fysiek + voorzieningen + duiding: premium
export interface BuurtprofielData {
  buurtnaam: string | null;
  gemeentenaam: string | null;
  // Jaar waarop de gebruikte CBS-cijfers betrekking hebben, voor transparantie.
  peiljaar: string | null;
  // Eén korte samenvattende zin (gratis).
  samenvatting: string | null;
  // Elk veld heeft naast de samenvattende tekst ook de losse cijfers erachter
  // — zelfde bron, alleen ook apart doorgegeven zodat de UI ze als stat-kaart
  // kan tonen i.p.v. alleen als zin in lopende tekst (nooit een schatting,
  // gewoon dezelfde CBS/politie-cijfers in een ander formaat).
  veiligheid: {
    tekst: string | null; // gratis — CBS/politie geregistreerde misdrijven per 1.000 inwoners
    misdrijvenPer1000: number | null;
    aantalMisdrijven: number | null;
  };
  sociaal: {
    tekst: string | null; // gratis — CBS kerncijfers bevolking/huishoudens
    inwoners: number | null;
    huishoudens: number | null;
    gemiddeldeHuishoudensgrootte: number | null;
    percentageEenpersoons: number | null;
    // % huishoudens met kinderen (CBS HuishoudensMetKinderen_32) — deze kolom
    // werd al opgehaald (stond al in de $select van buurtprofiel.ts) maar tot
    // nu toe nergens verwerkt; nu wel, zelfde berekening als percentageEenpersoons.
    percentageMetKinderen: number | null;
  };
  fysiek: {
    tekst: string | null; // premium — CBS kerncijfers bevolkingsdichtheid/woningvoorraad
    bevolkingsdichtheid: number | null; // inwoners per km²
    percentageEengezinswoning: number | null;
    percentageMeergezinswoning: number | null;
  };
  voorzieningen: {
    tekst: string | null; // premium — CBS nabijheid voorzieningen, gegroepeerd per thema
    // Generieke lijst i.p.v. losse velden per voorziening: welk CBS-veld bij
    // welke voorziening hoort staat in lib/data-sources/buurtprofiel.ts
    // (VOORZIENING_DEFINITIES) — een nieuwe voorziening toevoegen is daar één
    // regel, zonder dit type, de UI of de PDF stuk voor stuk aan te hoeven
    // passen. `thema` groepeert de UI/tekst (zie lib/utils/voorzieningenStijl.ts
    // voor de vaste volgorde/labels, gedeeld tussen app en PDF).
    items: VoorzieningAfstand[];
  };
  duiding: string | null; // premium — uitgebreidere synthese van bovenstaande
}

export type VoorzieningThema = "dagelijks" | "gezin" | "bereikbaarheid";

export interface VoorzieningAfstand {
  key: string; // stabiele identifier, bv. "huisarts" — voor icoon-/kleur-mapping in UI en PDF
  label: string; // bv. "Huisartsenpraktijk"
  thema: VoorzieningThema;
  afstandKm: number;
}

// Funderingsrisico — BEWUST alleen een voorzichtige INDICATIE, geen
// funderingsonderzoek en geen harde conclusie. Er bestaat geen publiek,
// verifieerbaar register van het werkelijke funderingstype per adres
// (gemeentelijke "funderingsloketten" bestaan, maar alleen lokaal en niet
// machine-bevraagbaar) — deze indicatie combineert daarom twee wél publieke,
// verifieerbare bronnen:
//   1) het bevestigde BAG-bouwjaar (building.data.bouwjaar);
//   2) de officiële KCAF/RVO-kaart "Indicatieve aandachtsgebieden
//      funderingsproblematiek" (via PDOK, gratis/zonder sleutel), die per
//      postcodegebied een bodemclassificatie publiceert (kwetsbaar/niet
//      kwetsbaar/stedelijk-onbekend) op basis van de daadwerkelijke
//      bodemgesteldheid.
// Zonder bekend bouwjaar is er geen basis, en is niveau bewust null (nette
// fallback, geen gok). Zie lib/data-sources/fundering.ts voor de precieze
// combinatielogica.
//
// Indeling volgt de gevraagde gratis/premium-knip:
//   - niveau + toelichting (wat betekent de score): gratis
//   - duiding + bodemtype/percentage (uitgebreidere, lokale context): premium
export type FunderingsRisicoNiveau = "laag" | "midden" | "hoog";

export interface FunderingData {
  niveau: FunderingsRisicoNiveau | null;
  // Korte, geruststellende/waarschuwende hoofdzin (gratis) — bv. "Laag —
  // geen sterke signalen van funderingsrisico."
  label: string | null;
  // Wat de score betekent en waarop hij is gebaseerd (gratis, kort).
  toelichting: string | null;
  // Uitgebreidere duiding + lokale/regionale context (premium). Zowel als
  // één samengevoegde tekst (duiding, voor bv. de PDF-export) als opgesplitst
  // in drie korte, los tonbare onderdelen — zelfde inhoud, alleen ook apart
  // beschikbaar zodat de UI het niet als één lange alinea hoeft te tonen.
  duiding: string | null;
  duidingKern: string | null; // wat de bodemclassificatie betekent
  duidingCaveat: string | null; // wat geen van beide bronnen met zekerheid vaststelt
  duidingAdvies: string | null; // concreet vervolgadvies bij twijfel
  // Bouwjaar dat aan de indicatie ten grondslag ligt, voor transparantie.
  bouwjaarGebruikt: number | null;
  // Volledige, altijd-betekenisvolle omschrijving van de officiële KCAF/RVO-
  // bodemclassificatie voor dit postcodegebied, premium — bv. "Kwetsbaar
  // gebied (Rivierengebied)" of, in dicht-stedelijke gebieden waar de kaart
  // de bodem zelf niet kan indelen, "Stedelijk gebied — bodem niet te
  // bepalen". BEWUST NIET simpelweg "Onbekend": dat zou een systeemfout
  // suggereren, terwijl "stedelijk, niet in te delen" zelf al een geldige,
  // betekenisvolle uitkomst van de KCAF/RVO-kaart is. Alleen null als er
  // voor dit postcodegebied helemaal geen data in de kaart zit.
  bodemclassificatie: string | null;
  // Korte, classificatie-specifieke uitleg bij bodemclassificatie — vooral
  // belangrijk bij "stedelijk": dat moet expliciet uitgelegd worden als een
  // geldige, betekenisvolle uitkomst en niet als ontbrekend gegeven. Altijd
  // gezet wanneer bodemclassificatie gezet is (en anders null).
  bodemclassificatieUitleg: string | null;
  // % panden (BAG) in dit postcodegebied gebouwd vóór 1970, premium context
  // — een buurtcijfer, geen uitspraak over dit specifieke pand.
  percentageVoor1970Postcode: number | null;
}

// Kavelgrootte (perceeloppervlakte) — officiële, geregistreerde Kadaster-
// waarde via PDOK Kadastrale Kaart (zie lib/data-sources/kavel.ts). Geen
// modelschatting: dit is dezelfde bron als het Kadaster zelf hanteert.
export interface KavelData {
  // Kadastrale grootte in m², altijd een geheel getal (zoals het Kadaster het
  // zelf registreert). Null als er geen (matchend) perceel gevonden is.
  oppervlakteM2: number | null;
  // "voorlopig" betekent dat de perceelgrens nog niet definitief is
  // vastgesteld en de maat dus nog kan wijzigen; "vastgesteld" is definitief.
  // Null als de status onbekend/niet meegegeven is.
  soortGrootte: "voorlopig" | "vastgesteld" | null;
  // Kadastrale aanduiding, bv. "Teteringen A 23" — puur ter transparantie/
  // verifieerbaarheid, niet actief gebruikt in de UI-tekst.
  kadastraleAanduiding: string | null;
}

// Bestemming/gebruiksfunctie van het perceel — via het bestemmingsplan- of
// omgevingsplan-register (zie lib/data-sources/bestemming.ts). Bewust GEEN
// vertaling van de juridische regels zelf (mag u een dakkapel bouwen, etc.):
// dat is dichte wetstekst per artikel, niet een los, betrouwbaar samen te
// vatten gegeven. Alleen de bestemmingsomschrijving zelf (bv. "Wonen") en de
// herkomst ervan.
export interface BestemmingData {
  // Eén of meer bestemmingsomschrijvingen die op dit punt van toepassing
  // zijn (een perceel kan onder meerdere vlakken vallen, bv. "Wonen" +
  // "Tuin"). Leeg als er geen (matchend) plan gevonden is.
  bestemmingen: string[];
  planNaam: string | null;
  planStatus: string | null; // bv. "vastgesteld", "onherroepelijk"
  planDatum: string | null; // ISO-datum
  bevoegdGezag: string | null; // bv. "gemeente Amsterdam"
  // Welk van de twee registers dit antwoord gaf — een gemeente draait op het
  // ene óf het andere systeem (zie de toelichting in bestemming.ts), nooit
  // allebei tegelijk voor hetzelfde adres. Null als geen van beide iets vond.
  bron: "bestemmingsplan" | "omgevingsplan" | null;
}

export type InsightToon = "positief" | "negatief" | "neutraal";

// Een inzicht wordt alleen gegenereerd als de onderliggende data er echt is —
// geen insight met een gegokte of halve onderbouwing. Zie buildInsights().
export interface Insight {
  key: string;
  label: string;
  tekst: string;
  toon: InsightToon;
}

export type DataCompleetheid = "volledig" | "grotendeels-compleet" | "beperkt";

export interface DataQualitySummary {
  compleetheid: DataCompleetheid;
  totaalBronnen: number;
  bevestigd: number;
  publiek: number;
  premium: number;
  mock: number;
  nietBeschikbaar: number;
  toelichting: string;
}

export interface PropertyCore {
  address: AddressMeta;
  titel: string; // bv. "Kerkstraat 12"
  ondertitel: string; // bv. "Tussenwoning · bouwjaar 1974 · label C" — alleen bekende velden
  // Precies adrespunt (WGS84) via de PDOK Locatieserver-lookup die ook al
  // voor buurtprofiel/fundering/kavel/bestemming wordt gebruikt — voor een
  // nauwkeurigere locatiekaart i.p.v. Google zelf de adrestekst te laten
  // geocoderen. Null als de opzoeking niet lukte; de kaart valt dan terug op
  // de adrestekst, precies zoals voorheen.
  lonLat: { lon: number; lat: number } | null;
}

export interface Report {
  core: PropertyCore;
  building: SourceResult<BuildingData>;
  energy: SourceResult<EnergyData>;
  market: SourceResult<MarketData>;
  nearbySales: SourceResult<NearbySalesData>;
  buurtprofiel: SourceResult<BuurtprofielData>;
  fundering: SourceResult<FunderingData>;
  kavel: SourceResult<KavelData>;
  bestemming: SourceResult<BestemmingData>;
  insights: Insight[];
  dataQuality: DataQualitySummary;
  gegenereerdOp: string;
}

export type ReportProgressStep =
  | "building"
  | "energy"
  | "market"
  | "nearbySales"
  | "buurtprofiel"
  | "fundering"
  | "kavel"
  | "bestemming"
  | "done";
