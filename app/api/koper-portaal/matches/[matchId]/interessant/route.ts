import { NextRequest, NextResponse } from "next/server";
import { getKoperDossierIdUitRequest } from "@/lib/services/koperPortaalAuth";
import { listMatchenVoorKlant, zetMatchInteressant } from "@/lib/services/b2bStore";

// -----------------------------------------------------------------------------
// Koperportaal-tegenhanger van .../klanten/[id]/matches/[matchId]/interessant/
// route.ts ("Bewaar als interessant"). Ownership hier: de match moet in het
// dossierId van de ingelogde koper-sessie staan.
// -----------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const dossierId = await getKoperDossierIdUitRequest(req);
  if (!dossierId) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { matchId } = await params;
  const body = (await req.json().catch(() => null)) as { interessant?: boolean } | null;
  if (typeof body?.interessant !== "boolean") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const matches = await listMatchenVoorKlant(dossierId);
  const match = matches.find((m) => m.id === matchId);
  if (!match) return NextResponse.json({ error: "Onbekende match." }, { status: 404 });

  const bijgewerkt = await zetMatchInteressant(match, body.interessant);
  return NextResponse.json({ match: bijgewerkt });
}
