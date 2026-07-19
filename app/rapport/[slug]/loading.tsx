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
// BUGFIX: de eerste versie gebruikte alleen `animate-pulse` op elke stap
// tegelijk — dat blijft voor de HELE wachttijd doorlopen (soms 5-10+
// seconden bij live bronnen), zonder ooit "klaar" te ogen. Dat voelde aan
// als vastlopen, zeker vergeleken met de oudere, client-side LoadingAnalysis
// (die wél per stap echt groen werd zodra een bron binnenkwam). Er is hier
// geen echte per-stap voortgang beschikbaar (dat komt pas ná server-side
// afronding van getReport() in zijn geheel), dus dit simuleert een
// aflopende reeks met pure CSS-animaties (@keyframes onderaan, met
// oplopende animation-delay per stap) — geen React state nodig, werkt dus
// ook zonder JavaScript. Duurt het in werkelijkheid langer dan de ~6s
// animatietijd, dan blijven alle stappen gewoon op "klaar" staan
// (animation-fill-mode: forwards) i.p.v. terug te springen.
const STAPPEN = [
  { label: "Objectgegevens ophalen", icon: BuildingIcon },
  { label: "Energieprestatie en label controleren", icon: BoltIcon },
  { label: "Waarde-indicatie berekenen", icon: TrendingUpIcon },
  { label: "Verkopen in de buurt vergelijken", icon: MapPinIcon },
  { label: "Buurtprofiel samenstellen", icon: UsersIcon },
  { label: "Funderingsrisico inschatten", icon: AlertTriangleIcon },
];

const STAP_INTERVAL_S = 1.1;

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
          <div
            className="h-full rounded-full bg-accent"
            style={{ animation: "rapport-progress 8s ease-out forwards" }}
          />
        </div>

        <ul className="mt-6 w-full space-y-1 rounded-2xl border border-ink/10 bg-paper p-2 text-left">
          {STAPPEN.map((s, i) => {
            const Icon = s.icon;
            const delay = `${(i * STAP_INTERVAL_S).toFixed(1)}s`;
            return (
              <li key={s.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <span
                  className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/15"
                  style={{ animation: "rapport-step-badge 0.6s ease-out forwards", animationDelay: delay }}
                >
                  <span
                    className="absolute flex items-center justify-center text-ink/35"
                    style={{ animation: "rapport-step-fade-out 0.6s ease-out forwards", animationDelay: delay }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="absolute h-3.5 w-3.5 text-[#0F766E]"
                    style={{ opacity: 0, animation: "rapport-step-fade-in 0.6s ease-out forwards", animationDelay: delay }}
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span
                  className="text-sm text-ink/40"
                  style={{ animation: "rapport-step-text 0.6s ease-out forwards", animationDelay: delay }}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-[11px] text-ink/40">Via Kadaster, RVO, CBS en Altum AI</p>
      </div>

      <style>{`
        @keyframes rapport-progress {
          0% { width: 6%; }
          60% { width: 82%; }
          100% { width: 92%; }
        }
        @keyframes rapport-step-badge {
          from { background-color: transparent; border-color: rgba(31, 31, 46, 0.15); }
          to { background-color: #E6FBF7; border-color: transparent; }
        }
        @keyframes rapport-step-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes rapport-step-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rapport-step-text {
          from { color: rgba(31, 31, 46, 0.4); }
          to { color: rgba(31, 31, 46, 0.75); }
        }
      `}</style>
    </div>
  );
}
