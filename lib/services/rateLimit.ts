import type { NextRequest } from "next/server";
import { kvIncrWithTtl } from "@/lib/services/kvStore";

// -----------------------------------------------------------------------------
// Simpele, per-IP rate limiter (vaste-window, geen sliding window — voor de
// mate van bescherming die dit project nodig heeft is dat voldoende, en het
// is met kvIncrWithTtl() in twee regels te implementeren). Gebruikt dezelfde
// kvStore als lib/payments/bestellingen.ts (mock: in-memory Map, live:
// Upstash Redis) — geen aparte infrastructuur nodig.
//
// Beschermt tegen scripted misbruik van:
// - /api/rapport: elke aanroep triggert live-lookups bij meerdere gratis
//   overheids-API's (Kadaster/BAG, EP-Online, CBS, PDOK) — geen geldkosten,
//   maar wél het risico dat zo'n bron ons IP gaat blokkeren bij excessief
//   gebruik, en onnodige serverbelasting.
// - /api/betaling/aanmaken: maakt een bestelling aan en (in live-modus) een
//   echte Mollie-betaalaanvraag — geen directe kosten bij Mollie voor een
//   niet-afgeronde betaling, maar wel ongewenst als iemand dit blijft
//   scripten.
//
// /api/rapport/premium hoeft hier NIET apart tegen beschermd: die staat al
// achter een server-side betaalcontrole (isBetaaldVoorAdres) — zonder een
// echt betaalde bestelling gebeurt er sowieso niets, dus rate limiting daar
// voegt weinig toe bovenop de limiet op /api/betaling/aanmaken hierboven.
// -----------------------------------------------------------------------------

export interface RateLimitResultaat {
  toegestaan: boolean;
  limiet: number;
  overgebleven: number;
}

// Best-effort IP-herkenning — werkt achter zowel Vercel (x-forwarded-for) als
// de meeste reverse proxies. Zonder header (bv. lokaal zonder proxy) valt dit
// terug op een vaste sleutel, wat de limiet effectief per-server i.p.v.
// per-bezoeker maakt — acceptabel voor lokaal ontwikkelen, niet erg genoeg om
// hier een harde fout van te maken.
function clientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "onbekend-ip";
}

export async function checkRateLimit(
  req: NextRequest,
  bucket: string,
  limiet: number,
  windowSeconden: number
): Promise<RateLimitResultaat> {
  const key = `ratelimit:${bucket}:${clientIp(req)}`;
  const count = await kvIncrWithTtl(key, windowSeconden);
  return {
    toegestaan: count <= limiet,
    limiet,
    overgebleven: Math.max(0, limiet - count),
  };
}
