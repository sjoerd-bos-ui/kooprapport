import type { Report } from "@/types/report";
import { successResult, unavailableResult } from "@/types/dataSource";
import type { BestemmingData } from "@/types/report";
import { slugify } from "@/lib/utils/slug";

// -----------------------------------------------------------------------------
// Curatief, met de hand samengesteld "showcase"-rapport — uitsluitend bedoeld
// om op de homepage het premium PDF-rapport op zijn best te laten zien.
//
// v2 (28-07-2026): overgezet op de cijfers van een écht, live gegenereerd
// rapport (Amsterdam Rijnkanaalkade 1) i.p.v. de eerdere, volledig verzonnen
// "Prinsengracht 88". Elk veld hieronder is nu een zo getrouw mogelijke
// weergave van dat echte rapport — inclusief de plekken waar de live
// databronnen zelf niets teruggaven (geen bodemclassificatie, geen kamertal
// meer sinds Altum's Woningwaarde+ API dat veld heeft laten vallen) — juist
// zodat de showcase laat zien hoe het rapport er in de praktijk uitziet,
// inclusief die eerlijke "niet beschikbaar"-momenten, i.p.v. een kunstmatig
// perfect voorbeeld.
//
// Uitzondering: voorzieningen (zie buurtprofiel.voorzieningen hieronder) zijn
// hier WEL met fictieve, plausibele cijfers gevuld, terwijl het echte, live
// rapport voor dit adres daar geen CBS-nabijheidscijfers voor kreeg. Op
// uitdrukkelijk verzoek: dit is een voorbeeldrapport en moet zo compleet
// mogelijk laten zien wat een rapport te bieden heeft, ook voor de secties
// die toevallig voor dit ene echte adres leeg waren.
//
// Nog steeds GEEN live databron-aanroep vanuit dit bestand zelf (mode:
// "mock", status: "mock" op elke bron) — zelfde eerlijke labeling als de
// rest van de app al hanteert voor voorbeelddata. Dit voorkomt dat de
// showcase per ongeluk oogt als een rechtstreeks, opnieuw op te vragen
// live resultaat.
//
// Gebruikt door app/api/rapport/voorbeeld-pdf/route.ts en door
// components/VoorbeeldrapportSlider.tsx op de homepage.
// -----------------------------------------------------------------------------

const STRAAT = "Amsterdam Rijnkanaalkade";
const HUISNUMMER = "1";
const POSTCODE = "1019 VA";
const PLAATS = "Amsterdam";
const LABEL = `${STRAAT} ${HUISNUMMER}, ${PLAATS}`;

const OPPERVLAKTE_M2 = 154;
// Zelfde ±22%-marge als OPPERVLAKTE_TOLERANTIE in lib/services/insights.ts —
// bepaalt hieronder welke verkopen als "vergelijkbaar" gelden, geen los
// bedachte grens voor alleen deze showcase.
const TOLERANTIE = 0.22;
const MIN_VERGELIJKBAAR = OPPERVLAKTE_M2 * (1 - TOLERANTIE);
const MAX_VERGELIJKBAAR = OPPERVLAKTE_M2 * (1 + TOLERANTIE);

const GESCHATTE_WAARDE = 1264239;
const DEZE_WONING_PER_M2 = Math.round(GESCHATTE_WAARDE / OPPERVLAKTE_M2);

function maakVerkoop(
  adres: string,
  verkoopdatum: string,
  oppervlakteM2: number,
  prijsPerM2: number,
  extra?: { verkoopprijsMin: number; verkoopprijsMax: number }
) {
  const verkoopprijs = extra ? Math.round((extra.verkoopprijsMin + extra.verkoopprijsMax) / 2) : Math.round(oppervlakteM2 * prijsPerM2);
  return {
    adres,
    verkoopdatum,
    verkoopprijs,
    oppervlakteM2,
    prijsPerM2,
    verkoopprijsMin: extra?.verkoopprijsMin,
    verkoopprijsMax: extra?.verkoopprijsMax,
    vergelijkbaar: oppervlakteM2 >= MIN_VERGELIJKBAAR && oppervlakteM2 <= MAX_VERGELIJKBAAR,
    deltaPct: Math.round(((prijsPerM2 - DEZE_WONING_PER_M2) / DEZE_WONING_PER_M2) * 100),
  };
}

export const voorbeeldRapport: Report = {
  core: {
    address: {
      straat: STRAAT,
      huisnummer: HUISNUMMER,
      postcode: POSTCODE,
      plaats: PLAATS,
      slug: slugify(LABEL),
      label: LABEL,
    },
    titel: `${STRAAT} ${HUISNUMMER}`,
    // Zelfde opbouw als buildCore() in lib/services/insights.ts:
    // "{woningtype} · bouwjaar {jaar} · energielabel {klasse}".
    ondertitel: "Hoekwoning · bouwjaar 2021 · energielabel A+",
    // Illustratief punt nabij de Houthavens/Rijnkanaalkade, voor de "Kaart →"-link.
    lonLat: { lon: 4.8735, lat: 52.3887 },
  },

  building: successResult(
    "bag",
    "Kadaster BAG",
    "mock",
    "mock",
    {
      bouwjaar: 2021,
      gebruiksdoel: "Woonfunctie",
      woningtype: "Hoekwoning",
      oppervlakteM2: OPPERVLAKTE_M2,
      inhoudM3: 539,
      aantalVerblijfsobjecten: 1,
      pandStatus: "Pand in gebruik",
    }
  ),

  energy: successResult(
    "energielabel",
    "RVO / EP-Online",
    "mock",
    "mock",
    {
      klasse: "A+",
      registratiedatum: "2023-07-13",
      geldigTot: "2033-07-13",
      // Bewust weggelaten (undefined), niet "Onbekend" ingevuld: isolatie per
      // bouwdeel ontbreekt regelmatig in de publieke EP-Online-dataset — de
      // showcase laat hier expliciet de eerlijke fallbacktekst zien i.p.v.
      // verzonnen dak-/gevel-/vloer-/beglazingswaarden.
    }
  ),

  market: successResult(
    "market",
    "Geschatte woningwaarde (model)",
    "mock",
    "mock",
    {
      geschatteWaarde: GESCHATTE_WAARDE,
      bandbreedteMin: 1137815,
      bandbreedteMax: 1390662,
      betrouwbaarheidstekst: "90% Confidence Interval is 1137815-1390662.",
      waarderingsdatum: "2026-07-28",
      // rooms/volume bewust weggelaten (undefined): Altum's Woningwaarde+ API
      // levert sinds kort geen Rooms-veld meer, dus market.data.rooms is voor
      // élk live rapport permanent undefined (zie code-comment in
      // ReportDocument.tsx bij "stepperVolledig"). objectInhoudM3 valt in dat
      // geval terug op building.data.inhoudM3, precies zoals hieronder.
    }
  ),

  nearbySales: successResult(
    "buurtverkopen",
    "Buurtverkopen (Altum AI / Kadaster)",
    "mock",
    "mock",
    {
      aantalLaatste12Maanden: 30,
      gemiddeldePrijsPerM2: 7908,
      verkopen: [
        maakVerkoop("Pedro de Medinalaan 90, Amsterdam", "2026-06-15", 152, 5592, { verkoopprijsMin: 800000, verkoopprijsMax: 900000 }),
        maakVerkoop("Borneokade 147, Amsterdam", "2026-05-10", 148, 9291, { verkoopprijsMin: 1250000, verkoopprijsMax: 1500000 }),
        maakVerkoop("D.L. Hudigstraat 43, Amsterdam", "2026-05-05", 124, 7661, { verkoopprijsMin: 900000, verkoopprijsMax: 1000000 }),
        maakVerkoop("Pedro de Medinalaan 192, Amsterdam", "2026-05-01", 159, 5346, { verkoopprijsMin: 800000, verkoopprijsMax: 900000 }),
        maakVerkoop("Seinwachterstraat 35, Amsterdam", "2026-05-20", 113, 7522, { verkoopprijsMin: 800000, verkoopprijsMax: 900000 }),
        maakVerkoop("Lampenistenstraat 115, Amsterdam", "2026-04-18", 119, 7983, { verkoopprijsMin: 900000, verkoopprijsMax: 1000000 }),
        maakVerkoop("Mortelstraat 111, Amsterdam", "2026-01-22", 205, 8537, { verkoopprijsMin: 1500000, verkoopprijsMax: 2000000 }),
      ],
      zoekvensterMaanden: 12,
      verruimd: false,
    }
  ),

  verduurzaming: successResult(
    "verduurzaming",
    "Verduurzamingsadvies (Altum AI, NTA 8800)",
    "mock",
    "mock",
    {
      huidigLabel: "A+",
      haalbaarLabel: "A+++",
      investering: 7705,
      besparingPerJaar: 909,
      terugverdientijdMaanden: 101,
      waardestijging: 6069,
      energierekeningHuidigPerJaar: 2131,
      energierekeningNaPerJaar: 1222,
      co2ReductieKg: 1560,
      maatregelen: [
        {
          key: "solar_panels",
          label: "Zonnepanelen",
          van: "0",
          naar: "14",
          investering: 6205,
          besparingPerJaar: 968,
          co2ReductieKg: 1400,
        },
        {
          key: "electric_cooking",
          label: "Electric cooking",
          van: "Gas stove",
          naar: "Electric stove",
          investering: 1500,
          besparingPerJaar: -149,
          co2ReductieKg: 160,
        },
      ],
    }
  ),

  buurtprofiel: successResult(
    "buurtprofiel",
    "CBS wijk- en buurtcijfers / politie",
    "mock",
    "mock",
    {
      buurtnaam: "Cruquiusbuurt",
      gemeentenaam: "Amsterdam",
      peiljaar: "2025",
      samenvatting: "Dichtbebouwde, moderne buurt aan het water met een gemiddeld veiligheidsniveau.",
      veiligheid: {
        tekst: "Circa 52,0 misdrijven per 1.000 inwoners geregistreerd door de politie in 2025 (134 in totaal).",
        misdrijvenPer1000: 52.0,
        aantalMisdrijven: 134,
      },
      sociaal: {
        tekst: "Circa 2.575 inwoners in 1.450 huishoudens, gemiddeld 1,8 personen per huishouden. Ongeveer 48% van de huishoudens is een eenpersoonshuishouden.",
        inwoners: 2575,
        huishoudens: 1450,
        gemiddeldeHuishoudensgrootte: 1.8,
        percentageEenpersoons: 48,
        percentageMetKinderen: 18,
      },
      fysiek: {
        tekst: "Met circa 14.727 inwoners per km² is dit een dichtbebouwde, stedelijke buurt.",
        bevolkingsdichtheid: 14727,
        percentageEengezinswoning: 0,
        percentageMeergezinswoning: 100,
      },
      // AANGEPAST t.o.v. het echte, live rapport voor dit adres: daar gaf CBS
      // voor deze specifieke buurt geen nabijheidscijfers terug (een
      // eveneens eerlijke, maar voor een SHOWCASE minder overtuigende lege
      // sectie). Op uitdrukkelijk verzoek tonen we hier bewust wél
      // (fictieve, plausibele) voorbeeldcijfers — dit is per definitie een
      // voorbeeldrapport en mag zo compleet mogelijk laten zien wat een
      // rapport mét CBS-nabijheidsdata te bieden heeft. Zelfde opbouw/stijl
      // als buildVoorzieningenTekst() in lib/data-sources/buurtprofiel.ts
      // (thema-groepering, "km tot <zinsdeel>"), niet zomaar losse tekst.
      voorzieningen: {
        tekst:
          "Dagelijks leven: gemiddeld 0,4 km tot de huisarts, 0,6 km tot de apotheek, 0,3 km tot een grote supermarkt. Gezin en onderwijs: gemiddeld 0,5 km tot de dichtstbijzijnde basisschool, 1,4 km tot een school voor voortgezet onderwijs, 0,4 km tot het dichtstbijzijnde kinderdagverblijf. Bereikbaarheid en buitenruimte: gemiddeld 1,9 km tot het dichtstbijzijnde treinstation, 2,8 km tot een oprit van de snelweg, 0,3 km tot een park of andere groenvoorziening.",
        items: [
          { key: "huisarts", label: "Huisartsenpraktijk", thema: "dagelijks", afstandKm: 0.4 },
          { key: "apotheek", label: "Apotheek", thema: "dagelijks", afstandKm: 0.6 },
          { key: "supermarkt", label: "Grote supermarkt", thema: "dagelijks", afstandKm: 0.3 },
          { key: "basisschool", label: "Basisschool", thema: "gezin", afstandKm: 0.5 },
          { key: "voortgezetOnderwijs", label: "Voortgezet onderwijs", thema: "gezin", afstandKm: 1.4 },
          { key: "kinderdagverblijf", label: "Kinderdagverblijf", thema: "gezin", afstandKm: 0.4 },
          { key: "treinstation", label: "Treinstation", thema: "bereikbaarheid", afstandKm: 1.9 },
          { key: "opritHoofdweg", label: "Oprit hoofdweg", thema: "bereikbaarheid", afstandKm: 2.8 },
          { key: "park", label: "Park / openbaar groen", thema: "bereikbaarheid", afstandKm: 0.3 },
        ],
      },
      duiding:
        "Veiligheid: de politie registreerde circa 52,0 misdrijven per 1.000 inwoners (134 in totaal) in 2025. In deze buurt wonen circa 2.575 mensen, verdeeld over 1.450 huishoudens, gemiddeld 1,8 personen per huishouden. Ongeveer 48% van de huishoudens bestaat uit één persoon. Circa 18% heeft thuiswonende kinderen. Met circa 14.727 inwoners per km² is dit een dichtbebouwde, stedelijke buurt; van de woningen hier is 0% eengezinswoningen en 100% meergezinswoningen. Dagelijks leven: gemiddeld 0,4 km tot de huisarts, 0,6 km tot de apotheek, 0,3 km tot een grote supermarkt. Gezin en onderwijs: gemiddeld 0,5 km tot de dichtstbijzijnde basisschool, 1,4 km tot een school voor voortgezet onderwijs, 0,4 km tot het dichtstbijzijnde kinderdagverblijf. Bereikbaarheid en buitenruimte: gemiddeld 1,9 km tot het dichtstbijzijnde treinstation, 2,8 km tot een oprit van de snelweg, 0,3 km tot een park of andere groenvoorziening. Deze cijfers gaan over de hele buurt of wijk (CBS/politie), niet specifiek over dit huis.",
    }
  ),

  fundering: successResult(
    "fundering",
    "KCAF/RVO aandachtsgebieden + BAG-bouwjaar",
    "mock",
    "mock",
    {
      niveau: "laag",
      label: "Laag, we zien geen duidelijke signalen van funderingsrisico",
      toelichting:
        "We kijken naar het bouwjaar (2021) en de officiële bodemclassificatie van het KCAF/RVO. Dit huis is gebouwd ná 1970, en vanaf toen werd bouwen op betonpalen de standaard. Dat verkleint het risico op de bekende problemen met houten paalfunderingen flink.",
      duiding:
        "Voor dit postcodegebied is geen officiële bodemclassificatie beschikbaar in de KCAF/RVO-kaart; deze indicatie steunt dan uitsluitend op het bouwjaar.",
      duidingKern:
        "Voor dit postcodegebied is geen officiële bodemclassificatie beschikbaar in de KCAF/RVO-kaart; deze indicatie steunt dan uitsluitend op het bouwjaar.",
      duidingCaveat:
        "Niemand kan het werkelijke funderingstype of de actuele grondwaterstand ter plekke met zekerheid vaststellen voor dit specifieke pand.",
      duidingAdvies:
        "Bij twijfel in Amsterdam is een funderingsonderzoek door een erkend bureau de enige harde manier om dit vast te stellen. Sommige gemeenten met bekende funderingsproblematiek (o.a. Gouda, Schiedam, Zaanstad, Dordrecht) hebben ook een funderingsloket met lokale kaarten.",
      bouwjaarGebruikt: 2021,
      // BEWUST null: net als bij een deel van de échte, live rapporten kent
      // de KCAF/RVO-kaart dit postcodegebied geen classificatie toe (vaak in
      // dicht-stedelijke nieuwbouwgebieden). Zie de bugfix hierboven (Bodem:
      // geen classificatie beschikbaar) voor de fallback-duiding die dit nu
      // altijd toont i.p.v. stilzwijgend weg te laten.
      bodemclassificatie: null,
      bodemclassificatieUitleg: null,
      // BEWUST null: ook dit cijfer was niet beschikbaar voor dit
      // postcodegebied in het echte rapport.
      percentageVoor1970Postcode: null,
    }
  ),

  kavel: successResult(
    "kavel",
    "Kavelgrootte (Kadaster, PDOK Kadastrale Kaart)",
    "mock",
    "mock",
    {
      oppervlakteM2: 3992,
      soortGrootte: "vastgesteld",
      kadastraleAanduiding: "Amsterdam AK 9142",
    }
  ),

  // BEWUST unavailableResult: in het echte rapport voor dit adres werd geen
  // bestemmingsplan-/omgevingsplangegeven getoond — geen bestemming-chip op
  // de Object-pagina. Eerlijke "niet opgehaald" i.p.v. een verzonnen "Wonen".
  bestemming: unavailableResult<BestemmingData>("bestemming", "Bestemming (Ruimtelijke Plannen / Omgevingsplan)", "mock"),

  // Zelfde drie keys als de echte generator (buildInsights() in
  // lib/services/insights.ts) — met dezelfde uitkomst die die functie ook
  // daadwerkelijk zou berekenen uit de cijfers hierboven (energielabel A+ is
  // met diff -2 t.o.v. een 2021-bouwjaar "onder gemiddeld", de woningwaarde
  // ligt met +4% t.o.v. de buurtverkopen binnen de neutrale marge, en 30
  // verkopen per jaar is "een actieve markt").
  insights: [
    { key: "energie-vs-bouwjaar", label: "Energieprestatie", tekst: "onder gemiddeld voor de bouwperiode", toon: "negatief" },
    {
      key: "woningwaarde-vs-buurtverkopen",
      label: "Positionering",
      tekst: "vergelijkbaar met het prijsniveau van recente buurtverkopen",
      toon: "neutraal",
    },
    { key: "marktactiviteit", label: "Marktactiviteit", tekst: "een actieve markt in de buurt", toon: "neutraal" },
  ],

  dataQuality: {
    compleetheid: "volledig",
    totaalBronnen: 6,
    bevestigd: 0,
    publiek: 0,
    premium: 0,
    mock: 6,
    nietBeschikbaar: 0,
    toelichting: "Voorbeeldrapport met samengestelde, illustratieve cijfers. Geen live databronnen bevraagd.",
  },

  gegenereerdOp: new Date().toISOString(),
};
