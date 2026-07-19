// Eén bron voor de prijs van het volledige rapport, nu in hele centen (het
// enige type waar geen afrondingsfouten in kunnen sluipen). RAPPORT_PRIJS
// (weergavetekst) én het bedrag dat we straks bij Mollie aanbieden worden
// hier allebei VAN afgeleid — zodat het bedrag dat de klant ziet en het
// bedrag dat daadwerkelijk in rekening wordt gebracht nooit uit elkaar
// kunnen lopen (zelfde "1 lijn"-principe als bij de veiligheidsscore).
// TIJDELIJK op €1 voor de éénmalige live Mollie-test (echte sleutel, klein
// bedrag i.p.v. de volle €11,95) — NIET VERGETEN terug te zetten naar 1195
// zodra die test geslaagd is, dit bedrag is ook wat een echte bezoeker nu
// zou zien/betalen.
export const RAPPORT_PRIJS_CENTEN = 100;

// Weergavetekst — gebruikt in de gratis-preview vergelijkingstabel
// (PreviewSummary), de PaywallModal en de FAQ.
export const RAPPORT_PRIJS = `€${(RAPPORT_PRIJS_CENTEN / 100).toFixed(2).replace(".", ",")}`;

// Mollie verwacht een bedrag als { currency, value }, met value als exacte
// twee-decimalen-string (dus "11.95", nooit "11.9" of een los getal) — zie
// lib/payments/mollie.ts.
export function rapportPrijsAlsMollieBedrag(): { currency: "EUR"; value: string } {
  return { currency: "EUR", value: (RAPPORT_PRIJS_CENTEN / 100).toFixed(2) };
}
