import type { AddressMeta, NearbySalesDataRaw, NearbySaleRaw } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { createRng, randomInt, delay } from "@/lib/utils/seed";
import { withResilience } from "@/lib/adapters/withResilience";
import { DATA_SOURCE_CONFIG, getApiKey } from "@/lib/config/dataSources";

// -----------------------------------------------------------------------------
// Buurtverkopen-adapter — Altum AI's Interactieve Woningreferentie API
// (Interactive Reference API) → levert NearbySalesDataRaw (het
// "nearbySales"-domein van het canonieke Report-model, zie types/report.ts).
//
// Waarom Altum en niet rechtstreeks het Kadaster: individuele
// verkooptransacties zijn openbare registerdata, maar geautomatiseerde
// bevraging rechtstreeks bij het Kadaster Koopsommenregister vereist een
// eigen (duurder) contract. Altum's Woningreferentie API zit al in het
// gewone Altum-abonnement (dezelfde ALTUM_API_KEY als de Woningwaarde-
// adapter) en put zelf uit Kadaster-transacties — zie
// docs.altum.ai/taxeren-en-waarderen/interactieve-woningreferentie-api.
//
// Endpoint: POST https://api.altum.ai/interactive-reference (header x-api-key)
// Sandbox (gratis, geen credits, publieke gedeelde sleutel, vaste testdata):
// POST https://api.altum.ai/sandbox/interactive-reference — zelfde
// ALTUM_SANDBOX-toggle als woningwaarde.ts.
//
// Deze adapter levert transacties zoals de bron ze aanlevert — géén
// vergelijking met het opgezochte adres. Of een verkoop "vergelijkbaar" is
// en hoeveel deze afwijkt, is geen brongegeven maar een eigen berekening
// t.o.v. de woning uit building/market; dat gebeurt pas in de
// enrichmentstap (lib/services/insights.ts::enrichNearbySales), ná het
// parallel ophalen van alle bronnen. Zo blijft deze adapter puur en
// onafhankelijk bevraagbaar, zoals de echte bron ook is.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "nearbySales";
const SOURCE_LABEL = "Buurtverkopen (Altum AI Woningreferentie, bron: Kadaster)";

// Publieke, door Altum zelf gepubliceerde sandbox-sleutel (géén geheim van de
// gebruiker) — alleen gebruikt wanneer ALTUM_SANDBOX=true. Bron:
// docs.altum.ai/ontwikkelaars/sandbox (Interactive Reference API staat
// expliciet in de lijst van door de sandbox ondersteunde API's).
const ALTUM_SANDBOX_PUBLIC_KEY = "m2ipzWVV3e9yPU9TduqpY4oZTbcEHCGj31GLVLYB";

export interface AltumReferenceHouse {
  PostCode?: string;
  HouseNumber?: number;
  HouseAddition?: string | null;
  Street?: string;
  City?: string;
  InnerSurfaceArea?: number;
  Transactiondate?: number; // formaat YYYYMM (geen dag bekend)
  TransactionPrice?: string; // bandbreedte als tekst, bv. "275000-300000"
}
export interface AltumReferenceApiResponse {
  ReferenceData?: {
    ReferenceHouses?: AltumReferenceHouse[];
  };
  Output?: string; // bij 400 komt hier een foutmelding als platte string
}

// "275000-300000" -> { min: 275000, max: 300000 }. Ontbreekt of onherkenbaar
// formaat? Dan undefined i.p.v. een gegokt getal.
function ontleedPrijsbandbreedte(bereik?: string): { min?: number; max?: number } {
  if (!bereik) return {};
  const match = /(\d+)\s*-\s*(\d+)/.exec(bereik);
  if (!match) return {};
  // Niet aannemen dat de eerste waarde in de string ook de laagste is — in
  // Altum's (sandbox-)data staat dat lang niet altijd zo (bv. "98069-22429"
  // is gezien), dus expliciet sorteren i.p.v. positioneel toewijzen.
  const a = Number(match[1]);
  const b = Number(match[2]);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

// "202104" (YYYYMM) -> "2021-04-01". Alleen maand bekend, geen exacte dag —
// day=01 is een technisch noodzakelijke placeholder voor new Date(), niet een
// bewering over de exacte transactiedag.
function maandNaarIsoDatum(yyyymm?: number): string | undefined {
  if (yyyymm == null) return undefined;
  const s = String(yyyymm);
  const match = /^(\d{4})(\d{2})$/.exec(s);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}-01`;
}

export function mapReferenceResponse(raw: AltumReferenceApiResponse): Partial<NearbySalesDataRaw> {
  const huizen = raw.ReferenceData?.ReferenceHouses ?? [];
  const verkopen: NearbySaleRaw[] = huizen
    .map((h): NearbySaleRaw | null => {
      const { min, max } = ontleedPrijsbandbreedte(h.TransactionPrice);
      const verkoopdatum = maandNaarIsoDatum(h.Transactiondate);
      if (!h.Street || h.HouseNumber == null || min == null || max == null || !h.InnerSurfaceArea || !verkoopdatum) {
        return null;
      }
      const verkoopprijs = Math.round((min + max) / 2);
      return {
        adres: `${h.Street} ${h.HouseNumber}${h.HouseAddition ?? ""}, ${h.City ?? ""}`.trim(),
        verkoopdatum,
        verkoopprijs,
        verkoopprijsMin: min,
        verkoopprijsMax: max,
        oppervlakteM2: h.InnerSurfaceArea,
        prijsPerM2: Math.round(verkoopprijs / h.InnerSurfaceArea),
      };
    })
    .filter((v): v is NearbySaleRaw => v !== null)
    // Meest recente verkopen eerst, zoals de rest van de app (bouwjaar,
    // buurtverkopen-mock) al doet — Altum sorteert zelf op relevantie, niet op datum.
    .sort((a, b) => new Date(b.verkoopdatum).getTime() - new Date(a.verkoopdatum).getTime());

  const gemiddeldePrijsPerM2 =
    verkopen.length > 0
      ? Math.round(verkopen.reduce((sum, v) => sum + v.prijsPerM2, 0) / verkopen.length)
      : undefined;

  return {
    // BELANGRIJK: dit is het aantal gevonden transacties binnen de gezochte
    // buurt/periode, gemaximeerd door Altum's reference_number (max. 30) — bij
    // een erg actieve buurt kan het werkelijke totaal dus hoger liggen dan wat
    // hier getoond wordt. Geen gegokt totaal, wel een mogelijk onvolledige telling.
    aantalLaatste12Maanden: verkopen.length,
    gemiddeldePrijsPerM2,
    verkopen,
  };
}

function generateMock(address: AddressMeta): NearbySalesDataRaw {
  const rng = createRng(`${address.slug}-buurt`);
  const aantalLaatste12Maanden = randomInt(rng, 3, 15);
  const gemiddeldePrijsPerM2 = randomInt(rng, 3200, 6800);

  const n = Math.min(aantalLaatste12Maanden, 6);
  const verkopen: NearbySaleRaw[] = [];
  for (let i = 0; i < n; i++) {
    const oppervlakteM2 = randomInt(rng, 50, 200);
    const prijsPerM2 = Math.round(gemiddeldePrijsPerM2 * (0.85 + rng() * 0.3));
    const verkoopprijs = Math.round((oppervlakteM2 * prijsPerM2) / 500) * 500;
    const daysAgo = randomInt(rng, 10, 360);
    const verkoopdatum = new Date();
    verkoopdatum.setDate(verkoopdatum.getDate() - daysAgo);

    verkopen.push({
      adres: `${address.straat} ${randomInt(rng, 1, 180)}, ${address.plaats}`,
      verkoopdatum: verkoopdatum.toISOString(),
      verkoopprijs,
      oppervlakteM2,
      prijsPerM2,
    });
  }

  verkopen.sort(
    (a, b) => new Date(b.verkoopdatum).getTime() - new Date(a.verkoopdatum).getTime()
  );

  // gemiddeldePrijsPerM2 wordt teruggegeven zoals de bron 'm aanlevert (over
  // alle transacties in de buurt, niet alleen de getoonde top-6) — dit is
  // bewust dezelfde waarde die elders (bv. de market-vergelijking in
  // insights.ts) hergebruikt wordt, zodat er nergens een tweede, los
  // gegenereerd "buurtgemiddelde" rondzwerft dat ermee in tegenspraak kan zijn.
  return { aantalLaatste12Maanden, gemiddeldePrijsPerM2, verkopen, zoekvensterMaanden: 12, verruimd: false };
}

// Standaard zoeken we strikt binnen de eigen buurt en 12 maanden terug.
// Zijn er dan te weinig (< 5) vergelijkbare verkopen, dan roept
// fetchPremiumOnUnlock() (reportService.ts) fetchNearbySales() opnieuw aan
// met ruimere opties — tot Altum's eigen grens van 60 maanden. We forceren
// nooit een uitkomst: bestaan er in werkelijkheid geen 5 vergelijkbare
// verkopen, dan blijft het bij minder.
export interface BuurtverkopenZoekOpties {
  strictBuurt?: boolean; // default true — false = ook wijk/regio meenemen
  dateLimitMonths?: number; // default 12 — Altum staat 6 t/m 60 toe
}

const STANDAARD_ZOEKOPTIES: Required<BuurtverkopenZoekOpties> = { strictBuurt: true, dateLimitMonths: 12 };

async function fetchLive(address: AddressMeta, opties: BuurtverkopenZoekOpties = {}): Promise<NearbySalesDataRaw> {
  const { strictBuurt, dateLimitMonths } = { ...STANDAARD_ZOEKOPTIES, ...opties };
  const verruimd = strictBuurt !== STANDAARD_ZOEKOPTIES.strictBuurt || dateLimitMonths !== STANDAARD_ZOEKOPTIES.dateLimitMonths;

  const config = DATA_SOURCE_CONFIG.buurtverkopen;
  const isSandbox = process.env.ALTUM_SANDBOX === "true";
  const apiKey = isSandbox ? ALTUM_SANDBOX_PUBLIC_KEY : getApiKey(config);

  if (!config.baseUrl || !apiKey) {
    throw new Error("Geen Altum-koppeling geconfigureerd (baseUrl/API-key ontbreken).");
  }

  const path = isSandbox ? "/sandbox/interactive-reference" : "/interactive-reference";
  // Zelfde huisletter+toevoeging-combinatie als woningwaarde.ts — Altum kent
  // geen apart huisletter-veld, alleen "houseaddition".
  const houseaddition = `${address.huisletter ?? ""}${address.toevoeging ?? ""}`;
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      postcode: address.postcode,
      housenumber: Number(address.huisnummer),
      ...(houseaddition ? { houseaddition } : {}),
      // strict_buurt: alleen verkopen uit dezelfde CBS-buurt (standaard) —
      // dat is precies wat "buurtverkopen" belooft. Bij te weinig resultaten
      // zet fetchPremiumOnUnlock() dit uit om breder te zoeken.
      strict_buurt: strictBuurt ? 1 : 0,
      // date_limit in maanden: standaard 12, zodat dit overeenkomt met het
      // "aantalLaatste12Maanden"-veld — kan verruimd worden tot max. 60.
      date_limit: dateLimitMonths,
      // reference_number: Altum's maximum (30) — zoveel mogelijk verkopen uit
      // de buurt tonen, niet kunstmatig beperken tot "vergelijkbare" woningen.
      reference_number: 30,
      comparable_housetype: 0,
      comparable_innersurfacearea: 0,
      comparable_buildyear: 0,
      comparable_distance: 0,
    }),
  });

  if (res.status === 400) {
    // Bekend, geldig "geen resultaat"-antwoord (bv. geen transacties in dit
    // gebied/deze periode, of adres onbekend) — geen storing.
    return { aantalLaatste12Maanden: 0, verkopen: [], zoekvensterMaanden: dateLimitMonths, verruimd };
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
    throw new Error(`Altum Woningreferentie API gaf status ${res.status}`);
  }

  const raw: AltumReferenceApiResponse = await res.json();
  const mapped = mapReferenceResponse(raw) as NearbySalesDataRaw;
  return { ...mapped, zoekvensterMaanden: dateLimitMonths, verruimd };
}

function missingFields(data: NearbySalesDataRaw): string[] {
  const missing: string[] = [];
  if (data.gemiddeldePrijsPerM2 == null) missing.push("gemiddeldePrijsPerM2");
  if (!data.verkopen) missing.push("verkopen");
  return missing;
}

function isEmpty(data: NearbySalesDataRaw): boolean {
  return data.aantalLaatste12Maanden === 0 && data.verkopen.length === 0;
}

export async function fetchNearbySales(
  address: AddressMeta,
  opties?: BuurtverkopenZoekOpties
): Promise<SourceResult<NearbySalesDataRaw>> {
  const config = DATA_SOURCE_CONFIG.buurtverkopen;

  if (config.mode === "mock") {
    // Mock-modus simuleert geen verruimd zoeken (geen echte data om breder in
    // te zoeken) — geeft altijd de standaard mock terug.
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
        isEmpty,
      }
    );
  }

  return withResilience(() => fetchLive(address, opties), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "premium",
    timeoutMs: config.timeoutMs,
    missingFields,
    isEmpty,
  });
}
