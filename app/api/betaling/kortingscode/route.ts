import { NextRequest, NextResponse } from "next/server";
import { verifieerKortingscode } from "@/lib/utils/kortingscode";
import { checkRateLimit } from "@/lib/services/rateLimit";

// -----------------------------------------------------------------------------
// Alleen-lezen check van een handmatig ingevoerde kortingscode -- verhoogt
// het gebruik NIET (dat gebeurt pas bij het echte afrekenen, zie
// verifieerEnVerbruikKortingscode in /api/betaling/aanmaken). Bestaat zodat
// PaywallModal.tsx de geverifieerde prijs kan tonen zodra iemand een code
// intypt, zonder dat het intikken zelf al een gebruik "verbruikt".
//
// Rate limit is hier bewust STRIKTER dan bij de kortingsTOKEN-check
// hierboven: een handmatige code is een string die iemand kan gokken/brute-
// forcen ("PROMO1", "PROMO2", ...) -- een token is een lange, ondertekende
// waarde die niet te raden is. 10 pogingen per 5 minuten per IP remt dat af.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "betaling-kortingscode-check", 10, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ geldig: false }, { status: 429 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ geldig: false }, { status: 400 });
  }

  if (!body.code) {
    return NextResponse.json({ geldig: false }, { status: 400 });
  }

  const resultaat = await verifieerKortingscode(body.code);
  return NextResponse.json(resultaat);
}
