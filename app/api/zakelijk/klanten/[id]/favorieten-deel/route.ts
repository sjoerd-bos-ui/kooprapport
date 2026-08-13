import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, maakOfVernieuwFavorietenDeelToken, verwijderFavorietenDeelToken } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Beveiligde deel-link voor de "Favorieten vergelijken"-tab (zie het
// Cowork-gesprek "maak de deellink") -- exact hetzelfde POST/DELETE-patroon
// als app/api/zakelijk/rapporten/[id]/deel/route.ts, alleen dan op
// dossier-niveau. Zie app/deelfavorieten/[token] voor de publieke,
// niet-ingelogde weergave.
// -----------------------------------------------------------------------------

async function haalDossierOpBinnenOrg(req: NextRequest, id: string) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return { error: NextResponse.json({ error: "Niet ingelogd." }, { status: 401 }) } as const;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return { error: NextResponse.json({ error: "Klantdossier niet gevonden." }, { status: 404 }) } as const;
  }
  return { context, dossier } as const;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultaat = await haalDossierOpBinnenOrg(req, id);
  if ("error" in resultaat) return resultaat.error;

  const token = await maakOfVernieuwFavorietenDeelToken(id);
  return NextResponse.json({ ok: true, deelUrl: `${APP_BASE_URL}/deelfavorieten/${token}` });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultaat = await haalDossierOpBinnenOrg(req, id);
  if ("error" in resultaat) return resultaat.error;

  await verwijderFavorietenDeelToken(id);
  return NextResponse.json({ ok: true });
}
