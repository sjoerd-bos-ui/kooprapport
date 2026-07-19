// -----------------------------------------------------------------------------
// Generieke, kleine key-value-opslag — mock/live-patroon zoals de rest van
// dit project (lib/config/dataSources.ts, lib/config/payment.ts): zonder
// UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN valt dit terug op een
// in-memory Map (zelfde beperking als voorheen — leeft zolang het
// serverproces leeft, gaat NIET mee tussen meerdere instanties/na een
// herstart — nu alleen expliciet op één plek, i.p.v. verstopt in
// lib/payments/bestellingen.ts zelf). Mét die env vars gaat het naar een
// echte, gedeelde Upstash Redis-store.
//
// Bewust GEEN aparte @upstash/redis-npm-package: Upstash's REST-API is
// gewoon een HTTP-endpoint (POST met een commando-array als JSON-body) —
// dat past bij hoe de rest van dit project externe bronnen aanspreekt
// (plain fetch(), zie lib/data-sources/*.ts), geen extra dependency nodig.
// Docs: https://upstash.com/docs/redis/features/restapi
//
// Nooit tegen een live respons geverifieerd (geen Upstash-account
// beschikbaar tijdens het bouwen) — zelfde discipline als bag.ts/kavel.ts:
// verifieer dit tegen een echt Upstash-project vóórdat PAYMENT_MODE=live
// hierop leunt.
// -----------------------------------------------------------------------------

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvIsLive(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN);
}

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

// Eén gedeelde Map per serverproces — exact dezelfde beperking als de
// oorspronkelijke `bestellingen`-Map had, nu alleen herbruikbaar voor elke
// toekomstige KV-behoefte (bv. rate limiting) i.p.v. een tweede, losse Map.
const memoryStore = new Map<string, MemoryEntry>();

async function upstashCommand(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(UPSTASH_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash Redis gaf HTTP ${res.status} bij commando ${command[0]}`);
  const body = (await res.json()) as { result: unknown; error?: string };
  if (body.error) throw new Error(`Upstash Redis-fout: ${body.error}`);
  return body.result;
}

export async function kvSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (kvIsLive()) {
    const command = ttlSeconds ? ["SET", key, value, "EX", ttlSeconds] : ["SET", key, value];
    await upstashCommand(command);
    return;
  }
  memoryStore.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
}

export async function kvGet(key: string): Promise<string | null> {
  if (kvIsLive()) {
    const result = await upstashCommand(["GET", key]);
    return typeof result === "string" ? result : null;
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

// Atomair ophogen met TTL — gebruikt door de rate limiter (lib/services/
// rateLimit.ts). INCR bestaat niet zinvol in de in-memory fallback zonder
// race conditions, maar dit project draait daar toch single-process, dus een
// simpele lees-schrijf is hier voldoende (zelfde soort pragmatisme als de
// rest van deze store).
export async function kvIncrWithTtl(key: string, ttlSeconds: number): Promise<number> {
  if (kvIsLive()) {
    const result = await upstashCommand(["INCR", key]);
    const count = typeof result === "number" ? result : Number(result);
    if (count === 1) {
      // Alleen bij de EERSTE hit een TTL zetten, anders zou elke aanroep de
      // window weer resetten en zou de limiet nooit intreden.
      await upstashCommand(["EXPIRE", key, ttlSeconds]);
    }
    return count;
  }
  const entry = memoryStore.get(key);
  const now = Date.now();
  if (!entry || (entry.expiresAt !== null && entry.expiresAt < now)) {
    memoryStore.set(key, { value: "1", expiresAt: now + ttlSeconds * 1000 });
    return 1;
  }
  const count = Number(entry.value) + 1;
  memoryStore.set(key, { value: String(count), expiresAt: entry.expiresAt });
  return count;
}
