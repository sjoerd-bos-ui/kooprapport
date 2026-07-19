import type { VoorzieningThema } from "@/types/report";

// -----------------------------------------------------------------------------
// Gedeelde presentatie-tokens voor de "voorzieningen"-lijst in het
// buurtprofiel — gebruikt door zowel components/report/ReportView.tsx (app)
// als lib/pdf/ReportDocument.tsx (PDF), zodat de thema-volgorde, thema-labels
// en per-voorziening kleur nooit tussen de twee kunnen driften (zelfde
// bedoeling als lib/utils/toonKleuren.ts voor de vijf toon-kleuren).
//
// De inhoudelijke definitie zelf — welk CBS-veld hoort bij welke key/label/
// thema — staat in lib/data-sources/buurtprofiel.ts (VOORZIENING_DEFINITIES).
// Dit bestand bevat uitsluitend hoe het eruitziet, geen databronlogica.
// -----------------------------------------------------------------------------

export const VOORZIENING_THEMA_VOLGORDE: VoorzieningThema[] = ["dagelijks", "gezin", "bereikbaarheid"];

export const VOORZIENING_THEMA_LABEL: Record<VoorzieningThema, string> = {
  dagelijks: "Dagelijks leven",
  gezin: "Gezin en onderwijs",
  bereikbaarheid: "Bereikbaarheid en buitenruimte",
};

// Eén kleur per voorziening-key (zie VOORZIENING_DEFINITIES in
// buurtprofiel.ts voor de keys). Bewust per individuele voorziening i.p.v.
// per thema: dat geeft elke kaart een eigen herkenbare kleur, net als de
// oorspronkelijke drie (huisarts/supermarkt/school) al hadden.
export const VOORZIENING_KLEUR: Record<string, string> = {
  huisarts: "#4F46E5",
  apotheek: "#7C3AED",
  supermarkt: "#0D9488",
  basisschool: "#DB2777",
  voortgezetOnderwijs: "#DB2777",
  kinderdagverblijf: "#F59E0B",
  treinstation: "#0EA5E9",
  opritHoofdweg: "#64748B",
  park: "#16A34A",
};
