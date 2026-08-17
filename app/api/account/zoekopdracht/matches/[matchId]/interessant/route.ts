import { NextRequest, NextResponse } from "next/server";
import { getIngelogdeEmailUitRequest } from "@/lib/services/consumentAuth";
import { consumentKlantId } from "@/lib/services/consumentZoekopdracht";
import { listMatchenVoorKlant, zetMatchInteressant } from "@/lib/services/b2bStore";

// -----------------------------------------------------------------------------
// B2C-tegenhanger van .../klanten/[id]/matches/[matchId]/interessant/route.ts
// ("Bewaar als interessant"). Ownership hier: de match moet in de eigen
// (namespaced) klantId van de ingelogde consument staan -- zelfde
// beschermingsprincipe als het orgId-check bij de Zakelijk-route, alleen dan
// zonder tussenliggend klantdossier.
// -----------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const email = await getIngelogdeEmailUitRequest(req);
  if (!email) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { matchId } = await params;
  const body = (await req.json().catch(() => null)) as { interessant?: boolean } | null;
  if (typeof body?.interessant !== "boolean") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const klantId = consumentKlantId(email);
  const matches = await listMatchenVoorKlant(klantId);
  const match = matches.find((m) => m.id === matchId);
  if (!match) return NextResponse.json({ error: "Onbekende match." }, { status: 404 });

  const bijgewerkt = await zetMatchInteressant(match, body.interessant);
  return NextResponse.json({ match: bijgewerkt });
}
