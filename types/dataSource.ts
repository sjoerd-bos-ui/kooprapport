// Bronstatus- en resultaatmodel, gedeeld door alle databron-adapters.
// Dit ontkoppelt "hebben we data" van "hoe betrouwbaar/vers is die data" —
// de UI kan op basis hiervan altijd eerlijk laten zien wat de status is,
// zonder aannames dat een bron compleet of zeker is.

// Waar komt de data vandaan: mockgenerator of een echte koppeling.
export type DataMode = "mock" | "live";

// Vertrouwensniveau van de bron zelf — onafhankelijk van of de laatste
// bevraging is geslaagd. Wordt getoond aan de gebruiker (SourceBadge).
export type SourceStatus =
  | "confirmed" // officieel bevestigd — rechtstreeks uit een authentieke registratie (bv. BAG)
  | "public" // publieke open-databron (bv. EP-Online open data)
  | "premium" // betaalde/gelicenseerde databron (bv. WOZ-leverancier, Kadaster Koopsommenregister)
  | "mock" // voorbeelddata, nog niet gekoppeld aan een echte bron
  | "unavailable"; // bron is (nu) niet beschikbaar of niet geconfigureerd

// Uitkomst van de laatste bevraging bij deze bron.
export type FetchState =
  | "success" // alle verwachte velden aanwezig
  | "partial" // data aanwezig, maar één of meer velden ontbreken
  | "empty" // bron gaf geldig antwoord, maar geen resultaten voor dit adres
  | "error" // bron gaf een fout terug
  | "timeout" // bron reageerde niet binnen de time-out
  | "unavailable"; // bron is niet geconfigureerd/ingeschakeld (bv. ontbrekende API-key)

export interface SourceMeta {
  source: string; // machine-key, bv. "bag"
  label: string; // mensleesbare naam, bv. "Kadaster BAG"
  mode: DataMode;
  status: SourceStatus;
  state: FetchState;
  fetchedAt: string; // ISO-timestamp
  missingFields?: string[];
  errorMessage?: string;
}

// Elke adapter levert dit envelope terug in plaats van los data. `data` is
// alleen niet-null bij state "success" of "partial" — de UI mag hier hard
// op vertrouwen en hoeft nergens anders te gokken of data compleet is.
export interface SourceResult<T> {
  data: T | null;
  meta: SourceMeta;
}

function baseMeta(source: string, label: string, mode: DataMode): Pick<SourceMeta, "source" | "label" | "mode" | "fetchedAt"> {
  return { source, label, mode, fetchedAt: new Date().toISOString() };
}

export function successResult<T>(source: string, label: string, mode: DataMode, status: SourceStatus, data: T): SourceResult<T> {
  return { data, meta: { ...baseMeta(source, label, mode), status, state: "success" } };
}

export function partialResult<T>(
  source: string,
  label: string,
  mode: DataMode,
  status: SourceStatus,
  data: T,
  missingFields: string[]
): SourceResult<T> {
  return { data, meta: { ...baseMeta(source, label, mode), status, state: "partial", missingFields } };
}

export function emptyResult<T>(source: string, label: string, mode: DataMode, status: SourceStatus): SourceResult<T> {
  return { data: null, meta: { ...baseMeta(source, label, mode), status, state: "empty" } };
}

export function errorResult<T>(
  source: string,
  label: string,
  mode: DataMode,
  status: SourceStatus,
  errorMessage: string
): SourceResult<T> {
  return { data: null, meta: { ...baseMeta(source, label, mode), status, state: "error", errorMessage } };
}

export function timeoutResult<T>(source: string, label: string, mode: DataMode, status: SourceStatus): SourceResult<T> {
  return { data: null, meta: { ...baseMeta(source, label, mode), status, state: "timeout" } };
}

export function unavailableResult<T>(source: string, label: string, mode: DataMode): SourceResult<T> {
  return { data: null, meta: { ...baseMeta(source, label, mode), status: "unavailable", state: "unavailable" } };
}
