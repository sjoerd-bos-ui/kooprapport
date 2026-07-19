import { NextRequest, NextResponse } from "next/server";
import { haalBestelling, zetStatus } from "@/lib/payments/bestellingen";
import { verifieerBetalingBijMollie } from "@/lib/payments/mollie";
import { BETAAL_MODE } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Statuscontrole — gebruikt op twee momenten:
// 1) door PaywallModal, kort na het aanmaken van de bestelling (in
//    mock-modus is de status dan al meteen "paid");
// 2) door ReportPageClient, wanneer de klant terugkomt van Mollie's
//    checkout-pagina (redirectUrl bevat ?bestellingId=...) — de webhook kan
//    op dat moment nog niet aangekomen zijn.
//
// Voor dat tweede geval: staat de bestelling nog op "open" mét een gekoppeld
// Mollie-betalings-id, dan verifiëren we hier ALVAST rechtstreeks bij Mollie
// i.p.v. alleen te wachten op de webhook. Dat maakt de flow ook bruikbaar
// tijdens lokaal ontwikkelen zonder tunnel (ngrok) — zonder bereikbare
// webhookUrl komt de webhook namelijk nooit aan, maar deze route werkt dan
// als volwaardige vervanging.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const bestellingId = req.nextUrl.searchParams.get("bestellingId");
  if (!bestellingId) {
    return NextResponse.json({ error: "Ontbrekende parameter: bestellingId." }, { status: 400 });
  }

  const bestelling = await haalBestelling(bestellingId);
  if (!bestelling) {
    return NextResponse.json({ error: "Onbekende bestelling." }, { status: 404 });
  }

  if (BETAAL_MODE === "live" && bestelling.status === "open") {
    if (!bestelling.molliePaymentId) {
      // Zichtbaar loggen i.p.v. stil overslaan: zonder gekoppeld Mollie-id
      // kan deze route nooit verifiëren, dus blijft de status voor altijd
      // "open" bij elke poll — dat moet je kunnen zien in plaats van
      // eindeloos "Betaling wordt bevestigd..." te tonen zonder duidelijke
      // oorzaak.
      console.error(
        `[betaling/status] bestelling ${bestelling.id} heeft nog geen molliePaymentId gekoppeld — kan status niet verifiëren.`
      );
    } else {
      try {
        const status = await verifieerBetalingBijMollie(bestelling.molliePaymentId);
        await zetStatus(bestelling.id, status);
      } catch (err) {
        // Verificatie mislukte (bv. Mollie tijdelijk onbereikbaar, verkeerde
        // sleutel) — geef de laatst bekende status terug i.p.v. de klant
        // hier te laten vastlopen op een foutmelding, MAAR wel loggen zodat
        // een aanhoudend probleem niet onzichtbaar blijft (was eerder een
        // stille catch — precies dit soort gevallen bleef daardoor onopgemerkt).
        console.error(
          `[betaling/status] verificatie bij Mollie mislukte voor bestelling ${bestelling.id} (molliePaymentId ${bestelling.molliePaymentId}):`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  const actueel = (await haalBestelling(bestellingId))!;
  return NextResponse.json({ bestellingId: actueel.id, status: actueel.status });
}
