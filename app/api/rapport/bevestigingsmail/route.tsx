import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Report } from "@/types/report";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { APP_BASE_URL } from "@/lib/config/payment";
import { haalBestelling, markeerRapportVerstuurd, wisRapportVerstuurd } from "@/lib/payments/bestellingen";
import { maakInlogToken } from "@/lib/services/consumentAuth";
import { stuurBestellingBevestigingEmail } from "@/lib/services/email";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { canonicalAddressKey, buildReportHref } from "@/lib/utils/slug";

// Automatische bevestigingsmail na een betaalde bestelling: PDF in de bijlage
// plus een inloglink naar "Mijn rapporten". Wordt eenmalig aangeroepen door
// ReportView zodra het rapport ontgrendeld is. Het e-mailadres komt uit het
// bestelling-record (nooit uit de request), en de bestelling moet betaald zijn
// en bij dit adres horen. Idempotent via rapportVerstuurdOp.
export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "rapport-bevestigingsmail", 10, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel pogingen." }, { status: 429 });
  }

  let body: { report?: Report; bestellingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const { report, bestellingId } = body;
  if (!report?.core?.address?.postcode || !bestellingId) {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const bestelling = await haalBestelling(bestellingId);
  const addressKey = canonicalAddressKey(report.core.address);
  if (!bestelling || bestelling.status !== "paid" || !bestelling.email || bestelling.addressSlug !== addressKey) {
    return NextResponse.json({ error: "Bestelling niet gevonden of niet betaald." }, { status: 403 });
  }

  if (!(await markeerRapportVerstuurd(bestelling.id))) {
    return NextResponse.json({ ok: true, alVerstuurd: true });
  }

  try {
    const pdfBuffer = await renderToBuffer(<ReportDocument report={report} siteUrl={APP_BASE_URL} />);
    const token = await maakInlogToken(bestelling.email);
    const inlogUrl = new URL(`/api/account/bevestigen?token=${token}`, APP_BASE_URL).toString();
    const resultaat = await stuurBestellingBevestigingEmail({
      naar: bestelling.email,
      naam: bestelling.naam,
      adresLabel: report.core.address.label,
      bedragCenten: bestelling.bedragCenten,
      rapportUrl: new URL(buildReportHref(report.core.address), APP_BASE_URL).toString(),
      inlogUrl,
      bestandsnaam: `kooprapport-${report.core.address.slug || "rapport"}.pdf`,
      pdfBuffer,
    });
    if (!resultaat.ok) throw new Error(resultaat.error ?? "Versturen mislukt");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/rapport/bevestigingsmail] mislukt:", err);
    // Opnieuw proberen mogelijk maken bij de volgende paginaweergave.
    await wisRapportVerstuurd(bestelling.id);
    return NextResponse.json({ error: "Versturen is niet gelukt." }, { status: 502 });
  }
}
