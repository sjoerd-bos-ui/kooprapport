import { NextRequest, NextResponse } from "next/server";
import { vindBestellingDoorMolliePaymentId, zetStatus } from "@/lib/payments/bestellingen";
import { verifieerBetalingBijMollie } from "@/lib/payments/mollie";

// -----------------------------------------------------------------------------
// Mollie-webhook — alleen relevant in live-modus (PAYMENT_MODE=live). Mollie
// stuurt hier NIET de betaalstatus zelf naartoe, maar uitsluitend een
// betalings-id, als application/x-www-form-urlencoded veld "id" (geen JSON).
// Dat is een bewuste beveiligingskeuze van Mollie: de webhook is alleen een
// seintje "er is iets veranderd, ga het zelf verifiëren" — wij vertrouwen
// nooit een status die in de aanroep zelf zou staan, want die zou door wie
// dan ook nagemaakt kunnen worden. We halen de echte status altijd apart op
// bij Mollie, met onze eigen MOLLIE_API_KEY (zie mollie.ts#verifieerBetalingBijMollie).
//
// Altijd 200 teruggeven, ook bij een onbekende/mislukte id — anders blijft
// Mollie dit verzoek eindeloos herhalen. Alleen bij een eigen serverfout
// (niet: "kende deze id niet") geven we iets anders terug, zodat Mollie dát
// wél opnieuw probeert.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let molliePaymentId: string | undefined;
  try {
    const form = await req.formData();
    molliePaymentId = form.get("id")?.toString();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: verwacht form-encoded body met veld 'id'." }, { status: 400 });
  }

  if (!molliePaymentId) {
    return NextResponse.json({ ontvangen: true, opmerking: "geen id meegegeven" });
  }

  const bestelling = await vindBestellingDoorMolliePaymentId(molliePaymentId);
  if (!bestelling) {
    // Onbekende id (kan bv. een testaanroep vanuit Mollie's dashboard zijn)
    // — geen fout, gewoon niets te doen.
    return NextResponse.json({ ontvangen: true, opmerking: "onbekende bestelling" });
  }

  try {
    const status = await verifieerBetalingBijMollie(molliePaymentId);
    await zetStatus(bestelling.id, status);
    return NextResponse.json({ ontvangen: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij verifiëren van betaling.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
