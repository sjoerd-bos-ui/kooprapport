// -----------------------------------------------------------------------------
// Betaalconfiguratie — zelfde "mode: mock/live via env var"-patroon als
// lib/config/dataSources.ts (Altum e.a.), zodat dit project overal op
// dezelfde manier tussen mockdata en een echte, kostenveroorzakende
// koppeling schakelt. PAYMENT_MODE ontbreekt of is iets anders dan "live"?
// Dan draait de hele betaalflow op mock (geen Mollie-aanroep, geen enkele
// kans op een onbedoelde echte transactie tijdens ontwikkelen).
//
// Provider: Mollie — gekozen boven Stripe omdat dit een NL-gerichte,
// eenmalige iDEAL-betaling is (geen abonnementen, geen internationale
// kaarten als hoofddoelgroep): Mollie is de gangbare keuze hiervoor in
// Nederland, met lagere kosten per iDEAL-transactie en een eenvoudigere
// API dan Stripe voor dit specifieke geval.
// -----------------------------------------------------------------------------

export type BetaalMode = "mock" | "live";

function readBetaalMode(): BetaalMode {
  return process.env.PAYMENT_MODE === "live" ? "live" : "mock";
}

export const BETAAL_MODE: BetaalMode = readBetaalMode();

export const MOLLIE_API_BASE_URL = process.env.MOLLIE_API_BASE_URL ?? "https://api.mollie.com/v2";
export const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY;

// Basis-URL van deze site zelf — nodig om de redirectUrl (waar de klant na
// betalen naar terugkeert) en webhookUrl (waar Mollie de betaalstatus naar
// stuurt) op te bouwen. BELANGRIJK: Mollie's webhookUrl moet van buitenaf
// bereikbaar zijn — "localhost" werkt niet. Voor lokaal testen in live-modus
// is een tunnel nodig (bv. ngrok), zie .env.example.
export const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

if (BETAAL_MODE === "live" && !MOLLIE_API_KEY) {
  // Bewust een harde, duidelijke fout i.p.v. stilzwijgend terugvallen op
  // mock: als iemand PAYMENT_MODE=live zet zonder sleutel, is dat een
  // configuratiefout die je NU wil zien, niet pas wanneer een klant
  // probeert af te rekenen.
  console.error(
    "[betaling] PAYMENT_MODE=live staat aan, maar MOLLIE_API_KEY ontbreekt. Betalingen zullen mislukken totdat deze is ingesteld."
  );
}
