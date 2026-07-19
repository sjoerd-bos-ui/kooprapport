import { NextRequest, NextResponse } from "next/server";
import type { AddressMeta } from "@/types/report";
import { fetchPremiumOnUnlock } from "@/lib/services/reportService";
import { isBetaaldVoorAdres } from "@/lib/payments/bestellingen";
import { canonicalAddressKey } from "@/lib/utils/slug";

// -----------------------------------------------------------------------------
// BELANGRIJK (kostenbeheersing): dit is de ENIGE plek in de app die de Altum
// AI-API's (Woningwaarde/AVM én Woningreferentie/buurtverkopen) daadwerkelijk
// aanroept. Beide kosten credits/geld per keer en gebruiken dezelfde
// ALTUM_API_KEY — daarom worden ze niet meer bij een gewone paginaweergave
// gedaan (zie app/api/rapport/route.ts, die geeft voor allebei een "nog niet
// opgevraagd"-placeholder terug), maar uitsluitend hier, in één gezamenlijke
// aanroep, op het moment dat iemand het rapport daadwerkelijk ontgrendelt/
// betaalt (zie ReportPageClient.handleUnlock). Draait server-side, net als
// de hoofd-route, dus de sleutel blijft uit de browserbundel.
//
// Vervangt de eerdere aparte /api/rapport/woningwaarde-route: die dekte
// alleen woningwaarde, waardoor buurtverkopen abusievelijk al bij de gewone
// (onbetaalde) paginaweergave werd opgehaald. Nu delen beide premium-bronnen
// hetzelfde ontgrendel-moment.
//
// BEVEILIGING: vóór de betaalflow (zie app/api/betaling/*) was "ontgrendeld"
// puur client-side state (ReportPageClient's isUnlocked) — deze route zelf
// controleerde niets, dus wie de browser-devtools opende en deze route
// rechtstreeks aanriep, kreeg de kostenveroorzakende Altum-data gratis. Dat
// is nu dichtgezet: zonder een bestellingId die hier, server-side, écht als
// "paid" voor DIT adres bekendstaat, wordt er niets opgehaald.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: { address?: AddressMeta; oppervlakteM2?: number; bestellingId?: string };
  try {
    body = (await req.json()) as { address?: AddressMeta; oppervlakteM2?: number; bestellingId?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const address = body?.address;
  if (!address || typeof address.postcode !== "string" || typeof address.huisnummer !== "string") {
    return NextResponse.json({ error: "Ongeldige aanvraag: adres ontbreekt of is onvolledig." }, { status: 400 });
  }

  // BEVEILIGING: dezelfde afgeleide sleutel als bij het aanmaken van de
  // bestelling (zie /api/betaling/aanmaken) — nooit address.slug uit de
  // request-body zelf, anders zou een betaalde bestelling voor adres A
  // (via een zelfgekozen, gelijk slug-veld) ook adres B laten ontgrendelen.
  const addressKey = canonicalAddressKey(address);
  if (!addressKey || !body.bestellingId || !(await isBetaaldVoorAdres(body.bestellingId, addressKey))) {
    return NextResponse.json(
      { error: "Geen (geldige, betaalde) bestelling gevonden voor dit adres. Rond eerst de betaling af." },
      { status: 402 }
    );
  }

  const result = await fetchPremiumOnUnlock(address, body.oppervlakteM2);
  return NextResponse.json(result);
}
