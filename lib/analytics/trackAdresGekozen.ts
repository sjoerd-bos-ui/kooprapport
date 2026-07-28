// -----------------------------------------------------------------------------
// Meta-pixel "Lead" — het top-of-funnel signaal voor Facebook/Instagram-
// campagnes: iemand koos een concreet adres om een rapport voor te bekijken
// (zie AddressSearchBar.tsx#chooseSuggestion). Zonder dit event kon Meta een
// campagne alleen op kliks/pageviews optimaliseren, niet op wie daadwerkelijk
// een adres invulde -- met te weinig aankopen (trackAankoop.ts) om in het
// begin al op te optimaliseren, is dit tussenliggende signaal juist dan
// belangrijk.
//
// Bewust GEEN dedup-guard zoals bij trackAankoop: iemand die meerdere
// adressen bekijkt in één sessie stuurt hier gewoon meerdere Lead-events,
// en dat is prima -- het is een engagementsignaal, geen omzetcijfer dat
// scheef zou trekken bij dubbeltelling.
//
// Bewust GEEN adresgegevens in de event-payload: Meta heeft dat niet nodig om
// te optimaliseren (alleen "een lead gebeurde" telt mee), en een adres is
// herleidbare, persoonsgerelateerde informatie -- hoe minder daarvan naar een
// derde partij gaat, hoe beter.
//
// window.fbq bestaat alleen als de bezoeker cookietoestemming gaf én het
// Meta-pixel-script geladen is (zie CookieConsent.tsx) -- bij weigering/
// onbekend is deze functie een no-op, net als trackAankoop.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackAdresGekozen(): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "Lead");
}
