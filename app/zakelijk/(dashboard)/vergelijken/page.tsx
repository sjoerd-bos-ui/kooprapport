"use client";

import { useEffect, useState } from "react";
import type { AddressMeta } from "@/types/report";
import type { B2bRapportAanvraag } from "@/types/b2b";
import { berekenBiedadvies } from "@/lib/services/biedadvies";
import { TrendingUpIcon, BoltIcon, AlertTriangleIcon, MapPinIcon, ScaleIcon } from "@/components/report/icons";

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

const FUNDERING_KLEUR: Record<string, string> = {
  laag: "text-[#3B6D11]",
  midden: "text-[#B4562E]",
  hoog: "text-rust",
};

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
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleSelectie(r.id)}
              className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold shadow-sm transition-colors ${
                actief ? "bg-accent text-white" : "bg-white text-ink/70 hover:bg-mist"
              }`}
            >
              {r.adres.straat} {r.adres.huisnummer}
              {r.adres.huisletter ?? ""}
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
        <div className={`mt-6 grid grid-cols-1 gap-4 ${details.length === 2 ? "sm:grid-cols-2" : details.length >= 3 ? "sm:grid-cols-3" : ""}`}>
          {details.map((d) => (
            <div key={d.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="font-display text-[14px] font-extrabold text-ink">
                {d.adres.straat} {d.adres.huisnummer}
                {d.adres.huisletter ?? ""}
              </p>
              <p className="text-[10.5px] text-ink/45">{d.adres.plaats}</p>

              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                    <TrendingUpIcon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[9.5px] font-bold text-ink/40">Waarde-indicatie</p>
                    <p className="text-[12px] font-semibold text-ink">
                      {euro(d.report.market.data?.bandbreedteMin ?? d.report.market.data?.geschatteWaarde)}
                      {d.report.market.data?.bandbreedteMax ? ` – ${euro(d.report.market.data.bandbreedteMax)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                    <BoltIcon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[9.5px] font-bold text-ink/40">Energielabel</p>
                    <p className="text-[12px] font-semibold text-ink">{d.report.energy.data?.klasse ?? "onbekend"}</p>
                  </div>
                </div>
                {(() => {
                  const biedadvies = berekenBiedadvies(d.report.market.data?.geschatteWaarde, d.adres.plaats);
                  return (
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                        <ScaleIcon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-[9.5px] font-bold text-ink/40">Biedadvies</p>
                        <p className="text-[12px] font-semibold text-ink">
                          {biedadvies ? `${euro(biedadvies.ondergrens)} – ${euro(biedadvies.bovengrens)}` : "niet beschikbaar"}
                        </p>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[9.5px] font-bold text-ink/40">Funderingsrisico</p>
                    <p className={`text-[12px] font-semibold capitalize ${d.report.fundering.data?.niveau ? FUNDERING_KLEUR[d.report.fundering.data.niveau] : "text-ink/40"}`}>
                      {d.report.fundering.data?.niveau ?? "onbekend"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                    <MapPinIcon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[9.5px] font-bold text-ink/40">Buurtprofiel</p>
                    <p className="text-[11.5px] leading-relaxed text-ink/70">{d.report.buurtprofiel.data?.samenvatting ?? "niet beschikbaar"}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
