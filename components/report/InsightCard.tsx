import type { ReactNode } from "react";
import type { Insight } from "@/types/report";
import StatusChip, { type ChipToon } from "./StatusChip";
import { TrendingUpIcon, AlertTriangleIcon, InfoIcon } from "./icons";

const TOON_CHIP: Record<Insight["toon"], ChipToon> = {
  positief: "gunstig",
  negatief: "risico",
  neutraal: "neutraal",
};

const TOON_ICON: Record<Insight["toon"], ReactNode> = {
  positief: <TrendingUpIcon className="h-3 w-3" />,
  negatief: <AlertTriangleIcon className="h-3 w-3" />,
  neutraal: <InfoIcon className="h-3 w-3" />,
};

// Toont uitsluitend inzichten die buildInsights() daadwerkelijk kon
// onderbouwen (zie lib/services/insights.ts) — er verschijnt hier nooit een
// kaart met een gegokte of halve conclusie. Compacte kaart met een echte
// statuschip i.p.v. een gekleurd puntje voor de toon.
export default function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-xl bg-parchment p-4">
      <StatusChip toon={TOON_CHIP[insight.toon]} icon={TOON_ICON[insight.toon]}>
        {insight.label}
      </StatusChip>
      <p className="mt-2.5 text-[14px] font-medium leading-snug text-ink/80">{insight.tekst}</p>
    </div>
  );
}
