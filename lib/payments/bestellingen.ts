import { kvGet, kvIsLive, kvSet, kvZAdd, kvZRangeByScore } from "@/lib/services/kvStore";
import { BETAAL_MODE } from "@/lib/config/payment";
import type { AddressMeta, Report } from "@/types/report";

// -----------------------------------------------------------------------------
// Bestelling-("order")-opslag — de kern van waarom een betaalflow niet
// hetzelfde is als de andere (data-)koppelingen in dit project: hier moet
// iets BLIJVEN bestaan tussen "betaling aangemaakt" (klant klikt "Betaal met
// iDEAL") en "betaling bevestigd" (Mollie's webhook, of de mock-variant
// daarvan) — vaak twee verschillende HTTP-requests, soms zelfs nadat de
// klant is weggenavigeerd naar Mollie en terugkomt.
//
// Draait nu op lib/services/kvStore.ts (mock: in-memory Map, live: Upstash
// Redis) i.p.v. een eigen, losse Map — dat loste de eerdere beperking op dat
// een herstart/nieuwe deploy/meerdere serverinstanties een "betaald"-status
// kwijtraakten. Zonder UPSTASH_REDIS_REST_URL/TOKEN blijft dit nog steeds
// in-memory (zie de waarschuwing hieronder), MET die env vars is het
// productiewaardig.
//
// Twee sleutels per bestelling: het record zelf (`bestelling:{id}`) en een
// secundaire index van Mollie's betalings-id naar ons bestelling-id
// (`bestelling-mollie:{molliePaymentId}`) — nodig omdat
// vindBestellingDoorMolliePaymentId() niet meer over alle keys kan
// itereren zoals de oude Map dat kon (een KV-store leent zich daar niet
// voor).
// -----------------------------------------------------------------------------

if (BETAAL_MODE === "live" && !kvIsLive()) {
  console.error(
    "[betaling] PAYMENT_MODE=live staat aan, maar UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN ontbreken. " +
      "Bestellingen worden dan nog steeds in-memory bewaard — bij een herstart, nieuwe deploy of meerdere " +
      "serverinstanties raakt een 'betaald'-status dan alsnog kwijt. Zie .env.example."
  );
}

export type BestellingStatus = "open" | "paid" | "failed" | "expired";

export interface Bestelling {
  id: string;
  addressSlug: string;
  bedragCenten: number;
  status: BestellingStatus;
  molliePaymentId?: string;
  aangemaaktOp: string;
  betaaldOp?: string;
  // Volledig AddressMeta-object (zie het Cowork-gesprek "zelfstandig
  // koperportaal" / "b2c-dashboard"), alleen gevuld vanaf maakBestelling --
  // BEWUST hier opgeslagen i.p.v. het adres later opnieuw op te zoeken via
  // Altum/BAG voor het dashboard: dat zou per rij in "Mijn rapporten" een
  // kostenveroorzakende her-aanvraag betekenen voor iets dat we op het
  // aankoopmoment al gewoon hebben. Ook nodig om vanuit het dashboard direct
  // naar het juiste rapport te kunnen linken (buildReportHref vereist het
  // volledige adres, niet alleen de slug — zie lib/utils/slug.ts).
  address?: AddressMeta;
  // Koppeling aan een consumentenaccount (zie lib/services/consumentAuth.ts).
  // SEO/procesaudit-vervolg ("mensen maken een account aan of magic link,
  // maar we hebben wel een mail nodig en wat basisgegevens"): e-mail (en
  // naam) zijn sinds die wijziging VERPLICHT bij het afrekenen zelf (zie
  // app/api/betaling/aanmaken/route.ts) i.p.v. optioneel achteraf via een
  // "Bewaar in account"-knop -- elke betaalde bestelling heeft dus altijd
  // een email. Blijft optioneel getypeerd voor de handvol oudere, vóór deze
  // wijziging aangemaakte bestellingen die nog geen e-mailadres hebben.
  email?: string;
  naam?: string;
  favoriet?: boolean;
  gearchiveerd?: boolean;
  // Demo-omgeving (zie app/api/admin/account/demo-vullen/route.ts, "gewoon
  // een demo-rapport zonder Altum aanvraag"): een volledig, vooraf
  // gegenereerd Report (genereerDemoRapport in b2bDemoData.ts, exact
  // dezelfde functie als de B2B-demo-route al gebruikte) -- staat hier klaar
  // zodat het bekijken van dit rapport GEEN live/kostenveroorzakende aanroep
  // hoeft te doen (niet naar Altum, en ook niet naar de gratis bronnen zoals
  // BAG/EP-Online). Zie app/rapport/[slug]/page.tsx (gebruikt dit i.p.v.
  // getReport() als bestellingId hierheen wijst) en app/api/rapport/premium/
  // route.ts (geeft market/nearbySales/verduurzaming hieruit terug i.p.v.
  // fetchPremiumOnUnlock aan te roepen).
  demoReport?: Report;
}

// Bestellingen die langer dan dit openstaan tellen niet meer mee als geldig
// (voorkomt dat een oude, nooit afgeronde bestelling later alsnog per
// ongeluk als "bewijs van betaling" gebruikt kan worden voor een heropend
// tabblad). Ruim boven de tijd die een iDEAL-betaling normaal kost.
const MAX_LEEFTIJD_MS = 60 * 60 * 1000; // 1 uur

// Hoe lang een bestelling-record in de store blijft staan, ruim boven
// MAX_LEEFTIJD_MS — een klant die vlak na afronden nog een keer de
// bevestigingspagina ververst of de pdf opnieuw downloadt, moet de
// bestelling nog kunnen terugvinden. Blijft de standaard voor een bestelling
// die NOOIT aan een e-mailadres gekoppeld wordt (puur anonieme aankoop).
const BESTELLING_TTL_SECONDEN = 60 * 60 * 24; // 24 uur

// Zodra een bestelling aan een e-mailadres gekoppeld wordt (zie
// koppelEmailAanBestelling hieronder), moet hij voor het "Mijn rapporten"-
// dashboard net zo lang bewaard blijven als een normaal account -- de oude
// 24-uurs TTL zou anders elke bestelling na een dag alsnog uit het dashboard
// laten verdwijnen. Geen "voor altijd" (kvSet ondersteunt geen TTL-loze
// set zonder de hele store-laag aan te passen), maar 5 jaar is ruim genoeg
// voor de levensduur van dit soort aankoopgeschiedenis.
const GEKOPPELDE_BESTELLING_TTL_SECONDEN = 5 * 365 * 24 * 60 * 60; // 5 jaar

function bestellingKey(id: string): string {
  return `bestelling:${id}`;
}

function mollieIndexKey(molliePaymentId: string): string {
  return `bestelling-mollie:${molliePaymentId}`;
}

// Sorted-set-index van e-mailadres -> bestelling-id's (score = aangemaaktOp
// als unix-ms, zodat listBestellingenVoorEmail nieuwste-eerst kan
// teruggeven) -- zelfde patroon als de vele klant/org-indexen in
// lib/services/b2bStore.ts.
function bestellingEmailIndexKey(email: string): string {
  return `bestelling-email:${email.trim().toLowerCase()}`;
}

const VER_IN_DE_TOEKOMST = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;

async function opslaan(bestelling: Bestelling): Promise<void> {
  const ttl = bestelling.email ? GEKOPPELDE_BESTELLING_TTL_SECONDEN : BESTELLING_TTL_SECONDEN;
  await kvSet(bestellingKey(bestelling.id), JSON.stringify(bestelling), ttl);
}

// email/naam optioneel in de signatuur gehouden (i.p.v. verplicht) zodat
// interne/toekomstige aanroepers die zonder koperklant werken (denkbeeldig,
// nu niet het geval) niet breken -- de ECHTE verplichting zit in de
// aanroepende route (app/api/betaling/aanmaken/route.ts), die valideert
// vóórdat dit hier aangeroepen wordt.
export async function maakBestelling(
  addressSlug: string,
  bedragCenten: number,
  address?: AddressMeta,
  email?: string,
  naam?: string
): Promise<Bestelling> {
  const bestelling: Bestelling = {
    id: crypto.randomUUID(),
    addressSlug,
    bedragCenten,
    status: "open",
    aangemaaktOp: new Date().toISOString(),
    address,
  };
  if (email) {
    bestelling.email = email.trim().toLowerCase();
    if (naam?.trim()) bestelling.naam = naam.trim();
    await opslaan(bestelling);
    // Zelfde index als koppelEmailAanBestelling hieronder -- hier inline
    // i.p.v. die functie aanroepen, want die haalt de bestelling opnieuw op
    // (bestaat op dit punt nog niet in de store) en zou dus niets vinden.
    await kvZAdd(bestellingEmailIndexKey(bestelling.email), new Date(bestelling.aangemaaktOp).getTime(), bestelling.id);
    return bestelling;
  }
  await opslaan(bestelling);
  return bestelling;
}

export async function haalBestelling(id: string): Promise<Bestelling | undefined> {
  const raw = await kvGet(bestellingKey(id));
  if (!raw) return undefined;
  const bestelling = JSON.parse(raw) as Bestelling;
  const leeftijdMs = Date.now() - new Date(bestelling.aangemaaktOp).getTime();
  if (bestelling.status === "open" && leeftijdMs > MAX_LEEFTIJD_MS) {
    bestelling.status = "expired";
    await opslaan(bestelling);
  }
  return bestelling;
}

export async function koppelMolliePaymentId(id: string, molliePaymentId: string): Promise<void> {
  const bestelling = await haalBestelling(id);
  if (!bestelling) return;
  bestelling.molliePaymentId = molliePaymentId;
  await opslaan(bestelling);
  await kvSet(mollieIndexKey(molliePaymentId), id, BESTELLING_TTL_SECONDEN);
}

export async function zetStatus(id: string, status: BestellingStatus): Promise<void> {
  const bestelling = await haalBestelling(id);
  if (!bestelling) return;
  bestelling.status = status;
  if (status === "paid") bestelling.betaaldOp = new Date().toISOString();
  await opslaan(bestelling);
}

export async function vindBestellingDoorMolliePaymentId(molliePaymentId: string): Promise<Bestelling | undefined> {
  const id = await kvGet(mollieIndexKey(molliePaymentId));
  if (!id) return undefined;
  return haalBestelling(id);
}

// Gebruikt door /api/rapport/premium om te controleren of er daadwerkelijk
// voor DIT adres is betaald — een betaalde bestelling voor een ander adres
// telt bewust niet mee.
export async function isBetaaldVoorAdres(bestellingId: string, addressSlug: string): Promise<boolean> {
  const bestelling = await haalBestelling(bestellingId);
  return !!bestelling && bestelling.status === "paid" && bestelling.addressSlug === addressSlug;
}

// --- Consumentenaccount ("Mijn rapporten", zie het Cowork-gesprek
// "zelfstandig koperportaal" / "b2c-dashboard") ------------------------------

// Koppelt een bestelling aan een e-mailadres -- ofwel omdat de koper na het
// afrekenen zelf een adres invult (zie app/api/account/koppel-bestelling/
// route.ts), ofwel automatisch omdat hij al ingelogd was tijdens het
// afrekenen (zie app/api/betaling/aanmaken/route.ts). Idempotent: opnieuw
// koppelen aan hetzelfde adres voegt de bestelling niet dubbel toe aan de
// index (kvZAdd met dezelfde member overschrijft gewoon de score).
export async function koppelEmailAanBestelling(id: string, email: string): Promise<Bestelling | undefined> {
  const bestelling = await haalBestelling(id);
  if (!bestelling) return undefined;
  bestelling.email = email.trim().toLowerCase();
  await opslaan(bestelling);
  await kvZAdd(bestellingEmailIndexKey(bestelling.email), new Date(bestelling.aangemaaktOp).getTime(), bestelling.id);
  return bestelling;
}

// Nieuwste-eerst, net als listMatchenVoorKlant/listRapportenVoorKlant in
// b2bStore.ts (kvZRangeByScore geeft oplopend terug, dus hier omgedraaid).
export async function listBestellingenVoorEmail(email: string): Promise<Bestelling[]> {
  const ids = await kvZRangeByScore(bestellingEmailIndexKey(email.trim().toLowerCase()), VER_IN_DE_TOEKOMST);
  const bestellingen = await Promise.all(ids.map((id) => haalBestelling(id)));
  return bestellingen.filter((b): b is Bestelling => b !== undefined).reverse();
}

// Ownership-check hoort bij de AANROEPENDE route (vergelijk bestelling.email
// met de ingelogde sessie, zie app/api/account/rapporten/[id]/route.ts) --
// deze functie zelf doet geen autorisatie, net als zetStatus hierboven.
export async function zetFavoriet(id: string, favoriet: boolean): Promise<Bestelling | undefined> {
  const bestelling = await haalBestelling(id);
  if (!bestelling) return undefined;
  bestelling.favoriet = favoriet;
  await opslaan(bestelling);
  return bestelling;
}

export async function zetGearchiveerd(id: string, gearchiveerd: boolean): Promise<Bestelling | undefined> {
  const bestelling = await haalBestelling(id);
  if (!bestelling) return undefined;
  bestelling.gearchiveerd = gearchiveerd;
  await opslaan(bestelling);
  return bestelling;
}

// Zie de toelichting bij Bestelling.demoReport hierboven -- uitsluitend
// aangeroepen vanuit de admin-demo-vulroute, nooit vanuit een echte
// (betaalde) bestelling.
export async function zetDemoRapport(id: string, report: Report): Promise<Bestelling | undefined> {
  const bestelling = await haalBestelling(id);
  if (!bestelling) return undefined;
  bestelling.demoReport = report;
  await opslaan(bestelling);
  return bestelling;
}
