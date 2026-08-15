import { NextRequest, NextResponse } from "next/server";
import { haalBestelling, koppelEmailAanBestelling } from "@/lib/payments/bestellingen";
import { isGeldigEmailadres, stuurAccountInlogEmail } from "@/lib/services/email";
import { maakInlogToken } from "@/lib/services/consumentAuth";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// "Bewaar dit rapport in je account" op de ontgrendelde rapportpagina (zie
// het Cowork-gesprek "zelfstandig koperportaal" / "b2c-dashboard",
// ReportView.tsx). Koppelt de zojuist afgeronde bestelling aan het
// opgegeven e-mailadres en stuurt daarna een inloglink -- BEWUST geen
// directe sessie hier (zie de toelichting in consumentAuth.ts): ook al is
// dit "hun eigen" bestelling, we vertrouwen client-ingevoerde e-mailadressen
// nergens anders in deze app zonder een klik in die inbox zelf (zelfde
// dubbele-opt-in-discipline als koper-mail/whatsapp aan de Zakelijk-kant).
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "account-koppel-bestelling", 5, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het over een paar minuten opnieuw." }, { status: 429 });
  }

  let body: { bestellingId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { bestellingId } = body;
  const email = body.email?.trim();
  if (!bestellingId || !email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  const bestelling = await haalBestelling(bestellingId);
  if (!bestelling || bestelling.status !== "paid") {
    return NextResponse.json({ error: "Onbekende of nog niet afgeronde bestelling." }, { status: 404 });
  }

  await koppelEmailAanBestelling(bestellingId, email);

  const token = await maakInlogToken(email);
  const inlogUrl = new URL(`/api/account/bevestigen?token=${token}`, APP_BASE_URL).toString();
  const resultaat = await stuurAccountInlogEmail({ naar: email, inlogUrl });

  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
