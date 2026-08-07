import type { B2bLocatie } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Locatiesuggesties (plaatsen ÉN wijken/buurten) voor de zoekopdracht (#3) en
// de matchfunctie (#2) -- zelfde bron en patroon als de bestaande
// adres-autocomplete (lib/services/addressLookup.ts +
// components/address/AddressSearchBar.tsx): de publieke, gratis PDOK
// Locatieserver-suggest-service, rechtstreeks vanuit de client aangeroepen
// (geen server-proxy nodig, zie de toelichting in addressLookup.ts).
//
// Het belangrijkste verschil met adressen: hier wordt de gekozen suggestie
// meteen ook de EXACTE Funda-zoekslug (plaatsSlug/wijkSlug op B2bLocatie),
// zodat er nooit een los, apart in te vullen "matchInstelling.plaats"-veld
// nodig is (zie types/b2b.ts) -- kiezen uit deze lijst IS de bevestigde,
// eenduidige locatie, precies dezelfde discipline als bij adressen: nooit
// vrije tekst fuzzy-matchen.
// -----------------------------------------------------------------------------

const PDOK_SUGGEST_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest";
const PDOK_FIELDS = "weergavenaam,woonplaatsnaam,gemeentenaam,type";

interface PdokLocatieDoc {
  type?: string;
  weergavenaam?: string;
  woonplaatsnaam?: string;
  gemeentenaam?: string;
}

// Funda's publieke zoek-URLs gebruiken lowercase, spatie-vrije slugs (bv.
// "den-haag", "kralingen-oost") -- dezelfde normalisatie als bouwZoekpad() in
// lib/data-sources/fundaFeed.ts, hier vooraf toegepast zodat elke suggestie
// al een geldige feed-slug is.
function naarFundaSlug(naam: string): string {
  return naam
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

// BUGFIX (live getest tegen PDOK, zie het gesprek hierover): twee dingen
// klopten niet voor "kleinere" gebieden zoals "Kralingen Oost".
//   1. Veel plekken die mensen een "wijk" noemen, zijn in PDOK's indeling
//      een fijnmaziger `type:buurt` (bv. "Kralingen Oost" is een buurt
//      binnen de wijk "Kralingen-Crooswijk") -- zonder `buurt` in de
//      type-filter leverde zo'n zoekopdracht 0 resultaten op.
//   2. weergavenaam voor wijk/buurt komt terug als "Kralingen Oost
//      Rotterdam" (spatie-gescheiden, GEEN komma) i.p.v. het aangenomen
//      "Kralingen Oost, Rotterdam" -- split(",") gaf dus de hele string
//      (inclusief plaatsnaam) terug als wijknaam. Nu wordt de betrouwbare
//      gemeentenaam van het EIND van weergavenaam afgeknipt, wat wel/geen
//      komma er ook staat.
//
// TWEEDE BUGFIX (klacht "Kralingen Crooswijk pakt helemaal niks"; live
// geverifieerd via Funda's eigen zoekbalk, Chrome-DOM op de resulterende
// URL): een `wijk`-niveau gebied heeft op Funda een ANDERE slugvorm dan een
// `buurt`-niveau gebied -- een buurt is een kale slug
// (selected_area=rotterdam/kralingen-oost, 46 resultaten), maar een wijk
// heeft een verplicht "wijk-"-voorvoegsel
// (selected_area=rotterdam/wijk-kralingen-crooswijk, 287 resultaten; zonder
// dat voorvoegsel: 0 resultaten). "Delfshaven" bestaat op Funda zelfs
// LETTERLIJK ALS BEIDE tegelijk (een wijk "Delfshaven" EN een buurt
// "Delfshaven" binnen die wijk) -- precies de reden dat Funda dit
// voorvoegsel nodig heeft om ze uit elkaar te houden. Deze functie kende dat
// onderscheid niet: elk `wijk`-niveau resultaat (niet alleen samengestelde
// namen zoals Kralingen-Crooswijk) kreeg dus stilzwijgend een kale slug en
// leverde 0 resultaten op, ook al zag de makelaar het gewoon als geldige
// suggestie in de autocomplete.
function mapPdokDoc(doc: PdokLocatieDoc): B2bLocatie | null {
  if (doc.type === "woonplaats" && doc.woonplaatsnaam) {
    return { label: doc.woonplaatsnaam, plaatsSlug: naarFundaSlug(doc.woonplaatsnaam), wijkSlug: null };
  }
  if ((doc.type === "wijk" || doc.type === "buurt") && doc.weergavenaam) {
    const plaatsNaam = doc.gemeentenaam?.trim();
    if (!plaatsNaam) return null;
    let subNaam = doc.weergavenaam.trim();
    if (subNaam.endsWith(plaatsNaam)) {
      subNaam = subNaam.slice(0, subNaam.length - plaatsNaam.length).replace(/,\s*$/, "").trim();
    }
    if (!subNaam) return null;
    const wijkSlug = doc.type === "wijk" ? `wijk-${naarFundaSlug(subNaam)}` : naarFundaSlug(subNaam);
    return { label: `${subNaam}, ${plaatsNaam}`, plaatsSlug: naarFundaSlug(plaatsNaam), wijkSlug };
  }
  return null;
}

export async function fetchLiveLocatieSuggesties(query: string, limit = 8): Promise<B2bLocatie[]> {
  const url = `${PDOK_SUGGEST_URL}?q=${encodeURIComponent(query)}&fq=type:(woonplaats OR wijk OR buurt)&rows=${limit}&fl=${encodeURIComponent(PDOK_FIELDS)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PDOK suggest HTTP ${res.status}`);
  const data = await res.json();
  const docs: PdokLocatieDoc[] = data?.response?.docs ?? [];
  const mapped = docs.map(mapPdokDoc).filter((l): l is B2bLocatie => l !== null);

  // PDOK kan dezelfde plaats/wijk meerdere keren teruggeven (bv. via
  // verschillende brondocumenten) -- dedupliceren op de uiteindelijke slug.
  const gezien = new Set<string>();
  return mapped.filter((l) => {
    const key = `${l.plaatsSlug}/${l.wijkSlug ?? ""}`;
    if (gezien.has(key)) return false;
    gezien.add(key);
    return true;
  });
}

// Kleine offline-fallback (grote steden, geen wijken) voor als PDOK niet
// bereikbaar is -- zelfde "nooit stil niets tonen"-patroon als
// searchAddressSuggestions() in addressLookup.ts.
const FALLBACK_LOCATIES: B2bLocatie[] = [
  { label: "Amsterdam", plaatsSlug: "amsterdam", wijkSlug: null },
  { label: "Rotterdam", plaatsSlug: "rotterdam", wijkSlug: null },
  { label: "Den Haag", plaatsSlug: "den-haag", wijkSlug: null },
  { label: "Utrecht", plaatsSlug: "utrecht", wijkSlug: null },
  { label: "Eindhoven", plaatsSlug: "eindhoven", wijkSlug: null },
  { label: "Groningen", plaatsSlug: "groningen", wijkSlug: null },
  { label: "Tilburg", plaatsSlug: "tilburg", wijkSlug: null },
  { label: "Almere", plaatsSlug: "almere", wijkSlug: null },
];

export function zoekLocatieFallback(query: string, limit = 6): B2bLocatie[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return FALLBACK_LOCATIES.filter((l) => l.label.toLowerCase().includes(q)).slice(0, limit);
}
