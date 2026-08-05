import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { getGebruikerDoorEmail, maakUitnodiging } from "@/lib/services/b2bStore";
import { stuurB2bUitnodigingEmail, isGeldigEmailadres } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";
import type { B2bRol } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Teamlid uitnodigen (#7). Alleen "eigenaar" mag dit -- een "lid" kan zo geen
// nieuwe accounts in de organisatie aanmaken. Zie lib/services/b2bStore.ts
// (maakUitnodiging) en app/zakelijk/(auth)/uitnodiging/[token]/page.tsx voor
// de acceptatiekant.
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "zakelijk-team-uitnodigen", 10, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel uitnodigingen. Probeer het over een paar minuten opnieuw." }, { status: 429 });
  }

  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  if (context.gebruiker.rol !== "eigenaar") {
    return NextResponse.json({ error: "Alleen de eigenaar kan teamleden uitnodigen." }, { status: 403 });
  }

  let body: { email?: string; rol?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  const rol: B2bRol = body.rol === "eigenaar" ? "eigenaar" : "lid";

  const bestaand = await getGebruikerDoorEmail(email);
  if (bestaand) {
    return NextResponse.json({ error: "Er bestaat al een gebruiker met dit e-mailadres." }, { status: 409 });
  }

  const uitnodiging = await maakUitnodiging(context.organisatie.id, email, context.gebruiker.id, rol);
  const uitnodigingUrl = `${APP_BASE_URL}/zakelijk/uitnodiging/${uitnodiging.token}`;

  const resultaat = await stuurB2bUitnodigingEmail({
    naar: email,
    orgNaam: context.organisatie.naam,
    uitgenodigdDoorNaam: context.gebruiker.naam,
    uitnodigingUrl,
  });
  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error ?? "Uitnodigen is niet gelukt." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
