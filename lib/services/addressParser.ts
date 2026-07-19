// -----------------------------------------------------------------------------
// Adres-parsing: zet ruwe, door de gebruiker getypte tekst om in losse,
// genormaliseerde velden (postcode, huisnummer, huisletter, toevoeging,
// straat, plaats).
//
// Belangrijk: dit bestand RAADT NIETS. Een veld dat niet met zekerheid uit de
// invoer te halen is, blijft `undefined` — er wordt nooit een placeholder
// als "Onbekend" verzonnen. "Splitsen" (deze tekst bestaat uit een straatdeel
// en een postcodedeel) is een ander soort bewerking dan "raden" (dit is
// vast Kerkstraat 12 in Amsterdam) — alleen het eerste gebeurt hier. Of de
// gesplitste velden ook daadwerkelijk een bestaand adres vormen, bepaalt
// lib/services/addressLookup.ts, tegen de (mock-)BAG-data.
// -----------------------------------------------------------------------------

export interface RawAddressInput {
  straat?: string;
  huisnummerRuw?: string; // ongesplitst, bv. "12A", "12-2", "12 bis"
  postcode?: string; // ongenormaliseerd, bv. "1015 cj"
  plaats?: string;
}

export interface ParsedHuisnummer {
  huisnummer: string;
  huisletter?: string;
  toevoeging?: string;
}

const POSTCODE_RE = /^(\d{4})\s*([A-Za-z]{2})$/;

export interface PostcodeParseResult {
  value: string | null; // genormaliseerd, bv. "1015CJ" — null als leeg of ongeldig
  ingevuld: boolean; // was er überhaupt iets getypt
  geldig: boolean; // was het (als het is ingevuld) ook een geldig NL-postcodeformaat
}

// NL-postcode: 4 cijfers + 2 letters, spatie optioneel, hoofdlettergevoeligheid
// genegeerd. Alles wat daar niet aan voldoet is "ongeldig", niet "onbekend" —
// dat onderscheid is belangrijk voor de foutmelding die de gebruiker ziet.
export function normalizePostcode(raw: string | undefined | null): PostcodeParseResult {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { value: null, ingevuld: false, geldig: true };
  const m = trimmed.match(POSTCODE_RE);
  if (!m) return { value: null, ingevuld: true, geldig: false };
  return { value: `${m[1]}${m[2].toUpperCase()}`, ingevuld: true, geldig: true };
}

export function formatPostcodeDisplay(postcode: string): string {
  const m = postcode.match(/^(\d{4})([A-Za-z]{2})$/);
  return m ? `${m[1]} ${m[2].toUpperCase()}` : postcode;
}

// Splitst een ruwe huisnummer-string in huisnummer + huisletter +
// toevoeging, volgens BAG-conventie:
//   - huisnummer: het numerieke deel, verplicht.
//   - huisletter: precies één letter direct (of met hooguit één spatie) na
//     het cijferdeel, zonder scheidingsteken.
//   - toevoeging: al het overige, losgemaakt door een spatie/koppelteken/
//     schuine streep (bv. de "2" in "12-2", of "bis" in "12 bis").
// Geeft `null` terug als de invoer niet als (numeriek) huisnummer te
// herkennen is — dan is er niets om te matchen, en dat moet ook zo behandeld
// worden (niet als huisnummer "0" of leeg doorschuiven).
export function parseHuisnummer(raw: string | undefined | null): ParsedHuisnummer | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;

  const m = trimmed.match(/^(\d+)\s*([A-Za-z])?(?:[\s\-/]+([A-Za-z0-9]+))?$/);
  if (!m) return null;

  const nummer = parseInt(m[1], 10);
  if (!Number.isFinite(nummer) || nummer <= 0) return null;

  return {
    huisnummer: String(nummer),
    huisletter: m[2] ? m[2].toUpperCase() : undefined,
    toevoeging: m[3] ? m[3].toUpperCase() : undefined,
  };
}

// Herkent Nederlandse ordinale straatnaam-prefixen ("1e", "2e", "3e" —
// zoals in "2e Oosterparkstraat") zodat die niet per ongeluk voor een
// huisnummer worden aangezien bij het splitsen van vrije tekst.
function isOrdinalPrefix(token: string): boolean {
  return /^\d+e$/i.test(token);
}

function splitStraatEnHuisnummer(deel: string): { straat?: string; huisnummerRuw?: string } {
  const tokens = deel.split(/\s+/).filter(Boolean);
  const idx = tokens.findIndex((t) => /^\d/.test(t) && !isOrdinalPrefix(t));
  if (idx === -1) {
    return { straat: deel.trim() || undefined, huisnummerRuw: undefined };
  }
  const straat = tokens.slice(0, idx).join(" ") || undefined;
  const huisnummerRuw = tokens.slice(idx).join(" ") || undefined;
  return { straat, huisnummerRuw };
}

// Splitst vrije tekst ("Kerkstraat 12A, 1011AB Amsterdam", "1011 AB 12",
// "Kerkstraat 12, Amsterdam") in de losse velden van RawAddressInput. Puur
// SPLITSEN op leestekens/patronen — geen enkel veld wordt verzonnen als het
// er niet (herkenbaar) staat.
export function splitFreeTextAddress(input: string): RawAddressInput {
  const text = input.trim();
  if (!text) return {};

  const postcodeMatch = text.match(/\b(\d{4}\s?[A-Za-z]{2})\b/);
  const postcode = postcodeMatch?.[1];
  const zonderPostcode = postcode ? (text.slice(0, postcodeMatch.index) + " " + text.slice(postcodeMatch.index! + postcodeMatch[0].length)).trim() : text;

  const delen = zonderPostcode.split(",").map((d) => d.trim()).filter(Boolean);
  const straatDeel = delen[0] ?? "";
  const plaats = delen.slice(1).join(", ").trim() || undefined;

  const { straat, huisnummerRuw } = splitStraatEnHuisnummer(straatDeel);

  return { straat, huisnummerRuw, postcode, plaats };
}
