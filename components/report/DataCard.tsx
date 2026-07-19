import type { ReactNode } from "react";
import StatusChip, { type ChipToon } from "./StatusChip";

// Compacte statchip i.p.v. het oude "label boven, cijfer eronder"-tegeltje:
// icoon, groot cijfer, kleine label — dezelfde structuur als de chips in
// PreviewSummary.tsx, nu herbruikbaar voor de rest van het rapport. Een
// los statusbadge (i.p.v. de oude puntje+kleine-hoofdletters-combinatie)
// kan eronder getoond worden voor herkomst/betrouwbaarheid.
export default function DataCard({
  icon,
  iconColor = "#4F46E5",
  label,
  labelInfo,
  value,
  hint,
  status,
}: {
  icon?: ReactNode;
  iconColor?: string;
  label: string;
  labelInfo?: ReactNode;
  value: ReactNode;
  hint?: string;
  status?: { toon: ChipToon; text: string };
}) {
  return (
    <div className="rounded-xl bg-parchment p-4">
      {icon && (
        <span className="mb-2 inline-flex" style={{ color: iconColor }}>
          {icon}
        </span>
      )}
      <p className="font-display text-xl font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink/55">
        {label}
        {labelInfo}
      </p>
      {hint && <p className="mt-1 text-[11px] text-ink/35">{hint}</p>}
      {status && (
        <div className="mt-2">
          <StatusChip toon={status.toon}>{status.text}</StatusChip>
        </div>
      )}
    </div>
  );
}
