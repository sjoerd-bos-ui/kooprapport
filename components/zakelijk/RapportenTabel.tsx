"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AddressMeta } from "@/types/report";
import { duidEnergielabel } from "@/lib/utils/energielabel";
import { FileCheckIcon, UsersIcon } from "@/components/report/icons";

export interface RapportRij {
  id: string;
  adres: AddressMeta;
  aangemaaktOp: string;
  geschatteWaarde: number | null;
  energielabel: string | null;
  funderingsniveau: string | null;
  klantId: string | null;
  klantnaam: string | null;
}

const FUNDERING_KLEUR: Record<string, { tekst: string; bg: string }> = {
  laag: { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]" },
  midden: { tekst: "text-[#8A6200]", bg: "bg-[#FBF2DC]" },
  hoog: { tekst: "text-rust", bg: "bg-[#FBEAE0]" },
};

function euro(bedrag: number | null): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

// -----------------------------------------------------------------------------
// Rapporten-tabel: zoeken/filteren op klantnaam en adres (#4) + visuele
// polish (#6) -- BEWUST geen wijziging aan wat er onder de motorkap gebeurt
// (zelfde data, zelfde link naar het rapport, geen paginering/sortering
// toegevoegd): alleen een zoekveld eroverheen en een iets rijkere, meer
// afgewerkte weergave per rij (klantnaam-kolom, gekleurde labels i.p.v. platte
// tekst) zoals ook elders in het dashboard (zie VergelijkTabel.tsx).
// -----------------------------------------------------------------------------
export default function RapportenTabel({ rapporten }: { rapporten: RapportRij[] }) {
  const [zoekterm, setZoekterm] = useState("");

  const gefilterd = useMemo(() => {
    const q = zoekterm.trim().toLowerCase();
    if (!q) return rapporten;
    return rapporten.filter((r) => r.adres.label.toLowerCase().includes(q) || (r.klantnaam ?? "").toLowerCase().includes(q));
  }, [rapporten, zoekterm]);

  return (
    <div>
      <div className="relative">
        <input
          value={zoekterm}
          onChange={(e) => setZoekterm(e.target.value)}
          placeholder="Zoek op klantnaam of adres…"
          className="w-full max-w-sm rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-[12px] text-ink shadow-sm focus:border-accent focus:outline-none sm:max-w-xs"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        {gefilterd.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
              <FileCheckIcon className="h-5 w-5" />
            </span>
            {rapporten.length === 0 ? (
              <>
                <p className="text-[13px] font-bold text-ink">Nog geen rapporten aangevraagd</p>
                <Link href="/zakelijk/rapporten/nieuw" className="rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark">
                  + Eerste rapport aanvragen
                </Link>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-ink">Geen rapporten gevonden voor &quot;{zoekterm}&quot;</p>
                <button
                  type="button"
                  onClick={() => setZoekterm("")}
                  className="text-[11.5px] font-semibold text-accent hover:underline"
                >
                  Zoekterm wissen
                </button>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-ink/[0.06] text-[9.5px] font-bold uppercase tracking-wide text-ink/40">
                <th className="px-5 py-2.5 font-bold">Adres</th>
                <th className="px-5 py-2.5 font-bold">Klant</th>
                <th className="px-5 py-2.5 font-bold">Waarde-indicatie</th>
                <th className="px-5 py-2.5 font-bold">Energielabel</th>
                <th className="px-5 py-2.5 font-bold">Fundering</th>
                <th className="px-5 py-2.5 font-bold">Aangevraagd</th>
              </tr>
            </thead>
            <tbody>
              {gefilterd.map((r) => {
                const duiding = r.energielabel ? duidEnergielabel(r.energielabel) : null;
                const funderingKleur = r.funderingsniveau ? FUNDERING_KLEUR[r.funderingsniveau] : null;
                return (
                  <tr key={r.id} className="border-b border-ink/[0.06] transition-colors last:border-0 hover:bg-mist/50">
                    <td className="px-5 py-3.5">
                      <Link href={`/zakelijk/rapporten/${r.id}`} className="font-semibold text-ink hover:text-accent">
                        {r.adres.label}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.klantId && r.klantnaam ? (
                        <Link
                          href={`/zakelijk/klanten/${r.klantId}`}
                          className="flex items-center gap-1.5 text-ink/70 hover:text-accent"
                        >
                          <UsersIcon className="h-3 w-3 shrink-0 text-ink/30" />
                          {r.klantnaam}
                        </Link>
                      ) : (
                        <span className="text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink/60">{euro(r.geschatteWaarde)}</td>
                    <td className="px-5 py-3.5">
                      {r.energielabel ? (
                        <span
                          className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-md px-1.5 text-[11px] font-extrabold text-white"
                          style={{ backgroundColor: duiding?.kleur ?? "#9CA3AF" }}
                        >
                          {r.energielabel}
                        </span>
                      ) : (
                        <span className="text-ink/30">onbekend</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.funderingsniveau && funderingKleur ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize ${funderingKleur.bg} ${funderingKleur.tekst}`}>
                          {r.funderingsniveau}
                        </span>
                      ) : (
                        <span className="text-ink/30">onbekend</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink/50">{new Date(r.aangemaaktOp).toLocaleDateString("nl-NL")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
