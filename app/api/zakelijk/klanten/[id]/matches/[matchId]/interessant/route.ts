import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, listMatchenVoorKlant, zetMatchInteressant } from "@/lib/services/b2bStore";

// -----------------------------------------------------------------------------
// "Bewaar als interessant" (zie het Cowork-gesprek van dezelfde naam): togglet
// de handmatige markering op één match. Zelfde auth/ownership-controle als de
// andere klanten/[id]-routes (sessie -> dossier -> orgId-check), plus een
// tweede check dat de match ook echt bij dit dossier hoort -- anders zou een
// makelaar met een geraden matchId een match uit een ander dossier kunnen
// bewerken.
// -----------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; matchId: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id, matchId } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { interessant?: boolean } | null;
  if (typeof body?.interessant !== "boolean") {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const matches = await listMatchenVoorKlant(id);
  const match = matches.find((m) => m.id === matchId);
  if (!match) return NextResponse.json({ error: "Onbekende match." }, { status: 404 });

  const bijgewerkt = await zetMatchInteressant(match, body.interessant);
  return NextResponse.json({ match: bijgewerkt });
}
