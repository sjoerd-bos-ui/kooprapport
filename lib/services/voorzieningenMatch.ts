import { fetchLiveAddressSuggestions } from "@/lib/services/addressLookup";
import { fetchBuurtprofiel } from "@/lib/data-sources/buurtprofiel";
import type { B2bVoorzieningWens } from "@/types/b2b";
import type { VoorzieningAfstand } from "@/types/report";

// -----------------------------------------------------------------------------
// Matchingmodel v2, Vraag 9 ("welke voorzieningen zijn belangrijk") en de
// dealbreaker "no_amenities" -- zie het Cowork-gesprek hierover: "alle data
// zijn van Funda te halen op voorzieningen na -- die halen we uit ons eigen
// systeem en maken we de koppeling". "Ons eigen systeem" = het bestaande,
// CBS-gebaseerde buurtprofiel (lib/data-sources/buurtprofiel.ts) dat al voor
// de consumenten-Kooprapporten gebruikt wordt -- geen nieuwe databron, alleen
// een nieuwe koppeling ernaartoe vanuit het B2B-matchingmodel.
//
// KOSTEN: fetchBuurtprofiel() gebruikt uitsluitend gratis, keyless CBS/politie-
// OData-bronnen (zie de toelichting in buurtprofiel.ts) -- dit voegt dus GEEN
// extra Bright Data-proxykosten toe, alleen wat extra latency per kandidaat
// (twee extra live-lookups: PDOK-adresresolutie + CBS-tabellen).
//
// ADRESRESOLUTIE: fetchBuurtprofiel() heeft een AddressMeta met
// `locatieserverId` nodig (zie resolveBuurtcode in buurtcodeLookup.ts) -- dat
// hebben we niet rechtstreeks uit een Funda-scrape. In plaats van zelf een
// nieuwe PDOK-koppeling te bouwen, hergebruiken we de BESTAANDE
// fetchLiveAddressSuggestions() (addressLookup.ts, dezelfde live PDOK-
// adres-suggest-service als de consumenten-adresbalk) met de Funda-titel
// ("straat huisnummer, plaats") als zoekterm -- die twee formats komen
// voldoende overeen om het juiste adres als eerste/beste suggestie terug te
// krijgen.
// -----------------------------------------------------------------------------

// 7 vragenlijst-categorieën -> CBS 85560NED-voorzieningkeys (zie
// VOORZIENING_DEFINITIES in buurtprofiel.ts, gedeeld met het consumenten-
// Kooprapport).
//
// BUGFIX (Cowork-gesprek "voorzieningen staat bij sommige geen databron
// gekoppeld -- fix dit"): "sports"/"restaurants" hadden hier eerder BEWUST
// geen CBS-bron (lege array) -- de tabel kent café/restaurant/sportterrein
// wel, maar toevoegen aan de gedeelde VOORZIENING_DEFINITIES raakt ook het
// consumenten-Kooprapport, dus dat was bewust uitgesteld. Inmiddels alsnog
// toegevoegd (zie de toelichting bij "sportterrein"/"cafeED"/"restaurant" in
// VOORZIENING_DEFINITIES, buurtprofiel.ts) -- alle 7 wensen hebben nu een
// echte CBS-databron, geen enkele meer met een lege array.
// ("workplace" bestond hier eerder ook als lege array, maar is inmiddels
// helemaal uit B2bVoorzieningWens verwijderd -- die categorie heeft
// ÜBERHAUPT geen bruikbare CBS-afstandsdata, zie types/b2b.ts. Een lege array
// blijft dus mogelijk/ondersteund voor een toekomstige categorie zonder
// databron, alleen komt dat nu voor geen van de 7 huidige wensen meer voor.)
const WENS_NAAR_CBS_KEYS: Record<B2bVoorzieningWens, string[]> = {
  schools: ["basisschool", "voortgezetOnderwijs", "kinderdagverblijf"],
  shops: ["supermarkt"],
  public_transport: ["treinstation"],
  healthcare: ["huisarts", "apotheek", "ziekenhuis"],
  sports: ["sportterrein"],
  restaurants: ["cafeED", "restaurant"],
  park: ["park"],
};

// "Dichtbij genoeg" -- eigen, praktische drempel (geen officiële CBS-norm):
// 2 km is in de regio Rotterdam/Rijnmond een redelijke fiets-/loopafstand.
// Gebruikt zowel voor de voorzieningen-score (Component 10, "amenities_
// nearby"-prioriteit) als voor de "no_amenities"-dealbreaker.
export const VOORZIENING_DICHTBIJ_KM = 2;

export interface VoorzieningenResultaat {
  // false = buurtprofiel kon niet bepaald worden (adres niet herleidbaar,
  // CBS-bronnen niet bereikbaar, etc.) -- GEEN afwijzingsgrond, gewoon
  // onbekend (zie matchScore.ts: bij `gevonden: false` telt dit onderdeel
  // altijd neutraal mee, nooit als 0 punten of dealbreaker-trigger).
  gevonden: boolean;
  items: VoorzieningAfstand[];
}

export async function haalVoorzieningenVoorAdres(funda_titel: string): Promise<VoorzieningenResultaat> {
  try {
    const suggesties = await fetchLiveAddressSuggestions(funda_titel, 1);
    const adres = suggesties[0];
    if (!adres) return { gevonden: false, items: [] };
    const resultaat = await fetchBuurtprofiel(adres);
    if (!resultaat.data) return { gevonden: false, items: [] };
    return { gevonden: true, items: resultaat.data.voorzieningen.items };
  } catch {
    return { gevonden: false, items: [] };
  }
}

// Kortste afstand tot een voorziening die bij deze wens hoort, of `null` als
// er geen databron (nu geen van de 7 wensen meer, maar de functie blijft
// hierop voorbereid) of geen cijfer bekend is -- bewust hetzelfde onderscheid
// als de rest van dit project: `null` is nooit "0 km"/"veraf", altijd "niet
// te bepalen".
//
// `?? []` bij de lookup is BEWUST defensief: `wens` komt bij een bestaand
// (nog niet opnieuw opgeslagen) koperVoorkeuren-dossier rechtstreeks uit de
// database, niet via het TypeScript-type. Een dossier dat de inmiddels
// verwijderde waarde "workplace" nog bevat (zie types/b2b.ts) zou hier anders
// een crash geven op `.length` van `undefined` -- zelfde soort bug als eerder
// bij de dealbreakers, nu in één keer voorkomen i.p.v. achteraf gefixt.
export function afstandTotWens(items: VoorzieningAfstand[], wens: B2bVoorzieningWens): number | null {
  const keys = WENS_NAAR_CBS_KEYS[wens] ?? [];
  if (keys.length === 0) return null;
  const afstanden = items.filter((i) => keys.includes(i.key)).map((i) => i.afstandKm);
  return afstanden.length > 0 ? Math.min(...afstanden) : null;
}

// Heeft deze wens ÜBERHAUPT een CBS-databron? Alle 7 huidige wensen hebben er
// inmiddels een (zie WENS_NAAR_CBS_KEYS hierboven) -- deze functie blijft
// bestaan voor een eventuele toekomstige wens zonder databron, zodat die dan
// expliciet als "niet meetbaar" behandeld wordt i.p.v. impliciet als "0 van
// de 0 gevonden = ver weg".
export function heeftDatabron(wens: B2bVoorzieningWens): boolean {
  return (WENS_NAAR_CBS_KEYS[wens] ?? []).length > 0;
}
