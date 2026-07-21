import { createHmac, timingSafeEqual } from "crypto";
import { canonicalAddressKey } from "@/lib/utils/slug";
import { RAPPORT_PRIJS_CENTEN } from "@/lib/utils/prijs";

// -----------------------------------------------------------------------------
// Ondertekende kortingstoken voor de herinneringsmail (48 uur na de gratis
// preview, zie app/api/cron/reminder-email/route.ts). SERVER-ONLY (gebruikt
// node:crypto) -- nooit importeren in een "use client"-bestand.
//
// BEWUST een eigen HMAC-token i.p.v. de korting gewoon als los queryparam
// ("korting=15") meesturen: zonder ondertekening zou iedereen zelf een
// kortingslink kunnen verzinnen voor eender welk adres. Dit token bindt de
// korting aan (a) precies dit adres (addressKey, dezelfde sleutel als
// bestellingen.ts al gebruikt) en (b) een vervaltijdstip -- en is alleen
// geldig als de handtekening klopt, geverifieerd met een secret dat nooit de
// server verlaat.
//
// Zonder KORTING_SECRET in de omgeving kunnen er domweg geen tokens worden
// aangemaakt of geverifieerd (fail-closed, zelfde voorzichtige patroon als
// stuurRapportEmail zonder RESEND_API_KEY) -- er wordt dan nooit een
// (niet-werkende) korting beloofd.
// -----------------------------------------------------------------------------

const KORTING_PERCENTAGE = 15;

function secret(): string | null {
  return process.env.KORTING_SECRET || null;
}

function b64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function handtekening(payload: string, sec: string): Buffer {
  return createHmac("sha256", sec).update(payload).digest();
}

export function kortingBeschikbaar(): boolean {
  return Boolean(secret());
}

// Voor weergave in de herinneringsmail (het bedrag/percentage tonen) --
// zonder dat daar al een token voor hoeft te bestaan. Het token zelf
// (maakKortingToken) blijft de enige bron van waarheid bij het daadwerkelijk
// afrekenen; dit is puur dezelfde berekening, hier herbruikbaar i.p.v.
// elders gedupliceerd.
export function kortingWeergave(): { percentage: number; bedragCenten: number } | null {
  if (!kortingBeschikbaar()) return null;
  return {
    percentage: KORTING_PERCENTAGE,
    bedragCenten: Math.round(RAPPORT_PRIJS_CENTEN * (1 - KORTING_PERCENTAGE / 100)),
  };
}

// addressKey MOET dezelfde sleutel zijn als canonicalAddressKey() elders in
// de app gebruikt (bestellingen.ts, betaling/aanmaken) -- zo blijft dit token
// gebonden aan exact dat ene adres, ongeacht welk slug/label-veld er verder
// nog wordt meegestuurd.
export function maakKortingToken(addressKey: string, geldigUurTotEindeMs: number): string | null {
  const sec = secret();
  if (!sec) return null;
  const payload = JSON.stringify({ a: addressKey, t: geldigUurTotEindeMs, p: KORTING_PERCENTAGE });
  const payloadB64 = b64url(Buffer.from(payload, "utf8"));
  const handtek = b64url(handtekening(payloadB64, sec));
  return `${payloadB64}.${handtek}`;
}

export interface KortingVerificatie {
  geldig: boolean;
  kortingsPercentage?: number;
  bedragCenten?: number;
}

export function verifieerKortingToken(token: string | null | undefined, addressKey: string | null): KortingVerificatie {
  const sec = secret();
  if (!sec || !token || !addressKey) return { geldig: false };

  const delen = token.split(".");
  if (delen.length !== 2) return { geldig: false };
  const [payloadB64, handtek] = delen;

  let verwachteHandtek: Buffer;
  let ontvangenHandtek: Buffer;
  try {
    verwachteHandtek = handtekening(payloadB64, sec);
    ontvangenHandtek = b64urlDecode(handtek);
  } catch {
    return { geldig: false };
  }
  // Lengte moet exact gelijk zijn vóór timingSafeEqual (anders gooit die zelf
  // een fout) -- een lengteverschil betekent hoe dan ook een ongeldig token.
  if (verwachteHandtek.length !== ontvangenHandtek.length || !timingSafeEqual(verwachteHandtek, ontvangenHandtek)) {
    return { geldig: false };
  }

  let payload: { a?: string; t?: number; p?: number };
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { geldig: false };
  }

  if (payload.a !== addressKey) return { geldig: false };
  if (typeof payload.t !== "number" || Date.now() > payload.t) return { geldig: false };
  const percentage = typeof payload.p === "number" ? payload.p : KORTING_PERCENTAGE;

  const bedragCenten = Math.round(RAPPORT_PRIJS_CENTEN * (1 - percentage / 100));
  return { geldig: true, kortingsPercentage: percentage, bedragCenten };
}

// Kleine helper voor de aanroepers die alleen een AddressMeta-achtig object
// hebben (niet al een kant-en-klare addressKey) -- zelfde afleiding als
// canonicalAddressKey elders, hier hergebruikt i.p.v. gedupliceerd.
export function addressKeyVoorKorting(input: {
  postcode?: string;
  huisnummer?: string;
  huisletter?: string;
  toevoeging?: string;
}): string | null {
  return canonicalAddressKey(input);
}
