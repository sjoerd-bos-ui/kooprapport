import type { AddressMeta } from "@/types/report";
import type { RawAddressInput } from "@/lib/services/addressParser";
import { normalizePostcode, parseHuisnummer } from "@/lib/services/addressParser";

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export function unslugify(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// -----------------------------------------------------------------------------
// BEVEILIGING (zie de audit): address.slug in een request-BODY is gewone
// tekst die de aanroeper zelf meestuurt — een server-route die daarop
// vertrouwt om "hoort deze betaling bij dit adres" of "hoort deze cache-
// entry bij dit adres" te beslissen, kan bewust misleid worden door een
// aanroeper die twee verzoeken met verschillende postcode/huisnummer maar
// hetzelfde (zelfgekozen) slug-veld stuurt. Concreet risico dat dit
// voorkomt: één keer (goedkoop) een bestelling aanmaken, en die betaling
// daarna hergebruiken om de kostenveroorzakende Altum-aanroep
// (/api/rapport/premium) voor een heel ander, écht adres te ontgrendelen.
//
// Deze functie herleidt in plaats daarvan een stabiele sleutel
// RECHTSTREEKS uit de genormaliseerde postcode + huisnummer(+letter+
// toevoeging) — samen het enige wat een Nederlands adres uniek
// identificeert, en beide al apart gevalideerd via addressParser.ts. Twee
// verzoeken leveren dus alleen dezelfde sleutel op als het daadwerkelijk
// hetzelfde adres betreft, wat er ook in het (nooit hiervoor gebruikte)
// slug-veld van de request stond. Gebruik dit — nooit address.slug uit een
// request-body — overal waar een server-route moet vaststellen of twee
// aanvragen over hetzelfde adres gaan (betaling aanmaken, ontgrendelen,
// cache-keys).
export function canonicalAddressKey(input: {
  postcode?: string;
  huisnummer?: string;
  huisletter?: string;
  toevoeging?: string;
}): string | null {
  const postcode = normalizePostcode(input.postcode);
  if (!postcode.value) return null;
  const huisnummerRuw = `${input.huisnummer ?? ""}${input.huisletter ?? ""}${
    input.toevoeging ? `-${input.toevoeging}` : ""
  }`;
  const huisnummer = parseHuisnummer(huisnummerRuw);
  if (!huisnummer) return null;
  return slugify(
    `${postcode.value}-${huisnummer.huisnummer}${huisnummer.huisletter ?? ""}${
      huisnummer.toevoeging ? `-${huisnummer.toevoeging}` : ""
    }`
  );
}

// Bouwt de link naar een rapport op basis van een AL GEVALIDEERD adres (het
// resultaat van lookupAddress met status "match", of een gekozen live
// PDOK-suggestie). Er wordt hier niets meer geraden — elk veld komt direct
// van het gematchte/gekozen adres. locatieserverId/adresseerbaarObjectId
// gaan mee (indien aanwezig) zodat de rapportpagina het bouwjaar bij de
// officiële BAG-bron kan opzoeken zonder het adres opnieuw te hoeven raden.
export function buildReportHref(addr: AddressMeta): string {
  const params = new URLSearchParams({
    straat: addr.straat,
    huisnummer: addr.huisnummer,
    postcode: addr.postcode,
    plaats: addr.plaats,
    label: addr.label,
  });
  if (addr.huisletter) params.set("huisletter", addr.huisletter);
  if (addr.toevoeging) params.set("toevoeging", addr.toevoeging);
  if (addr.locatieserverId) params.set("locatieserverId", addr.locatieserverId);
  if (addr.adresseerbaarObjectId) params.set("adresseerbaarObjectId", addr.adresseerbaarObjectId);
  return `/rapport/${addr.slug}?${params.toString()}`;
}

// Haalt de RUWE velden uit de URL-queryparams, zonder ook maar iets in te
// vullen of te gokken bij ontbrekende waarden. Dit voedt lib/services/
// addressLookup.ts::lookupAddress — nog gebruikt voor het opnieuw matchen
// van vrije tekst tegen de lokale MOCK_ADDRESSES (bv. demo-scenario's).
// Canonieke URL voor een rapportpagina — een kleinere, stabielere paramset
// dan buildReportHref() hierboven (zonder label/locatieserverId/
// adresseerbaarObjectId: die veranderen niets aan de getoonde inhoud, maar
// zouden wel onnodige URL-varianten van dezelfde pagina opleveren, met
// duplicate-content-risico voor Google). De content hangt nog steeds af van
// deze queryparams (zie resolveConfirmedAddress in addressLookup.ts) — dit
// is dus bewust de URL die we canonical/indexeerbaar willen laten zijn, niet
// het kale /rapport/slug zonder params (dat toont geen rapport, zie
// app/rapport/[slug]/page.tsx).
export function buildCanonicalReportPath(addr: AddressMeta): string {
  const params = new URLSearchParams({
    straat: addr.straat,
    huisnummer: addr.huisnummer,
    postcode: addr.postcode,
    plaats: addr.plaats,
  });
  if (addr.huisletter) params.set("huisletter", addr.huisletter);
  if (addr.toevoeging) params.set("toevoeging", addr.toevoeging);
  return `/rapport/${addr.slug}?${params.toString()}`;
}

export function rawInputFromSearchParams(searchParams: {
  [key: string]: string | string[] | undefined;
}): RawAddressInput {
  const get = (key: string): string | undefined => {
    const v = searchParams[key];
    const value = Array.isArray(v) ? v[0] : v;
    return value?.trim() ? value.trim() : undefined;
  };

  const huisnummer = get("huisnummer");
  const huisletter = get("huisletter");
  const toevoeging = get("toevoeging");
  const huisnummerRuw = huisnummer
    ? `${huisnummer}${huisletter ?? ""}${toevoeging ? `-${toevoeging}` : ""}`
    : undefined;

  return {
    straat: get("straat"),
    huisnummerRuw,
    postcode: get("postcode"),
    plaats: get("plaats"),
  };
}

// Zelfde ruwe extractie als hierboven, maar dan met de extra velden die
// resolveConfirmedAddress nodig heeft (label + de twee PDOK-ID's) om een AL
// BEVESTIGDE adreskeuze te herbouwen — zie addressLookup.ts::
// resolveConfirmedAddress voor waarom dit niet meer via de kleine
// MOCK_ADDRESSES-lijst gaat nu suggesties uit heel Nederland kunnen komen.
export function confirmedAddressParamsFromSearchParams(searchParams: {
  [key: string]: string | string[] | undefined;
}): {
  straat?: string;
  huisnummerRuw?: string;
  postcode?: string;
  plaats?: string;
  label?: string;
  locatieserverId?: string;
  adresseerbaarObjectId?: string;
} {
  const raw = rawInputFromSearchParams(searchParams);
  const get = (key: string): string | undefined => {
    const v = searchParams[key];
    const value = Array.isArray(v) ? v[0] : v;
    return value?.trim() ? value.trim() : undefined;
  };
  return {
    ...raw,
    label: get("label"),
    locatieserverId: get("locatieserverId"),
    adresseerbaarObjectId: get("adresseerbaarObjectId"),
  };
}
