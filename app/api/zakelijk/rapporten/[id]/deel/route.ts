import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getRapportAanvraag, maakOfVernieuwDeelToken, verwijderDeelToken } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Beveiligde deel-link voor een rapport (#4) -- POST maakt een nieuw token
// (of vernieuwt een bestaand token, waarmee de oude link stopt te werken),
// DELETE trekt de link volledig in. Zie lib/services/b2bStore.ts
// (maakOfVernieuwDeelToken/verwijderDeelToken) en app/deelrapport/[token]
// voor de publieke, niet-ingelogde weergave die de klant te zien krijgt.
// -----------------------------------------------------------------------------

async function haalRapportOpBinnenOrg(req: NextRequest, id: string) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return { error: NextResponse.json({ error: "Niet ingelogd." }, { status: 401 }) } as const;
  const rapport = await getRapportAanvraag(id);
  if (!rapport || rapport.orgId !== context.organisatie.id) {
    return { error: NextResponse.json({ error: "Rapport niet gevonden." }, { status: 404 }) } as const;
  }
  return { context, rapport } as const;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultaat = await haalRapportOpBinnenOrg(req, id);
  if ("error" in resultaat) return resultaat.error;

  const token = await maakOfVernieuwDeelToken(id);
  return NextResponse.json({ ok: true, deelUrl: `${APP_BASE_URL}/deelrapport/${token}` });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultaat = await haalRapportOpBinnenOrg(req, id);
  if ("error" in resultaat) return resultaat.error;

  await verwijderDeelToken(id);
  return NextResponse.json({ ok: true });
}
