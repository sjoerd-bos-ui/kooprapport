import {
  B2B_KOSTEN_KOPER_OPTIES,
  B2B_WONINGTYPE_VOORKEUREN,
  B2B_MIN_KAMERS_OPTIES,
  B2B_MIN_OPPERVLAK_OPTIES,
  B2B_BUITENRUIMTE_OPTIES,
  B2B_MIN_ENERGIELABEL_OPTIES,
  B2B_VOORZIENING_WENSEN,
  B2B_PARKEREN_OPTIES,
  B2B_DEALBREAKERS,
  B2B_AFWEGINGEN,
  B2B_PRIORITEITEN,
  MAX_VOORKEUR_LOCATIES,
  MAX_DEALBREAKERS,
  MAX_AFWEGINGEN,
  MAX_PRIORITEITEN,
} from "@/types/b2b";
import type { B2bKoperVoorkeuren, B2bLocatie } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Gedeelde validatie voor de 13-vragen koper-voorkeurenlijst (matchingmodel
// v2) -- gebruikt door zowel de makelaar-route
// (app/api/zakelijk/klanten/[id]/route.ts) als de publieke koper-link
// (app/api/koper-voorkeuren/[token]/route.ts), zodat beide invulkanalen
// EXACT dezelfde regels toepassen (zie het gesprek hierover: "moet op deze
// manier ingevuld kunnen worden via de link, maar ook via de app zelf").
//
// BEWUST alles-of-niets: elke vraag in de opgave is "Required: true" (behalve
// Vraag 9, voorzieningen) -- een halve invoer wordt hier afgewezen i.p.v.
// stilzwijgend aangevuld met een default, want een verzonnen antwoord (bv.
// "budget onbekend" invullen omdat het veld leeg was) zou het scoremodel een
// vals gevoel van zekerheid geven.
// -----------------------------------------------------------------------------

function isGeldigeWaarde<T extends string>(waarde: unknown, opties: { waarde: T }[]): waarde is T {
  return typeof waarde === "string" && opties.some((o) => o.waarde === waarde);
}

function isGeldigeArray<T extends string>(waarden: unknown, opties: { waarde: T }[], max?: number): waarden is T[] {
  if (!Array.isArray(waarden)) return false;
  if (max != null && waarden.length > max) return false;
  return waarden.every((w) => isGeldigeWaarde(w, opties));
}

function valideerLocatie(input: unknown): B2bLocatie | null {
  if (!input || typeof input !== "object") return null;
  const l = input as Partial<B2bLocatie>;
  if (typeof l.label !== "string" || !l.label.trim() || typeof l.plaatsSlug !== "string" || !l.plaatsSlug.trim()) return null;
  return {
    label: l.label.trim().slice(0, 120),
    plaatsSlug: l.plaatsSlug.trim().toLowerCase().slice(0, 80),
    wijkSlug: typeof l.wijkSlug === "string" && l.wijkSlug.trim() ? l.wijkSlug.trim().toLowerCase().slice(0, 80) : null,
  };
}

function tekst(input: unknown, maxLengte: number): string | null {
  if (typeof input !== "string") return null;
  const t = input.trim();
  return t ? t.slice(0, maxLengte) : null;
}

// NIEUW (continu budget i.p.v. buckets, zie types/b2b.ts): geldig is `null`
// ("nog geen vast maximum") of een eindig, positief getal. Bewust een ruimere
// bovengrens (10 miljoen) dan de UI-schuifregelaar zelf (BUDGET_MAX) toestaat
// -- deze validatie is de laatste server-side poort, geen kopie van de
// UI-grenzen; die mogen later nog wijzigen zonder dat deze check ze allebei
// hoeft te kennen.
function valideerMaxKoopprijs(input: unknown): { ok: true; waarde: number | null } | { ok: false } {
  if (input === null) return { ok: true, waarde: null };
  if (typeof input === "number" && Number.isFinite(input) && input > 0 && input <= 10000000) {
    return { ok: true, waarde: Math.round(input) };
  }
  return { ok: false };
}

export function valideerKoperVoorkeuren(input: unknown): { ok: true; waarde: B2bKoperVoorkeuren } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Ongeldige koper-voorkeuren." };
  const v = input as Record<string, unknown>;

  const maxKoopprijs = valideerMaxKoopprijs(v.maxKoopprijs);
  if (!maxKoopprijs.ok) return { ok: false, error: "Kies een geldig budget (vraag 1)." };
  if (!isGeldigeWaarde(v.kostenKoper, B2B_KOSTEN_KOPER_OPTIES)) return { ok: false, error: "Beantwoord vraag 2 (kosten koper)." };

  if (!Array.isArray(v.voorkeurLocaties) || v.voorkeurLocaties.length === 0 || v.voorkeurLocaties.length > MAX_VOORKEUR_LOCATIES) {
    return { ok: false, error: `Kies minimaal 1 en maximaal ${MAX_VOORKEUR_LOCATIES} locaties (vraag 3).` };
  }
  const voorkeurLocatiesRuw = v.voorkeurLocaties.map(valideerLocatie);
  if (voorkeurLocatiesRuw.some((l) => l === null)) {
    return { ok: false, error: "Kies elke locatie uit de suggesties (vraag 3)." };
  }
  const voorkeurLocaties = voorkeurLocatiesRuw as B2bLocatie[];

  if (!isGeldigeArray(v.woningtypes, B2B_WONINGTYPE_VOORKEUREN) || (v.woningtypes as unknown[]).length === 0) {
    return { ok: false, error: "Kies minimaal 1 woningtype (vraag 4)." };
  }
  const woningtypes = v.woningtypes as B2bKoperVoorkeuren["woningtypes"];
  const woningtypeAnders = woningtypes.includes("other") ? tekst(v.woningtypeAnders, 120) : null;

  if (!isGeldigeWaarde(v.minKamers, B2B_MIN_KAMERS_OPTIES)) return { ok: false, error: "Beantwoord vraag 5 (aantal kamers)." };
  if (!isGeldigeWaarde(v.minOppervlak, B2B_MIN_OPPERVLAK_OPTIES)) return { ok: false, error: "Beantwoord vraag 6 (woonoppervlakte)." };
  if (!isGeldigeWaarde(v.buitenruimte, B2B_BUITENRUIMTE_OPTIES)) return { ok: false, error: "Beantwoord vraag 7 (buitenruimte)." };
  if (!isGeldigeWaarde(v.minEnergielabel, B2B_MIN_ENERGIELABEL_OPTIES)) return { ok: false, error: "Beantwoord vraag 8 (energielabel)." };

  // Vraag 9 is NIET verplicht (Required: false in de opgave) -- lege array
  // is een geldig antwoord.
  const belangrijkeVoorzieningen = isGeldigeArray(v.belangrijkeVoorzieningen, B2B_VOORZIENING_WENSEN)
    ? (v.belangrijkeVoorzieningen as B2bKoperVoorkeuren["belangrijkeVoorzieningen"])
    : [];

  if (!isGeldigeWaarde(v.parkeren, B2B_PARKEREN_OPTIES)) return { ok: false, error: "Beantwoord vraag 10 (parkeren)." };

  if (!isGeldigeArray(v.dealbreakers, B2B_DEALBREAKERS, MAX_DEALBREAKERS) || (v.dealbreakers as unknown[]).length === 0) {
    return { ok: false, error: `Kies minimaal 1 en maximaal ${MAX_DEALBREAKERS} dealbreakers (vraag 11).` };
  }
  const dealbreakers = v.dealbreakers as B2bKoperVoorkeuren["dealbreakers"];
  const dealbreakerAnders = dealbreakers.includes("other") ? tekst(v.dealbreakerAnders, 200) : null;

  if (!isGeldigeArray(v.afwegingen, B2B_AFWEGINGEN, MAX_AFWEGINGEN) || (v.afwegingen as unknown[]).length === 0) {
    return { ok: false, error: `Kies minimaal 1 en maximaal ${MAX_AFWEGINGEN} afwegingen (vraag 12).` };
  }

  if (!isGeldigeArray(v.prioriteiten, B2B_PRIORITEITEN, MAX_PRIORITEITEN) || (v.prioriteiten as unknown[]).length === 0) {
    return { ok: false, error: `Kies minimaal 1 en maximaal ${MAX_PRIORITEITEN} prioriteiten (vraag 13).` };
  }

  return {
    ok: true,
    waarde: {
      maxKoopprijs: maxKoopprijs.waarde,
      kostenKoper: v.kostenKoper as B2bKoperVoorkeuren["kostenKoper"],
      voorkeurLocaties,
      woningtypes,
      woningtypeAnders,
      minKamers: v.minKamers as B2bKoperVoorkeuren["minKamers"],
      minOppervlak: v.minOppervlak as B2bKoperVoorkeuren["minOppervlak"],
      buitenruimte: v.buitenruimte as B2bKoperVoorkeuren["buitenruimte"],
      minEnergielabel: v.minEnergielabel as B2bKoperVoorkeuren["minEnergielabel"],
      belangrijkeVoorzieningen,
      parkeren: v.parkeren as B2bKoperVoorkeuren["parkeren"],
      dealbreakers,
      dealbreakerAnders,
      afwegingen: v.afwegingen as B2bKoperVoorkeuren["afwegingen"],
      prioriteiten: v.prioriteiten as B2bKoperVoorkeuren["prioriteiten"],
      ingevuldOp: new Date().toISOString(),
    },
  };
}
