import { NextRequest, NextResponse } from "next/server";
import type { AddressMeta } from "@/types/report";
import { maakBestelling, haalBestelling } from "@/lib/payments/bestellingen";
import { maakBetaling } from "@/lib/payments/mollie";
import { RAPPORT_PRIJS_CENTEN } from "@/lib/utils/prijs";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { canonicalAddressKey, buildReportHref } from "@/lib/utils/slug";
import { verifieerKortingToken } from "@/lib/utils/kortingToken";

// -----------------------------------------------------------------------------
// Stap 1 van de betaalflow: een bestelling aanmaken op het moment dat de
// klant op "Betaal met iDEAL" klikt (zie PaywallModal.tsx). Draait
// server-side omdat MOLLIE_API_KEY hier nooit in de browserbundel terecht
// mag komen — zelfde reden als bij de Altum-koppeling.
//
// In mock-modus (default, geen MOLLIE_API_KEY nodig) is de bestelling na dit
// ene verzoek al "paid" — zie lib/payments/mollie.ts#maakBetaling. In
// live-modus blijft de status "open" totdat Mollie's webhook (of de
// fallback-verificatie in /api/betaling/status) bevestigt dat er echt is
// betaald.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 10 bestelpogingen per 5 minuten per IP — een echte klant rondt een
  // aankoop nooit zo vaak achter elkaar af; dit remt alleen scripted
  // misbruik (herhaald bestellingen/Mollie-betaalaanvragen aanmaken) af.
  const limiet = await checkRateLimit(req, "betaling-aanmaken", 10, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json(
      { error: "Te veel pogingen. Probeer het over een paar minuten opnieuw." },
      { status: 429 }
    );
  }

  let address: AddressMeta;
  let kortingToken: string | undefined;
  try {
    ({ address, kortingToken } = (await req.json()) as { address: AddressMeta; kortingToken?: string });
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  if (!address?.slug || !address.label) {
    return NextResponse.json({ error: "Ongeldige aanvraag: adres ontbreekt of is onvolledig." }, { status: 400 });
  }

  // BEVEILIGING: de bestelling wordt gekoppeld aan een sleutel die WIJ hier
  // afleiden uit postcode+huisnummer, niet aan het slug-veld uit de
  // request-body zelf — anders zou iemand voor elk gewenst (duurder) adres
  // gewoon hetzelfde slug-veld kunnen meesturen als bij een eerdere, al
  // betaalde bestelling. Zie lib/utils/slug.ts#canonicalAddressKey.
  const addressKey = canonicalAddressKey(address);
  if (!addressKey) {
    return NextResponse.json(
      { error: "Ongeldige aanvraag: postcode/huisnummer zijn niet geldig." },
      { status: 400 }
    );
  }

  // BEVEILIGING: het bedrag komt NOOIT rechtstreeks van de client (dat zou
  // een bezoeker een willekeurig bedrag laten invullen) -- alleen een geldig,
  // ondertekend kortingstoken (uit de herinneringsmail, zie
  // lib/utils/kortingToken.ts) kan de prijs verlagen, en dat wordt hier
  // opnieuw en onafhankelijk geverifieerd, los van wat /api/betaling/korting
  // eerder al liet zien.
  const korting = verifieerKortingToken(kortingToken, addressKey);
  const bedragCenten = korting.geldig && korting.bedragCenten != null ? korting.bedragCenten : RAPPORT_PRIJS_CENTEN;

  const bestelling = await maakBestelling(addressKey, bedragCenten);

  try {
    // BUGFIX: redirectPad moet het adres zelf meegeven (straat/huisnummer/
    // postcode/plaats), niet alleen de kale slug — anders herkent
    // resolveConfirmedAddress() het adres na terugkomst van Mollie niet
    // meer (toont dan "Onvolledig, vul het adres verder aan"), want die
    // functie leest het adres uit de queryparams van de URL, niet uit de
    // slug zelf.
    //
    // BEWUST buildReportHref() i.p.v. buildCanonicalReportPath(): deze
    // terug-URL is eenmalig/niet bedoeld om te indexeren (dus geen SEO-
    // reden om 'm kort te houden), en moet ook locatieserverId/
    // adresseerbaarObjectId bevatten — zonder die twee kon buurtprofiel.ts
    // (en kavel/bestemming) geen buurtcode opzoeken voor het net-betaalde
    // rapport ("geen locatieserverId beschikbaar"-waarschuwing), dus
    // ontgrendelde die sectie leeg. buildCanonicalReportPath() blijft wél
    // de kortere variant voor de metadata/canonical-link elders.
    const { checkoutUrl } = await maakBetaling({
      bestellingId: bestelling.id,
      omschrijving: `Kooprapport voor ${address.label}`,
      redirectPad: buildReportHref(address),
      bedragCenten,
    });

    // Na maakBetaling() kan de status al "paid" zijn (mock-modus) — dus
    // opnieuw ophalen i.p.v. de oorspronkelijke (nog "open") bestelling
    // hierboven terug te sturen.
    const actueel = (await haalBestelling(bestelling.id)) ?? bestelling;

    return NextResponse.json({
      bestellingId: actueel.id,
      status: actueel.status,
      checkoutUrl,
      bedragCenten,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij het aanmaken van de betaling.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
