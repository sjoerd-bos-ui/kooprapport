"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegioRichting } from "@/lib/content/marktupdates";
import type { WerkgebiedRegioStatus } from "@/lib/content/regioOverbieden";
import { LockIcon } from "@/components/report/icons";

export interface WerkgebiedTabelRegio {
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
  status: WerkgebiedRegioStatus;
}

export interface ProvincieTegel {
  provincie: string;
  gemiddeldOverbod: number;
  aantalRegios: number;
}

// -----------------------------------------------------------------------------
// Herbouw (2e poging) van de Werkgebied-tabel -- dit keer wél de daadwerkelijk
// goedgekeurde variant 1-mockup: provincie-heatmap bovenaan als filter,
// daaronder een sorteerbare/doorzoekbare TABEL (geen kaartenraster) met een
// vinkje per regio, en een rustig paneel onderaan voor de warmste regio in
// het werkgebied.
//
// Het vinkje kent 3 standen (zie WerkgebiedRegioStatus in
// lib/content/regioOverbieden.ts):
//  - "geen": klikken voegt deze ÉÉN regio rechtstreeks toe (nieuw, fijnmazig
//    pad -- de officiële COROP-naam zelf in werkgebiedRegios).
//  - "direct": al zo toegevoegd, klikken verwijdert 'm weer -- veilig, raakt
//    niets anders.
//  - "editorial": onderdeel van het werkgebied via een gedeelde redactionele
//    naam (bv. "Drenthe" dekt 3 regio's tegelijk, zie
//    MARKTUPDATE_NAAM_NAAR_COROP) -- NIET los uit te zetten zonder de andere
//    twee mee te raken, dus vergrendeld getoond met een korte uitleg i.p.v.
//    een onterecht "los" ogend vinkje.
// -----------------------------------------------------------------------------

function overbiedKleurTekst(pct: number): string {
  if (pct >= 75) return "text-[#B3410C]";
  if (pct >= 55) return "text-[#8A6200]";
  return "text-[#3B6D11]";
}
function overbiedKleurBalk(pct: number): string {
  if (pct >= 75) return "bg-[#D9601F]";
  if (pct >= 55) return "bg-[#C99A1E]";
  return "bg-[#5D9130]";
}
function heatmapKleur(gemOverbod: number): { bg: string; tekst: string } {
  if (gemOverbod >= 5) return { bg: "bg-[#FBEAE0]", tekst: "text-[#B3410C]" };
  if (gemOverbod >= 3) return { bg: "bg-[#FBF2DC]", tekst: "text-[#8A6200]" };
  return { bg: "bg-[#EAF3DE]", tekst: "text-[#3B6D11]" };
}

const RICHTING_STIJL: Record<RegioRichting, { tekst: string; bg: string; pijl: string }> = {
  up: { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]", pijl: "▲" },
  down: { tekst: "text-[#B3410C]", bg: "bg-[#FBEAE0]", pijl: "▼" },
  flat: { tekst: "text-ink/45", bg: "bg-ink/5", pijl: "→" },
};

function TrendSparkline({ richting }: { richting: RegioRichting }) {
  const punten = richting === "up" ? "2,16 26,9 50,3" : richting === "down" ? "2,3 26,9 50,16" : "2,9 26,9 50,9";
  const kleur = richting === "up" ? "#3B6D11" : richting === "down" ? "#B3410C" : "rgba(31,31,46,0.3)";
  return (
    <svg width="52" height="20" viewBox="0 0 52 20">
      <polyline points={punten} fill="none" stroke={kleur} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy={richting === "up" ? 3 : richting === "down" ? 16 : 9} r="2.5" fill={kleur} />
    </svg>
  );
}

type Sortering = "overboden" | "overbod" | "naam";

export default function WerkgebiedTabel({
  alleRegios,
  provincies,
  werkgebiedRegiosRuw,
}: {
  alleRegios: WerkgebiedTabelRegio[];
  provincies: ProvincieTegel[];
  werkgebiedRegiosRuw: string[];
}) {
  const router = useRouter();
  const [provincieFilter, setProvincieFilter] = useState<string | null>(null);
  const [zoekterm, setZoekterm] = useState("");
  const [sortering, setSortering] = useState<Sortering>("overboden");
  const [bezig, setBezig] = useState<string | null>(null);

  async function toggleRegio(regio: WerkgebiedTabelRegio) {
    if (regio.status === "editorial" || bezig) return;
    setBezig(regio.regio);
    const nieuw =
      regio.status === "direct" ? werkgebiedRegiosRuw.filter((n) => n !== regio.regio) : [...werkgebiedRegiosRuw, regio.regio];
    try {
      await fetch("/api/zakelijk/instellingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ werkgebiedRegios: nieuw }),
      });
      router.refresh();
    } finally {
      setBezig(null);
    }
  }

  const gefilterd = useMemo(() => {
    const q = zoekterm.trim().toLowerCase();
    let lijst = alleRegios;
    if (provincieFilter) lijst = lijst.filter((r) => r.provincie === provincieFilter);
    if (q) lijst = lijst.filter((r) => r.regio.toLowerCase().includes(q) || r.gemeenten.some((g) => g.toLowerCase().includes(q)));
    const kopie = [...lijst];
    if (sortering === "overboden") kopie.sort((a, b) => b.percentageBovenVraagprijs - a.percentageBovenVraagprijs);
    else if (sortering === "overbod") kopie.sort((a, b) => b.gemiddeldOverbod - a.gemiddeldOverbod);
    else kopie.sort((a, b) => a.regio.localeCompare(b.regio, "nl"));
    return kopie;
  }, [alleRegios, provincieFilter, zoekterm, sortering]);

  const werkgebiedCijfers = useMemo(() => alleRegios.filter((r) => r.status !== "geen"), [alleRegios]);
  const warmste = useMemo(
    () => (werkgebiedCijfers.length > 0 ? [...werkgebiedCijfers].sort((a, b) => b.percentageBovenVraagprijs - a.percentageBovenVraagprijs)[0] : null),
    [werkgebiedCijfers]
  );

  return (
    <div>
      {/* Provincie-heatmap */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink/40">Filter op provincie</p>
          <div className="flex items-center gap-1.5">
            {provincieFilter && (
              <button type="button" onClick={() => setProvincieFilter(null)} className="text-[10.5px] font-semibold text-accent hover:underline">
                Wis filter
              </button>
            )}
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/40">
              <span>Rustig</span>
              <span className="inline-block h-1.5 w-9 rounded-full" style={{ background: "linear-gradient(90deg, #EAF3DE, #FBF2DC, #FBEAE0)" }} />
              <span>Verhit</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {provincies.map((p) => {
            const kleur = heatmapKleur(p.gemiddeldOverbod);
            const actief = provincieFilter === p.provincie;
            return (
              <button
                key={p.provincie}
                type="button"
                onClick={() => setProvincieFilter(actief ? null : p.provincie)}
                className={`rounded-xl px-2 py-2.5 text-center transition-transform hover:-translate-y-0.5 ${kleur.bg} ${
                  actief ? "ring-2 ring-accent" : ""
                }`}
              >
                <p className={`text-[10.5px] font-bold leading-tight ${kleur.tekst}`}>{p.provincie}</p>
                <p className={`mt-0.5 text-[13px] font-extrabold ${kleur.tekst}`}>
                  {p.gemiddeldOverbod > 0 ? "+" : ""}
                  {p.gemiddeldOverbod.toFixed(1).replace(".", ",")}%
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabel */}
      <div className="mt-3 rounded-2xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.06] p-4">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-ink/35">⌕</span>
            <input
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              placeholder="Zoek regio of gemeente..."
              className="w-56 rounded-lg border border-ink/15 py-2 pl-8 pr-2.5 text-[12px] text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className="w-9 py-3 pl-4"></th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/40">Regio</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/40">% Boven vraagprijs</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/40">Overbod</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/40">Trend</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/40">Gemeenten</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/40">Bron</th>
              </tr>
            </thead>
            <tbody>
              {gefilterd.map((regio) => (
                <tr key={regio.regio} className={`border-t border-ink/[0.06] transition-colors ${regio.status !== "geen" ? "bg-[#FAFAFF]" : "hover:bg-mist/40"}`}>
                  <td className="py-3 pl-4">
                    {regio.status === "editorial" ? (
                      <span title="Onderdeel van uw werkgebied via een gedeelde regionaam -- beheer dit bij 'Regio's beheren'." className="flex h-4 w-4 items-center justify-center text-ink/30">
                        <LockIcon className="h-3 w-3" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleRegio(regio)}
                        disabled={bezig === regio.regio}
                        aria-label={regio.status === "direct" ? `${regio.regio} uit werkgebied halen` : `${regio.regio} toevoegen aan werkgebied`}
                        className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors disabled:opacity-40 ${
                          regio.status === "direct" ? "border-accent bg-accent" : "border-ink/20 bg-white hover:border-accent"
                        }`}
                      >
                        {regio.status === "direct" && <span className="text-[9px] leading-none text-white">✓</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[12.5px] font-bold text-ink">{regio.regio}</p>
                    <p className="text-[10px] text-ink/40">{regio.provincie}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-display w-9 text-[13px] font-extrabold ${overbiedKleurTekst(regio.percentageBovenVraagprijs)}`}>
                        {regio.percentageBovenVraagprijs}%
                      </span>
                      <div className="h-[5px] w-24 overflow-hidden rounded-full bg-ink/[0.06]">
                        <div
                          className={`h-full rounded-full ${overbiedKleurBalk(regio.percentageBovenVraagprijs)}`}
                          style={{ width: `${Math.min(100, Math.max(4, regio.percentageBovenVraagprijs))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11.5px] font-bold text-ink/70">
                    {regio.gemiddeldOverbod > 0 ? "+" : ""}
                    {regio.gemiddeldOverbod.toLocaleString("nl-NL")}%
                  </td>
                  <td className="px-3 py-3">
                    {regio.trend ? (
                      <div className="flex items-center gap-2">
                        <TrendSparkline richting={regio.trend.richting} />
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${RICHTING_STIJL[regio.trend.richting].bg} ${RICHTING_STIJL[regio.trend.richting].tekst}`}>
                          {regio.trend.jaarVergelijking}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10.5px] text-ink/25">—</span>
                    )}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-3 text-[10.5px] text-ink/45">{regio.gemeenten.slice(0, 2).join(", ")}{regio.gemeenten.length > 2 ? ` +${regio.gemeenten.length - 2}` : ""}</td>
                  <td className="px-3 py-3">
                    <a href={regio.bronUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-accent hover:underline">
                      NVM ↗
                    </a>
                  </td>
                </tr>
              ))}
              {gefilterd.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[11.5px] text-ink/40">
                    Geen regio&apos;s gevonden voor deze zoekterm/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rustig paneel: warmste regio in het werkgebied */}
      {warmste && (
        <div className="mt-3 flex overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="w-1 shrink-0 bg-accent" />
          <div className="flex flex-1 flex-wrap items-center gap-8 p-5">
            <div className="min-w-[180px]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Warmste regio in uw werkgebied</p>
              <p className="font-display mt-1.5 text-[20px] font-extrabold text-ink">{warmste.regio}</p>
              <p className="mt-1 text-[11px] text-ink/45">{warmste.contextZin}</p>
            </div>
            <div className="h-9 w-px shrink-0 bg-ink/[0.06]" />
            <div className="text-center">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink/40">Boven vraagprijs</p>
              <p className="font-display mt-1.5 text-[22px] font-extrabold text-ink">{warmste.percentageBovenVraagprijs}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink/40">Gem. overbod</p>
              <p className="font-display mt-1.5 text-[22px] font-extrabold text-ink">
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
            <a href={warmste.bronUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-[11px] font-semibold text-accent hover:underline">
              Bron: {warmste.bron} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
