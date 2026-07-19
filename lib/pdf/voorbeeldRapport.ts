import type { Report } from "@/types/report";
import { successResult } from "@/types/dataSource";
import { slugify } from "@/lib/utils/slug";

// -----------------------------------------------------------------------------
// Curatief, met de hand samengesteld "showcase"-rapport — uitsluitend bedoeld
// om op de homepage het premium PDF-rapport op zijn best te laten zien.
//
// GEEN echt adres, GEEN live databron-aanroep: elk veld hieronder is met de
// hand ingevuld, intern consistent (bv. prijs/m² van de verkopen sluit aan bij
// de opgegeven oppervlaktes, "vergelijkbaar" volgt exact dezelfde ±22%-marge
// die de app elders ook echt gebruikt) en expliciet gemarkeerd als mock
// (mode: "mock", status: "mock" op elke bron) — zelfde eerlijke labeling als
// de rest van de app al hanteert voor voorbeelddata (zie de bestaande notitie
// "Mockdata ter illustratie" op de homepage-footer). Dit voorkomt twee dingen:
//   1) dat de showcase per ongeluk oogt als een echt, bevestigd adresresultaat;
//   2) dat de showcase kwetsbaar is voor de bekende Altum-sandbox eigenaardig-
//      heden (bv. een enkele keer een onwaarschijnlijk hoge geschatte waarde
//      of een gelijke boven-/ondergrens) — dit rapport is met opzet altijd
//      "schoon", zodat het de opmaak laat zien, niet een randgeval.
//
// Gebruikt door app/api/rapport/voorbeeld-pdf/route.ts, gelinkt vanaf de
// homepage-CTA ("Download het premium voorbeeldrapport").
// -----------------------------------------------------------------------------

const STRAAT = "Prinsengracht";
const HUISNUMMER = "88";
const POSTCODE = "1015 DZ";
const PLAATS = "Amsterdam";
const LABEL = `${STRAAT} ${HUISNUMMER}, ${PLAATS}`;

const OPPERVLAKTE_M2 = 118;
// Zelfde ±22%-marge als OPPERVLAKTE_TOLERANTIE in lib/services/insights.ts —
// bepaalt hieronder welke verkopen als "vergelijkbaar" gelden, geen los
// bedachte grens voor alleen deze showcase.
const TOLERANTIE = 0.22;
const MIN_VERGELIJKBAAR = OPPERVLAKTE_M2 * (1 - TOLERANTIE);
const MAX_VERGELIJKBAAR = OPPERVLAKTE_M2 * (1 + TOLERANTIE);

const DEZE_WONING_PER_M2 = Math.round(875000 / OPPERVLAKTE_M2);

function maakVerkoop(
  adres: string,
  verkoopdatum: string,
  oppervlakteM2: number,
  prijsPerM2: number,
  extra?: { verkoopprijsMin: number; verkoopprijsMax: number }
) {
  const verkoopprijs = Math.round(oppervlakteM2 * prijsPerM2);
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
    ondertitel: "Grachtenpand · bouwjaar 1904 · label B",
    // Illustratief punt in de Amsterdamse grachtengordel, voor de "Kaart →"-link.
    lonLat: { lon: 4.8852, lat: 52.3676 },
  },

  building: successResult(
    "bag",
    "Kadaster BAG",
    "mock",
    "mock",
    {
      bouwjaar: 1904,
      gebruiksdoel: "Woonfunctie",
      woningtype: "Woonfunctie",
      oppervlakteM2: OPPERVLAKTE_M2,
      inhoudM3: 410,
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
      klasse: "B",
      registratiedatum: "2023-09-12",
      geldigTot: "2033-09-12",
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
      geschatteWaarde: 875000,
      bandbreedteMin: 810000,
      bandbreedteMax: 940000,
      betrouwbaarheidstekst: "90% Confidence Interval is 810000-940000.",
      waarderingsdatum: "2026-06-02",
      rooms: 5,
      volume: 410,
    }
  ),

  nearbySales: successResult(
    "buurtverkopen",
    "Buurtverkopen (Altum AI / Kadaster)",
    "mock",
    "mock",
    {
      aantalLaatste12Maanden: 14,
      gemiddeldePrijsPerM2: 8200,
      verkopen: [
        maakVerkoop("Herengracht 210", "2026-05-15", 112, 8100),
        maakVerkoop("Bloemgracht 45", "2026-04-02", 121, 7900),
        maakVerkoop("Egelantiersgracht 12", "2026-02-20", 105, 8400),
        maakVerkoop("Prinsengracht 140", "2025-08-18", 118, 8300, { verkoopprijsMin: 950000, verkoopprijsMax: 1010000 }),
        maakVerkoop("Keizersgracht 301", "2025-12-10", 168, 8600),
        maakVerkoop("Leliegracht 8", "2025-10-05", 76, 7600),
      ],
      zoekvensterMaanden: 12,
      verruimd: false,
    }
  ),

  buurtprofiel: successResult(
    "buurtprofiel",
    "CBS wijk- en buurtcijfers / politie",
    "mock",
    "mock",
    {
      buurtnaam: "Grachtengordel-West",
      gemeentenaam: "Amsterdam",
      peiljaar: "2025",
      samenvatting:
        "Rustige, gewilde grachtenbuurt met veel voorzieningen op loopafstand en een bovengemiddeld veilig profiel.",
      veiligheid: {
        tekst:
          "Circa 18,2 misdrijven per 1.000 inwoners geregistreerd door de politie in 2025 (146 in totaal), een laag aantal vergeleken met het landelijk gemiddelde.",
        misdrijvenPer1000: 18.2,
        aantalMisdrijven: 146,
      },
      sociaal: {
        tekst:
          "Circa 8.020 inwoners in 5.210 huishoudens, gemiddeld 1,5 personen per huishouden. Ongeveer 68% van de huishoudens is een eenpersoonshuishouden.",
        inwoners: 8020,
        huishoudens: 5210,
        gemiddeldeHuishoudensgrootte: 1.5,
        percentageEenpersoons: 68,
        percentageMetKinderen: 11,
      },
      fysiek: {
        tekst: "Met circa 15.200 inwoners per km² is dit een dichtbebouwde, stedelijke buurt.",
        bevolkingsdichtheid: 15200,
        percentageEengezinswoning: 22,
        percentageMeergezinswoning: 78,
      },
      voorzieningen: {
        tekst:
          "Dagelijks leven: gemiddeld 0,4 km tot de huisarts, 0,3 km tot de apotheek, 0,6 km tot een grote supermarkt. Gezin en onderwijs: gemiddeld 0,7 km tot de dichtstbijzijnde basisschool, 1,8 km tot een school voor voortgezet onderwijs, 0,5 km tot het dichtstbijzijnde kinderdagverblijf. Bereikbaarheid en buitenruimte: gemiddeld 1,2 km tot het dichtstbijzijnde treinstation, 0,8 km tot een oprit van de snelweg, 0,3 km tot een park of andere groenvoorziening.",
        items: [
          { key: "huisarts", label: "Huisartsenpraktijk", thema: "dagelijks", afstandKm: 0.4 },
          { key: "apotheek", label: "Apotheek", thema: "dagelijks", afstandKm: 0.3 },
          { key: "supermarkt", label: "Grote supermarkt", thema: "dagelijks", afstandKm: 0.6 },
          { key: "basisschool", label: "Basisschool", thema: "gezin", afstandKm: 0.7 },
          { key: "voortgezetOnderwijs", label: "Voortgezet onderwijs", thema: "gezin", afstandKm: 1.8 },
          { key: "kinderdagverblijf", label: "Kinderdagverblijf", thema: "gezin", afstandKm: 0.5 },
          { key: "treinstation", label: "Treinstation", thema: "bereikbaarheid", afstandKm: 1.2 },
          { key: "opritHoofdweg", label: "Oprit hoofdweg", thema: "bereikbaarheid", afstandKm: 0.8 },
          { key: "park", label: "Park / openbaar groen", thema: "bereikbaarheid", afstandKm: 0.3 },
        ],
      },
      duiding:
        "Grachtengordel-West combineert een laag geregistreerd misdrijfcijfer met een zeer dichte, overwegend uit meergezinswoningen bestaande bebouwing. Kenmerkend voor de historische binnenstad. Het hoge aandeel eenpersoonshuishoudens en de korte afstanden tot voorzieningen passen bij een centrumstedelijk, kleinschalig woonmilieu.",
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
        "Gebaseerd op het bevestigde BAG-bouwjaar (1904) en de officiële KCAF/RVO-bodemclassificatie voor dit postcodegebied.",
      duiding:
        "Dit postcodegebied is geclassificeerd als 'Niet kwetsbaar'. Dat zegt niets over de daadwerkelijke, huidige staat van de fundering onder dit specifieke pand. Alleen een gespecialiseerd funderingsonderzoek geeft daar zekerheid over.",
      duidingKern:
        "Dit postcodegebied is geclassificeerd als 'Niet kwetsbaar'. De bodem hier is over het algemeen minder gevoelig voor paalrot en zetting dan in veengebieden.",
      duidingCaveat:
        "Dit zegt niets over de daadwerkelijke, huidige staat van de fundering onder dit specifieke pand. Alleen een gespecialiseerd funderingsonderzoek geeft daar zekerheid over.",
      duidingAdvies:
        "Bij twijfel (scheuren, scheve kozijnen, verzakking) is een funderingsonderzoek door een erkend bureau de enige manier om zekerheid te krijgen. Vraag hier bij een bezichtiging altijd naar.",
      bouwjaarGebruikt: 1904,
      bodemclassificatie: "Niet kwetsbaar (stedelijk gefundeerd)",
      bodemclassificatieUitleg:
        "Dit postcodegebied valt buiten de door KCAF/RVO aangewezen kwetsbare veen- en rivierklei-gebieden.",
      percentageVoor1970Postcode: 91,
    }
  ),

  kavel: successResult(
    "kavel",
    "Kavelgrootte (Kadaster, PDOK Kadastrale Kaart)",
    "mock",
    "mock",
    {
      oppervlakteM2: 142,
      soortGrootte: "vastgesteld",
      kadastraleAanduiding: "Amsterdam AK 4021",
    }
  ),

  bestemming: successResult(
    "bestemming",
    "Bestemming (Ruimtelijke Plannen / Omgevingsplan)",
    "mock",
    "mock",
    {
      bestemmingen: ["Wonen"],
      planNaam: "Bestemmingsplan Grachtengordel",
      planStatus: "onherroepelijk",
      planDatum: "2013-11-06",
      bevoegdGezag: "gemeente Amsterdam",
      bron: "bestemmingsplan",
    }
  ),

  // Zelfde drie keys als de echte generator (buildInsights() in
  // lib/services/insights.ts) — deze waren hier eerder losse, verzonnen
  // sleutels ("waarde-buurt"/"veiligheid"/"fundering") die in de live app
  // nooit voorkomen, waardoor deze showcase een rapportonderdeel
  // (lib/services/samenvatting.ts) net iets anders behandelde dan een echt,
  // live rapport. Nu identiek aan wat buildInsights() daadwerkelijk oplevert.
  insights: [
    {
      key: "woningwaarde-vs-buurtverkopen",
      label: "Positionering",
      tekst: "10% onder het prijsniveau van recente buurtverkopen",
      toon: "neutraal",
    },
    { key: "energie-vs-bouwjaar", label: "Energieprestatie", tekst: "boven gemiddeld voor de bouwperiode", toon: "positief" },
    { key: "marktactiviteit", label: "Marktactiviteit", tekst: "een gemiddelde marktactiviteit in de buurt", toon: "neutraal" },
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
