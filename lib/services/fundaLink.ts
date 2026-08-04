import type { AddressMeta } from "@/types/report";
import { fetchLiveAddressSuggestions } from "@/lib/services/addressLookup";
import { parseHuisnummer } from "@/lib/services/addressParser";

// -----------------------------------------------------------------------------
// Herkent een Funda-listingURL en zet die om in een adres -- volledig via
// onze EIGEN databronnen (PDOK Locatieserver -> BAG, zie addressLookup.ts).
// We lezen NOOIT de Funda-pagina zelf uit (geen scraping; Funda's
// voorwaarden verbieden geautomatiseerd uitlezen) en we gebruiken NOOIT een
// vraagprijs van Funda -- die staat sowieso niet in de URL, alleen in de
// paginainhoud, die we bewust niet ophalen.
//
// De link is dus uitsluitend een snelle manier om aan een ADRES te komen.
// Zodra dat adres bekend is, loopt de rest exact via dezelfde weg als
// handmatige invoer: PDOK-suggesties -> BAG-adres -> Altum AVM-schatting
// (lib/data-sources/woningwaarde.ts, dat zelf ook geen vraagprijs kent of
// gebruikt -- alleen postcode+huisnummer als invoer). Daardoor kan het
// verschil tussen een (soms bewust hoog of laag gezette) vraagprijs en de
// werkelijke waarde nooit in ons biedadvies terechtkomen: welke weg de
// gebruiker ook kiest (link plakken of handmatig invullen), het cijfer
// waarop het advies rust is altijd ons eigen model, nooit Funda's prijs.
//
// URL-vormen die Funda gebruikt (bevestigd via publieke voorbeelden,
// augustus 2026):
//   https://www.funda.nl/detail/koop/{plaats}/{soort}-{straat-slug}-{huisnummer}/{listingId}/
//   https://www.funda.nl/en/detail/koop/{plaats}/{soort}-{straat-slug}-{huisnummer}/{listingId}/
//   https://www.funda.nl/koop/{plaats}/{soort}-{listingId}-{straat-slug}-{huisnummer}/  (oudere vorm)
//
// De straat-slug is een aan-elkaar-geplakte, kleingeschreven versie van de
// straatnaam (spaties -> streepjes). Daar is de ECHTE straatnaam met
// correcte spelling/spatiëring niet met zekerheid uit terug te herleiden
// (bv. "Van Goghstraat" vs "Van Gogh straat"). Daarom wordt het ontlede deel
// alleen als ZOEKVRAAG naar PDOK gestuurd, nooit als kant-en-klaar adres --
// dezelfde "nooit gokken, bij twijfel expliciet 'meerdere/geen match'"-regel
// als addressLookup.ts.
// -----------------------------------------------------------------------------

export interface FundaLinkParseResult {
  ok: boolean;
  plaats?: string;
  straatZoekterm?: string;
  huisnummerRuw?: string;
  // Enige twee inhoudelijke signalen die daadwerkelijk IN de URL zelf staan
  // (dus zonder de pagina te hoeven uitlezen): het soort object en of het om
  // nieuwbouw gaat. Alleen gezet als de slug dat woord letterlijk bevat --
  // geen enkele aanname erbovenop.
  woningtype?: "Huis" | "Appartement" | "Woonboot" | "Parkeergelegenheid";
  nieuwbouw?: boolean;
  reden?: string; // uitleg bij ok:false, bedoeld voor UI-feedback
}

const FUNDA_HOST_PATTERN = /^(www\.)?funda\.nl$/i;
const WONINGTYPE_LABELS: Record<string, FundaLinkParseResult["woningtype"]> = {
  huis: "Huis",
  appartement: "Appartement",
  woonboot: "Woonboot",
  parkeergelegenheid: "Parkeergelegenheid",
};
const SOORT_PREFIXEN = new Set(["huis", "appartement", "woonboot", "parkeergelegenheid", "bouwnr", "bouwnummer"]);
// Laatste segment van de adres-slug herkennen als huisnummer(+letter), bv.
// "kerkstraat-12" -> "12", "kerkstraat-12a" -> "12a". Toevoegingen zoals
// "-2" (bij "12-2") laat Funda's slug meestal weg; komt die toch voor, dan
// levert dit gewoon een andere (nog steeds eerlijke) PDOK-zoekvraag op.
const HUISNUMMER_SUFFIX = /-(\d+[a-zA-Z]?)$/;

export function parseFundaUrl(input: string): FundaLinkParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reden: "Geen link ingevuld." };

  let url: URL;
  try {
    url = new URL(trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, reden: "Dit is geen geldige link." };
  }

  if (!FUNDA_HOST_PATTERN.test(url.hostname)) {
    return { ok: false, reden: "Dit is geen funda.nl-link." };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  // Optioneel taalprefix ("en", "de") direct voor "detail" overslaan.
  if (segments[0] && segments[0].length === 2 && segments[1] === "detail") {
    segments.shift();
  }
  if (segments[0] === "detail") segments.shift();

  const koopIdx = segments.findIndex((s) => s === "koop" || s === "huur");
  if (koopIdx === -1 || !segments[koopIdx + 1] || !segments[koopIdx + 2]) {
    return { ok: false, reden: "Kon geen woningpagina in deze link herkennen." };
  }

  const plaatsSlug = segments[koopIdx + 1];
  const adresSlug = segments[koopIdx + 2];

  const huisnummerMatch = HUISNUMMER_SUFFIX.exec(adresSlug);
  if (!huisnummerMatch) {
    return { ok: false, reden: "Kon geen huisnummer in deze link herkennen." };
  }

  const voorHuisnummer = adresSlug.slice(0, huisnummerMatch.index);
  // Alleen "soort"-voorvoegsels (huis-, appartement-...) en lange cijferreeksen
  // (het listingId, dat bij de oudere URL-vorm vooraan in de slug staat --
  // Funda's eigen documentatie noemt een 8-cijferig id) eruit filteren. Een
  // KORT cijferdeel blijft bewust staan: dat kan een tweede huisnummerdeel
  // zijn (bv. een toevoeging), en meesturen als extra zoekwoord naar PDOK is
  // onschadelijk -- in het ergste geval levert dat gewoon minder/geen
  // suggesties op, nooit een fout adres.
  const ruweDelen = voorHuisnummer.split("-").filter(Boolean);
  const woningtype = WONINGTYPE_LABELS[ruweDelen[0]] ?? undefined;
  const nieuwbouw = ruweDelen.includes("bouwnr") || ruweDelen.includes("bouwnummer");
  const straatDelen = ruweDelen.filter((deel) => !/^\d{5,}$/.test(deel) && !SOORT_PREFIXEN.has(deel));
  const straatZoekterm = straatDelen.join(" ");

  if (!straatZoekterm) {
    return { ok: false, reden: "Kon geen straatnaam in deze link herkennen." };
  }

  return {
    ok: true,
    plaats: plaatsSlug.replace(/-/g, " "),
    straatZoekterm,
    huisnummerRuw: huisnummerMatch[1],
    woningtype,
    nieuwbouw,
  };
}

export type FundaResolveStatus = "match" | "multiple" | "no-match" | "invalid";

export interface FundaResolveResult {
  status: FundaResolveStatus;
  address?: AddressMeta; // alleen bij "match"
  candidates?: AddressMeta[]; // alleen bij "multiple"
  woningtype?: FundaLinkParseResult["woningtype"]; // uit de URL zelf, gratis bonus
  nieuwbouw?: boolean; // idem
  reden?: string; // uitleg bij "invalid"/"no-match", voor UI-feedback
}

// Herkent een Funda-link en zoekt het bijbehorende adres op via PDOK -- de
// exact zelfde live adresbron als de handmatige zoekbalk (AddressSearchBar).
// Geeft nooit stilzwijgend één "meest waarschijnlijke" match terug bij
// twijfel: bij meerdere PDOK-treffers komt "multiple" terug, zodat de UI de
// gebruiker zelf laat kiezen -- zelfde patroon als lookupAddress().
export async function resolveFundaUrl(input: string): Promise<FundaResolveResult> {
  const parsed = parseFundaUrl(input);
  if (!parsed.ok) return { status: "invalid", reden: parsed.reden };

  const huisnummerGeparsed = parseHuisnummer(parsed.huisnummerRuw);
  if (!huisnummerGeparsed) return { status: "invalid", reden: "Kon geen geldig huisnummer in deze link herkennen." };

  const query = `${parsed.straatZoekterm} ${parsed.huisnummerRuw}, ${parsed.plaats}`;
  let suggesties: AddressMeta[];
  try {
    suggesties = await fetchLiveAddressSuggestions(query, 10);
  } catch {
    return { status: "invalid", reden: "Adresherkenning (PDOK) is nu niet bereikbaar -- probeer het adres handmatig." };
  }

  // Eerst proberen te verfijnen op exact huisnummer + huisletter (en plaats,
  // als die herkenbaar overeenkomt) -- Funda's plaats-slug is soms een
  // wijk/dorpskern in plaats van de officiële PDOK-woonplaats, dus die
  // laatste vergelijking mag een treffer niet blokkeren als de rest klopt.
  const opHuisnummer = suggesties.filter(
    (a) =>
      a.huisnummer === huisnummerGeparsed.huisnummer &&
      (a.huisletter ?? "") === (huisnummerGeparsed.huisletter ?? "")
  );
  const kandidaten = opHuisnummer.length > 0 ? opHuisnummer : suggesties;

  if (kandidaten.length === 0) return { status: "no-match", reden: "Dit adres kon niet worden gevonden." };
  if (kandidaten.length === 1) {
    return { status: "match", address: kandidaten[0], woningtype: parsed.woningtype, nieuwbouw: parsed.nieuwbouw };
  }
  return { status: "multiple", candidates: kandidaten.slice(0, 5), woningtype: parsed.woningtype, nieuwbouw: parsed.nieuwbouw };
}
