import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Report } from "@/types/report";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { APP_BASE_URL } from "@/lib/config/payment";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { isGeldigEmailadres, stuurRapportEmail } from "@/lib/services/email";

// -----------------------------------------------------------------------------
// "Verstuur naar e-mail" bij een AL OPGEHAALD, ontgrendeld rapport — zelfde
// vertrouwensmodel als POST /api/rapport/pdf (de client stuurt het Report-
// object mee dat op dat moment al zichtbaar op het scherm staat, geen
// nieuwe/dubbele Altum-aanroep). Bouwt dezelfde PDF en stuurt 'm als bijlage
// via Resend, i.p.v. 'm in de browser te downloaden.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 5 verzendingen per 10 minuten per IP — een klant verstuurt een rapport
  // normaal maar één of enkele keren; dit remt alleen misbruik (Resend laten
  // spammen naar willekeurige adressen) af.
  const limiet = await checkRateLimit(req, "rapport-email", 5, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json(
      { error: "Te veel verzendpogingen. Probeer het over een paar minuten opnieuw." },
      { status: 429 }
    );
  }

  let body: { report?: Report; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const { report, email } = body;
  if (!report || !report.core?.address?.postcode) {
    return NextResponse.json({ error: "Ongeldige aanvraag: rapportgegevens ontbreken of zijn onvolledig." }, { status: 400 });
  }
  if (!email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(<ReportDocument report={report} siteUrl={APP_BASE_URL} />);
  } catch (err) {
    console.error("[api/rapport/email] renderToBuffer faalde:", err);
    return NextResponse.json({ error: "De PDF kon niet worden opgebouwd. Probeer het later opnieuw." }, { status: 500 });
  }

  const adresLabel = report.core.address.label;
  const resultaat = await stuurRapportEmail({
    naar: email,
    adresLabel,
    bestandsnaam: `kooprapport-${report.core.address.slug || "export"}.pdf`,
    pdfBuffer: buffer,
  });

  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error ?? "Versturen is niet gelukt." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
