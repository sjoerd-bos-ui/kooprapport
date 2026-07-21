import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { isGeldigEmailadres, stuurPreviewEmail } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// "Bewaar dit rapport in uw mail" op de GRATIS preview — vóór ontgrendelen,
// dus BEWUST geen report-object nodig en geen PDF-bijlage (zie
// lib/services/email.ts: stuurPreviewEmail vs. stuurRapportEmail). Alleen
// adresLabel + een terugkeer-URL naar dezelfde preview-pagina.
//
// Zelfde rate-limit-aanpak als /api/rapport/email (5 per 10 minuten per IP) —
// dit is een ongeauthenticeerd endpoint, dus de enige bescherming tegen
// misbruik (Resend laten spammen) is deze limiet.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "rapport-preview-email", 5, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json(
      { error: "Te veel verzendpogingen. Probeer het over een paar minuten opnieuw." },
      { status: 429 }
    );
  }

  let body: { adresLabel?: string; previewPath?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const { adresLabel, previewPath, email } = body;
  if (!adresLabel || !previewPath) {
    return NextResponse.json({ error: "Ongeldige aanvraag: adresgegevens ontbreken." }, { status: 400 });
  }
  if (!email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  // previewPath komt van window.location.pathname+search op de client (zie
  // EmailBewaarOptie.tsx) — hier alsnog tot een volledige, veilige URL
  // gemaakt op basis van de eigen APP_BASE_URL, nooit een extern/ongefilterd
  // domein in de mail-link.
  const previewUrl = new URL(previewPath, APP_BASE_URL).toString();

  const resultaat = await stuurPreviewEmail({ naar: email, adresLabel, previewUrl });
  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error ?? "Versturen is niet gelukt." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
