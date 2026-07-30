// -----------------------------------------------------------------------------
// WhatsApp-supportkanaal (los zakelijk nummer, zie het gesprek in Cowork over
// een gratis eSIM-nummer via Simyo + WhatsApp Business zonder Sjoerds eigen
// nummer). Bewust ÉÉN losse env-var i.p.v. het nummer los in componenten te
// hardcoden — zolang NEXT_PUBLIC_WHATSAPP_NUMMER leeg is (het nummer bestaat
// nog niet), laten zowel de zwevende contactknop (WhatsAppFloatingButton.tsx)
// als de vertrouwensregel in PaywallModal.tsx zichzelf gewoon weg in plaats
// van een kapotte/lege wa.me-link te tonen.
//
// NEXT_PUBLIC_ omdat de browser dit zelf nodig heeft om de wa.me-link te
// bouwen, geen geheime waarde (een WhatsApp-zakelijk nummer is sowieso
// publiek zodra iemand erop klikt).
const RUW_NUMMER = process.env.NEXT_PUBLIC_WHATSAPP_NUMMER ?? "";

// Alleen cijfers, altijd met landcode, geen spaties/haakjes/plusteken —
// exact het formaat dat wa.me verwacht (bv. "31612345678").
export const WHATSAPP_NUMMER = RUW_NUMMER.replace(/[^0-9]/g, "");

export function heeftWhatsAppSupport(): boolean {
  return WHATSAPP_NUMMER.length > 0;
}

// text= wordt automatisch in het chatvenster gezet zodra iemand op de link
// klikt (nog niet verzonden) — scheelt een leeg "hoi, ik heb een vraag over..."
// dat anders elke keer opnieuw getypt moet worden.
export function bouwWhatsAppLink(bericht?: string): string {
  const basis = `https://wa.me/${WHATSAPP_NUMMER}`;
  return bericht ? `${basis}?text=${encodeURIComponent(bericht)}` : basis;
}
