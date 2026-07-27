// -----------------------------------------------------------------------------
// Conversie-tracking bij een geslaagde ontgrendeling (zie
// ReportPageClient.tsx#handleUnlock, de enige plek waar een betaling
// daadwerkelijk als "afgerond" wordt behandeld).
//
// Waarom dit nodig was: GA4 stuurde tot nu toe alleen automatische pageviews
// (zie CookieConsent.tsx) — nergens een signaal "hier is geld verdiend". Voor
// Google Ads is dat verschil cruciaal: zonder een conversie-event kan Ads niet
// zien welke klik tot een betaald rapport leidde, en optimaliseert (biedt)
// het systeem dus in het blinde.
//
// window.gtag bestaat alleen als de bezoeker cookietoestemming gaf én het
// GA4-script is geladen (zie CookieConsent.tsx) — bij weigering/onbekend is
// deze functie bewust een no-op, geen enkel verzoek naar Google.
//
// Google Ads-koppeling: twee onafhankelijke, allebei optionele mechanismen,
// zodat dit al werkt vóórdat er een Google Ads-account/conversieactie is:
// 1) GA4 "purchase"-event (werkt meteen met de bestaande GA_ID) — koppel je
//    Google Ads-account aan deze GA4-property (GA4 > Beheer > Product-
//    koppelingen > Google Ads) en importeer "purchase" als conversieactie:
//    geen code nodig.
// 2) Rechtstreeks Google Ads-conversie-event via gtag, alleen actief zodra
//    NEXT_PUBLIC_GOOGLE_ADS_ID + NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL zijn
//    ingevuld (zie .env.example) — tot die tijd stil overgeslagen, exact het
//    zelfde "MODE ontbreekt -> val terug op niets doen"-patroon als de rest
//    van dit project.
// -----------------------------------------------------------------------------

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;

export function trackAankoop(input: { bestellingId: string; bedragCenten: number }): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const waarde = Math.round(input.bedragCenten) / 100;

  window.gtag("event", "purchase", {
    transaction_id: input.bestellingId,
    value: waarde,
    currency: "EUR",
    items: [{ item_id: "volledig-rapport", item_name: "Volledig woningrapport", price: waarde, quantity: 1 }],
  });

  if (GOOGLE_ADS_ID && GOOGLE_ADS_CONVERSION_LABEL) {
    window.gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
      value: waarde,
      currency: "EUR",
      transaction_id: input.bestellingId,
    });
  }
}
