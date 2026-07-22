// Eén bron voor de prijs van het volledige rapport, nu in hele centen (het
// enige type waar geen afrondingsfouten in kunnen sluipen). RAPPORT_PRIJS
// (weergavetekst) én het bedrag dat we straks bij Mollie aanbieden worden
// hier allebei VAN afgeleid — zodat het bedrag dat de klant ziet en het
// bedrag dat daadwerkelijk in rekening wordt gebracht nooit uit elkaar
// kunnen lopen (zelfde "1 lijn"-principe als bij de veiligheidsscore).
export const RAPPORT_PRIJS_CENTEN = 1195;

// Weergavetekst — gebruikt in de gratis-preview vergelijkingstabel
// (PreviewSummary), de PaywallModal en de FAQ.
export const RAPPORT_PRIJS = `€${(RAPPORT_PRIJS_CENTEN / 100).toFixed(2).replace(".", ",")}`;

// Mollie verwacht een bedrag als { currency, value }, met value als exacte
// twee-decimalen-string (dus "11.95", nooit "11.9" of een los getal) — zie
// lib/payments/mollie.ts.
export function rapportPrijsAlsMollieBedrag(): { currency: "EUR"; value: string } {
  return { currency: "EUR", value: (RAPPORT_PRIJS_CENTEN / 100).toFixed(2) };
}

// Zelfde als hierboven, maar voor een AFWIJKEND bedrag (bv. een geldig
// kortingstoken uit de herinneringsmail, zie lib/utils/kortingToken.ts) --
// nooit rapportPrijsAlsMollieBedrag() gebruiken zodra er een korting is
// geverifieerd, anders wordt bij Mollie alsnog de volle prijs in rekening
// gebracht terwijl de klant een korting te zien kreeg.
export function centenAlsMollieBedrag(centen: number): { currency: "EUR"; value: string } {
  return { currency: "EUR", value: (centen / 100).toFixed(2) };
}

// Eén formule voor "X% korting op het rapport" — gebruikt door zowel het
// ondertekende kortingstoken (lib/utils/kortingToken.ts, herinneringsmail)
// als de handmatig invoerbare kortingscode (lib/utils/kortingscode.ts) --
// zodat 15% korting via de ene of de andere route nooit een ander bedrag
// oplevert door een losse, licht afwijkende berekening.
export function berekenKortingBedragCenten(percentage: number): number {
  return Math.round(RAPPORT_PRIJS_CENTEN * (1 - percentage / 100));
}
