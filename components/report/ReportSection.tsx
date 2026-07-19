import type { ReactNode } from "react";
import type { SourceMeta } from "@/types/dataSource";
import LockedOverlay from "./LockedOverlay";
import SourceBadge from "./SourceBadge";
import DataUnavailableNotice from "./DataUnavailableNotice";
import StatusChip from "./StatusChip";
import { InfoIcon } from "./icons";

// Zachte, afgeronde kaart in het indigo/wit-systeem — vervangt het eerdere
// scherprandige "kaartblad" met dikke zwarte onderlijn. Titels in gewone
// zinsvorm (niet meer uppercase/display) voor een rustiger, moderner SaaS-
// gevoel, consistent met de nieuwe homepage en PreviewSummary.
export default function ReportSection({
  title,
  subtitle,
  locked = false,
  onUnlockClick,
  meta,
  hasData = true,
  deferred = false,
  children,
}: {
  title: string;
  subtitle?: string;
  locked?: boolean;
  onUnlockClick?: () => void;
  meta?: SourceMeta;
  hasData?: boolean;
  // Voor bronnen die pas ná ontgrendelen daadwerkelijk worden opgehaald
  // (bv. de Altum Woningwaarde API, die geld kost per aanroep — zie
  // reportService.ts#deferredMarketResult). Zolang deferred=true is er nog
  // helemaal niets geprobeerd, dus is een "niet beschikbaar"-melding
  // misleidend; dan tonen we gewoon de normale ontgrendel-teaser i.p.v. de
  // (voorbarige) DataUnavailableNotice.
  deferred?: boolean;
  children: ReactNode;
}) {
  const showUnavailable = Boolean(meta) && !hasData && !deferred;

  return (
    <section className="mt-6 rounded-2xl border border-ink/10 bg-paper p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-1.5 text-[13px] text-ink/45">{subtitle}</p>}
        </div>
        {meta && <SourceBadge meta={meta} />}
      </div>

      {meta?.state === "partial" && (
        <div className="mb-5 -mt-1 flex flex-wrap items-center gap-2">
          <StatusChip toon="aandacht" icon={<InfoIcon className="h-3 w-3" />}>
            Gedeeltelijk beschikbaar
          </StatusChip>
          {meta.missingFields && meta.missingFields.length > 0 && (
            <span className="text-xs text-ink/40">Ontbreekt: {meta.missingFields.join(", ")}</span>
          )}
        </div>
      )}

      {showUnavailable && meta ? (
        <DataUnavailableNotice meta={meta} />
      ) : (
        <div className="relative">
          <div className={locked ? "pointer-events-none select-none blur-[3px]" : ""}>{children}</div>
          {locked && <LockedOverlay onUnlockClick={onUnlockClick} />}
        </div>
      )}
    </section>
  );
}
