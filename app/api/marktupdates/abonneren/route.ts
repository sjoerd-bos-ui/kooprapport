import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { isGeldigEmailadres, stuurMarktupdateBevestigingsEmail } from "@/lib/services/email";
import { isActiefAbonnee, vraagAanmeldingAan } from "@/lib/services/marktupdateAbonnees";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Aanmelden voor de Marktupdates-nieuwsbrief (zie components/marktupdates/
// AbonneerFormulier.tsx). Zet GEEN meteen een abonnement — stuurt alleen een
// dubbele-opt-in-bevestigingsmail (zie lib/services/marktupdateAbonnees.ts).
// Zelfde rate-limit-aanpak als /api/rapport/preview-email: dit is een
// ongeauthenticeerd endpoint, de enige bescherming tegen misbruik (Resend
// laten spammen) is deze limiet.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "marktupdates-abonneren", 5, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json(
      { error: "Te veel aanmeldpogingen. Probeer het over een paar minuten opnieuw." },
      { status: 429 }
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const { email } = body;
  if (!email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  if (await isActiefAbonnee(email)) {
    // Al een bevestigd abonnee — vriendelijk melden, geen nieuwe mail sturen.
    return NextResponse.json({ ok: true, alAbonnee: true });
  }

  const token = await vraagAanmeldingAan(email);
  const bevestigUrl = `${APP_BASE_URL}/api/marktupdates/bevestigen?token=${token}`;
  const resultaat = await stuurMarktupdateBevestigingsEmail({ naar: email, bevestigUrl });
  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error ?? "Versturen is niet gelukt." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
