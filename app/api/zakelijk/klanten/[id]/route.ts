import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, zetKlantdossierStatus } from "@/lib/services/b2bStore";
import type { B2bDossierStatus } from "@/types/b2b";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  let body: { status?: B2bDossierStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  if (body.status !== "lopend" && body.status !== "afgerond") {
    return NextResponse.json({ error: "status moet 'lopend' of 'afgerond' zijn." }, { status: 400 });
  }

  const bijgewerkt = await zetKlantdossierStatus(id, body.status);
  return NextResponse.json({ ok: true, dossier: bijgewerkt });
}
