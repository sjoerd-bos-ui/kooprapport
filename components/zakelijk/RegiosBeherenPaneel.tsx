"use client";

import { useState } from "react";
import WerkgebiedForm from "@/components/zakelijk/WerkgebiedForm";
import { ChevronDownIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Dunne client-wrapper om het bestaande WerkgebiedForm (tot nu toe alleen op
// de Instellingen-pagina) ook direct op de Werkgebied-pagina zelf bruikbaar
// te maken -- "op de pagina zelf kunnen selecteren" i.p.v. alleen een
// uitgaande link naar Instellingen. Standaard dichtgeklapt (rustig), WerkgebiedForm
// zelf is ongewijzigd hergebruikt (geen dubbele opslaglogica).
// -----------------------------------------------------------------------------
export default function RegiosBeherenPaneel({
  alleRegioNamen,
  huidig,
  startOpen,
}: {
  alleRegioNamen: string[];
  huidig: string[];
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(startOpen));

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
          Regio&apos;s beheren {huidig.length > 0 && <span className="text-ink/30">({huidig.length})</span>}
        </span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-ink/35 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-ink/[0.06] p-4">
          <WerkgebiedForm alleRegioNamen={alleRegioNamen} huidig={huidig} />
        </div>
      )}
    </div>
  );
}
