import type { AddressMeta, VerduurzamingData, VerduurzamingMaatregel } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { createRng, randomInt, randomChoice, delay } from "@/lib/utils/seed";
import { withResilience } from "@/lib/adapters/withResilience";
import { DATA_SOURCE_CONFIG, getApiKey } from "@/lib/config/dataSources";

// -----------------------------------------------------------------------------
// Verduurzamingsadvies-adapter → levert VerduurzamingData (het
// "verduurzaming"-domein van het canonieke Report-model, zie types/report.ts).
//
// Bron: Altum AI Verduurzaming API v2 — modelmatig advies (NTA 8800-methodiek)
// over huidig/haalbaar energielabel, concrete maatregelen en de bijbehorende
// Ecowaarde (marktwaardestijging). GEEN vervanging voor een officieel
// energieadvies/-label — zie de disclaimer in ReportView.tsx.
//
// Documentatie: https://docs.altum.ai/verduurzamen/verduurzaming-api-v2
// Endpoint: POST https://api.altum.ai/v2/sustainability (header x-api-key)
//
// Zelfde kostenlogica als woningwaarde.ts/buurtverkopen.ts: dit kost credits
// per aanroep, dus deze adapter wordt uitsluitend aangeroepen vanuit
// fetchPremiumOnUnlock() (reportService.ts), nooit bij een gewone,
// onbetaalde paginaweergave.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "verduurzaming";
const SOURCE_LABEL = "Verduurzamingsadvies (Altum AI, NTA 8800)";

// Nederlandse weergavenamen per Altum-maatregelcode. Bewust een losse,
// best-effort lookup i.p.v. een uitputtende/strikte enum: duikt Altum ooit
// een nieuwe maatregelcode op die hier nog niet in staat, dan valt
// labelVoorMaatregel() terug op een leesbaar-gemaakte versie van de code
// zelf (zie hieronder) i.p.v. de hele adapter te laten breken.
const MAATREGEL_LABELS: Record<string, string> = {
  wall_insulation: "Gevelisolatie",
  floor_insulation: "Vloerisolatie",
  roof_insulation: "Dakisolatie",
  sloped_roof_insulation: "Dakisolatie (schuin dak)",
  flat_roof_insulation: "Dakisolatie (plat dak)",
  living_room_windows: "Beglazing woonkamer",
  bedroom_windows: "Beglazing slaapkamers",
  ventilation: "Ventilatie",
  solar_panels: "Zonnepanelen",
  installation: "Verwarmingsinstallatie",
  instalation: "Verwarmingsinstallatie", // bekende typefout in Altum's eigen v1-respons, zekerheidshalve ook hier opgevangen
  shower: "Douche-warmteterugwinning",
};

function labelVoorMaatregel(key: string): string {
  if (MAATREGEL_LABELS[key]) return MAATREGEL_LABELS[key];
  // Nette terugval: "some_new_key" -> "Some new key"
  const leesbaar = key.replace(/_/g, " ");
  return leesbaar.charAt(0).toUpperCase() + leesbaar.slice(1);
}

// -----------------------------------------------------------------------------
// Ruwe respons-vorm — BEVESTIGD via docs.altum.ai (authenticatie-invoer-en-
// resultaat.md + resultaat-interpretatie.md), 27-07-2026. Let op: Altum's
// eigen documentatie is op een aantal punten intern inconsistent tussen het
// veldreferentie-overzicht en de twee voorbeeld-responses (bv. "total_saving"
// vs. "total_savings", "saving" vs. "savings" per maatregel, en
// energy_cost_monthly als los getal vs. als {current,potential}-object).
// mapSustainabilityResponse() hieronder leest daarom overal defensief BEIDE
// varianten i.p.v. te gokken welke de huidige is — exact dezelfde
// voorzichtige aanpak als de rest van dit project bij een onzekere/wisselende
// bronvorm (zie bv. bestemming.ts voor het omgevingsplan-fallback-patroon).
// -----------------------------------------------------------------------------
interface AltumMaatregelKant {
  desc?: string;
  value?: number;
  points?: number | null;
}

interface AltumMaatregel {
  before?: AltumMaatregelKant;
  after?: AltumMaatregelKant;
  investment?: number;
  saving?: number;
  savings?: number;
  co2_reduce?: number;
  BENG2?: string;
  gas_savings?: number;
  electricity_savings?: number;
}

interface AltumSustainabilityResponse {
  warnings?: { code?: string; description?: string }[];
  label?: { current?: string | null; potential?: string | null };
  CO2?: { current?: number | null; potential?: number | null };
  financial?: {
    total_investment?: number;
    total_saving?: number;
    total_savings?: number;
    months_to_pay_off?: number;
    eco_value?: number | null;
    savings_monthly?: number;
    energy_cost_monthly?: number | { current?: number; potential?: number };
    energy_cost_yearly?: { current?: number; potential?: number };
  };
  measures?: Record<string, AltumMaatregel>;
}

export function mapSustainabilityResponse(raw: AltumSustainabilityResponse | string | null | undefined): Partial<VerduurzamingData> {
  if (!raw || typeof raw !== "object") return {};

  const huidigLabel = raw.label?.current ?? null;
  const haalbaarLabel = raw.label?.potential ?? null;

  const financial = raw.financial ?? {};
  const investering = financial.total_investment ?? null;
  const besparingPerJaar = financial.total_saving ?? financial.total_savings ?? null;
  const terugverdientijdMaanden = financial.months_to_pay_off ?? null;
  const waardestijging = financial.eco_value ?? null;

  // energy_cost_monthly komt in Altum's documentatie in twee vormen voor
  // (los getal ná alle maatregelen, óf {current,potential}) — defensief
  // beide vormen afhandelen i.p.v. aan te nemen welke dit is.
  const energyCostMonthly = financial.energy_cost_monthly;
  const energyCostYearly = financial.energy_cost_yearly;
  let energierekeningHuidigPerJaar: number | null = null;
  let energierekeningNaPerJaar: number | null = null;
  if (energyCostYearly?.current != null) energierekeningHuidigPerJaar = energyCostYearly.current;
  if (energyCostYearly?.potential != null) energierekeningNaPerJaar = energyCostYearly.potential;
  if (energierekeningHuidigPerJaar == null && typeof energyCostMonthly === "object" && energyCostMonthly?.current != null) {
    energierekeningHuidigPerJaar = Math.round(energyCostMonthly.current * 12);
  }
  if (energierekeningNaPerJaar == null && typeof energyCostMonthly === "object" && energyCostMonthly?.potential != null) {
    energierekeningNaPerJaar = Math.round(energyCostMonthly.potential * 12);
  }
  if (energierekeningNaPerJaar == null && typeof energyCostMonthly === "number") {
    energierekeningNaPerJaar = Math.round(energyCostMonthly * 12);
  }

  const co2Current = raw.CO2?.current ?? null;
  const co2Potential = raw.CO2?.potential ?? null;
  // Nooit een negatieve/onzinnige "reductie" tonen — alleen zetten als beide
  // bekend zijn én potential daadwerkelijk lager is dan current.
  const co2ReductieKg = co2Current != null && co2Potential != null && co2Potential < co2Current ? Math.round(co2Current - co2Potential) : null;

  const maatregelen: VerduurzamingMaatregel[] = [];
  for (const [key, m] of Object.entries(raw.measures ?? {})) {
    const van = m.before?.desc ?? "Onbekend";
    const naar = m.after?.desc ?? "Onbekend";
    const investeringMaatregel = m.investment ?? 0;
    // Regels zonder daadwerkelijk advies (bv. beglazing die al voldoet:
    // before.desc === after.desc, investering 0) worden hier al weggelaten
    // — de UI hoeft dan geen "Geen wijziging"-rijen te tonen.
    if (van === naar && investeringMaatregel <= 0) continue;

    maatregelen.push({
      key,
      label: labelVoorMaatregel(key),
      van,
      naar,
      investering: investeringMaatregel,
      besparingPerJaar: m.saving ?? m.savings ?? 0,
      co2ReductieKg: m.co2_reduce ?? null,
    });
  }
  // Grootste investering eerst — meestal ook de maatregel met de meeste
  // impact (isolatie/installatie), prettiger leesvolgorde dan Altum's eigen,
  // niet-gegarandeerde veldvolgorde.
  maatregelen.sort((a, b) => b.investering - a.investering);

  return {
    huidigLabel,
    haalbaarLabel,
    investering,
    besparingPerJaar,
    terugverdientijdMaanden,
    waardestijging,
    energierekeningHuidigPerJaar,
    energierekeningNaPerJaar,
    co2ReductieKg,
    maatregelen,
  };
}

// -----------------------------------------------------------------------------
// Mockdata — deterministisch per adres, met "huidig label D -> haalbaar A" als
// het meest voorkomende scenario (representatief voor de gemiddelde
// naoorlogse Nederlandse rijtjes-/hoekwoning, en het scenario dat de
// gebruiker zelf als voorbeeld koos voor de eerste visuele uitwerking).
// -----------------------------------------------------------------------------
const MOCK_LABEL_SCENARIOS: { huidig: string; haalbaar: string; weight: number }[] = [
  { huidig: "D", haalbaar: "A", weight: 4 },
  { huidig: "C", haalbaar: "A", weight: 3 },
  { huidig: "E", haalbaar: "B", weight: 2 },
  { huidig: "F", haalbaar: "B", weight: 1 },
  { huidig: "G", haalbaar: "B", weight: 1 },
];

function generateMock(address: AddressMeta): VerduurzamingData {
  const rng = createRng(`${address.slug}-verduurzaming`);
  const scenario = (() => {
    const total = MOCK_LABEL_SCENARIOS.reduce((s, x) => s + x.weight, 0);
    let r = rng() * total;
    for (const s of MOCK_LABEL_SCENARIOS) {
      if (r < s.weight) return s;
      r -= s.weight;
    }
    return MOCK_LABEL_SCENARIOS[0];
  })();

  const investering = randomInt(rng, 16000, 42000);
  const besparingPerJaar = randomInt(rng, 850, 2100);
  const terugverdientijdMaanden = Math.round((investering / besparingPerJaar) * 12);
  const waardestijging = randomInt(rng, 12000, 34000);
  const energierekeningHuidigPerJaar = randomInt(rng, 2200, 3400);
  const energierekeningNaPerJaar = Math.max(400, energierekeningHuidigPerJaar - besparingPerJaar);
  const co2ReductieKg = randomInt(rng, 1400, 3600);

  const mogelijkeMaatregelen: VerduurzamingMaatregel[] = [
    { key: "wall_insulation", label: labelVoorMaatregel("wall_insulation"), van: "Matig", naar: "Goed", investering: randomInt(rng, 6000, 14000), besparingPerJaar: randomInt(rng, 150, 400), co2ReductieKg: randomInt(rng, 200, 500) },
    { key: "floor_insulation", label: labelVoorMaatregel("floor_insulation"), van: "Geen", naar: "Goed", investering: randomInt(rng, 1800, 4200), besparingPerJaar: randomInt(rng, 100, 260), co2ReductieKg: randomInt(rng, 150, 350) },
    { key: "installation", label: labelVoorMaatregel("installation"), van: "HR-combi", naar: randomChoice(rng, ["WP lucht/water combi", "Hybride warmtepomp"]), investering: randomInt(rng, 9000, 18000), besparingPerJaar: randomInt(rng, 300, 700), co2ReductieKg: randomInt(rng, 500, 1200) },
    { key: "solar_panels", label: labelVoorMaatregel("solar_panels"), van: "0", naar: String(randomInt(rng, 10, 22)), investering: randomInt(rng, 4500, 9500), besparingPerJaar: randomInt(rng, 350, 750), co2ReductieKg: randomInt(rng, 400, 900) },
  ];

  return {
    huidigLabel: scenario.huidig,
    haalbaarLabel: scenario.haalbaar,
    investering,
    besparingPerJaar,
    terugverdientijdMaanden,
    waardestijging,
    energierekeningHuidigPerJaar,
    energierekeningNaPerJaar,
    co2ReductieKg,
    maatregelen: mogelijkeMaatregelen.sort((a, b) => b.investering - a.investering),
  };
}

async function fetchLive(address: AddressMeta, opts?: { bouwjaar?: number; oppervlakteM2?: number }): Promise<VerduurzamingData> {
  const config = DATA_SOURCE_CONFIG.verduurzaming;
  const apiKey = getApiKey(config);

  if (!config.baseUrl || !apiKey) {
    throw new Error("Geen Altum-koppeling geconfigureerd (baseUrl/API-key ontbreken).");
  }

  // Zelfde huisletter+toevoeging-samenvoeging als woningwaarde.ts (Altum kent
  // zelf geen apart huisletter-veld) — zie docs.altum.ai/.../house-numbers-
  // and-additions.
  const houseaddition = `${address.huisletter ?? ""}${address.toevoeging ?? ""}`;

  const res = await fetch(`${config.baseUrl}/v2/sustainability`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      postcode: address.postcode,
      housenumber: Number(address.huisnummer),
      ...(houseaddition ? { houseaddition } : {}),
      // Bouwjaar/oppervlakte: alleen meesturen als al bekend (gratis BAG-
      // data uit hetzelfde rapport) — verbetert Altum's schatting, maar is
      // geen vereiste invoer; ontbreekt het, dan schat Altum het zelf.
      ...(opts?.bouwjaar != null ? { build_year: opts.bouwjaar } : {}),
      ...(opts?.oppervlakteM2 != null ? { inner_surface_area: opts.oppervlakteM2 } : {}),
      // target_label bewust NIET meegestuurd: Altum's eigen default (A) is
      // precies wat we willen tonen ("wat is haalbaar richting het beste
      // label"), geen lager, eigen gekozen doel.
    }),
  });

  if (res.status === 400) {
    // Bekend, geldig "geen resultaat"-antwoord (adres onbekend, geen
    // maatregelen te suggereren e.d.) — geen storing, eerlijk "geen data".
    return {} as VerduurzamingData;
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("Altum wees de sleutel af (401/403). Controleer of de sleutel correct is overgenomen.");
  }
  if (res.status === 422) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body === "object" ? JSON.stringify(body) : String(body);
    } catch {
      // negeren, val terug op generieke tekst
    }
    throw new Error(`Altum wees de invoer af (422, ongeldig formaat)${detail ? ": " + detail : ""}`);
  }
  if (res.status === 429) {
    throw new Error("Altum gaf 429. Limiet bereikt (te veel verzoeken, of onvoldoende credits/abonnement).");
  }
  if (!res.ok) {
    throw new Error(`Altum Verduurzaming API gaf status ${res.status}`);
  }

  const raw: AltumSustainabilityResponse = await res.json();
  return mapSustainabilityResponse(raw) as VerduurzamingData;
}

function missingFields(data: VerduurzamingData): string[] {
  const missing: string[] = [];
  if (data.huidigLabel == null) missing.push("huidigLabel");
  if (data.haalbaarLabel == null) missing.push("haalbaarLabel");
  if (data.investering == null) missing.push("investering");
  return missing;
}

export async function fetchVerduurzaming(
  address: AddressMeta,
  opts?: { bouwjaar?: number; oppervlakteM2?: number }
): Promise<SourceResult<VerduurzamingData>> {
  const config = DATA_SOURCE_CONFIG.verduurzaming;

  if (config.mode === "mock") {
    return withResilience(
      async () => {
        await delay(500 + Math.random() * 350);
        return generateMock(address);
      },
      {
        source: SOURCE_KEY,
        label: SOURCE_LABEL,
        mode: "mock",
        status: "mock",
        timeoutMs: config.timeoutMs,
        missingFields,
      }
    );
  }

  return withResilience(() => fetchLive(address, opts), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "premium",
    timeoutMs: config.timeoutMs,
    missingFields,
  });
}
