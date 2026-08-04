import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getRapportAanvraag } from "@/lib/services/b2bStore";

// Gebruikt door de vergelijkingstool (client component) om meerdere volledige
// rapporten tegelijk op te halen. Org-eigenaarschap wordt hier expliciet
// gecontroleerd: zonder deze check zou een geraden id een rapport van een
// ANDERE organisatie kunnen tonen.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const aanvraag = await getRapportAanvraag(id);
  if (!aanvraag || aanvraag.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Rapport niet gevonden." }, { status: 404 });
  }

  return NextResponse.json({ aanvraag });
}
