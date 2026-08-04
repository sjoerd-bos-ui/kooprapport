"use client";

import { useEffect, useState } from "react";
import type { AddressMeta } from "@/types/report";
import type { B2bRapportAanvraag } from "@/types/b2b";

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
      <p className="mt-1 text-[12px] text-ink/50">Kies tot 3 rapporten om naast elkaar te zetten.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {rapporten.map((r) => {
          const actief = geselecteerd.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleSelectie(r.id)}
              className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                actief ? "bg-accent text-white" : "bg-white text-ink/70 shadow-sm hover:bg-mist"
              }`}
            >
              {r.adres.straat} {r.adres.huisnummer}
              {r.adres.huisletter ?? ""}
            </button>
          );
        })}
        {rapporten.length === 0 && <p className="text-[12px] text-ink/45">Nog geen rapporten om te vergelijken.</p>}
      </div>

      {laden && <p className="mt-6 text-[12px] text-ink/45">Details laden…</p>}

      {!laden && details.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                <th className="px-5 py-3"></th>
                {details.map((d) => (
                  <th key={d.id} className="px-5 py-3">
                    <p className="text-[12px] font-extrabold text-ink">{d.adres.straat} {d.adres.huisnummer}</p>
                    <p className="text-[10px] font-normal text-ink/45">{d.adres.plaats}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink/[0.06]">
                <td className="px-5 py-3 text-[10.5px] font-bold text-ink/45">Waarde-indicatie</td>
                {details.map((d) => (
                  <td key={d.id} className="px-5 py-3 font-semibold text-ink">
                    {euro(d.report.market.data?.bandbreedteMin ?? d.report.market.data?.geschatteWaarde)}
                    {d.report.market.data?.bandbreedteMax ? ` – ${euro(d.report.market.data.bandbreedteMax)}` : ""}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-ink/[0.06]">
                <td className="px-5 py-3 text-[10.5px] font-bold text-ink/45">Energielabel</td>
                {details.map((d) => (
                  <td key={d.id} className="px-5 py-3 font-semibold text-ink">
                    {d.report.energy.data?.klasse ?? "onbekend"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-ink/[0.06]">
                <td className="px-5 py-3 text-[10.5px] font-bold text-ink/45">Funderingsrisico</td>
                {details.map((d) => (
                  <td key={d.id} className="px-5 py-3 font-semibold capitalize text-ink">
                    {d.report.fundering.data?.niveau ?? "onbekend"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-[10.5px] font-bold text-ink/45">Buurtprofiel</td>
                {details.map((d) => (
                  <td key={d.id} className="px-5 py-3 text-[11px] text-ink/70">
                    {d.report.buurtprofiel.data?.samenvatting ?? "niet beschikbaar"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
