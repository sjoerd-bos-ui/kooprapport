"use client";

import { useState } from "react";
import type { B2bRapportAanvraag } from "@/types/b2b";
import VergelijkTabel from "@/components/zakelijk/VergelijkTabel";

// -----------------------------------------------------------------------------
// Vergelijken binnen een klantdossier (#2, tweede deel) -- alle rapporten van
// dit dossier zijn hier al server-side volledig geladen (listRapportenVoorKlant
// in b2bStore.ts geeft complete B2bRapportAanvraag[] terug, inclusief
// report-data), dus BEWUST geen losse fetch zoals op de vergelijkpagina: de
// data staat al klaar, alleen de selectie is client-side state. Standaard de
// twee/drie meest recente rapporten al aangevinkt, zodat een makelaar bij het
// openen van een dossier direct een vergelijking ziet i.p.v. eerst zelf te
// moeten selecteren.
// -----------------------------------------------------------------------------
export default function DossierVergelijken({ rapporten }: { rapporten: B2bRapportAanvraag[] }) {
  const [geselecteerd, setGeselecteerd] = useState<string[]>(rapporten.slice(0, 3).map((r) => r.id));

  if (rapporten.length < 2) return null;

  function toggle(id: string) {
    setGeselecteerd((huidig) => {
      if (huidig.includes(id)) return huidig.filter((x) => x !== id);
      if (huidig.length >= 3) return huidig;
      return [...huidig, id];
    });
  }

  const details = rapporten.filter((r) => geselecteerd.includes(r.id));

  return (
    <div className="mt-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Rapporten vergelijken</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {rapporten.map((r) => {
          const actief = geselecteerd.includes(r.id);
          const uitgeschakeld = !actief && geselecteerd.length >= 3;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              disabled={uitgeschakeld}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm transition-colors ${
                actief ? "bg-accent text-white" : uitgeschakeld ? "bg-white/60 text-ink/30" : "bg-white text-ink/70 hover:bg-mist"
              }`}
            >
              {r.adres.straat} {r.adres.huisnummer}
              {r.adres.huisletter ?? ""}
            </button>
          );
        })}
      </div>
      {details.length > 0 ? (
        <div className="mt-3">
          <VergelijkTabel details={details} />
        </div>
      ) : (
        <p className="mt-3 text-[11.5px] text-ink/45">Selecteer hierboven tot 3 rapporten om te vergelijken.</p>
      )}
    </div>
  );
}
