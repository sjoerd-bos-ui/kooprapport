import type { B2bRapportAanvraag } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Koppelt een gevonden Funda-match aan een al bestaand rapport in hetzelfde
// dossier, puur op adrestekst -- er is geen gestructureerd adres (straat/
// huisnummer/postcode) beschikbaar vanuit de Funda-feed (alleen een titel als
// "Boezemsingel 24, Rotterdam", zie FundaFeedItem in lib/data-sources/
// fundaFeed.ts), dus een exacte BAG/postcode-match is hier niet mogelijk.
//
// Dat titel-formaat ("Straat Nr, Plaats") is BEWUST hetzelfde formaat als
// AddressMeta.label (zie de label-opbouw in lib/services/addressLookup.ts:
// `${straat} ${huisnummerVolledig}, ${plaats}`), dus een genormaliseerde
// (lowercase, getrimde) tekstvergelijking tussen match.titel en
// rapport.adres.label is hier een eerlijke, best-effort match -- geen
// garantie bij afwijkende schrijfwijzen, maar wel de beste beschikbare
// aanpak zonder een niet-bestaand gestructureerd adres te verzinnen.
function normaliseer(tekst: string): string {
  return tekst.trim().toLowerCase().replace(/\s+/g, " ");
}

export function vindGekoppeldRapport(matchTitel: string, rapporten: B2bRapportAanvraag[]): B2bRapportAanvraag | null {
  const doel = normaliseer(matchTitel);
  return rapporten.find((r) => normaliseer(r.adres.label) === doel) ?? null;
}
