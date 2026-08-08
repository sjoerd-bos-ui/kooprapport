import { NextRequest, NextResponse } from "next/server";
import { getKlantdossierDoorKoperVoorkeurenToken, zetKoperVoorkeuren } from "@/lib/services/b2bStore";
import { valideerKoperVoorkeuren } from "@/lib/services/koperVoorkeurenValidatie";

// -----------------------------------------------------------------------------
// Publieke route (geen login, alleen het lange token als "bewijs") waarmee de
// koper zelf de matching-voorkeuren invult -- zie app/koper-voorkeuren/
// [token]/page.tsx voor de bijbehorende publieke pagina, en het Cowork-
// gesprek hierover voor de achterliggende reden (het matching-scoremodel in
// lib/services/matchScore.ts leest deze antwoorden uit).
//
// MATCHINGMODEL V2: de vragenlijst is uitgebreid van 4 naar 13 vragen (zie
// types/b2b.ts en de gedeelde validatie in koperVoorkeurenValidatie.ts, nu
// hergebruikt door zowel deze publieke route als de makelaar-route
// app/api/zakelijk/klanten/[id]/route.ts) -- de route zelf is verder
// ongewijzigd qua patroon.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dossier = await getKlantdossierDoorKoperVoorkeurenToken(token);
  if (!dossier) return NextResponse.json({ error: "Onbekende of verlopen link." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const resultaat = valideerKoperVoorkeuren(body);
  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error }, { status: 400 });
  }

  const bijgewerkt = await zetKoperVoorkeuren(dossier.id, resultaat.waarde);
  if (!bijgewerkt) return NextResponse.json({ error: "Er is nog geen zoekopdracht om voorkeuren aan te koppelen." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
