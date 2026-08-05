import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, zetKlantdossierStatus, zetKlantdossierZoekopdracht, verwijderKlantdossier } from "@/lib/services/b2bStore";
import type { B2bDossierStatus, B2bZoekopdracht } from "@/types/b2b";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  let body: { status?: B2bDossierStatus; zoekopdracht?: Partial<B2bZoekopdracht> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (body.status !== undefined) {
    if (body.status !== "lopend" && body.status !== "afgerond") {
      return NextResponse.json({ error: "status moet 'lopend' of 'afgerond' zijn." }, { status: 400 });
    }
    const bijgewerkt = await zetKlantdossierStatus(id, body.status);
    return NextResponse.json({ ok: true, dossier: bijgewerkt });
  }

  if (body.zoekopdracht !== undefined) {
    const z = body.zoekopdracht;
    const budgetMin = typeof z.budgetMin === "number" && z.budgetMin > 0 ? z.budgetMin : null;
    const budgetMax = typeof z.budgetMax === "number" && z.budgetMax > 0 ? z.budgetMax : null;
    const locatieVoorkeur = typeof z.locatieVoorkeur === "string" && z.locatieVoorkeur.trim() ? z.locatieVoorkeur.trim().slice(0, 300) : null;
    const moetHebben = typeof z.moetHebben === "string" && z.moetHebben.trim() ? z.moetHebben.trim().slice(0, 500) : null;
    const bijgewerkt = await zetKlantdossierZoekopdracht(id, { budgetMin, budgetMax, locatieVoorkeur, moetHebben });
    return NextResponse.json({ ok: true, dossier: bijgewerkt });
  }

  return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  await verwijderKlantdossier(id);
  return NextResponse.json({ ok: true });
}
