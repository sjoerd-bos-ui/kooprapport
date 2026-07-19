import type { SourceMeta } from "@/types/dataSource";
import StatusChip from "./StatusChip";
import { InfoIcon } from "./icons";

const STATE_MESSAGE: Record<SourceMeta["state"], string> = {
  success: "",
  partial: "Deze gegevens zijn deels beschikbaar.",
  empty: "Er zijn voor dit adres geen resultaten gevonden bij deze bron.",
  error: "Deze gegevens konden niet worden opgehaald.",
  timeout: "Deze bron reageerde niet op tijd. Probeer het later opnieuw.",
  unavailable: "Deze gegevens zijn op dit moment niet beschikbaar.",
};

// Los van de betaalmuur: als een bron geen data heeft (fout, leeg, time-out,
// niet geconfigureerd) is er niets om te "ontgrendelen". Dat dan toch blurren
// zou suggereren dat er waardevolle inhoud achter zit — terwijl die er niet
// is. Vandaar een eigen, compacte melding met statuschip i.p.v. de
// locked-overlay of een groot leeg tekstblok.
export default function DataUnavailableNotice({ meta }: { meta: SourceMeta }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-ink/15 px-6 py-8 text-center">
      <StatusChip toon="neutraal" icon={<InfoIcon className="h-3 w-3" />}>
        Niet beschikbaar
      </StatusChip>
      <p className="max-w-sm text-sm text-ink/50">{STATE_MESSAGE[meta.state] || STATE_MESSAGE.unavailable}</p>
      {meta.errorMessage && <p className="text-xs text-ink/30">{meta.errorMessage}</p>}
    </div>
  );
}
