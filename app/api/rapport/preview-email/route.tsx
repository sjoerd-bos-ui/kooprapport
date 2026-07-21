import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { isGeldigEmailadres, stuurPreviewEmail } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";
import { canonicalAddressKey } from "@/lib/utils/slug";
import { kvZAdd } from "@/lib/services/kvStore";

// Hoelang na deze preview-mail de herinnering verstuurd mag worden. De
// kortingstoken zelf wordt pas in de cron-route gegenereerd (zie
// app/api/cron/reminder-email/route.ts) -- pas op het moment dat de mail
// daadwerkelijk verstuurd wordt weten we exact vanaf wanneer die 24 uur
// geldig moet zijn.
const HERINNERING_NA_MS = 48 * 60 * 60 * 1000;
const REMINDER_QUEUE_KEY = "reminder:queue";

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

  // Herinnering inplannen -- BEST-EFFORT: als dit om wat voor reden dan ook
  // faalt (bv. queryparams ontbreken, KV-fout), mag dat de al gelukte
  // preview-mail hierboven niet alsnog als mislukt laten terugkomen. De
  // gebruiker heeft zijn mail al, de herinnering is een bonus, geen
  // kernfunctie van deze aanvraag.
  try {
    const parsedUrl = new URL(previewUrl);
    const addressKey = canonicalAddressKey({
      postcode: parsedUrl.searchParams.get("postcode") ?? undefined,
      huisnummer: parsedUrl.searchParams.get("huisnummer") ?? undefined,
      huisletter: parsedUrl.searchParams.get("huisletter") ?? undefined,
      toevoeging: parsedUrl.searchParams.get("toevoeging") ?? undefined,
    });
    if (addressKey) {
      const job = JSON.stringify({ email, adresLabel, previewPath, addressKey });
      await kvZAdd(REMINDER_QUEUE_KEY, Date.now() + HERINNERING_NA_MS, job);
    }
  } catch (err) {
    console.error("[preview-email] herinnering inplannen mislukt (niet-kritiek):", err);
  }

  return NextResponse.json({ ok: true });
}
