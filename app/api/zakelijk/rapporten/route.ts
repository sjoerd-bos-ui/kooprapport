import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { verbruikRapport, maakRapportAanvraag, listRapportenVoorOrg, getKlantdossier } from "@/lib/services/b2bStore";
import { resolveConfirmedAddress, type ConfirmedAddressParams } from "@/lib/services/addressLookup";
import { getReport } from "@/lib/services/reportService";
import { checkRateLimit } from "@/lib/services/rateLimit";

// -----------------------------------------------------------------------------
// Rapportaanvragen binnen "Kooprapport Zakelijk". In tegenstelling tot de
// consumentenroute (app/api/rapport/*) is dit GEEN paywall-flow: het
// abonnement van de organisatie dekt de kosten, dus we roepen getReport()
// direct aan met deferMarket/deferNearbySales/deferVerduurzaming allemaal op
// false — hetzelfde volledige rapport dat een consument pas ná betalen te
// zien krijgt, hier meteen. Dat is precies het verschil tussen beide flows,
// dus BELANGRIJK: verbruikRapport() (het quotum) moet hier vóór de
// daadwerkelijke aanroep staan, anders zou een organisatie ongelimiteerd
// Altum-credits (echt geld) kunnen verbruiken.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const limiet = await checkRateLimit(req, "zakelijk-rapport-aanvraag", 30, 60 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel aanvragen. Probeer het over een uur opnieuw." }, { status: 429 });
  }

  let body: ConfirmedAddressParams & { klantId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const lookup = resolveConfirmedAddress(body);
  if (lookup.status !== "match" || !lookup.address) {
    return NextResponse.json({ error: "Kies een adres uit de suggesties." }, { status: 400 });
  }

  if (body.klantId) {
    const dossier = await getKlantdossier(body.klantId);
    if (!dossier || dossier.orgId !== context.organisatie.id) {
      return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 400 });
    }
  }

  // Quotum-check EERST, vóór de kostenveroorzakende Altum-aanroep in getReport().
  const { toegestaan, verbruikt } = await verbruikRapport(context.organisatie.id, context.organisatie.quotumPerMaand);
  if (!toegestaan) {
    return NextResponse.json(
      { error: `Quotum bereikt: ${context.organisatie.quotumPerMaand} rapporten deze maand al gebruikt.` },
      { status: 403 }
    );
  }

  const report = await getReport(lookup.address, undefined, {
    deferMarket: false,
    deferNearbySales: false,
    deferVerduurzaming: false,
  });

  const aanvraag = await maakRapportAanvraag({
    orgId: context.organisatie.id,
    klantId: body.klantId ?? null,
    aangevraagdDoorUserId: context.gebruiker.id,
    adres: lookup.address,
    report,
  });

  return NextResponse.json({ ok: true, id: aanvraag.id, verbruikt });
}

export async function GET(req: NextRequest) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const rapporten = await listRapportenVoorOrg(context.organisatie.id);
  return NextResponse.json({
    rapporten: rapporten.map((r) => ({
      id: r.id,
      adres: r.adres,
      klantId: r.klantId,
      aangemaaktOp: r.aangemaaktOp,
      geschatteWaarde: r.report.market.data?.geschatteWaarde ?? null,
      energielabel: r.report.energy.data?.klasse ?? null,
      funderingsniveau: r.report.fundering.data?.niveau ?? null,
    })),
  });
}
