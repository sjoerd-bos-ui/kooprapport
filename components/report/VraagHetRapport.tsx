"use client";

import { useState } from "react";
import type { Report } from "@/types/report";
import { Button } from "@/components/ui/Button";
import { ChatIcon, SendIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// "Vraag het aan uw rapport" -- alleen zichtbaar bij een ontgrendeld rapport
// (zie de aanroep in ReportView.tsx), stuurt het al ontgrendelde Report-
// object mee naar POST /api/rapport/vraag (zelfde vertrouwensmodel als de
// PDF-/e-mailknoppen hierboven). Werkt hierdoor ook automatisch, zonder extra
// code, in Kooprapport Zakelijk (B2bReportView geeft isUnlocked altijd mee).
// -----------------------------------------------------------------------------

interface Uitwisseling {
  vraag: string;
  antwoord: string;
  bron: "ai" | "rapportgegevens";
}

export default function VraagHetRapport({ report }: { report: Report }) {
  const [vraag, setVraag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [uitwisselingen, setUitwisselingen] = useState<Uitwisseling[]>([]);
  const [fout, setFout] = useState<string | null>(null);

  const suggesties = [
    report.market.data ? "Is dit een goede prijs?" : null,
    report.energy.data?.klasse ? "Wat betekent dit energielabel?" : null,
    report.fundering.data?.niveau ? "Is de fundering een risico?" : null,
    report.buurtprofiel.data?.samenvatting ? "Hoe is de buurt?" : null,
  ].filter((s): s is string => s !== null);

  async function stel(gestelde: string) {
    const schoon = gestelde.trim();
    if (!schoon || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/rapport/vraag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, vraag: schoon }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error ?? "Er ging iets mis. Probeer het opnieuw.");
        return;
      }
      setUitwisselingen((huidig) => [...huidig, { vraag: schoon, antwoord: data.antwoord, bron: data.bron }]);
      setVraag("");
    } catch {
      setFout("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-ink/10 bg-paper p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-accent">
          <ChatIcon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-lg font-bold text-ink">Vraag het aan uw rapport</p>
          <p className="mt-0.5 text-sm text-ink/50">Gebaseerd op de gegevens in dit rapport voor {report.core.address.label}.</p>
        </div>
      </div>

      {uitwisselingen.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-5">
          {uitwisselingen.map((u, i) => (
            <div key={i} className="rounded-xl bg-parchment p-4">
              <p className="text-sm font-semibold text-ink">{u.vraag}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/75">{u.antwoord}</p>
            </div>
          ))}
        </div>
      )}

      {suggesties.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {suggesties.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => stel(s)}
              disabled={bezig}
              className="rounded-full bg-mist px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-mist/70 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          stel(vraag);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          type="text"
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          placeholder="Stel uw eigen vraag over dit pand…"
          disabled={bezig}
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-accent/30 sm:text-sm"
        />
        <Button type="submit" disabled={bezig || vraag.trim().length === 0}>
          {bezig ? (
            "…"
          ) : (
            <span className="flex items-center gap-1.5">
              <SendIcon className="h-3.5 w-3.5" />
              Vraag
            </span>
          )}
        </Button>
      </form>

      {fout && <p className="mt-2 text-xs text-rust">{fout}</p>}

      <p className="mt-3 text-xs text-ink/40">AI-antwoord op basis van dit rapport — geen persoonlijk koop- of financieel advies.</p>
    </div>
  );
}
