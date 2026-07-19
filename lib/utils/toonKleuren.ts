// Eén bron voor de vijf "toon"-kleuren die door het hele rapport heen
// dezelfde betekenis dragen (gunstig = teal, aandacht = amber, risico =
// rood, plus neutraal/accent) — StatusChip, de veiligheidsscore, het
// funderingsrisico (ReportHero + FunderingRedenering) en de
// Energieprestatie-toelichting gebruikten hiervoor eerder allemaal hun
// eigen, los gekopieerde hex-waarden. Die kopieën waren identiek maar
// onafhankelijk onderhouden — een makkelijke bron van toekomstige drift.
// Nu is er precies één plek: iedereen importeert hiervandaan (rechtstreeks,
// of via het re-export in components/report/StatusChip.tsx).
export type ChipToon = "neutraal" | "gunstig" | "aandacht" | "risico" | "accent";

export const TOON_HEX: Record<ChipToon, { bg: string; tekst: string }> = {
  neutraal: { bg: "#F5F5FA", tekst: "#1F1F2E99" },
  gunstig: { bg: "#E6FBF7", tekst: "#0F766E" },
  aandacht: { bg: "#FEF3E2", tekst: "#9A6A0C" },
  risico: { bg: "#FEECEC", tekst: "#B7302B" },
  accent: { bg: "#EEF0FF", tekst: "#4F46E5" },
};
