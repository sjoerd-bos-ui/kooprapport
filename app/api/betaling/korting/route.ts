import { NextRequest, NextResponse } from "next/server";
import type { AddressMeta } from "@/types/report";
import { canonicalAddressKey } from "@/lib/utils/slug";
import { verifieerKortingToken } from "@/lib/utils/kortingToken";
import { checkRateLimit } from "@/lib/services/rateLimit";

// -----------------------------------------------------------------------------
// Alleen-lezen verificatie van een kortingstoken (uit de herinneringsmail,
// zie app/api/cron/reminder-email/route.ts) -- GEEN bestelling aanmaken,
// geen bijwerkingen. Bestaat zodat PaywallModal.tsx het echte, geverifieerde
// bedrag kan TONEN voordat de klant op "Betaal" klikt: nooit een prijs laten
// zien die bij het afrekenen zelf (POST /api/betaling/aanmaken, dat
// hetzelfde token onafhankelijk opnieuw verifieert) mogelijk niet blijkt te
// kloppen.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "betaling-korting-check", 20, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ geldig: false }, { status: 429 });
  }

  let body: { token?: string; address?: AddressMeta };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ geldig: false }, { status: 400 });
  }

  const { token, address } = body;
  if (!token || !address) {
    return NextResponse.json({ geldig: false }, { status: 400 });
  }

  const addressKey = canonicalAddressKey(address);
  const resultaat = verifieerKortingToken(token, addressKey);
  return NextResponse.json(resultaat);
}
