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

// PERF: dit rapport is 100% statisch (geen request-parameters, altijd exact
// dezelfde voorbeeldRapport-data) — @react-pdf/renderer opnieuw laten
// renderen bij élk verzoek was de grootste oorzaak van de trage eerste keer
// laden in de slider (react-pdf embedt lettertypen/tekent tabellen, dat kost
// écht tijd, per request opnieuw). Twee lagen caching bovenop elkaar:
// 1) in-memory: binnen dezelfde warme serverless-instantie wordt de PDF maar
//    één keer echt gerenderd, daarna hergebruikt.
// 2) HTTP Cache-Control: Vercel's CDN en de browser mogen deze respons zelf
//    ook langdurig cachen, dus na de allereerste bezoeker ooit hoeft de
//    functie meestal niet eens meer aangeroepen te worden.
let gecachtebuffer: Buffer | null = null;

export async function GET() {
  if (!gecachtebuffer) {
    // BUGFIX: siteUrl werd hier niet meegegeven, dus viel terug op een
    // relatief pad — een PDF-viewer kan dat niet naar de site herleiden,
    // waardoor de "eigen adres invoeren"-knop niet werkte. Nu de echte,
    // absolute site-URL (zie ReportDocument.tsx voor de volledige uitleg).
    gecachtebuffer = await renderToBuffer(
      <ReportDocument report={voorbeeldRapport} isVoorbeeld siteUrl={APP_BASE_URL} />
    );
  }

  return new NextResponse(gecachtebuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="kooprapport-voorbeeld.pdf"',
      // BUGFIX: stond eerst op max-age=86400 (1 dag) — na een inhoudelijke
      // aanpassing (bv. de voorzieningen hieronder toegevoegd) bleven
      // browser/CDN dan tot een dag lang de oude PDF tonen, wat als "nog
      // niet aangepast" overkwam terwijl de code allang klopte. De echte
      // cache-busting zit nu in de querystring-versie in
      // components/VoorbeeldrapportSlider.tsx (PDF_URL met ?v=...) — die
      // moet bij elke inhoudelijke wijziging omhoog. Dit max-age is alleen
      // nog een vangnet voor de zeldzame keer dat die bump vergeten wordt,
      // daarom bewust kort (1 uur) i.p.v. een dag.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
