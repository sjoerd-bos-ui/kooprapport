// Eén gedeelde berekening voor onze veiligheidsscore (1-10) — gebruikt door
// zowel het Overzicht-tabblad (kerncijfer) als het Buurt-tabblad (dial +
// uitleg), zodat er nooit twee verschillende getallen/kleuren voor
// "hoe veilig is deze buurt" door elkaar heen kunnen lopen.
//
// GEEN officieel CBS-cijfer — een transparante, eenvoudige omrekening van
// het echte, opgehaalde cijfer (misdrijven per 1.000 inwoners, CBS/politie):
// score = 10 - (cijfer / 10), afgerond en begrensd tussen 1 en 10.
import { TOON_HEX } from "./toonKleuren";

export type VeiligheidsBand = "gunstig" | "aandacht" | "risico";

// Kleur komt uit dezelfde gedeelde TOON_HEX-set als StatusChip en het
// funderingsrisico (zie lib/utils/toonKleuren.ts) — alleen de tekst hier is
// specifiek voor veiligheid, dus dat blijft een eigen mapping.
export const VEILIGHEID_BAND: Record<VeiligheidsBand, { kleur: string; tekst: string }> = {
  gunstig: { kleur: TOON_HEX.gunstig.tekst, tekst: "Laag risico" },
  aandacht: { kleur: TOON_HEX.aandacht.tekst, tekst: "Gemiddeld risico" },
  risico: { kleur: TOON_HEX.risico.tekst, tekst: "Verhoogd risico" },
};

export function berekenVeiligheidsscore(misdrijvenPer1000: number): number {
  const ruw = 10 - misdrijvenPer1000 / 10;
  return Math.min(10, Math.max(1, Math.round(ruw)));
}

export function bepaalVeiligheidsBand(score: number): VeiligheidsBand {
  if (score >= 7) return "gunstig";
  if (score >= 4) return "aandacht";
  return "risico";
}
