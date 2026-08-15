import { NextRequest, NextResponse } from "next/server";
import { isGeldigEmailadres, stuurAccountInlogEmail } from "@/lib/services/email";
import { maakInlogToken } from "@/lib/services/consumentAuth";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Terugkerende inlogaanvraag op /account/inloggen (koper heeft al eerder een
// bestelling gekoppeld, wil nu vanaf een ander toestel/nieuwe sessie weer
// bij "Mijn rapporten"). BEWUST altijd hetzelfde succesbericht, ongeacht of
// dit adres al bestellingen heeft -- anders zou deze route kunnen worden
// gebruikt om te ontdekken welke e-mailadressen wél/niet een account hebben
// (zelfde generieke-foutmelding-principe als de Zakelijk-login).
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "account-inlog-link", 5, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het over een paar minuten opnieuw." }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  const token = await maakInlogToken(email);
  const inlogUrl = new URL(`/api/account/bevestigen?token=${token}`, APP_BASE_URL).toString();
  // Bewust niet op het resultaat reageren met een specifieke foutmelding --
  // zie de toelichting hierboven. Een mislukte Resend-verzending (bv. nog
  // niet geconfigureerd in dev) is de enige uitzondering die wél zichtbaar
  // moet zijn, anders lijkt de knop het te doen terwijl er niets verstuurd is.
  const resultaat = await stuurAccountInlogEmail({ naar: email, inlogUrl });
  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
