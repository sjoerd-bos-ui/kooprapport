import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { maakKlantdossier, listKlantdossiersVoorOrg } from "@/lib/services/b2bStore";
import type { B2bDossierType } from "@/types/b2b";

export async function POST(req: NextRequest) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  let body: { klantnaam?: string; type?: B2bDossierType };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const klantnaam = body.klantnaam?.trim();
  if (!klantnaam) {
    return NextResponse.json({ error: "Klantnaam is verplicht." }, { status: 400 });
  }
  const type: B2bDossierType = body.type === "verkoop" ? "verkoop" : "aankoop";

  const dossier = await maakKlantdossier({
    orgId: context.organisatie.id,
    klantnaam,
    type,
    status: "lopend",
    aangemaaktDoorUserId: context.gebruiker.id,
  });

  return NextResponse.json({ ok: true, dossier });
}

export async function GET(req: NextRequest) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const dossiers = await listKlantdossiersVoorOrg(context.organisatie.id);
  return NextResponse.json({ dossiers });
}
