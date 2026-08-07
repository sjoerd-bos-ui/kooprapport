import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, maakOfVernieuwKoperVoorkeurenToken } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Genereert (of geeft de al bestaande) publieke link voor de koper-voorkeuren-
// vragenlijst (matching-model, zie het Cowork-gesprek hierover) -- zelfde
// patroon als app/api/zakelijk/rapporten/[id]/deel/route.ts, alleen dan voor
// een klantdossier i.p.v. een los rapport. Publieke, niet-ingelogde weergave:
// app/koper-voorkeuren/[token]/page.tsx.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const token = await maakOfVernieuwKoperVoorkeurenToken(id);
  return NextResponse.json({ ok: true, voorkeurenUrl: `${APP_BASE_URL}/koper-voorkeuren/${token}` });
}
