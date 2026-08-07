import { NextRequest, NextResponse } from "next/server";
import { getKlantdossierDoorKoperVoorkeurenToken, zetKoperVoorkeuren } from "@/lib/services/b2bStore";
import type { B2bPrioriteit, B2bBouwstijlVoorkeur } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Publieke route (geen login, alleen het lange token als "bewijs") waarmee de
// koper zelf de matching-voorkeuren invult -- zie app/koper-voorkeuren/
// [token]/page.tsx voor de bijbehorende publieke pagina, en het Cowork-
// gesprek hierover voor de achterliggende reden (het matching-scoremodel in
// lib/services/matchScore.ts leest deze antwoorden uit).
// -----------------------------------------------------------------------------

const GELDIGE_PRIORITEIT: B2bPrioriteit[] = ["prijs", "kenmerken", "gelijk"];
const GELDIGE_BOUWSTIJL: B2bBouwstijlVoorkeur[] = ["nieuw", "karakter", "geen_voorkeur"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dossier = await getKlantdossierDoorKoperVoorkeurenToken(token);
  if (!dossier) return NextResponse.json({ error: "Onbekende of verlopen link." }, { status: 404 });

  let body: { prioriteit?: string; bouwstijl?: string; budgetFlexibel?: boolean; kenmerkenFlexibel?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!body.prioriteit || !GELDIGE_PRIORITEIT.includes(body.prioriteit as B2bPrioriteit)) {
    return NextResponse.json({ error: "Ongeldige of ontbrekende prioriteit." }, { status: 400 });
  }
  if (!body.bouwstijl || !GELDIGE_BOUWSTIJL.includes(body.bouwstijl as B2bBouwstijlVoorkeur)) {
    return NextResponse.json({ error: "Ongeldige of ontbrekende bouwstijl." }, { status: 400 });
  }

  const bijgewerkt = await zetKoperVoorkeuren(dossier.id, {
    prioriteit: body.prioriteit as B2bPrioriteit,
    bouwstijl: body.bouwstijl as B2bBouwstijlVoorkeur,
    budgetFlexibel: Boolean(body.budgetFlexibel),
    kenmerkenFlexibel: Boolean(body.kenmerkenFlexibel),
    ingevuldOp: new Date().toISOString(),
  });

  if (!bijgewerkt) return NextResponse.json({ error: "Er is nog geen zoekopdracht om voorkeuren aan te koppelen." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
