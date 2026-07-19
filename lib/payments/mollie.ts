import { BETAAL_MODE, MOLLIE_API_BASE_URL, MOLLIE_API_KEY, APP_BASE_URL } from "@/lib/config/payment";
import { rapportPrijsAlsMollieBedrag } from "@/lib/utils/prijs";
import { koppelMolliePaymentId, zetStatus, type BestellingStatus } from "@/lib/payments/bestellingen";

// -----------------------------------------------------------------------------
// Mollie Payments API-adapter — https://docs.mollie.com/reference/create-payment
//
// Twee losse functies, met een duidelijke reden om ze apart te houden:
// - maakBetaling(): het AANMAKEN van een betaling (klant klikt "Betaal met
//   iDEAL"). In live-modus levert dit een checkout-URL op waar de klant
//   naartoe wordt gestuurd om bij zijn eigen bank in te loggen.
// - verifieerBetalingBijMollie(): de daadwerkelijke STATUSCONTROLE, alleen
//   aangeroepen vanuit de webhook (app/api/betaling/webhook/route.ts).
//   Cruciaal Mollie-beveiligingsprincipe: je vertrouwt NOOIT de inhoud van
//   een webhook-aanroep zelf (die kan door wie dan ook nagemaakt worden) —
//   de webhook is slechts een seintje "ga de status opnieuw ophalen bij
//   Mollie". Pas dát opnieuw-opgehaalde antwoord (met onze eigen
//   MOLLIE_API_KEY erbij) is te vertrouwen. Zie ook Mollie's eigen docs.
// -----------------------------------------------------------------------------

export interface MollieBetalingAanvraag {
  bestellingId: string;
  omschrijving: string;
  redirectPad: string; // bv. "/rapport/herengracht-210-1015-cw-amsterdam"
}

export interface MollieBetalingResultaat {
  checkoutUrl: string | null; // null in mock-modus: er is niets om naartoe te navigeren
}

export async function maakBetaling(aanvraag: MollieBetalingAanvraag): Promise<MollieBetalingResultaat> {
  if (BETAAL_MODE === "mock") {
    // Mock-modus simuleert een direct geslaagde betaling — geen echte
    // transactie, geen Mollie-aanroep, geen kosten. Dit is bewust de ENIGE
    // plek die de bestelling in mock-modus op "paid" zet, zodat de rest van
    // de flow (status-endpoint, /api/rapport/premium) exact dezelfde code
    // doorloopt als in live-modus — alleen dit ene stukje is nep.
    await zetStatus(aanvraag.bestellingId, "paid");
    return { checkoutUrl: null };
  }

  if (!MOLLIE_API_KEY) {
    throw new Error("PAYMENT_MODE=live maar MOLLIE_API_KEY ontbreekt. Kan geen echte betaling aanmaken.");
  }

  // redirectPad bevat sinds de bugfix in app/api/betaling/aanmaken/route.ts
  // zelf al een queryparams-string (het adres) — bestellingId dus met "&"
  // toevoegen als dat zo is, anders (theoretisch, voor toekomstige
  // aanroepers zonder queryparams) met "?".
  const separator = aanvraag.redirectPad.includes("?") ? "&" : "?";
  const redirectUrl = `${APP_BASE_URL}${aanvraag.redirectPad}${separator}bestellingId=${aanvraag.bestellingId}`;
  const webhookUrl = `${APP_BASE_URL}/api/betaling/webhook`;

  const res = await fetch(`${MOLLIE_API_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MOLLIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: aanvraag.omschrijving,
      amount: rapportPrijsAlsMollieBedrag(),
      redirectUrl,
      // webhookUrl moet van buitenaf bereikbaar zijn — Mollie accepteert
      // geen localhost. Op APP_BASE_URL=http://localhost:... (het lokale
      // devmodus-default) laten we 'm daarom bewust weg i.p.v. een
      // aanroep te doen die toch nooit aankomt.
      ...(webhookUrl.startsWith("http://localhost") ? {} : { webhookUrl }),
      method: "ideal",
      locale: "nl_NL",
      // Onze eigen bestellingId ook als metadata meesturen: geen
      // vertrouwen op alleen de redirectUrl-query-param (die kan een
      // klant zelf aanpassen) — bij de webhook lezen we straks liever de
      // koppeling die WIJ zelf al vastlegden via koppelMolliePaymentId().
      metadata: { bestellingId: aanvraag.bestellingId },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Mollie wees de betaalaanvraag af (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  const data = await res.json();
  const checkoutUrl: string | null = data?._links?.checkout?.href ?? null;
  const molliePaymentId: string | undefined = data?.id;

  if (molliePaymentId) await koppelMolliePaymentId(aanvraag.bestellingId, molliePaymentId);
  if (!checkoutUrl) throw new Error("Mollie gaf geen checkout-URL terug in de betaalrespons.");

  return { checkoutUrl };
}

// Mollie's eigen statuswaarden (open/canceled/pending/expired/failed/paid/
// authorized) vertaald naar onze eigen, kleinere BestellingStatus — alles
// wat geen "paid" is behandelen we als niet-betaald; het exacte onderscheid
// (geannuleerd vs. verlopen vs. mislukt) is voor deze app niet relevant,
// alleen "heeft de klant betaald, ja of nee" bepaalt of het rapport
// ontgrendelt.
export async function verifieerBetalingBijMollie(molliePaymentId: string): Promise<BestellingStatus> {
  if (!MOLLIE_API_KEY) {
    throw new Error("Kan betaling niet verifiëren: MOLLIE_API_KEY ontbreekt.");
  }

  const res = await fetch(`${MOLLIE_API_BASE_URL}/payments/${molliePaymentId}`, {
    headers: { Authorization: `Bearer ${MOLLIE_API_KEY}` },
  });

  if (!res.ok) {
    throw new Error(`Mollie gaf status ${res.status} bij het opvragen van betaling ${molliePaymentId}.`);
  }

  const data = await res.json();
  return data?.status === "paid" ? "paid" : data?.status === "open" || data?.status === "pending" ? "open" : "failed";
}
