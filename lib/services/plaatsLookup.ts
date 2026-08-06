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

function mapPdokDoc(doc: PdokLocatieDoc): B2bLocatie | null {
  if (doc.type === "woonplaats" && doc.woonplaatsnaam) {
    return { label: doc.woonplaatsnaam, plaatsSlug: naarFundaSlug(doc.woonplaatsnaam), wijkSlug: null };
  }
  if (doc.type === "wijk" && doc.weergavenaam) {
    // gemeentenaam is de betrouwbaarste bron voor de bijbehorende plaats; als
    // die ontbreekt, valt dit terug op het laatste deel van weergavenaam (bv.
    // "Kralingen, Rotterdam" -> "Rotterdam") -- nooit gokken zonder bron.
    const plaatsNaam = doc.gemeentenaam?.trim() || doc.weergavenaam.split(",").pop()?.trim();
    const wijkNaam = doc.weergavenaam.split(",")[0]?.trim();
    if (!plaatsNaam || !wijkNaam) return null;
    return { label: doc.weergavenaam, plaatsSlug: naarFundaSlug(plaatsNaam), wijkSlug: naarFundaSlug(wijkNaam) };
  }
  return null;
}

export async function fetchLiveLocatieSuggesties(query: string, limit = 8): Promise<B2bLocatie[]> {
  const url = `${PDOK_SUGGEST_URL}?q=${encodeURIComponent(query)}&fq=type:(woonplaats OR wijk)&rows=${limit}&fl=${encodeURIComponent(PDOK_FIELDS)}`;
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
