import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getUitnodiging, verwijderUitnodiging } from "@/lib/services/b2bStore";

// -----------------------------------------------------------------------------
// Openstaande teamuitnodiging intrekken (#7). Alleen "eigenaar", zelfde
// beperking als het versturen van een uitnodiging.
// -----------------------------------------------------------------------------
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  if (context.gebruiker.rol !== "eigenaar") {
    return NextResponse.json({ error: "Alleen de eigenaar kan uitnodigingen intrekken." }, { status: 403 });
  }

  const { id } = await params;
  const uitnodiging = await getUitnodiging(id);
  if (!uitnodiging || uitnodiging.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Uitnodiging niet gevonden." }, { status: 404 });
  }

  await verwijderUitnodiging(id);
  return NextResponse.json({ ok: true });
}
