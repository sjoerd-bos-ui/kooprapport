import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { voorbeeldRapport } from "@/lib/pdf/voorbeeldRapport";

// -----------------------------------------------------------------------------
// Premium voorbeeld-PDF voor op de homepage — GEEN live adresopzoeking, geen
// Altum/BAG-aanroep: rendert altijd hetzelfde, met de hand samengestelde
// showcase-rapport (lib/pdf/voorbeeldRapport.ts) door dezelfde ReportDocument-
// opmaak als een echt rapport. Bewust een aparte, simpele GET-route (i.p.v.
// het bestaande POST /api/rapport/pdf, dat een AL OPGEHAALD live rapport in
// de request-body verwacht) zodat dit direct als <a href> te downloaden is,
// zonder tussenkomst van client-state.
// -----------------------------------------------------------------------------

export async function GET() {
  const buffer = await renderToBuffer(<ReportDocument report={voorbeeldRapport} isVoorbeeld />);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="kooprapport-voorbeeld.pdf"',
    },
  });
}
