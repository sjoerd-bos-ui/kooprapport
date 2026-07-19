import type { AddressMeta } from "@/types/report";
import { MOCK_ADDRESSES } from "@/lib/mock/addresses";
import { normalizePostcode, parseHuisnummer, type RawAddressInput } from "@/lib/services/addressParser";
import { slugify } from "@/lib/utils/slug";

// -----------------------------------------------------------------------------
// Adres-matching: de enige plek die uitspraak doet over "bestaat dit adres en
// welk BAG-object hoort erbij". In productie vervangt dit een BAG Individuele
// Bevragingen-call (exacte match op postcode+huisnummer(+letter/toevoeging),
// of straat+huisnummer+plaats). Tot die koppeling er is, matcht dit tegen
// lib/mock/addresses.ts — maar met dezelfde strikte regels:
//
//   - ALTIJD een exacte vergelijking op de genormaliseerde velden, nooit
//     substring/Levenshtein/"lijkt op"-matching.
//   - Bij twijfel (geen éénduidige match) geeft dit NOOIT het "meest
//     waarschijnlijke" adres terug — het geeft expliciet "meerdere
//     matches", "geen match" of "onvolledig" terug, en laat de UI dat
//     vervolgens duidelijk tonen.
// -----------------------------------------------------------------------------

export type AddressLookupStatus = "match" | "multiple" | "no-match" | "incomplete" | "invalid";

export interface AddressFieldError {
  field: "postcode" | "huisnummer";
  reason: string;
}

export interface AddressLookupResult {
  status: AddressLookupStatus;
  address?: AddressMeta; // alleen bij "match"
  candidates?: AddressMeta[]; // alleen bij "multiple"
  missingFields?: string[]; // alleen bij "incomplete"
  fieldErrors?: AddressFieldError[]; // alleen bij "invalid"
}

export function lookupAddress(input: RawAddressInput): AddressLookupResult {
  const postcodeResult = normalizePostcode(input.postcode);
  const huisnummerResult = parseHuisnummer(input.huisnummerRuw);
  const straat = input.straat?.trim();
  const plaats = input.plaats?.trim();

  // Stap 1: velden die WEL zijn ingevuld maar niet geldig zijn, zijn een
  // ander (en dringender) probleem dan velden die simpelweg ontbreken.
  const fieldErrors: AddressFieldError[] = [];
  if (input.postcode?.trim() && !postcodeResult.geldig) {
    fieldErrors.push({
      field: "postcode",
      reason: `"${input.postcode.trim()}" is geen geldige postcode (verwacht formaat: 1234AB).`,
    });
  }
  if (input.huisnummerRuw?.trim() && !huisnummerResult) {
    fieldErrors.push({
      field: "huisnummer",
      reason: `"${input.huisnummerRuw.trim()}" is geen geldig huisnummer.`,
    });
  }
  if (fieldErrors.length > 0) {
    return { status: "invalid", fieldErrors };
  }

  // Stap 2: is er genoeg voor één van de twee geldige zoekroutes?
  //   Route A (kortste): postcode + huisnummer
  //   Route B: straat + huisnummer + plaats
  const hasPostcode = Boolean(postcodeResult.value);
  const hasHuisnummer = Boolean(huisnummerResult);
  const hasStraat = Boolean(straat);
  const hasPlaats = Boolean(plaats);
  const routeA = hasPostcode && hasHuisnummer;
  const routeB = hasStraat && hasHuisnummer && hasPlaats;

  if (!routeA && !routeB) {
    const missing: string[] = [];
    if (!hasHuisnummer) missing.push("huisnummer");
    if (!hasPostcode && !(hasStraat && hasPlaats)) {
      if (!hasPostcode) missing.push("postcode");
      if (!hasStraat) missing.push("straat");
      if (!hasPlaats) missing.push("plaats");
    }
    return { status: "incomplete", missingFields: missing.length > 0 ? Array.from(new Set(missing)) : ["adres"] };
  }

  // Stap 3: exacte matching tegen de (mock-)BAG-data.
  let kandidaten: AddressMeta[] = routeA
    ? MOCK_ADDRESSES.filter(
        (a) => a.postcode === postcodeResult.value && a.huisnummer === huisnummerResult!.huisnummer
      )
    : MOCK_ADDRESSES.filter(
        (a) =>
          a.straat.toLowerCase() === straat!.toLowerCase() &&
          a.huisnummer === huisnummerResult!.huisnummer &&
          a.plaats.toLowerCase() === plaats!.toLowerCase()
      );

  // Is huisletter/toevoeging expliciet meegegeven, gebruik die dan om verder
  // te verfijnen — dat kan een "meerdere matches" alsnog terugbrengen naar
  // precies één BAG-object.
  if (huisnummerResult!.huisletter) {
    kandidaten = kandidaten.filter((a) => (a.huisletter ?? "").toUpperCase() === huisnummerResult!.huisletter);
  }
  if (huisnummerResult!.toevoeging) {
    kandidaten = kandidaten.filter((a) => (a.toevoeging ?? "").toUpperCase() === huisnummerResult!.toevoeging);
  }

  if (kandidaten.length === 0) return { status: "no-match" };
  if (kandidaten.length === 1) return { status: "match", address: kandidaten[0] };
  return { status: "multiple", candidates: kandidaten };
}

// Losstaand van lookupAddress: puur voor suggesties tijdens het typen. Dit is
// bewust tolerant/prefix-achtig — maar het is en blijft een lijst om uit te
// KIEZEN, nooit een automatisch geaccepteerd eindresultaat. De uiteindelijke
// keuze (klik op een suggestie) loopt alsnog door lookupAddress heen met de
// exacte velden van die suggestie.
export function searchAddressSuggestions(query: string, limit = 6): AddressMeta[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/[\s,]+/).filter(Boolean);
  return MOCK_ADDRESSES.filter((a) => {
    const text = (a.label + " " + a.postcode).toLowerCase();
    return tokens.every((t) => text.includes(t));
  }).slice(0, limit);
}

// -----------------------------------------------------------------------------
// Live adressuggesties via de PDOK Locatieserver — de publieke, gratis
// suggest-service bovenop de BAG (geen API-key nodig). Dit dekt alle adressen
// in Nederland, in tegenstelling tot searchAddressSuggestions() hierboven, dat
// alleen tegen de kleine MOCK_ADDRESSES-lijst zoekt. searchAddressSuggestions()
// blijft bestaan als offline-fallback wanneer de live registratie niet
// bereikbaar is (zie AddressSearchBar.tsx) — nooit stil niets tonen.
// -----------------------------------------------------------------------------
interface PdokSuggestDoc {
  id?: string;
  straatnaam?: string;
  huisnummer?: number;
  huisletter?: string;
  huisnummertoevoeging?: string;
  postcode?: string;
  woonplaatsnaam?: string;
  adresseerbaarobject_id?: string;
}

const PDOK_SUGGEST_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest";
const PDOK_FIELDS =
  "id,weergavenaam,straatnaam,huisnummer,huisletter,huisnummertoevoeging,postcode,woonplaatsnaam,adresseerbaarobject_id";

function mapPdokDoc(doc: PdokSuggestDoc): AddressMeta | null {
  if (!doc.straatnaam || doc.huisnummer == null || !doc.postcode || !doc.woonplaatsnaam) return null;
  const straat = doc.straatnaam;
  const huisnummer = String(doc.huisnummer);
  const huisletter = doc.huisletter || undefined;
  const toevoeging = doc.huisnummertoevoeging || undefined;
  const postcode = doc.postcode;
  const plaats = doc.woonplaatsnaam;
  const huisnummerVolledigStr = `${huisnummer}${huisletter ?? ""}${toevoeging ? `-${toevoeging}` : ""}`;
  const label = `${straat} ${huisnummerVolledigStr}, ${plaats}`;
  return {
    straat,
    huisnummer,
    huisletter,
    toevoeging,
    postcode,
    plaats,
    label,
    slug: slugify(label),
    locatieserverId: doc.id || undefined,
    adresseerbaarObjectId: doc.adresseerbaarobject_id || undefined,
  };
}

// Bewust GEEN server-side proxy hiervoor (overwogen tijdens de bredere
// security-check van deze app): PDOK's Locatieserver-suggest-endpoint is
// zelf al bedoeld voor rechtstreeks client-side gebruik door precies dit
// soort autocomplete-velden (gratis, keyless, publieke overheids-infra), en
// AddressSearchBar.tsx debounced de aanroepen al. Een eigen proxy zou alleen
// een extra server-hop toevoegen zonder een echt beveiligingsprobleem op te
// lossen — de rate limiting die wél nodig is (lib/services/rateLimit.ts) zit
// daarom op onze EIGEN routes (/api/rapport, /api/betaling/aanmaken), niet
// hier.
export async function fetchLiveAddressSuggestions(query: string, limit = 8): Promise<AddressMeta[]> {
  const url = `${PDOK_SUGGEST_URL}?q=${encodeURIComponent(query)}&fq=type:adres&rows=${limit}&fl=${encodeURIComponent(PDOK_FIELDS)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PDOK suggest HTTP ${res.status}`);
  const data = await res.json();
  const docs: PdokSuggestDoc[] = data?.response?.docs ?? [];
  return docs.map(mapPdokDoc).filter((a): a is AddressMeta => a !== null);
}

// -----------------------------------------------------------------------------
// Re-validatie van een AL BEVESTIGDE adreskeuze op de rapportpagina (URL komt
// van buildReportHref(), gevoed door een gekozen suggestie — live via PDOK of
// lokaal via MOCK_ADDRESSES). lookupAddress() hierboven matcht tegen de kleine
// MOCK_ADDRESSES-lijst — dat werkte toen adressen ALLEEN uit die lijst konden
// komen, maar nu suggesties uit de landelijke PDOK-registratie komen (elk
// adres in Nederland) zou die match daar bijna altijd op "geen match" stuiten.
// Het vertrouwenspunt verschuift dus: niet meer "komt dit adres voor in onze
// beperkte lijst", maar "zijn de velden in de URL zelf geldig en compleet" —
// exact dezelfde veldvalidatie (normalizePostcode/parseHuisnummer) als
// lookupAddress, alleen zonder de matching-stap tegen een eindige lijst. Een
// handmatig aangepaste/onvolledige/ongeldige URL levert nog steeds gewoon
// "invalid" of "incomplete" op, nooit een gefabriceerd adres.
// -----------------------------------------------------------------------------
export interface ConfirmedAddressParams {
  straat?: string;
  huisnummerRuw?: string;
  postcode?: string;
  plaats?: string;
  label?: string;
  locatieserverId?: string;
  adresseerbaarObjectId?: string;
}

export function resolveConfirmedAddress(input: ConfirmedAddressParams): AddressLookupResult {
  const postcodeResult = normalizePostcode(input.postcode);
  const huisnummerResult = parseHuisnummer(input.huisnummerRuw);
  const straat = input.straat?.trim();
  const plaats = input.plaats?.trim();
  const labelInput = input.label?.trim();

  const fieldErrors: AddressFieldError[] = [];
  if (input.postcode?.trim() && !postcodeResult.geldig) {
    fieldErrors.push({
      field: "postcode",
      reason: `"${input.postcode.trim()}" is geen geldige postcode (verwacht formaat: 1234AB).`,
    });
  }
  if (input.huisnummerRuw?.trim() && !huisnummerResult) {
    fieldErrors.push({
      field: "huisnummer",
      reason: `"${input.huisnummerRuw.trim()}" is geen geldig huisnummer.`,
    });
  }
  if (fieldErrors.length > 0) {
    return { status: "invalid", fieldErrors };
  }

  // "label" (de mensleesbare weergave, bv. "Pleinweg 66D, Rotterdam") hoeft
  // NIET apart in de URL te staan — die is altijd exact afleidbaar uit
  // straat/huisnummer(+letter/toevoeging)/plaats, dezelfde formule als
  // mapPdokDoc() elders in dit bestand gebruikt. Dit maakte eerder elke URL
  // zonder los "label"-queryparam onterecht "onvolledig", inclusief de
  // redirect die een klant na een Mollie-betaling terugkrijgt (die stuurt
  // bewust een kortere query mee, zie app/api/betaling/aanmaken/route.ts).
  const missing: string[] = [];
  if (!straat) missing.push("straat");
  if (!huisnummerResult) missing.push("huisnummer");
  if (!postcodeResult.value) missing.push("postcode");
  if (!plaats) missing.push("plaats");
  if (missing.length > 0) {
    return { status: "incomplete", missingFields: Array.from(new Set(missing)) };
  }

  const huisnummerVolledig = `${huisnummerResult!.huisnummer}${huisnummerResult!.huisletter ?? ""}${
    huisnummerResult!.toevoeging ? `-${huisnummerResult!.toevoeging}` : ""
  }`;
  const label = labelInput || `${straat} ${huisnummerVolledig}, ${plaats}`;

  const address: AddressMeta = {
    straat: straat!,
    huisnummer: huisnummerResult!.huisnummer,
    huisletter: huisnummerResult!.huisletter,
    toevoeging: huisnummerResult!.toevoeging,
    postcode: postcodeResult.value!,
    plaats: plaats!,
    label,
    slug: slugify(label),
    locatieserverId: input.locatieserverId,
    adresseerbaarObjectId: input.adresseerbaarObjectId,
  };
  return { status: "match", address };
}

export function huisnummerVolledig(a: AddressMeta): string {
  return `${a.huisnummer}${a.huisletter ?? ""}${a.toevoeging ? `-${a.toevoeging}` : ""}`;
}
