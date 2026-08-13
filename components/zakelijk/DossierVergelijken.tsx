"use client";

import { useState } from "react";
import type { B2bRapportAanvraag } from "@/types/b2b";
import VergelijkTabel from "@/components/zakelijk/VergelijkTabel";
import { LinkIcon } from "@/components/report/icons";

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
export default function DossierVergelijken({ rapporten, dossierId }: { rapporten: B2bRapportAanvraag[]; dossierId: string }) {
  const [geselecteerd, setGeselecteerd] = useState<string[]>(rapporten.slice(0, 3).map((r) => r.id));
  const [deelBezig, setDeelBezig] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  if (rapporten.length < 2) return null;

  function toggle(id: string) {
    setGeselecteerd((huidig) => {
      if (huidig.includes(id)) return huidig.filter((x) => x !== id);
      if (huidig.length >= 3) return huidig;
      return [...huidig, id];
    });
  }

  const details = rapporten.filter((r) => geselecteerd.includes(r.id));

  // Elke klik legt een NIEUWE momentopname van de huidige selectie vast (zie
  // de toelichting bij maakVergelijkingDeelToken in b2bStore.ts) -- geen
  // hergebruik van een eerder token, want de selectie kan intussen gewijzigd
  // zijn.
  async function deelVergelijking() {
    setDeelBezig(true);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}/vergelijking-deel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rapportIds: geselecteerd }),
      });
      if (!res.ok) throw new Error("mislukt");
      const body = await res.json();
      await navigator.clipboard.writeText(body.deelUrl);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      alert("De deel-link kon nu niet worden aangemaakt. Probeer het straks opnieuw.");
    } finally {
      setDeelBezig(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Rapporten vergelijken</p>
        {details.length >= 2 && (
          <button
            type="button"
            onClick={deelVergelijking}
            disabled={deelBezig}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[11.5px] font-semibold text-ink shadow-sm hover:bg-mist disabled:opacity-60"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            {deelBezig ? "Bezig…" : gekopieerd ? "Link gekopieerd!" : "Deel deze vergelijking"}
          </button>
        )}
      </div>
      <div id="rapport-kiezer" className="mt-2.5 flex flex-wrap gap-2">
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
          <VergelijkTabel details={details} aantalMeerBeschikbaar={Math.max(0, rapporten.length - geselecteerd.length)} />
        </div>
      ) : (
        <p className="mt-3 text-[11.5px] text-ink/45">Selecteer hierboven tot 3 rapporten om te vergelijken.</p>
      )}
    </div>
  );
}
