import type {
  AddressMeta,
  Report,
  BuildingData,
  EnergyData,
  MarketData,
  NearbySalesDataRaw,
  VerduurzamingData,
  BuurtprofielData,
  FunderingData,
  KavelData,
  BestemmingData,
} from "@/types/report";
import { successResult } from "@/types/dataSource";
import { buildCore, buildInsights, buildDataQuality, enrichNearbySales } from "@/lib/services/insights";
import { slugify } from "@/lib/utils/slug";

// -----------------------------------------------------------------------------
// Demo-rapporten voor "Kooprapport Zakelijk" (zie app/api/admin/zakelijk/
// demo-vullen/route.ts) -- puur voor een testaccount om het dashboard te
// vullen ZONDER de echte, kostenveroorzakende databronnen aan te roepen
// (Altum AI kost credits per aanroep voor market/nearbySales/verduurzaming,
// zie reportService.ts). Elk veld krijgt hier expliciet mode:"mock" mee (zie
// SourceMeta in types/dataSource.ts) -- dit rapport is dus altijd
// herkenbaar als voorbeelddata, ook al wordt de vorm (via buildCore/
// buildInsights/buildDataQuality) op exact dezelfde manier samengesteld als
// een echt rapport. BEWUST NIET gebruikt voor een echte, aan een consument
// getoonde adrespagina -- alleen voor B2B-demo-dossiers.
// -----------------------------------------------------------------------------

export interface DemoWoningInput {
  straat: string;
  huisnummer: string;
  huisletter?: string;
  postcode: string;
  plaats: string;
  bouwjaar: number;
  oppervlakteM2: number;
  woningtype: string;
  energielabel: string;
  geschatteWaarde: number;
  funderingsniveau: "laag" | "midden" | "hoog";
  buurtnaam: string;
}

export function genereerDemoAdres(input: DemoWoningInput): AddressMeta {
  const label = `${input.straat} ${input.huisnummer}${input.huisletter ?? ""}, ${input.plaats}`;
  const slug = slugify(`${input.straat}-${input.huisnummer}${input.huisletter ?? ""}-${input.plaats}`);
  return {
    straat: input.straat,
    huisnummer: input.huisnummer,
    huisletter: input.huisletter,
    postcode: input.postcode,
    plaats: input.plaats,
    slug,
    label,
  };
}

const FUNDERING_TEKST: Record<DemoWoningInput["funderingsniveau"], { label: string; toelichting: string }> = {
  laag: { label: "Laag -- geen sterke signalen van funderingsrisico.", toelichting: "Bouwjaar en bodemclassificatie geven samen geen aanleiding voor extra aandacht." },
  midden: { label: "Midden -- enkele aandachtspunten, geen acute zorg.", toelichting: "Bouwperiode en bodemclassificatie geven samen een gemiddeld risicobeeld." },
  hoog: { label: "Hoog -- reden voor nader onderzoek.", toelichting: "Bouwperiode en bodemclassificatie wijzen samen op een verhoogd risico." },
};

export function genereerDemoRapport(input: DemoWoningInput): Report {
  const address = genereerDemoAdres(input);

  const building: BuildingData = {
    bouwjaar: input.bouwjaar,
    gebruiksdoel: "Woonfunctie",
    woningtype: input.woningtype,
    oppervlakteM2: input.oppervlakteM2,
    inhoudM3: Math.round(input.oppervlakteM2 * 3.1),
    aantalVerblijfsobjecten: 1,
    pandStatus: "Pand in gebruik",
  };
  const buildingResult = successResult("bag", "Kadaster BAG", "mock" as const, "confirmed" as const, building);

  const energy: EnergyData = { klasse: input.energielabel, registratiedatum: "2023-04-01" };
  const energyResult = successResult("energielabel", "EP-Online", "mock" as const, "public" as const, energy);

  const bandbreedteMin = Math.round((input.geschatteWaarde * 0.94) / 1000) * 1000;
  const bandbreedteMax = Math.round((input.geschatteWaarde * 1.06) / 1000) * 1000;
  const market: MarketData = {
    geschatteWaarde: input.geschatteWaarde,
    bandbreedteMin,
    bandbreedteMax,
    betrouwbaarheidstekst: `90% Confidence Interval is ${bandbreedteMin}-${bandbreedteMax}.`,
    waarderingsdatum: new Date().toISOString().slice(0, 10),
    rooms: Math.max(2, Math.round(input.oppervlakteM2 / 30)),
    volume: Math.round(input.oppervlakteM2 * 3.1),
  };
  const marketResult = successResult("woningwaarde", "Geschatte woningwaarde (model)", "mock" as const, "premium" as const, market);

  const prijsPerM2 = Math.round(input.geschatteWaarde / input.oppervlakteM2);
  const huisnummerNum = Number(input.huisnummer) || 10;
  const nearbySalesRaw: NearbySalesDataRaw = {
    aantalLaatste12Maanden: 8,
    gemiddeldePrijsPerM2: prijsPerM2,
    verkopen: [
      {
        adres: `${input.straat} ${huisnummerNum + 4}`,
        verkoopdatum: "2026-05-12",
        verkoopprijs: Math.round(input.geschatteWaarde * 0.97),
        oppervlakteM2: Math.max(20, input.oppervlakteM2 - 5),
        prijsPerM2,
      },
      {
        adres: `${input.straat} ${Math.max(1, huisnummerNum - 8)}`,
        verkoopdatum: "2026-03-22",
        verkoopprijs: Math.round(input.geschatteWaarde * 1.03),
        oppervlakteM2: input.oppervlakteM2 + 8,
        prijsPerM2: prijsPerM2 + 40,
      },
      {
        adres: `Van Nearbystraat 12, ${input.plaats}`,
        verkoopdatum: "2026-01-15",
        verkoopprijs: Math.round(input.geschatteWaarde * 0.9),
        oppervlakteM2: Math.max(20, input.oppervlakteM2 - 15),
        prijsPerM2: prijsPerM2 - 60,
      },
    ],
    zoekvensterMaanden: 12,
    verruimd: false,
  };
  const nearbySalesEnriched = enrichNearbySales(nearbySalesRaw, { oppervlakteM2: input.oppervlakteM2, prijsPerM2 });
  const nearbySalesResult = successResult(
    "buurtverkopen",
    "Buurtverkopen (Altum AI Woningreferentie, bron: Kadaster)",
    "mock" as const,
    "premium" as const,
    nearbySalesEnriched!
  );

  const verduurzaming: VerduurzamingData = {
    huidigLabel: input.energielabel,
    haalbaarLabel: "B",
    investering: 18500,
    besparingPerJaar: 950,
    terugverdientijdMaanden: 234,
    waardestijging: Math.round(input.geschatteWaarde * 0.02),
    energierekeningHuidigPerJaar: 2450,
    energierekeningNaPerJaar: 1500,
    co2ReductieKg: 1200,
    maatregelen: [
      { key: "wall_insulation", label: "Gevelisolatie", van: "Matig", naar: "Goed", investering: 9500, besparingPerJaar: 420, co2ReductieKg: 520 },
      { key: "solar_panels", label: "Zonnepanelen (12 stuks)", van: "Geen", naar: "12 panelen", investering: 6000, besparingPerJaar: 380, co2ReductieKg: 480 },
      { key: "hr_glass", label: "HR++ beglazing", van: "Enkel/dubbel", naar: "HR++", investering: 3000, besparingPerJaar: 150, co2ReductieKg: 200 },
    ],
  };
  const verduurzamingResult = successResult("verduurzaming", "Verduurzamingsadvies (Altum AI, NTA 8800)", "mock" as const, "premium" as const, verduurzaming);

  const buurtprofiel: BuurtprofielData = {
    buurtnaam: input.buurtnaam,
    gemeentenaam: input.plaats,
    peiljaar: "2025",
    samenvatting: `${input.buurtnaam} is een rustige, gewilde buurt met overwegend ${input.woningtype.toLowerCase()}en en goede voorzieningen in de buurt.`,
    veiligheid: { tekst: "Relatief weinig geregistreerde misdrijven vergeleken met het landelijk gemiddelde.", misdrijvenPer1000: 32, aantalMisdrijven: 210 },
    sociaal: { tekst: "Gemengde bevolkingssamenstelling met relatief veel gezinnen.", inwoners: 8400, huishoudens: 3900, gemiddeldeHuishoudensgrootte: 2.1, percentageEenpersoons: 38, percentageMetKinderen: 27 },
    fysiek: { tekst: "Overwegend laagbouw met een gemiddelde bevolkingsdichtheid voor stedelijk gebied.", bevolkingsdichtheid: 4200, percentageEengezinswoning: 62, percentageMeergezinswoning: 38 },
    voorzieningen: {
      tekst: "Dagelijkse voorzieningen op loopafstand, scholen binnen een paar minuten fietsen.",
      items: [
        { key: "supermarkt", label: "Supermarkt", thema: "dagelijks", afstandKm: 0.4 },
        { key: "huisarts", label: "Huisartsenpraktijk", thema: "dagelijks", afstandKm: 0.7 },
        { key: "basisschool", label: "Basisschool", thema: "gezin", afstandKm: 0.5 },
        { key: "treinstation", label: "Treinstation", thema: "bereikbaarheid", afstandKm: 1.8 },
      ],
    },
    duiding: `Al met al een courante locatie in ${input.plaats}, met een goede balans tussen rust en voorzieningen.`,
  };
  const buurtprofielResult = successResult("buurtprofiel", "CBS / politie buurtcijfers", "mock" as const, "public" as const, buurtprofiel);

  const funderingTekst = FUNDERING_TEKST[input.funderingsniveau];
  const fundering: FunderingData = {
    niveau: input.funderingsniveau,
    label: funderingTekst.label,
    toelichting: funderingTekst.toelichting,
    duiding: `${funderingTekst.toelichting} Gebaseerd op het bouwjaar (${input.bouwjaar}) en de KCAF/RVO-bodemclassificatie voor dit postcodegebied.`,
    duidingKern: "Bodemclassificatie geeft een indicatie, geen zekerheid.",
    duidingCaveat: "Geen van beide bronnen stelt het daadwerkelijke funderingstype met zekerheid vast.",
    duidingAdvies: "Bij twijfel: raadpleeg een funderingsspecialist vóór aankoop.",
    bouwjaarGebruikt: input.bouwjaar,
    bodemclassificatie: input.funderingsniveau === "hoog" ? "Kwetsbaar gebied (Rivierengebied)" : "Niet kwetsbaar gebied",
    bodemclassificatieUitleg: "Bodemclassificatie volgens de officiële KCAF/RVO-kaart voor aandachtsgebieden funderingsproblematiek.",
    percentageVoor1970Postcode: input.bouwjaar < 1970 ? 64 : 28,
  };
  const funderingResult = successResult("fundering", "Funderingsrisico-indicatie (KCAF/RVO + BAG)", "mock" as const, "public" as const, fundering);

  const kavel: KavelData = {
    oppervlakteM2: Math.round(input.oppervlakteM2 * 1.4),
    soortGrootte: "vastgesteld",
    kadastraleAanduiding: `${input.plaats} A ${1000 + huisnummerNum}`,
  };
  const kavelResult = successResult("kavel", "Kadastrale Kaart (PDOK)", "mock" as const, "confirmed" as const, kavel);

  const bestemming: BestemmingData = {
    bestemmingen: ["Wonen", "Tuin"],
    planNaam: `Bestemmingsplan Centrum ${input.plaats}`,
    planStatus: "onherroepelijk",
    planDatum: "2019-06-01",
    bevoegdGezag: `gemeente ${input.plaats}`,
    bron: "bestemmingsplan",
  };
  const bestemmingResult = successResult("bestemming", "Bestemmingsplanregister", "mock" as const, "confirmed" as const, bestemming);

  const core = buildCore(address, building, energy, null);
  const insights = buildInsights({ building, energy, market, nearbySales: nearbySalesEnriched });
  const dataQuality = buildDataQuality([
    buildingResult.meta,
    energyResult.meta,
    marketResult.meta,
    nearbySalesResult.meta,
    verduurzamingResult.meta,
    buurtprofielResult.meta,
    funderingResult.meta,
    kavelResult.meta,
    bestemmingResult.meta,
  ]);

  return {
    core,
    building: buildingResult,
    energy: energyResult,
    market: marketResult,
    nearbySales: nearbySalesResult,
    verduurzaming: verduurzamingResult,
    buurtprofiel: buurtprofielResult,
    fundering: funderingResult,
    kavel: kavelResult,
    bestemming: bestemmingResult,
    insights,
    dataQuality,
    gegenereerdOp: new Date().toISOString(),
  };
}

// Vaste set van gevarieerde demo-woningen -- verschillende steden (matchend
// met de bestaande woningmarkt-stads-/regiopagina's, zodat het biedadvies
// ook regio-cijfers oplevert i.p.v. steeds op het landelijk gemiddelde terug
// te vallen), prijsklassen, bouwjaren en funderingsniveaus, zodat een
// gevulde demo-omgeving er niet overal hetzelfde uitziet.
export const DEMO_WONINGEN: DemoWoningInput[] = [
  { straat: "Prinsengracht", huisnummer: "88", huisletter: "A", postcode: "1015DZ", plaats: "Amsterdam", bouwjaar: 1650, oppervlakteM2: 95, woningtype: "Meergezinswoning", energielabel: "D", geschatteWaarde: 685000, funderingsniveau: "midden", buurtnaam: "Grachtengordel" },
  { straat: "Kralingse Plaslaan", huisnummer: "42", postcode: "3062CG", plaats: "Rotterdam", bouwjaar: 1998, oppervlakteM2: 128, woningtype: "Eengezinswoning", energielabel: "B", geschatteWaarde: 495000, funderingsniveau: "laag", buurtnaam: "Kralingen" },
  { straat: "Zeeheldenkwartier", huisnummer: "17", postcode: "2518BG", plaats: "Den Haag", bouwjaar: 1932, oppervlakteM2: 88, woningtype: "Meergezinswoning", energielabel: "D", geschatteWaarde: 435000, funderingsniveau: "hoog", buurtnaam: "Zeeheldenkwartier" },
  { straat: "Wittevrouwensingel", huisnummer: "63", postcode: "3572AK", plaats: "Utrecht", bouwjaar: 1910, oppervlakteM2: 110, woningtype: "Eengezinswoning", energielabel: "C", geschatteWaarde: 575000, funderingsniveau: "midden", buurtnaam: "Wittevrouwen" },
  { straat: "Helperzoom", huisnummer: "205", postcode: "9722AN", plaats: "Groningen", bouwjaar: 1985, oppervlakteM2: 102, woningtype: "Eengezinswoning", energielabel: "B", geschatteWaarde: 365000, funderingsniveau: "laag", buurtnaam: "Helpman" },
  { straat: "Cronjéstraat", huisnummer: "9", postcode: "2021LA", plaats: "Haarlem", bouwjaar: 1924, oppervlakteM2: 76, woningtype: "Meergezinswoning", energielabel: "E", geschatteWaarde: 415000, funderingsniveau: "hoog", buurtnaam: "Duivelsbrug-Zuid" },
  { straat: "Groesbeekseweg", huisnummer: "134", postcode: "6524DK", plaats: "Nijmegen", bouwjaar: 1965, oppervlakteM2: 118, woningtype: "Eengezinswoning", energielabel: "C", geschatteWaarde: 445000, funderingsniveau: "midden", buurtnaam: "Galgenveld" },
  { straat: "Bergstraat", huisnummer: "51", postcode: "6211CD", plaats: "Maastricht", bouwjaar: 1890, oppervlakteM2: 84, woningtype: "Meergezinswoning", energielabel: "D", geschatteWaarde: 395000, funderingsniveau: "midden", buurtnaam: "Jekerkwartier" },
];
