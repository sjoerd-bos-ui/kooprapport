import { NextRequest, NextResponse } from "next/server";
import { getIngelogdeEmailUitRequest } from "@/lib/services/consumentAuth";
import { haalBestelling, zetFavoriet, zetGearchiveerd } from "@/lib/payments/bestellingen";

// -----------------------------------------------------------------------------
// Favoriet/archief-toggle op een rapport in "Mijn rapporten" (zie
// app/account/page.tsx). OWNERSHIP-CHECK hier, niet in bestellingen.ts zelf
// (die functies daar doen bewust geen autorisatie, zie de toelichting erbij)
// -- vergelijkt de ingelogde sessie-e-mail tegen bestelling.email, zodat
// niemand via een geraden bestelling-id andermans rapport kan favorieten of
// archiveren.
// -----------------------------------------------------------------------------

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await getIngelogdeEmailUitRequest(req);
  if (!email) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const bestelling = await haalBestelling(id);
  if (!bestelling || (bestelling.email ?? "").toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Onbekend rapport." }, { status: 404 });
  }

  let body: { favoriet?: boolean; gearchiveerd?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  let bijgewerkt = bestelling;
  if (typeof body.favoriet === "boolean") {
    bijgewerkt = (await zetFavoriet(id, body.favoriet)) ?? bijgewerkt;
  }
  if (typeof body.gearchiveerd === "boolean") {
    bijgewerkt = (await zetGearchiveerd(id, body.gearchiveerd)) ?? bijgewerkt;
  }

  return NextResponse.json({ ok: true, bestelling: bijgewerkt });
}
