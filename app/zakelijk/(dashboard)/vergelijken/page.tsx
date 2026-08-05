"use client";

import { useEffect, useState } from "react";
import type { AddressMeta } from "@/types/report";
import type { B2bRapportAanvraag } from "@/types/b2b";
import VergelijkTabel from "@/components/zakelijk/VergelijkTabel";
import { TrendingUpIcon } from "@/components/report/icons";

interface RapportListItem {
  id: string;
  adres: AddressMeta;
  aangemaaktOp: string;
  geschatteWaarde: number | null;
  energielabel: string | null;
  funderingsniveau: string | null;
}

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export default function ZakelijkVergelijkenPagina() {
  const [rapporten, setRapporten] = useState<RapportListItem[]>([]);
  const [geselecteerd, setGeselecteerd] = useState<string[]>([]);
  const [details, setDetails] = useState<B2bRapportAanvraag[]>([]);
  const [laden, setLaden] = useState(false);

  useEffect(() => {
    fetch("/api/zakelijk/rapporten")
      .then((r) => r.json())
      .then((body: { rapporten: RapportListItem[] }) => setRapporten(body.rapporten ?? []));
  }, []);

  function toggleSelectie(id: string) {
    setGeselecteerd((huidig) => {
      if (huidig.includes(id)) return huidig.filter((x) => x !== id);
      if (huidig.length >= 3) return huidig;
      return [...huidig, id];
    });
  }

  useEffect(() => {
    if (geselecteerd.length === 0) {
      setDetails([]);
      return;
    }
    setLaden(true);
    Promise.all(
      geselecteerd.map((id) =>
        fetch(`/api/zakelijk/rapporten/${id}`)
          .then((r) => r.json())
          .then((b: { aanvraag: B2bRapportAanvraag }) => b.aanvraag)
      )
    )
      .then(setDetails)
      .finally(() => setLaden(false));
  }, [geselecteerd]);

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Vergelijken</p>
      <p className="mt-1 text-[12px] text-ink/50">Kies tot 3 rapporten om naast elkaar te zetten voor een klant.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {rapporten.map((r) => {
          const actief = geselecteerd.includes(r.id);
          const uitgeschakeld = !actief && geselecteerd.length >= 3;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleSelectie(r.id)}
              disabled={uitgeschakeld}
              className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-left shadow-sm transition-colors ${
                actief ? "bg-accent text-white" : uitgeschakeld ? "bg-white/60 text-ink/30" : "bg-white text-ink/70 hover:bg-mist"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                  actief ? "border-white/70 bg-white/15 text-white" : "border-ink/15 text-ink/30"
                }`}
              >
                {actief ? "✓" : ""}
              </span>
              <span>
                <span className="block text-[11.5px] font-semibold leading-tight">
                  {r.adres.straat} {r.adres.huisnummer}
                  {r.adres.huisletter ?? ""}
                </span>
                <span className={`block text-[9.5px] leading-tight ${actief ? "text-white/65" : "text-ink/40"}`}>
                  {r.adres.plaats} · {euro(r.geschatteWaarde)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {rapporten.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2.5 rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
            <TrendingUpIcon className="h-5 w-5" />
          </span>
          <p className="text-[13px] font-bold text-ink">Nog geen rapporten om te vergelijken</p>
          <p className="text-[11.5px] text-ink/50">Vraag eerst een paar rapporten aan onder &quot;Rapporten&quot;.</p>
        </div>
      )}

      {geselecteerd.length === 0 && rapporten.length > 0 && (
        <p className="mt-6 text-[12px] text-ink/45">Selecteer hierboven tot 3 adressen om ze te vergelijken.</p>
      )}

      {laden && <p className="mt-6 text-[12px] text-ink/45">Details laden…</p>}

      {!laden && details.length > 0 && (
        <div className="mt-6">
          <VergelijkTabel details={details} />
        </div>
      )}
    </div>
  );
}
