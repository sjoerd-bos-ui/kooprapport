import type { AddressMeta, EnergyData } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { createRng, randomInt, randomWeightedChoice, delay } from "@/lib/utils/seed";
import { withResilience } from "@/lib/adapters/withResilience";
import { DATA_SOURCE_CONFIG, getApiKey } from "@/lib/config/dataSources";

// -----------------------------------------------------------------------------
// Energielabel-adapter. Twee mogelijke live-bronnen, beide uiteindelijk
// gevoed door dezelfde officiële EP-Online-registratie (RVO):
//
//   1. "ep-online"   — rechtstreeks bij EP-Online. Gratis, maar vereist een
//      aangevraagde API-key (KvK-nummer verplicht bij aanvraag, zie
//      https://apikey.ep-online.nl/). Endpoint en veldnamen hieronder zijn
//      geverifieerd tegen de officiële OpenAPI-spec
//      (https://public.ep-online.nl/swagger/v5/swagger.json) — LET OP: een
//      eerdere versie van dit bestand gebruikte een verzonnen endpoint/schema
//      (labelklasse, isolatie_dak, ...), dat is hieronder gecorrigeerd.
//   2. "overheid-io" — wrapper-API van overheid.io (derde partij). Geen KvK
//      nodig, wel een betaald abonnement (vanaf ca. €15/mnd, 2.500 calls).
//      Endpoint/response geverifieerd tegen hun live documentatie
//      (https://overheid.io/documentatie/v3/energielabels).
//
// Kies de bron via env var ENERGIELABEL_PROVIDER ("ep-online" = default, of
// "overheid-io"). Geen sleutel geconfigureerd voor de gekozen bron? Dan wordt
// hier NIETS gegokt of gesimuleerd: generateEmpty() levert een leeg record,
// en de UI toont eerlijk "Onbekend"/"Niet beschikbaar" i.p.v. een
// voorbeeld-label dat op een echte registratie lijkt.
//
// Geen van beide bronnen levert aparte isolatiewaarden per bouwdeel
// (dak/gevel/vloer/beglazing) — dat veld bestaat niet in de echte data en
// blijft daarom altijd undefined, nooit geraden.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "energy";
const SOURCE_LABEL = "RVO Energielabel (EP-Online)";

// Echte respons-vorm van GET /api/v5/PandEnergielabel/{Adres|AdresseerbaarObject/...}
// — een ARRAY van registraties (meestal 0 of 1). Alleen de velden die wij
// tonen zijn hier getypeerd; de volledige PandEnergielabelV5 heeft nog veel
// meer velden (energieprestatiecijfers e.d.) die niet in dit rapport komen.
export interface PandEnergielabelV5 {
  Energieklasse?: string;
  Registratiedatum?: string;
  Geldig_tot?: string;
  BAGVerblijfsobjectID?: string;
}

export function mapEnergielabelResponse(items: PandEnergielabelV5[]): Partial<EnergyData> {
  const item = items[0];
  if (!item) return {};
  return {
    klasse: item.Energieklasse,
    registratiedatum: item.Registratiedatum,
    geldigTot: item.Geldig_tot,
    isolatie: undefined,
  };
}

// Respons-vorm van GET https://api.overheid.io/v3/energielabels (JSON HAL).
interface OverheidIoEnergielabelItem {
  energieKlasse?: string;
  registratieDatum?: string;
  geldigTot?: string;
  huisNummerToevoeging?: string;
  huisNummerLetter?: string;
}
interface OverheidIoListResponse {
  totalItemCount?: number;
  _embedded?: { energielabel?: OverheidIoEnergielabelItem[] };
}

export function mapOverheidIoResponse(item: OverheidIoEnergielabelItem): Partial<EnergyData> {
  return {
    klasse: item.energieKlasse,
    registratiedatum: item.registratieDatum,
    geldigTot: item.geldigTot,
    isolatie: undefined,
  };
}

const KLASSEN = [
  { value: "A+++", weight: 2 },
  { value: "A++", weight: 3 },
  { value: "A+", weight: 5 },
  { value: "A", weight: 10 },
  { value: "B", weight: 18 },
  { value: "C", weight: 20 },
  { value: "D", weight: 16 },
  { value: "E", weight: 12 },
  { value: "F", weight: 8 },
  { value: "G", weight: 6 },
];

const LABEL_SCHAAL = ["G", "F", "E", "D", "C", "B", "A", "A+", "A++", "A+++"];

// Isolatie en beglazing zijn NIET onafhankelijk van de labelklasse: een
// A+++-woning met "niet geïsoleerd" dak/gevel/vloer en enkel glas zou in
// werkelijkheid nooit dat label krijgen (het label wordt er in de praktijk
// juist UIT afgeleid). Elk kenmerk wordt daarom getrokken uit een gewogen
// verdeling die past bij de kwaliteitsklasse, met ruimte voor natuurlijke
// variatie (dak/gevel/vloer hoeven onderling niet identiek te zijn).
const NIVEAU_GEWICHTEN: { value: string; weight: number }[][] = [
  // klasse G/F/E
  [
    { value: "Niet geïsoleerd", weight: 70 },
    { value: "Deels geïsoleerd", weight: 25 },
    { value: "Volledig geïsoleerd", weight: 5 },
  ],
  // klasse D/C/B
  [
    { value: "Niet geïsoleerd", weight: 15 },
    { value: "Deels geïsoleerd", weight: 60 },
    { value: "Volledig geïsoleerd", weight: 25 },
  ],
  // klasse A/A+/A++/A+++
  [
    { value: "Niet geïsoleerd", weight: 2 },
    { value: "Deels geïsoleerd", weight: 18 },
    { value: "Volledig geïsoleerd", weight: 80 },
  ],
];

const BEGLAZING_GEWICHTEN: { value: string; weight: number }[][] = [
  [
    { value: "Enkel glas", weight: 55 },
    { value: "Dubbel glas", weight: 40 },
    { value: "HR++ glas", weight: 5 },
    { value: "Triple glas", weight: 0 },
  ],
  [
    { value: "Enkel glas", weight: 5 },
    { value: "Dubbel glas", weight: 45 },
    { value: "HR++ glas", weight: 45 },
    { value: "Triple glas", weight: 5 },
  ],
  [
    { value: "Enkel glas", weight: 0 },
    { value: "Dubbel glas", weight: 5 },
    { value: "HR++ glas", weight: 45 },
    { value: "Triple glas", weight: 50 },
  ],
];

function tierVoorKlasse(klasse: string): number {
  const idx = LABEL_SCHAAL.indexOf(klasse);
  if (idx <= 2) return 0;
  if (idx <= 5) return 1;
  return 2;
}

// Geen geregistreerd/bevestigd energielabel — nooit een geschat label tonen.
// Alle velden blijven leeg; de UI toont dan overal "Onbekend"/"Niet beschikbaar".
function generateEmpty(): EnergyData {
  return {
    klasse: undefined,
    registratiedatum: undefined,
    geldigTot: undefined,
    isolatie: undefined,
  };
}

async function fetchLiveEpOnline(address: AddressMeta): Promise<EnergyData> {
  const config = DATA_SOURCE_CONFIG.energielabel;
  const apiKey = getApiKey(config);
  if (!apiKey) {
    throw new Error("EP_ONLINE_API_KEY ontbreekt. Kan geen live energielabel ophalen.");
  }

  // Voorkeur: opzoeken via het BAG-adresseerbaarobject-ID (uniek, geen
  // ambiguïteit). Alleen als dat niet bekend is, terugvallen op de
  // postcode/huisnummer-variant van hetzelfde endpoint.
  const url = address.adresseerbaarObjectId
    ? `${config.baseUrl}/PandEnergielabel/AdresseerbaarObject/${address.adresseerbaarObjectId}`
    : `${config.baseUrl}/PandEnergielabel/Adres?${new URLSearchParams({
        postcode: address.postcode,
        huisnummer: address.huisnummer,
        ...(address.huisletter ? { huisletter: address.huisletter } : {}),
        ...(address.toevoeging ? { huisnummertoevoeging: address.toevoeging } : {}),
      }).toString()}`;

  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (res.status === 404) {
    // Geen registratie voor dit adres — dit is een geldige, eerlijke uitkomst,
    // geen fout. Lege data laten teruggeven i.p.v. te gooien, zodat de UI
    // netjes "Onbekend"/"Niet beschikbaar" toont in plaats van een foutmelding.
    return generateEmpty();
  }
  if (!res.ok) throw new Error(`EP-Online gaf status ${res.status}`);
  const raw: PandEnergielabelV5[] = await res.json();
  return { ...generateEmpty(), ...mapEnergielabelResponse(raw) };
}

async function fetchLiveOverheidIo(address: AddressMeta): Promise<EnergyData> {
  const apiKey = process.env.OVERHEID_IO_API_KEY;
  if (!apiKey) {
    throw new Error("OVERHEID_IO_API_KEY ontbreekt. Kan geen live energielabel ophalen via overheid.io.");
  }
  const baseUrl = process.env.OVERHEID_IO_API_BASE_URL ?? "https://api.overheid.io/v3";

  const params = new URLSearchParams();
  params.set("filters[postcode]", address.postcode);
  params.set("filters[huisNummer]", address.huisnummer);
  for (const field of ["energieKlasse", "registratieDatum", "geldigTot", "huisNummerToevoeging", "huisNummerLetter"]) {
    params.append("fields[]", field);
  }

  const res = await fetch(`${baseUrl}/energielabels?${params.toString()}`, {
    headers: { "ovio-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`overheid.io gaf status ${res.status}`);
  const raw: OverheidIoListResponse = await res.json();
  const items = raw._embedded?.energielabel ?? [];
  if (items.length === 0) return generateEmpty();

  let match: OverheidIoEnergielabelItem;
  if (items.length === 1) {
    match = items[0];
  } else {
    // Meerdere verblijfsobjecten op hetzelfde postcode+huisnummer (bv.
    // toevoegingen "A"/"B"). Alleen kiezen als het adres zelf een
    // huisletter/toevoeging heeft die overeenkomt met precies één resultaat.
    // Geen toevoeging op het adres bekend terwijl de resultaten wél
    // verschillende toevoegingen hebben (of andersom)? Dan is niet met
    // zekerheid te zeggen welk resultaat bij dít adres hoort — dan liever
    // eerlijk "onbekend" dan het eerste resultaat uit de lijst te gokken.
    const candidates = items.filter((item) => {
      const letterMatches = address.huisletter
        ? item.huisNummerLetter?.toLowerCase() === address.huisletter.toLowerCase()
        : !item.huisNummerLetter;
      const toevoegingMatches = address.toevoeging
        ? item.huisNummerToevoeging?.toLowerCase() === address.toevoeging.toLowerCase()
        : !item.huisNummerToevoeging;
      return letterMatches && toevoegingMatches;
    });
    if (candidates.length !== 1) return generateEmpty();
    match = candidates[0];
  }
  return { ...generateEmpty(), ...mapOverheidIoResponse(match) };
}

function fetchLive(address: AddressMeta): Promise<EnergyData> {
  const provider = process.env.ENERGIELABEL_PROVIDER === "overheid-io" ? "overheid-io" : "ep-online";
  return provider === "overheid-io" ? fetchLiveOverheidIo(address) : fetchLiveEpOnline(address);
}

function missingFields(data: EnergyData): string[] {
  const missing: string[] = [];
  if (!data.klasse) missing.push("klasse");
  if (!data.registratiedatum) missing.push("registratiedatum");
  if (!data.geldigTot) missing.push("geldigTot");
  // isolatie bewust niet meetellen: geen van onze bronnen (EP-Online/
  // overheid.io) levert aparte isolatiewaarden per bouwdeel (zie boven) —
  // dit is dus geen data die we mislopen, maar een veld dat structureel
  // nooit gevuld wordt. Als "ontbrekend" labelen was dan ook misleidend.
  return missing;
}

export async function fetchEnergy(address: AddressMeta): Promise<SourceResult<EnergyData>> {
  const config = DATA_SOURCE_CONFIG.energielabel;

  if (config.mode === "mock") {
    return withResilience(
      async () => {
        await delay(400 + Math.random() * 300);
        // Geen gratis/keyless bron voor EP-Online (anders dan de BAG via
        // PDOK) — dus geen gesimuleerd label tonen. Leeg record -> UI toont
        // eerlijk "Onbekend"/"Niet beschikbaar", nooit een voorbeeld-label
        // dat op een echte registratie lijkt.
        return generateEmpty();
      },
      {
        source: SOURCE_KEY,
        label: SOURCE_LABEL,
        mode: "mock",
        status: "unavailable",
        timeoutMs: config.timeoutMs,
        missingFields,
      }
    );
  }

  return withResilience(() => fetchLive(address), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "public",
    timeoutMs: config.timeoutMs,
    missingFields,
  });
}
