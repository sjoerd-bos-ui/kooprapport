import type { AddressMeta, BuurtprofielData, VoorzieningAfstand, VoorzieningThema } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { withResilience } from "@/lib/adapters/withResilience";
import { resolveBuurtcode } from "@/lib/services/buurtcodeLookup";
import { VOORZIENING_THEMA_VOLGORDE, VOORZIENING_THEMA_LABEL } from "@/lib/utils/voorzieningenStijl";

// -----------------------------------------------------------------------------
// Buurtprofiel / leefomgeving — CBS (StatLine) en de politie-wijk/buurtcijfers
// als leidende bron, precies zoals gevraagd. Drie gratis, keyless CBS OData-
// tabellen, elk bevraagd op de buurtcode van dit adres (zie
// buurtcodeLookup.ts):
//
//   1. 86165NED "Kerncijfers wijken en buurten 2025"        -> sociaal + fysiek
//   2. 47018NED "Geregistreerde misdrijven ... wijk, buurt" -> veiligheid
//      (dit is een politie-tabel, gepubliceerd via het aparte
//      dataderden.cbs.nl-portaal, niet het gewone opendata.cbs.nl)
//   3. 85560NED "Nabijheid voorzieningen; afstand locatie"  -> voorzieningen
//      (dit is een grote CBS-tabel met ruim 120 categorieën; we gebruiken
//      een bewust samengestelde selectie van 9 daarvan, zie
//      VOORZIENING_DEFINITIES hieronder — expliciet NIET alles, sommige
//      categorieën zoals sauna/zonnebank/bioscoop passen niet bij de
//      feitelijke, serieuze toon van dit rapport)
//
// Geen van deze bronnen kost geld of vereist een sleutel, dus is er (anders
// dan bv. de Altum-woningwaarde) geen reden om de aanroep zelf uit te
// stellen tot ontgrendelen — alleen de WEERGAVE van fysiek/voorzieningen/
// duiding is premium (zie ReportView), de data wordt gewoon in één keer
// opgehaald, net als bouwjaar bij BAG.
//
// Elke deeltekst wordt alleen samengesteld uit cijfers die er echt zijn; een
// ontbrekend cijfer laat simpelweg die zin weg (zie de build*Tekst-functies).
// Blijft een hele categorie zonder tekst over, dan is het veld null en toont
// de UI de standaard "niet beschikbaar"-melding — geen gok, geen "onbekend"
// halverwege een zin.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "buurtprofiel";
const SOURCE_LABEL = "CBS wijk- en buurtcijfers";

const CBS_BASE = "https://opendata.cbs.nl/ODataApi/OData";
const POLITIE_BASE = "https://dataderden.cbs.nl/ODataApi/OData";

async function fetchODataRows(base: string, datasetId: string, filter: string, select?: string): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({ $filter: filter, $format: "json" });
  if (select) params.set("$select", select);
  const url = `${base}/${datasetId}/TypedDataSet?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[buurtprofiel] CBS-dataset ${datasetId} gaf HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  return Array.isArray(data?.value) ? data.value : [];
}

interface KerncijfersRow {
  Gemeentenaam_1?: string;
  AantalInwoners_5?: number;
  HuishoudensTotaal_29?: number;
  Eenpersoonshuishoudens_30?: number;
  HuishoudensMetKinderen_32?: number;
  GemiddeldeHuishoudensgrootte_33?: number;
  Bevolkingsdichtheid_34?: number;
  PercentageEengezinswoning_40?: number;
  PercentageMeergezinswoning_45?: number;
}

interface MisdrijvenRow {
  Perioden?: string;
  GeregistreerdeMisdrijven_1?: number;
}

// Generieke rij-vorm i.p.v. drie losse velden: welk CBS-veld überhaupt wordt
// opgehaald, staat uitsluitend in VOORZIENING_DEFINITIES hieronder — een
// nieuwe voorziening toevoegen is daardoor één regel in die lijst, niet een
// wijziging op vier plekken (interface, $select, mapping, UI).
type NabijheidRow = Record<string, number | undefined>;

interface VoorzieningDefinitie {
  key: string; // stabiele identifier, zie VOORZIENING_KLEUR in voorzieningenStijl.ts
  cbsVeld: string; // exacte CBS 85560NED-kolomnaam (geverifieerd tegen de live DataProperties van de tabel)
  label: string; // weergavelabel voor UI/PDF
  thema: VoorzieningThema;
  zinsdeel: string; // natuurlijke zinsvorm voor buildVoorzieningenTekst, bv. "de huisarts"
}

// Bewuste selectie van 9 uit de ruim 120 categorieën in 85560NED — gekozen
// op relevantie voor een koop-/verkoopbeslissing (gezondheid, dagelijkse
// boodschappen, gezin/onderwijs, bereikbaarheid, buitenruimte). Expliciet
// NIET toegevoegd: sauna, zonnebank, kunstijsbaan, bioscoop, attractie e.d.
// — die bestaan wel in de CBS-tabel maar passen niet bij de feitelijke,
// serieuze toon van dit rapport.
const VOORZIENING_DEFINITIES: VoorzieningDefinitie[] = [
  { key: "huisarts", cbsVeld: "AfstandTotHuisartsenpraktijk_5", label: "Huisartsenpraktijk", thema: "dagelijks", zinsdeel: "de huisarts" },
  { key: "apotheek", cbsVeld: "AfstandTotApotheek_10", label: "Apotheek", thema: "dagelijks", zinsdeel: "de apotheek" },
  { key: "supermarkt", cbsVeld: "AfstandTotGroteSupermarkt_24", label: "Grote supermarkt", thema: "dagelijks", zinsdeel: "een grote supermarkt" },
  { key: "basisschool", cbsVeld: "AfstandTotSchool_60", label: "Basisschool", thema: "gezin", zinsdeel: "de dichtstbijzijnde basisschool" },
  { key: "voortgezetOnderwijs", cbsVeld: "AfstandTotSchool_64", label: "Voortgezet onderwijs", thema: "gezin", zinsdeel: "een school voor voortgezet onderwijs" },
  { key: "kinderdagverblijf", cbsVeld: "AfstandTotKinderdagverblijf_52", label: "Kinderdagverblijf", thema: "gezin", zinsdeel: "het dichtstbijzijnde kinderdagverblijf" },
  { key: "treinstation", cbsVeld: "AfstandTotTreinstationsTotaal_105", label: "Treinstation", thema: "bereikbaarheid", zinsdeel: "het dichtstbijzijnde treinstation" },
  { key: "opritHoofdweg", cbsVeld: "AfstandTotOpritHoofdverkeersweg_104", label: "Oprit hoofdweg", thema: "bereikbaarheid", zinsdeel: "een oprit van de snelweg" },
  { key: "park", cbsVeld: "AfstandTotOpenbaarGroenTotaal_91", label: "Park / openbaar groen", thema: "bereikbaarheid", zinsdeel: "een park of andere groenvoorziening" },
];

const NABIJHEID_SELECT = VOORZIENING_DEFINITIES.map((d) => d.cbsVeld).join(",");
const ZINSDEEL_PER_KEY: Record<string, string> = Object.fromEntries(VOORZIENING_DEFINITIES.map((d) => [d.key, d.zinsdeel]));

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}

// Zelfde afronding als round1(), maar als getal i.p.v. weergavestring — voor
// de losse numerieke velden die de UI als stat-kaart toont.
function round1Num(n: number): number {
  return Math.round(n * 10) / 10;
}

// Sociaal (gratis): bevolkings-/huishoudenssamenstelling — geen losse
// cijfers, één korte zin die alleen de onderdelen bevat die bekend zijn.
function buildSociaalTekst(k: KerncijfersRow | null): string | null {
  if (!k) return null;
  const delen: string[] = [];
  if (k.AantalInwoners_5 != null && k.HuishoudensTotaal_29 != null) {
    delen.push(`circa ${k.AantalInwoners_5.toLocaleString("nl-NL")} mensen, verdeeld over ${k.HuishoudensTotaal_29.toLocaleString("nl-NL")} huishoudens`);
  } else if (k.AantalInwoners_5 != null) {
    delen.push(`circa ${k.AantalInwoners_5.toLocaleString("nl-NL")} mensen`);
  }
  if (k.GemiddeldeHuishoudensgrootte_33 != null) {
    delen.push(`gemiddeld ${round1(k.GemiddeldeHuishoudensgrootte_33)} personen per huishouden`);
  }
  if (delen.length === 0) return null;
  let zin = `In deze buurt wonen ${delen.join(", ")}.`;
  if (k.Eenpersoonshuishoudens_30 != null && k.HuishoudensTotaal_29) {
    const pct = Math.round((k.Eenpersoonshuishoudens_30 / k.HuishoudensTotaal_29) * 100);
    zin += ` Ongeveer ${pct}% van de huishoudens bestaat uit één persoon.`;
  }
  if (k.HuishoudensMetKinderen_32 != null && k.HuishoudensTotaal_29) {
    const pctKinderen = Math.round((k.HuishoudensMetKinderen_32 / k.HuishoudensTotaal_29) * 100);
    zin += ` Circa ${pctKinderen}% van de huishoudens heeft thuiswonende kinderen.`;
  }
  return zin;
}

// Veiligheid (gratis): geregistreerde misdrijven per 1.000 inwoners — één
// samengevat cijfer i.p.v. een uitsplitsing naar soort misdrijf.
function buildVeiligheidTekst(m: MisdrijvenRow | null, inwoners: number | undefined): string | null {
  if (!m || m.GeregistreerdeMisdrijven_1 == null) return null;
  const jaar = m.Perioden ? m.Perioden.slice(0, 4) : null;
  if (inwoners && inwoners > 0) {
    const per1000 = (m.GeregistreerdeMisdrijven_1 / inwoners) * 1000;
    return `In ${jaar ?? "het meest recente jaar"} registreerde de politie in deze buurt circa ${round1(per1000)} misdrijven per 1.000 inwoners (${m.GeregistreerdeMisdrijven_1.toLocaleString("nl-NL")} in totaal).`;
  }
  return `In ${jaar ?? "het meest recente jaar"} registreerde de politie ${m.GeregistreerdeMisdrijven_1.toLocaleString("nl-NL")} misdrijven in deze buurt.`;
}

// Fysiek (premium): dichtheid + woningtype-mix.
function buildFysiekTekst(k: KerncijfersRow | null): string | null {
  if (!k) return null;
  const delen: string[] = [];
  if (k.Bevolkingsdichtheid_34 != null) {
    const dichtheid = k.Bevolkingsdichtheid_34;
    const kwalificatie = dichtheid >= 2500 ? "dichtbebouwde stedelijke" : dichtheid >= 1000 ? "matig dichtbebouwde" : "landelijke, dunbevolkte";
    delen.push(`Met circa ${dichtheid.toLocaleString("nl-NL")} inwoners per km² is dit een ${kwalificatie} buurt.`);
  }
  if (k.PercentageEengezinswoning_40 != null || k.PercentageMeergezinswoning_45 != null) {
    const soorten: string[] = [];
    if (k.PercentageEengezinswoning_40 != null) soorten.push(`${k.PercentageEengezinswoning_40}% eengezinswoningen`);
    if (k.PercentageMeergezinswoning_45 != null) soorten.push(`${k.PercentageMeergezinswoning_45}% meergezinswoningen`);
    delen.push(`Van de woningen hier is ${soorten.join(" en ")}.`);
  }
  return delen.length > 0 ? delen.join(" ") : null;
}

// Voorzieningen (premium): per thema (dagelijks leven / gezin en onderwijs /
// bereikbaarheid en buitenruimte) één korte zin, i.p.v. één lange opsomming
// — bij 9 mogelijke voorzieningen wordt één doorlopende komma-zin snel
// onleesbaar. Een thema komt alleen voor als er minstens één cijfer in
// bekend is; ontbrekende voorzieningen laten simpelweg hun plek in de zin
// weg, net als de rest van deze module.
function buildVoorzieningenTekst(items: VoorzieningAfstand[]): string | null {
  if (items.length === 0) return null;
  const zinnen: string[] = [];
  for (const thema of VOORZIENING_THEMA_VOLGORDE) {
    const themaItems = items.filter((i) => i.thema === thema);
    if (themaItems.length === 0) continue;
    const delen = themaItems.map((i) => `${round1(i.afstandKm)} km tot ${ZINSDEEL_PER_KEY[i.key] ?? i.label.toLowerCase()}`);
    zinnen.push(`${VOORZIENING_THEMA_LABEL[thema]}: gemiddeld ${delen.join(", ")}.`);
  }
  return zinnen.length > 0 ? zinnen.join(" ") : null;
}

function buildSamenvatting(veiligheid: string | null, sociaal: string | null): string | null {
  if (!veiligheid && !sociaal) return null;
  if (veiligheid && sociaal) return "Dit is een eerste blik op veiligheid en de buurt zelf. De volledige duiding, plus meer over de omgeving en voorzieningen, vind je in het volledige rapport.";
  return "We hebben nog maar een beperkt beeld van deze buurt. De volledige duiding vind je in het volledige rapport.";
}

function buildDuiding(
  veiligheid: string | null,
  sociaal: string | null,
  fysiek: string | null,
  voorzieningen: string | null
): string | null {
  const delen = [veiligheid, sociaal, fysiek, voorzieningen].filter((d): d is string => Boolean(d));
  if (delen.length === 0) return null;
  return delen.join(" ") + " Deze cijfers gaan over de hele buurt of wijk (CBS/politie), niet specifiek over dit huis.";
}

async function fetchLive(address: AddressMeta): Promise<BuurtprofielData> {
  const buurt = await resolveBuurtcode(address);
  if (!buurt) {
    throw new Error("Kon geen CBS-buurtcode bepalen voor dit adres.");
  }

  const filter = `WijkenEnBuurten eq '${buurt.buurtcode}'`;

  const [kerncijfersRows, misdrijvenRows, nabijheidRows] = await Promise.all([
    fetchODataRows(
      CBS_BASE,
      "86165NED",
      filter,
      "Gemeentenaam_1,AantalInwoners_5,HuishoudensTotaal_29,Eenpersoonshuishoudens_30,HuishoudensMetKinderen_32,GemiddeldeHuishoudensgrootte_33,Bevolkingsdichtheid_34,PercentageEengezinswoning_40,PercentageMeergezinswoning_45"
    ).catch(() => []),
    fetchODataRows(
      POLITIE_BASE,
      "47018NED",
      // BELANGRIJK: CBS's SoortMisdrijf-dimensiecodes zijn vast-breedte en
      // dus opgevuld met een spatie ("0.0.0 ", niet "0.0.0") — geverifieerd
      // via https://dataderden.cbs.nl/ODataApi/OData/47018NED/SoortMisdrijf.
      // Zonder die spatie matcht de filter nooit iets, en bleef veiligheid
      // voor elk adres op "Onbekend" staan.
      `SoortMisdrijf eq '0.0.0 ' and ${filter}`,
      "Perioden,GeregistreerdeMisdrijven_1"
    ).catch(() => []),
    fetchODataRows(CBS_BASE, "85560NED", filter, NABIJHEID_SELECT).catch(() => []),
  ]);

  const kerncijfers = (kerncijfersRows[0] as KerncijfersRow | undefined) ?? null;
  // Meerdere jaren mogelijk (jaarcijfers) — de meest recente periode eerst.
  const misdrijvenSorted = [...misdrijvenRows].sort((a, b) =>
    String((b as MisdrijvenRow).Perioden ?? "").localeCompare(String((a as MisdrijvenRow).Perioden ?? ""))
  );
  const misdrijven = (misdrijvenSorted[0] as MisdrijvenRow | undefined) ?? null;
  const nabijheid = (nabijheidRows[0] as NabijheidRow | undefined) ?? null;

  const veiligheidTekst = buildVeiligheidTekst(misdrijven, kerncijfers?.AantalInwoners_5);
  const sociaalTekst = buildSociaalTekst(kerncijfers);
  const fysiekTekst = buildFysiekTekst(kerncijfers);
  // Eén item per voorziening waarvan het CBS-cijfer er echt is — ontbrekende
  // voorzieningen laten simpelweg geen item achter, geen gok.
  const voorzieningItems: VoorzieningAfstand[] = VOORZIENING_DEFINITIES.map((d): VoorzieningAfstand | null => {
    const km = nabijheid?.[d.cbsVeld];
    return km != null ? { key: d.key, label: d.label, thema: d.thema, afstandKm: round1Num(km) } : null;
  }).filter((item): item is VoorzieningAfstand => item !== null);
  const voorzieningenTekst = buildVoorzieningenTekst(voorzieningItems);

  // Dezelfde ruwe cijfers als hierboven, nu ook los teruggegeven (naast de
  // samengestelde zin) zodat de UI ze als stat-kaart kan tonen i.p.v. alleen
  // verstopt in een zin — geen nieuwe berekening, geen schatting.
  const misdrijvenPer1000 =
    misdrijven?.GeregistreerdeMisdrijven_1 != null && kerncijfers?.AantalInwoners_5
      ? round1Num((misdrijven.GeregistreerdeMisdrijven_1 / kerncijfers.AantalInwoners_5) * 1000)
      : null;
  const percentageEenpersoons =
    kerncijfers?.Eenpersoonshuishoudens_30 != null && kerncijfers?.HuishoudensTotaal_29
      ? Math.round((kerncijfers.Eenpersoonshuishoudens_30 / kerncijfers.HuishoudensTotaal_29) * 100)
      : null;
  // Werd al opgehaald (HuishoudensMetKinderen_32 stond al in de $select
  // hieronder) maar nergens verwerkt — zelfde berekening als hierboven.
  const percentageMetKinderen =
    kerncijfers?.HuishoudensMetKinderen_32 != null && kerncijfers?.HuishoudensTotaal_29
      ? Math.round((kerncijfers.HuishoudensMetKinderen_32 / kerncijfers.HuishoudensTotaal_29) * 100)
      : null;

  return {
    buurtnaam: buurt.buurtnaam,
    gemeentenaam: buurt.gemeentenaam ?? kerncijfers?.Gemeentenaam_1 ?? null,
    peiljaar: misdrijven?.Perioden ? misdrijven.Perioden.slice(0, 4) : null,
    samenvatting: buildSamenvatting(veiligheidTekst, sociaalTekst),
    veiligheid: {
      tekst: veiligheidTekst,
      misdrijvenPer1000,
      aantalMisdrijven: misdrijven?.GeregistreerdeMisdrijven_1 ?? null,
    },
    sociaal: {
      tekst: sociaalTekst,
      inwoners: kerncijfers?.AantalInwoners_5 ?? null,
      huishoudens: kerncijfers?.HuishoudensTotaal_29 ?? null,
      gemiddeldeHuishoudensgrootte:
        kerncijfers?.GemiddeldeHuishoudensgrootte_33 != null ? round1Num(kerncijfers.GemiddeldeHuishoudensgrootte_33) : null,
      percentageEenpersoons,
      percentageMetKinderen,
    },
    fysiek: {
      tekst: fysiekTekst,
      bevolkingsdichtheid: kerncijfers?.Bevolkingsdichtheid_34 ?? null,
      percentageEengezinswoning: kerncijfers?.PercentageEengezinswoning_40 ?? null,
      percentageMeergezinswoning: kerncijfers?.PercentageMeergezinswoning_45 ?? null,
    },
    voorzieningen: {
      tekst: voorzieningenTekst,
      items: voorzieningItems,
    },
    duiding: buildDuiding(veiligheidTekst, sociaalTekst, fysiekTekst, voorzieningenTekst),
  };
}

function missingFields(data: BuurtprofielData): string[] {
  const missing: string[] = [];
  if (!data.veiligheid.tekst) missing.push("veiligheid");
  if (!data.sociaal.tekst) missing.push("sociaal");
  if (!data.fysiek.tekst) missing.push("fysiek");
  if (!data.voorzieningen.tekst) missing.push("voorzieningen");
  return missing;
}

function isEmpty(data: BuurtprofielData): boolean {
  return !data.veiligheid.tekst && !data.sociaal.tekst && !data.fysiek.tekst && !data.voorzieningen.tekst;
}

// Publiek adapter-entrypunt. Altijd "live" (er is geen mock-modus nodig: CBS
// en de politie-wijkcijfers zijn gratis en keyless, net als bouwjaar bij BAG)
// — bij een fout/timeout/lege respons geeft withResilience gewoon een
// eerlijke "niet beschikbaar"-status terug, nooit een gok.
export async function fetchBuurtprofiel(address: AddressMeta): Promise<SourceResult<BuurtprofielData>> {
  return withResilience(() => fetchLive(address), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "confirmed",
    timeoutMs: 8000,
    isEmpty,
    missingFields,
  });
}
