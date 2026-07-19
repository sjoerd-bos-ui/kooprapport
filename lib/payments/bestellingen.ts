import { kvGet, kvIsLive, kvSet } from "@/lib/services/kvStore";
import { BETAAL_MODE } from "@/lib/config/payment";

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
}

// Bestellingen die langer dan dit openstaan tellen niet meer mee als geldig
// (voorkomt dat een oude, nooit afgeronde bestelling later alsnog per
// ongeluk als "bewijs van betaling" gebruikt kan worden voor een heropend
// tabblad). Ruim boven de tijd die een iDEAL-betaling normaal kost.
const MAX_LEEFTIJD_MS = 60 * 60 * 1000; // 1 uur

// Hoe lang een bestelling-record in de store blijft staan, ruim boven
// MAX_LEEFTIJD_MS — een klant die vlak na afronden nog een keer de
// bevestigingspagina ververst of de pdf opnieuw downloadt, moet de
// bestelling nog kunnen terugvinden.
const BESTELLING_TTL_SECONDEN = 60 * 60 * 24; // 24 uur

function bestellingKey(id: string): string {
  return `bestelling:${id}`;
}

function mollieIndexKey(molliePaymentId: string): string {
  return `bestelling-mollie:${molliePaymentId}`;
}

async function opslaan(bestelling: Bestelling): Promise<void> {
  await kvSet(bestellingKey(bestelling.id), JSON.stringify(bestelling), BESTELLING_TTL_SECONDEN);
}

export async function maakBestelling(addressSlug: string, bedragCenten: number): Promise<Bestelling> {
  const bestelling: Bestelling = {
    id: crypto.randomUUID(),
    addressSlug,
    bedragCenten,
    status: "open",
    aangemaaktOp: new Date().toISOString(),
  };
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
