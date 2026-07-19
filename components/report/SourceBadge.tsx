import type { SourceMeta } from "@/types/dataSource";
import StatusChip, { type ChipToon } from "./StatusChip";
import { CheckIcon } from "./icons";

const STATUS_LABEL: Record<SourceMeta["status"], string> = {
  confirmed: "Officieel bevestigd",
  public: "Publieke bron",
  premium: "Premium databron",
  mock: "Voorbeelddata",
  unavailable: "Niet beschikbaar",
};

// Elke bronstatus is nu een echte gekleurde statuspil i.p.v. een puntje +
// kleine hoofdletters — dezelfde StatusChip-taal als de rest van het rapport.
const STATUS_TOON: Record<SourceMeta["status"], ChipToon> = {
  confirmed: "gunstig",
  public: "neutraal",
  premium: "accent",
  mock: "neutraal",
  unavailable: "risico",
};

export default function SourceBadge({ meta }: { meta: SourceMeta }) {
  const updated = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(meta.fetchedAt)
  );

  return (
    <span title={`${meta.label} · bijgewerkt ${updated}`}>
      <StatusChip
        toon={STATUS_TOON[meta.status]}
        icon={meta.status === "confirmed" ? <CheckIcon className="h-3 w-3" /> : undefined}
      >
        {STATUS_LABEL[meta.status]}
      </StatusChip>
    </span>
  );
}
