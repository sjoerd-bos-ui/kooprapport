"use client";

import { useMemo, useState } from "react";
import type { RegioRichting } from "@/lib/content/marktupdates";

export interface WerkgebiedRegioWeergave {
  regio: string;
  provincie: string;
  gemeenten: string[];
  percentageBovenVraagprijs: number;
  gemiddeldOverbod: number;
  periodeLabel: string;
  bron: string;
  bronUrl: string;
  contextZin: string;
  trend: { jaarVergelijking: string; richting: RegioRichting } | null;
}

// -----------------------------------------------------------------------------
// Client-component (sorteren is de enige interactiviteit) voor het
// kaartenraster + het "spotlight"-paneel op de Werkgebied-pagina. Alle data
// komt al kant-en-klaar/verrijkt binnen vanuit page.tsx (server component) --
// dit component verzint zelf niets, herschikt alleen.
// -----------------------------------------------------------------------------

function overbiedKleur(pct: number): { tekst: string; bg: string; balk: string } {
  if (pct >= 75) return { tekst: "text-[#B3410C]", bg: "bg-[#FBEAE0]", balk: "bg-[#D9601F]" };
  if (pct >= 55) return { tekst: "text-[#8A6200]", bg: "bg-[#FBF2DC]", balk: "bg-[#C99A1E]" };
  return { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]", balk: "bg-[#5D9130]" };
}

const RICHTING_STIJL: Record<RegioRichting, { tekst: string; bg: string; pijl: string }> = {
  up: { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]", pijl: "▲" },
  down: { tekst: "text-[#B3410C]", bg: "bg-[#FBEAE0]", pijl: "▼" },
  flat: { tekst: "text-ink/45", bg: "bg-ink/5", pijl: "→" },
};

function TrendSparkline({ richting }: { richting: RegioRichting }) {
  const punten = richting === "up" ? "3,18 28,11 53,4" : richting === "down" ? "3,4 28,11 53,18" : "3,10 28,10 53,10";
  const kleur = richting === "up" ? "#3B6D11" : richting === "down" ? "#B3410C" : "rgba(31,31,46,0.3)";
  return (
    <svg width="56" height="22" viewBox="0 0 56 22">
      <polyline points={punten} fill="none" stroke={kleur} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="53" cy={richting === "up" ? 4 : richting === "down" ? 18 : 10} r="3" fill={kleur} />
    </svg>
  );
}

type Sortering = "overboden" | "overbod" | "naam";

export default function WerkgebiedRegioGrid({ cijfers }: { cijfers: WerkgebiedRegioWeergave[] }) {
  const [sortering, setSortering] = useState<Sortering>("overboden");

  const gesorteerd = useMemo(() => {
    const kopie = [...cijfers];
    if (sortering === "overboden") kopie.sort((a, b) => b.percentageBovenVraagprijs - a.percentageBovenVraagprijs);
    else if (sortering === "overbod") kopie.sort((a, b) => b.gemiddeldOverbod - a.gemiddeldOverbod);
    else kopie.sort((a, b) => a.regio.localeCompare(b.regio, "nl"));
    return kopie;
  }, [cijfers, sortering]);

  const warmste = useMemo(
    () => [...cijfers].sort((a, b) => b.percentageBovenVraagprijs - a.percentageBovenVraagprijs)[0],
    [cijfers]
  );

  return (
    <div>
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[10.5px] font-semibold text-ink/40">Sorteer:</span>
        {(
          [
            { key: "overboden", label: "% boven vraagprijs" },
            { key: "overbod", label: "gem. overbod" },
            { key: "naam", label: "A → Z" },
          ] as const
        ).map((optie) => (
          <button
            key={optie.key}
            type="button"
            onClick={() => setSortering(optie.key)}
            className={`rounded-lg border px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
              sortering === optie.key ? "border-accent bg-[#EEF0FF] text-accent" : "border-ink/10 bg-white text-ink/50 hover:bg-mist"
            }`}
          >
            {optie.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {gesorteerd.map((regio) => {
          const kleur = overbiedKleur(regio.percentageBovenVraagprijs);
          const zichtbareGemeenten = regio.gemeenten.slice(0, 3);
          const restGemeenten = regio.gemeenten.length - zichtbareGemeenten.length;
          return (
            <div key={regio.regio} className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full"
                style={{ background: "radial-gradient(circle, #4F46E512 0%, rgba(79,70,229,0) 70%)" }}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-extrabold text-ink">{regio.regio}</p>
                  <p className="text-[10.5px] text-ink/45">{regio.provincie}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${kleur.bg} ${kleur.tekst}`}>{regio.periodeLabel}</span>
                  {regio.trend && (
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${RICHTING_STIJL[regio.trend.richting].bg} ${RICHTING_STIJL[regio.trend.richting].tekst}`}>
                      {RICHTING_STIJL[regio.trend.richting].pijl} {regio.trend.jaarVergelijking}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-display text-[28px] font-extrabold leading-none ${kleur.tekst}`}>
                    {regio.percentageBovenVraagprijs}%
                  </span>
                  <span className="text-[10.5px] text-ink/45">boven vraagprijs verkocht</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                  <div
                    className={`h-full rounded-full ${kleur.balk}`}
                    style={{ width: `${Math.min(100, Math.max(4, regio.percentageBovenVraagprijs))}%` }}
                  />
                </div>
              </div>

              <p className="relative mt-3.5 text-[11.5px] leading-relaxed text-ink/60">{regio.contextZin}</p>

              <p className="relative mt-2 text-[10.5px] text-ink/40">
                {zichtbareGemeenten.join(", ")}
                {restGemeenten > 0 ? ` en ${restGemeenten} andere gemeenten` : ""}
              </p>

              <a
                href={regio.bronUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-3.5 block truncate text-[10px] font-semibold text-accent hover:underline"
              >
                Bron: {regio.bron} ↗
              </a>
            </div>
          );
        })}
      </div>

      {warmste && (
        <div className="mt-4 flex overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="w-1 shrink-0 bg-accent" />
          <div className="flex flex-1 flex-wrap items-center gap-8 p-5">
            <div className="min-w-[180px]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Warmste regio in uw werkgebied</p>
              <p className="mt-1.5 font-display text-[20px] font-extrabold text-ink">{warmste.regio}</p>
              <p className="mt-1 text-[11px] text-ink/45">{warmste.contextZin}</p>
            </div>
            <div className="h-9 w-px shrink-0 bg-ink/[0.06]" />
            <div className="text-center">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink/40">Boven vraagprijs</p>
              <p className="mt-1.5 font-display text-[22px] font-extrabold text-ink">{warmste.percentageBovenVraagprijs}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink/40">Gem. overbod</p>
              <p className="mt-1.5 font-display text-[22px] font-extrabold text-ink">
                {warmste.gemiddeldOverbod > 0 ? "+" : ""}
                {warmste.gemiddeldOverbod.toLocaleString("nl-NL")}%
              </p>
            </div>
            {warmste.trend && (
              <div className="text-center">
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink/40">Jaarvergelijking</p>
                <div className="mt-1">
                  <TrendSparkline richting={warmste.trend.richting} />
                </div>
              </div>
            )}
            <a
              href={warmste.bronUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto shrink-0 text-[11px] font-semibold text-accent hover:underline"
            >
              Bron: {warmste.bron} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
