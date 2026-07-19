"use client";

import { useState } from "react";
import { InfoIcon } from "./icons";
import { berekenVeiligheidsscore, bepaalVeiligheidsBand, VEILIGHEID_BAND as BAND } from "@/lib/utils/veiligheidsscore";

export default function VeiligheidsScore({
  misdrijvenPer1000,
  aantalMisdrijven,
  peiljaar,
}: {
  misdrijvenPer1000: number;
  aantalMisdrijven: number | null;
  peiljaar: string | null;
}) {
  const [toonUitleg, setToonUitleg] = useState(false);
  const score = berekenVeiligheidsscore(misdrijvenPer1000);
  const band = bepaalVeiligheidsBand(score);
  const { kleur, tekst } = BAND[band];

  const straal = 40;
  const omtrek = 2 * Math.PI * straal;
  const offset = omtrek * (1 - score / 10);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Veiligheidsscore</p>
          <p className="mt-0.5 text-[11px] text-ink/40">Onze indicatie, geen officieel CBS-cijfer</p>
        </div>
        <button
          type="button"
          aria-label="Hoe deze score werkt"
          onClick={() => setToonUitleg((v) => !v)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/45 transition-colors hover:border-accent hover:text-accent"
        >
          <InfoIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={straal} fill="none" stroke="#E4E4EC" strokeWidth={9} />
            <circle
              cx="48"
              cy="48"
              r={straal}
              fill="none"
              stroke={kleur}
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={omtrek}
              strokeDashoffset={offset}
              transform="rotate(-90 48 48)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold leading-none text-ink">{score}</span>
            <span className="mt-0.5 text-[10px] text-ink/40">van de 10</span>
          </div>
        </div>
        <div className="flex-1">
          <span
            className="mb-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: `${kleur}1A`, color: kleur }}
          >
            {tekst}
          </span>
          <p className="text-[12.5px] leading-relaxed text-ink/60">
            {misdrijvenPer1000} misdrijven per 1.000 inwoners{peiljaar ? ` (${peiljaar})` : ""}
            {aantalMisdrijven != null ? `, ${aantalMisdrijven.toLocaleString("nl-NL")} in totaal` : ""}.
          </p>
        </div>
      </div>

      {toonUitleg && (
        <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="mb-2.5 text-[11.5px] text-ink/55">
            Score = 10 − (misdrijven per 1.000 inwoners ÷ 10), afgerond en begrensd tussen 1 en 10.
          </p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: BAND.gunstig.kleur }} />
              <span className="text-[11.5px] text-ink/55">7 – 10 · minder dan 30 per 1.000 inwoners</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: BAND.aandacht.kleur }} />
              <span className="text-[11.5px] text-ink/55">4 – 6 · 30 tot 60 per 1.000 inwoners</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: BAND.risico.kleur }} />
              <span className="text-[11.5px] text-ink/55">1 – 3 · meer dan 60 per 1.000 inwoners</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
