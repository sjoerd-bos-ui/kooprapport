import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { AddressMeta } from "@/types/report";
import BonDocument from "@/lib/pdf/BonDocument";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { canonicalAddressKey } from "@/lib/utils/slug";
import { haalBestelling, isBetaaldVoorAdres } from "@/lib/payments/bestellingen";
import { BETAAL_MODE } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// "Download aankoopbewijs" bij een ontgrendeld rapport (zie ReportView.tsx).
//
// BEVEILIGING: zelfde vertrouwensmodel als /api/rapport/premium — het bedrag,
// de betaaldatum en de betaalstatus komen hier UITSLUITEND uit het server-side
// bewaarde Bestelling-record (lib/payments/bestellingen.ts), nooit uit iets
// dat de client meestuurt. address/bestellingId van de client worden alleen
// gebruikt om het juiste, al-bestaande record op te zoeken en te verifiëren
// dat het echt bij dit adres hoort — een gemanipuleerde aanvraag kan hooguit
// een bestaand, eigen aankoopbewijs opnieuw downloaden, nooit een bedrag of
// datum laten tonen dat niet al zo was vastgelegd.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "rapport-bon", 10, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het over een paar minuten opnieuw." },
      { status: 429 }
    );
  }

  let body: { address?: AddressMeta; bestellingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const { address, bestellingId } = body;
  const addressKey = address ? canonicalAddressKey(address) : null;
  if (!addressKey || !bestellingId || !(await isBetaaldVoorAdres(bestellingId, addressKey))) {
    return NextResponse.json(
      { error: "Geen (geldige, betaalde) bestelling gevonden voor dit adres." },
      { status: 402 }
    );
  }

  const bestelling = await haalBestelling(bestellingId);
  if (!bestelling || !bestelling.betaaldOp) {
    return NextResponse.json({ error: "Bestelling niet gevonden." }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      <BonDocument
        bestellingId={bestelling.id}
        adresLabel={address!.label ?? addressKey}
        bedragCenten={bestelling.bedragCenten}
        betaaldOp={bestelling.betaaldOp}
        betaalmethode={BETAAL_MODE === "live" ? "iDEAL via Mollie" : "Test (mock-modus, geen echte betaling)"}
      />
    );
  } catch (err) {
    console.error("[api/rapport/bon] renderToBuffer faalde:", err);
    return NextResponse.json({ error: "Het aankoopbewijs kon niet worden gemaakt. Probeer het later opnieuw." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="aankoopbewijs-${bestelling.id.slice(0, 8)}.pdf"`,
    },
  });
}
