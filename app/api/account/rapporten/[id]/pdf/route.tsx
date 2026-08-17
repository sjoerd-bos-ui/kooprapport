import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { Report } from "@/types/report";
import ReportDocument from "@/lib/pdf/ReportDocument";
import { APP_BASE_URL } from "@/lib/config/payment";
import { getIngelogdeEmailUitRequest } from "@/lib/services/consumentAuth";
import { haalBestelling } from "@/lib/payments/bestellingen";
import { getReport, fetchPremiumOnUnlock } from "@/lib/services/reportService";
import { kvGet, kvSet } from "@/lib/services/kvStore";

// -----------------------------------------------------------------------------
// "Download rapport" rechtstreeks vanaf een kaart in "Mijn rapporten"
// (AccountDashboard.tsx) -- zonder dat de koper eerst de rapportpagina zelf
// hoeft te openen en te "ontgrendelen" zoals bij een gewone paginaweergave
// (zie ReportPageClient.handleUnlock). Bouwt het volledige rapport hier
// server-side op en levert meteen de PDF (zelfde renderer als
// /api/rapport/pdf, alleen die kreeg het rapport al kant-en-klaar van de
// client -- hier moet het eerst zelf worden opgebouwd).
//
// BEVEILIGING: alleen de ingelogde eigenaar van de bestelling (e-mailadres
// in de sessie == bestelling.email) mag dit -- zelfde soort ownership-check
// als app/api/account/rapporten/[id]/route.ts (favoriet/archief-PATCH).
//
// KOSTENBEHEERSING: twee paden --
//   1. demo-bestelling (Bestelling.demoReport, zie bestellingen.ts): geen
//      enkele live aanroep, het volledige rapport staat al klaar.
//   2. echte betaalde bestelling: gratis bronnen via getReport() (zelfde
//      24u-cache als een gewone paginaweergave), premium-onderdelen
//      (Altum) via fetchPremiumOnUnlock() -- MET dezelfde
//      premium-resultaat-KV-cache als /api/rapport/premium/route.ts, zodat
//      een download vlak na (of vlak vóór) het bekijken van de rapportpagina
//      nooit een tweede, dubbele Altum-aanroep voor dezelfde bestelling
//      veroorzaakt.
// -----------------------------------------------------------------------------

const PREMIUM_CACHE_TTL_SECONDEN = 60 * 60 * 24;

function premiumCacheKey(bestellingId: string): string {
  return `premium-resultaat:${bestellingId}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await getIngelogdeEmailUitRequest(req);
  if (!email) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const bestelling = await haalBestelling(id);
  if (!bestelling || bestelling.email !== email.trim().toLowerCase() || bestelling.status !== "paid" || !bestelling.address) {
    return NextResponse.json({ error: "Onbekende of niet-betaalde bestelling." }, { status: 404 });
  }

  let report: Report;
  try {
    if (bestelling.demoReport) {
      report = bestelling.demoReport;
    } else {
      const basis = await getReport(bestelling.address);
      const cacheKey = premiumCacheKey(id);
      const cached = await kvGet(cacheKey);
      const premium = cached
        ? (JSON.parse(cached) as Awaited<ReturnType<typeof fetchPremiumOnUnlock>>)
        : await fetchPremiumOnUnlock(bestelling.address, basis.building.data?.oppervlakteM2, basis.building.data?.bouwjaar);
      if (!cached) await kvSet(cacheKey, JSON.stringify(premium), PREMIUM_CACHE_TTL_SECONDEN);
      report = { ...basis, ...premium };
    }

    const buffer = await renderToBuffer(<ReportDocument report={report} siteUrl={APP_BASE_URL} />);
    const bestandsnaam = `kooprapport-${report.core.address.slug || "export"}.pdf`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bestandsnaam}"`,
      },
    });
  } catch (err) {
    console.error("[api/account/rapporten/pdf] mislukt:", err);
    return NextResponse.json({ error: "De PDF kon niet worden opgebouwd. Probeer het later opnieuw." }, { status: 500 });
  }
}
