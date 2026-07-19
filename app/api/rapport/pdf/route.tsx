import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Report } from "@/types/report";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// PDF-export van een AL OPGEHAALD rapport. De client (ReportView.tsx) heeft op
// het moment van downloaden het volledige, al ontgrendelde Report-object al in
// React-state staan (zie ReportPageClient.tsx) — dat sturen we hier gewoon
// mee in de body, i.p.v. het rapport op basis van het adres opnieuw op te
// bouwen. Dat voorkomt twee problemen:
//   1) een dubbele (kostenveroorzakende) Altum-aanroep voor de woningwaarde;
//   2) een PDF die door een andere mock-seed/timing net andere cijfers zou
//      tonen dan het rapport dat de koper zojuist heeft bekeken.
//
// @react-pdf/renderer is gekozen boven een headless-browser-aanpak
// (Puppeteer/Playwright): geen Chromium-binary nodig op de server, dus
// goedkoper/betrouwbaarder te hosten, met volledige controle over de
// paginering — zie lib/pdf/ReportDocument.tsx voor de opmaak zelf.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let report: Report;
  try {
    report = (await req.json()) as Report;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  if (!report || !report.core?.address?.postcode) {
    return NextResponse.json({ error: "Ongeldige aanvraag: rapportgegevens ontbreken of zijn onvolledig." }, { status: 400 });
  }

  // Zonder deze try/catch verdween elke fout tijdens het renderen (bv. een
  // ontbrekend of onverwacht-gevormd veld in het meegestuurde rapport-object,
  // zoals kan gebeuren als de browser nog een ouder Report-object in state
  // heeft dan het huidige Report-type) in een kale 500 zonder server-log en
  // zonder bruikbare foutmelding voor de client — heel lastig te
  // onderscheiden van "een databron was toevallig niet beschikbaar" (wat
  // op zichzelf nooit tot een crash zou mogen leiden, zie de defensieve
  // null-checks overal in ReportDocument.tsx). Nu loggen we de echte fout
  // server-side, zodat een volgend incident wél te diagnosticeren is.
  let buffer: Buffer;
  try {
    // siteUrl: zie de uitleg in ReportDocument.tsx — moet een absolute URL
    // zijn, anders werkt de "voer nu je eigen adres in"-knop niet in de PDF.
    buffer = await renderToBuffer(<ReportDocument report={report} siteUrl={APP_BASE_URL} />);
  } catch (err) {
    console.error("[api/rapport/pdf] renderToBuffer faalde:", err);
    return NextResponse.json(
      { error: "De PDF kon niet worden opgebouwd. Probeer het later opnieuw." },
      { status: 500 }
    );
  }
  const bestandsnaam = `kooprapport-${report.core.address.slug || "export"}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${bestandsnaam}"`,
    },
  });
}
