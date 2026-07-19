"use client";

import type { ReactElement } from "react";
import type { AddressMeta, ReportProgressStep } from "@/types/report";
import { BuildingIcon, BoltIcon, TrendingUpIcon, MapPinIcon, UsersIcon, AlertTriangleIcon, KavelIcon, BestemmingIcon, CheckIcon } from "./icons";

// React 19: het globale "JSX"-namespace bestaat niet meer automatisch (zie
// de Next.js 16-migratie) — ReactElement uit "react" zelf i.p.v. JSX.Element.
type IconComp = (props: { className?: string }) => ReactElement;

// Labels gebruiken bewust dezelfde termen als de tabbladen/tabel elders in
// de app (ReportView.tsx, PreviewSummary.tsx) — "Objectgegevens",
// "Energieprestatie en label", "Waarde-indicatie", "Verkopen in de buurt",
// "Buurtprofiel", "Funderingsrisico", "Kavelgrootte" — i.p.v. een eigen,
// losse woordkeuze per stap die de gebruiker verderop in het rapport niet
// meer terugziet. Geen eigen stap voor "Samenvatting"/"Rapportoverzicht":
// dat zijn geen losse databronnen, maar een weergave van de stappen hieronder.
const STEPS: { key: ReportProgressStep; label: string; icon: IconComp }[] = [
  { key: "building", label: "Objectgegevens ophalen", icon: BuildingIcon },
  { key: "energy", label: "Energieprestatie en label controleren", icon: BoltIcon },
  { key: "market", label: "Waarde-indicatie berekenen", icon: TrendingUpIcon },
  { key: "nearbySales", label: "Verkopen in de buurt vergelijken", icon: MapPinIcon },
  { key: "buurtprofiel", label: "Buurtprofiel samenstellen", icon: UsersIcon },
  { key: "fundering", label: "Funderingsrisico inschatten", icon: AlertTriangleIcon },
  { key: "kavel", label: "Kavelgrootte opzoeken", icon: KavelIcon },
  { key: "bestemming", label: "Bestemming opzoeken", icon: BestemmingIcon },
];

// Bronnen worden parallel bevraagd (zie reportService), dus deze stappen
// ronden niet per se in volgorde af — elke stap wordt losstaand "klaar"
// zodra de bijbehorende bron daadwerkelijk antwoord heeft gegeven. Voor de
// weergave kiezen we simpelweg de eerstvolgende, nog niet voltooide stap in
// STEPS als "actief" (geaccentueerd) — een redelijke benadering, ook al kan
// de werkelijke volgorde van afronden hiervan afwijken.
export default function LoadingAnalysis({
  completedSteps,
  address,
}: {
  completedSteps: ReportProgressStep[];
  address: AddressMeta;
}) {
  const activeIndex = STEPS.findIndex((s) => !completedSteps.includes(s.key));
  const voortgangPct = Math.round((completedSteps.length / STEPS.length) * 100);

  return (
    <div
      className="flex min-h-[80vh] items-center justify-center bg-parchment px-4"
      style={{ backgroundImage: "radial-gradient(#4F46E51A 1px, transparent 1px)", backgroundSize: "18px 18px" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider3 text-accent">Rapport wordt samengesteld</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink">
          {address.straat} {address.huisnummer}
          {address.huisletter ?? ""}
          {address.toevoeging ? `-${address.toevoeging}` : ""}
        </h1>
        <p className="mt-1 text-sm text-ink/45">{address.plaats}</p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${Math.max(8, voortgangPct)}%` }}
          />
        </div>

        <ul className="mt-6 w-full space-y-1 rounded-2xl border border-ink/10 bg-paper p-2 text-left">
          {STEPS.map((s, i) => {
            const done = completedSteps.includes(s.key);
            const isActive = !done && i === activeIndex;
            const Icon = s.icon;
            return (
              <li
                key={s.key}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${isActive ? "bg-[#EEF0FF]" : ""}`}
              >
                <span
                  className={
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors " +
                    (done
                      ? "bg-accent text-white"
                      : isActive
                        ? "border-2 border-accent text-accent"
                        : "border border-ink/15 text-ink/35")
                  }
                >
                  {done ? <CheckIcon className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className={`text-sm ${done ? "text-ink" : isActive ? "font-semibold text-accent" : "text-ink/40"}`}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[11px] text-ink/40">
          Stap {Math.min(completedSteps.length + 1, STEPS.length)} van {STEPS.length} · via Kadaster, RVO, CBS en
          Altum AI
        </p>
      </div>
    </div>
  );
}
