import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { voorbeeldRapport } from "@/lib/pdf/voorbeeldRapport";
import { APP_BASE_URL } from "@/lib/config/payment";

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
  // BUGFIX: siteUrl werd hier niet meegegeven, dus viel terug op een
  // relatief pad — een PDF-viewer kan dat niet naar de site herleiden,
  // waardoor de "eigen adres invoeren"-knop niet werkte. Nu de echte,
  // absolute site-URL (zie ReportDocument.tsx voor de volledige uitleg).
  const buffer = await renderToBuffer(
    <ReportDocument report={voorbeeldRapport} isVoorbeeld siteUrl={APP_BASE_URL} />
  );

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="kooprapport-voorbeeld.pdf"',
    },
  });
}
