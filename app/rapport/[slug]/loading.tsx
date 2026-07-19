import {
  BuildingIcon,
  BoltIcon,
  TrendingUpIcon,
  MapPinIcon,
  UsersIcon,
  AlertTriangleIcon,
} from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Route-level laadscherm (Next.js App Router-conventie: automatisch getoond
// zolang de async Server Component in page.tsx bezig is met getReport()).
// Dit raakt de eerdere SEO-fix niet aan: crawlers/Google krijgen nog steeds
// de volledige, server-gerenderde HTML zodra die klaar is — dit bestand is
// puur een tijdelijke, client-zijdige overgang tijdens het wachten daarop.
//
// Geen echte per-stap voortgang (die info is hier niet beschikbaar, dat komt
// pas ná server-side afronding): dit toont daarom een vaste lijst met een
// algemene "bezig"-animatie, ter onderscheid van de eerdere, wél
// stap-voor-stap bijgewerkte LoadingAnalysis (die nog los blijft bestaan
// als client-side fallback in ReportPageClient.tsx voor het randgeval zonder
// initialReport).
const STAPPEN = [
  { label: "Objectgegevens ophalen", icon: BuildingIcon },
  { label: "Energieprestatie en label controleren", icon: BoltIcon },
  { label: "Waarde-indicatie berekenen", icon: TrendingUpIcon },
  { label: "Verkopen in de buurt vergelijken", icon: MapPinIcon },
  { label: "Buurtprofiel samenstellen", icon: UsersIcon },
  { label: "Funderingsrisico inschatten", icon: AlertTriangleIcon },
];

export default function RapportLoading() {
  return (
    <div
      className="flex min-h-[80vh] items-center justify-center bg-parchment px-4"
      style={{ backgroundImage: "radial-gradient(#4F46E51A 1px, transparent 1px)", backgroundSize: "18px 18px" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider3 text-accent">Rapport wordt samengesteld</p>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink">Een moment geduld</h1>
        <p className="mt-1 text-sm text-ink/45">We halen de officiële bronnen op voor dit adres.</p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>

        <ul className="mt-6 w-full space-y-1 rounded-2xl border border-ink/10 bg-paper p-2 text-left">
          {STAPPEN.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 animate-pulse items-center justify-center rounded-full border border-ink/15 text-ink/35">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-ink/40">{s.label}</span>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[11px] text-ink/40">Via Kadaster, RVO, CBS en Altum AI</p>
      </div>
    </div>
  );
}
