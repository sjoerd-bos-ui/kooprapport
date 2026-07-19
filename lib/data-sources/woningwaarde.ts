import type { AddressMeta, MarketData } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { createRng, randomInt, delay } from "@/lib/utils/seed";
import { withResilience } from "@/lib/adapters/withResilience";
import { DATA_SOURCE_CONFIG, getApiKey } from "@/lib/config/dataSources";

// -----------------------------------------------------------------------------
// Woningwaarde-adapter → levert MarketData (het "market"-domein van het
// canonieke Report-model, zie types/report.ts).
//
// Waarom Altum AI en niet WOZ of een echte verkoopprijs: er bestaat geen
// officiële/gratis WOZ-API (wozwaardeloket.nl verbiedt geautomatiseerde
// bevraging, de Kadaster "WOZ Bevragen"-API is wettelijk beperkt tot
// Huisvestingswet/verhuurderschap/belastingdoeleinden) en er bestaat geen
// gratis bron voor de laatste verkoopprijs (Kadaster Koopsommenregister is
// uitsluitend een betaald, handmatig product per adres). Altum AI's
// Woningwaarde API (AVM — Automated Valuation Model) is in plaats daarvan
// gekozen: een verifieerbaar model met een expliciete bandbreedte/
// betrouwbaarheidsmaat, nooit gepresenteerd als taxatie, WOZ-waarde of
// bevestigde verkoopprijs — zie de i-toelichting in ReportView.tsx.
//
// Documentatie: https://docs.altum.ai/taxeren-en-waarderen/woningwaarde+-api
// Endpoint: POST https://api.altum.ai/avmplus (header x-api-key)
// Sandbox (gratis, geen credits, publieke gedeelde sleutel, mock-output):
// POST https://api.altum.ai/sandbox/avmplus — zie ALTUM_SANDBOX in .env.example.
//
// GEKOZEN: Woningwaarde+ (avmplus) i.p.v. de basis Woningwaarde API (avm) —
// bewuste keuze, besproken met de gebruiker. Het basismodel is volledig
// NRVT-conform (taxateursgebruik); dat claimt dit rapport zelf nergens (zie
// de "geen officiële taxatie, geen WOZ-waarde"-disclaimer in ReportView.tsx/
// ReportDocument.tsx), dus dat voordeel leveren we toch niet uit. Altum
// positioneert Woningwaarde+ zelf expliciet voor "waarde-indicaties in
// softwaretoepassingen zoals websites" — precies dit gebruik — met bredere
// dekking (minder mislukte adressen) en volgens Altum snellere/nauwkeurigere
// schattingen. Prijstabel (docs.altum.ai/platform/maandabonnementen) noemt
// alleen "de Woningwaarde API" expliciet, niet apart "Woningwaarde+" — dat
// wijst op dezelfde staffel, maar is niet 1-op-1 bevestigd; controleer dit
// in Mopsus voordat er ooit met een echte sleutel (ALTUM_SANDBOX=false)
// gedraaid wordt.
//
// BEVESTIGD (lokaal getest, zie console.info hieronder): /sandbox/avmplus
// bestaat en geeft 200 terug. Wel een verschil met Altum's eigen
// documentatievoorbeeld: de sandbox levert de veldnamen met underscores
// (bv. "price_estimation", "valuation_date"), terwijl het gedocumenteerde
// productievoorbeeld ze aan elkaar geschreven toont ("priceestimation",
// "valuationdate") — inconsistentie tussen sandbox en documentatie, geen
// aanname meer waard. mapAvmResponse() hieronder leest daarom defensief
// beide varianten, zodat dit werkt ongeacht welke spelling productie
// daadwerkelijk gebruikt.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "market";
const SOURCE_LABEL = "Geschatte woningwaarde (model)";

// Publieke, door Altum zelf gepubliceerde sandbox-sleutel (géén geheim van de
// gebruiker) — alleen gebruikt wanneer ALTUM_SANDBOX=true, uitsluitend om
// zonder credits/aanmelding te kunnen testen. Bron: docs.altum.ai/ontwikkelaars/sandbox
const ALTUM_SANDBOX_PUBLIC_KEY = "m2ipzWVV3e9yPU9TduqpY4oZTbcEHCGj31GLVLYB";

// Woningwaarde+ (avmplus) geeft, anders dan de basis-AVM-API, een platte
// respons terug (geen "Output"-wrapper), en levert geen "Rooms" — dat veld
// blijft bij deze bron voortaan dus altijd undefined (eerlijk "onbekend",
// geen gok). Bij een 400/401 e.d. komt er geen JSON in dit formaat terug
// (zie de foutafhandeling in fetchLive hieronder).
//
// Veldnamen zijn hieronder BEIDE varianten die in de praktijk zijn gezien
// (zie toelichting bovenaan dit bestand): het gedocumenteerde
// productievoorbeeld schrijft ze aan elkaar ("priceestimation"), de
// daadwerkelijke sandbox-respons gebruikt underscores ("price_estimation").
// mapAvmResponse() hieronder probeert altijd beide, in die volgorde.
export interface AltumAvmPlusApiResponse {
  bagid?: string;
  bag_id?: string;
  postcode?: string;
  housenumber?: string;
  houseaddition?: string | null;
  city?: string;
  street?: string;
  housetype?: string;
  house_type?: string;
  buildyear?: string;
  build_year?: string | number;
  innersurfacearea?: string;
  inner_surface_area?: string | number;
  outersurfacearea?: string;
  outer_surface_area?: string | number;
  volume?: string | number;
  energylabel?: string | null;
  energy_label?: string | null;
  longitude?: string | number;
  latitude?: string | number;
  valuationdate?: string; // YYYYMMDD
  valuation_date?: string; // YYYYMMDD
  priceestimation?: string;
  price_estimation?: string;
  confidence?: string; // vrije tekst, bv. "90% Confidence Interval is 250273-305890."
}

// "YYYYMMDD" → "YYYY-MM-DD", zodat lib/utils/format.ts#formatDate() (die
// new Date() gebruikt) het correct kan parsen. Geen aanname over tijdzone
// nodig: alleen de kalenderdatum wordt gebruikt.
function naarIsoDatum(yyyymmdd: string): string | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(yyyymmdd);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

// Confidence komt als vrije tekst binnen, bv.
// "90% Confidence Interval is 327363-429880." — hier ontleden we alleen de
// twee getallen; lukt dat niet (ander formaat, ontbrekend), dan blijven
// bandbreedteMin/Max bewust undefined i.p.v. een gegokt cijfer.
function ontleedBandbreedte(confidence?: string): { min?: number; max?: number } {
  if (!confidence) return {};
  const match = /(\d+)\s*-\s*(\d+)/.exec(confidence);
  if (!match) return {};
  // Zelfde defensieve volgorde als buurtverkopen.ts#ontleedPrijsbandbreedte:
  // niet aannemen dat de eerste waarde de laagste is.
  const a = Number(match[1]);
  const b = Number(match[2]);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export function mapAvmResponse(raw: AltumAvmPlusApiResponse): Partial<MarketData> {
  if (!raw || typeof raw !== "object") return {};

  const priceRaw = raw.price_estimation ?? raw.priceestimation;
  const geschatteWaarde = priceRaw != null ? Number(priceRaw) : undefined;
  if (geschatteWaarde == null || Number.isNaN(geschatteWaarde)) return {};

  const { min, max } = ontleedBandbreedte(raw.confidence);
  const valuationDateRaw = raw.valuation_date ?? raw.valuationdate;
  const waarderingsdatum = valuationDateRaw ? naarIsoDatum(valuationDateRaw) : undefined;
  // Woningwaarde+ (avmplus) levert, anders dan de basis-AVM-API, geen Rooms
  // veld — rooms blijft daarom bewust undefined ("onbekend" in de UI), geen
  // gok op basis van bv. oppervlakte.
  // volume: Altum's eigen inhoudsschatting, net als bij de basis-API.
  const volume = raw.volume != null ? Number(raw.volume) : undefined;

  return {
    geschatteWaarde,
    bandbreedteMin: min,
    bandbreedteMax: max,
    betrouwbaarheidstekst: raw.confidence,
    waarderingsdatum,
    volume: volume != null && !Number.isNaN(volume) ? volume : undefined,
  };
}

function generateMock(address: AddressMeta): MarketData {
  const rng = createRng(`${address.slug}-woningwaarde`);
  const geschatteWaarde = Math.round(randomInt(rng, 220000, 780000) / 1000) * 1000;
  const bandbreedteMin = Math.round((geschatteWaarde * 0.9) / 1000) * 1000;
  const bandbreedteMax = Math.round((geschatteWaarde * 1.1) / 1000) * 1000;
  const vandaag = new Date().toISOString().slice(0, 10);

  return {
    geschatteWaarde,
    bandbreedteMin,
    bandbreedteMax,
    betrouwbaarheidstekst: `90% Confidence Interval is ${bandbreedteMin}-${bandbreedteMax}.`,
    waarderingsdatum: vandaag,
    rooms: randomInt(rng, 2, 6),
    volume: randomInt(rng, 140, 420),
  };
}

async function fetchLive(address: AddressMeta): Promise<MarketData> {
  const config = DATA_SOURCE_CONFIG.woningwaarde;
  const isSandbox = process.env.ALTUM_SANDBOX === "true";
  const apiKey = isSandbox ? ALTUM_SANDBOX_PUBLIC_KEY : getApiKey(config);

  if (!config.baseUrl || !apiKey) {
    throw new Error("Geen Altum-koppeling geconfigureerd (baseUrl/API-key ontbreken).");
  }

  const path = isSandbox ? "/sandbox/avmplus" : "/avmplus";
  // Altum kent geen apart huisletter-veld — hun "houseaddition" is de
  // combinatie van huisletter + toevoeging in die volgorde, als één string
  // (bv. huisletter "B", geen toevoeging -> "B"; huisletter "A" + toevoeging
  // "02" -> "A02"). Zie docs.altum.ai/.../house-numbers-and-additions.
  // Dit was eerder een echte bug: alleen address.toevoeging werd gestuurd,
  // dus een adres als "28B" (huisletter B, geen toevoeging) kwam bij Altum
  // binnen als kaal huisnummer 28 zonder de "B" — waardoor Altum voor een
  // adres dat wél bestaat toch "geen resultaat" teruggaf.
  const houseaddition = `${address.huisletter ?? ""}${address.toevoeging ?? ""}`;
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      postcode: address.postcode,
      // Altum's schema verwacht housenumber als getal, niet als tekst (zie
      // hun OpenAPI-spec: "type": "integer"). address.huisnummer is bij ons
      // een string (zie types/report.ts) — hier expliciet omgezet zodat het
      // verzoek niet op een type-mismatch afketst.
      housenumber: Number(address.huisnummer),
      ...(houseaddition ? { houseaddition } : {}),
    }),
  });

  if (res.status === 400) {
    // Bekend, geldig "geen resultaat"-antwoord (adres niet in AVM-database,
    // woningtype onbekend, schatting te laag e.d.) — geen storing, gewoon
    // eerlijk "geen data" teruggeven i.p.v. te gokken.
    return {} as MarketData;
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
    throw new Error(`Altum Woningwaarde API gaf status ${res.status}`);
  }

  const raw: AltumAvmPlusApiResponse = await res.json();
  if (isSandbox) {
    // Alleen in sandbox-modus: loggen wat Altum daadwerkelijk teruggaf voor
    // dit adres — de enige manier om te zien of /sandbox/avmplus echt
    // hetzelfde soort respons geeft als /sandbox/avm (niet apart bevestigd
    // in Altum's documentatie, zie de toelichting bovenaan dit bestand).
    console.info("[woningwaarde/sandbox] raw Altum-respons (avmplus):", JSON.stringify(raw));
  }
  return mapAvmResponse(raw) as MarketData;
}

function missingFields(data: MarketData): string[] {
  const missing: string[] = [];
  if (data.geschatteWaarde == null) missing.push("geschatteWaarde");
  // waarderingsdatum bewust niet meetellen: dit is een bijkomend detail (de
  // datum van Altum's schatting), geen kernveld — het als "ontbrekend"
  // labelen liet het rapport onterecht onvolledig lijken.
  return missing;
}

export async function fetchMarket(address: AddressMeta): Promise<SourceResult<MarketData>> {
  const config = DATA_SOURCE_CONFIG.woningwaarde;

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

  return withResilience(() => fetchLive(address), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "premium",
    timeoutMs: config.timeoutMs,
    missingFields,
  });
}
