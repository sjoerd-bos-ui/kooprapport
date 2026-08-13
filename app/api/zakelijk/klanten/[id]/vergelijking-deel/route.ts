import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, listRapportenVoorKlant, maakVergelijkingDeelToken } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Deel-link voor een SPECIFIEKE selectie in de "Vergelijken"-tab (zie het
// Cowork-gesprek "maak de deellink ook voor de rapport vergelijkpagina") --
// in tegenstelling tot de favorieten-deellink (favorieten-deel/route.ts,
// dossier-niveau, altijd 1 token) legt dit een MOMENTOPNAME van precies de
// rapport-id's vast die de makelaar op dat moment had aangevinkt in
// DossierVergelijken.tsx, zie maakVergelijkingDeelToken in b2bStore.ts.
// Vandaar geen DELETE hier: elke klik maakt een eigen, onafhankelijk token
// (net zo min te verwarren als twee losse screenshots van twee verschillende
// selecties).
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Klantdossier niet gevonden." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const rapportIds = Array.isArray(body?.rapportIds) ? (body.rapportIds as unknown[]).filter((x): x is string => typeof x === "string") : [];
  if (rapportIds.length < 2) {
    return NextResponse.json({ error: "Selecteer minstens twee rapporten om te delen." }, { status: 400 });
  }

  // Alleen rapporten die daadwerkelijk bij dit dossier horen mogen gedeeld
  // worden -- geen vertrouwen op de client-side body zonder server-side
  // membership-check.
  const rapportenVanDossier = await listRapportenVoorKlant(id);
  const toegestaneIds = new Set(rapportenVanDossier.map((r) => r.id));
  if (!rapportIds.every((rid) => toegestaneIds.has(rid))) {
    return NextResponse.json({ error: "Eén of meer rapporten horen niet bij dit dossier." }, { status: 400 });
  }

  const token = await maakVergelijkingDeelToken(context.organisatie.id, rapportIds);
  return NextResponse.json({ ok: true, deelUrl: `${APP_BASE_URL}/deelvergelijking/${token}` });
}
