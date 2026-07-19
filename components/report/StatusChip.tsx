import type { ReactNode } from "react";
import { TOON_HEX, type ChipToon } from "@/lib/utils/toonKleuren";

// Eén herbruikbare, gekleurde statuspil — vervangt de losse "puntje + kleine
// hoofdletters"-labels die overal in het rapport stonden (SourceBadge,
// DataQualityBanner, FunderingsBadge, "Vergelijkbaar"-tag, ...). Elk statuscomponent
// in het rapport gebruikt nu dezelfde vijf tonen, zodat kleur overal
// dezelfde betekenis draagt.
//
// ChipToon en TOON_HEX worden hier doorgegeven (niet opnieuw gedefinieerd)
// vanuit lib/utils/toonKleuren.ts, zodat bestaande imports als
// `import { type ChipToon, TOON_HEX } from "@/components/report/StatusChip"`
// elders in de app gewoon blijven werken.
export type { ChipToon };
export { TOON_HEX };

const TOON_STIJL: Record<ChipToon, string> = {
  neutraal: "bg-[#F5F5FA] text-[#1F1F2E99]",
  gunstig: "bg-[#E6FBF7] text-[#0F766E]",
  aandacht: "bg-[#FEF3E2] text-[#9A6A0C]",
  risico: "bg-[#FEECEC] text-[#B7302B]",
  accent: "bg-[#EEF0FF] text-accent",
};

export default function StatusChip({
  toon = "neutraal",
  icon,
  children,
}: {
  toon?: ChipToon;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TOON_STIJL[toon]}`}
    >
      {icon}
      {children}
    </span>
  );
}
