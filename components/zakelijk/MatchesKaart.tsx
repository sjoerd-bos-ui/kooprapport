"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { B2bWoningMatch, B2bRapportAanvraag } from "@/types/b2b";
import { vindGekoppeldRapport } from "@/lib/services/matchRapportKoppeling";
import { BoltIcon, ArrowRightIcon, FileCheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Matches (#2), herbouwd van een smal lijstje onderaan de sidebar naar een
// volwaardig, breed resultatenraster -- "voor ons eigen zoekmachine" was de
// expliciete wens. Elke kaart klikbaar, maar i.p.v. direct doorlinken naar
// Funda (het eerdere gedrag) opent een klik nu een keuzemenu: de advertentie
// zelf bekijken, OF het eigen Kooprapport voor dat adres (indien al
// aangevraagd in dit dossier, anders een link om er een aan te vragen).
//
// GEEN m²/kamers/energielabel-metadata in de kaarten: de Funda-detailpagina's
// JSON-LD (zie lib/data-sources/fundaFeed.ts) geeft betrouwbaar alleen titel,
// prijs en foto -- die extra kenmerken zouden geraden/verzonnen moeten
// worden, en dat doen we hier bewust niet.
// -----------------------------------------------------------------------------

const HUIS_KLEUREN = [
  { lucht: "#D7E6F2", dak: "#8B5E3C", muur: "#EFE3CE" },
  { lucht: "#E3D9EC", dak: "#6B5544", muur: "#F2EAD8" },
  { lucht: "#DDE7EF", dak: "#7A4A34", muur: "#E9DFC9" },
];

function HuisIllustratie({ index, groot }: { index: number; groot?: boolean }) {
  const k = HUIS_KLEUREN[index % HUIS_KLEUREN.length];
  return (
    <svg
      width={groot ? 104 : 88}
      height={groot ? 88 : 72}
      viewBox="0 0 104 88"
      style={{ borderRadius: 10, flexShrink: 0, width: "100%", height: "100%" }}
    >
      <rect width="104" height="88" fill={k.lucht} />
      <rect y="58" width="104" height="30" fill="#D9E4C9" />
      <polygon points="14,58 52,30 90,58" fill={k.dak} />
      <rect x="20" y="58" width="64" height="30" fill={k.muur} />
      <rect x="46" y="70" width="12" height="18" fill="#6B4A32" />
      <rect x="26" y="64" width="10" height="10" fill="#4A5A6B" />
      <rect x="68" y="64" width="10" height="10" fill="#4A5A6B" />
    </svg>
  );
}

function relatieveTijd(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minuten = Math.floor(ms / 60000);
  if (minuten < 60) return `${Math.max(1, minuten)} min. geleden`;
  const uren = Math.floor(minuten / 60);
  if (uren < 24) return `${uren} uur geleden`;
  const dagen = Math.floor(uren / 24);
  if (dagen === 1) return "gisteren";
  return `${dagen} dagen geleden`;
}

const BRON_LABEL: Record<string, string> = { funda: "Funda" };

// Losse subcomponent (i.p.v. inline) omdat de error-fallback per afbeelding
// zijn eigen state nodig heeft -- een foto-URL die (nog) niet laadt (verlopen
// CDN-link, CSP-domein niet toegestaan, etc.) mag nooit een kapot-
// afbeeldingicoon tonen, valt dan terug op dezelfde neutrale illustratie als
// wanneer er helemaal geen fotoUrl is.
function MatchThumbnail({ fotoUrl, index }: { fotoUrl: string | null; index: number }) {
  const [fout, setFout] = useState(false);
  if (!fotoUrl || fout) return <HuisIllustratie index={index} groot />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fotoUrl} alt="" className="h-full w-full object-cover" onError={() => setFout(true)} />
  );
}

function MatchActieMenu({
  match,
  dossierId,
  gekoppeldRapport,
  onSluiten,
}: {
  match: B2bWoningMatch;
  dossierId: string;
  gekoppeldRapport: B2bRapportAanvraag | null;
  onSluiten: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onSluiten}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <p className="text-[12.5px] font-semibold text-ink">{match.titel}</p>
        {match.prijsLabel && <p className="mt-0.5 text-[11.5px] text-ink/50">{match.prijsLabel}</p>}

        <div className="mt-4 flex flex-col gap-2">
          <a
            href={match.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-ink/10 px-3.5 py-3 hover:bg-mist/60"
          >
            <span className="text-[12px] font-semibold text-ink">Bekijk advertentie op {BRON_LABEL[match.bron] ?? match.bron}</span>
            <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-ink/30" />
          </a>

          {gekoppeldRapport ? (
            <Link
              href={`/zakelijk/rapporten/${gekoppeldRapport.id}`}
              className="flex items-center justify-between rounded-xl bg-[#EEF0FF] px-3.5 py-3 hover:bg-[#E2E5FF]"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-accent">
                <FileCheckIcon className="h-3.5 w-3.5" /> Bekijk ons rapport
              </span>
              <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-accent/50" />
            </Link>
          ) : (
            <Link
              href={`/zakelijk/rapporten/nieuw?klantId=${dossierId}&adres=${encodeURIComponent(match.titel)}`}
              className="flex flex-col rounded-xl border border-dashed border-accent/40 px-3.5 py-3 hover:bg-[#EEF0FF]/50"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold text-accent">
                <FileCheckIcon className="h-3.5 w-3.5" /> Rapport genereren voor dit adres
              </span>
              <span className="mt-0.5 text-[10.5px] text-ink/40">Nog geen rapport voor dit adres in dit dossier.</span>
            </Link>
          )}
        </div>

        <button type="button" onClick={onSluiten} className="mt-4 w-full text-center text-[11px] font-semibold text-ink/40 hover:text-ink/60">
          Sluiten
        </button>
      </div>
    </div>
  );
}

export default function MatchesKaart({
  matches,
  rapporten,
  dossierId,
  matchenActief,
}: {
  matches: B2bWoningMatch[];
  rapporten: B2bRapportAanvraag[];
  dossierId: string;
  matchenActief: boolean;
}) {
  const router = useRouter();
  const [actieveMatch, setActieveMatch] = useState<B2bWoningMatch | null>(null);
  const [ververst, setVerverst] = useState(false);

  async function ververs() {
    setVerverst(true);
    try {
      await fetch(`/api/zakelijk/klanten/${dossierId}/matches-verversen`, { method: "POST" });
      router.refresh();
    } finally {
      setVerverst(false);
    }
  }

  const laatstGevonden = matches[0]?.gevondenOp;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">
            <BoltIcon className="h-3 w-3 text-accent" /> Matches
          </p>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">{matches.length}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${matchenActief ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-ink/5 text-ink/40"}`}>
            Automatisch {matchenActief ? "aan" : "uit"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {laatstGevonden && <span className="text-[10.5px] text-ink/40">Laatst gevonden: {relatieveTijd(laatstGevonden)}</span>}
          <button
            type="button"
            onClick={ververs}
            disabled={ververst}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-[10.5px] font-semibold text-ink/60 hover:bg-mist disabled:opacity-50"
          >
            {ververst ? "Bezig…" : "Ververs"}
          </button>
        </div>
      </div>

      {ververst && (
        // Duidelijke, prominente melding i.p.v. alleen de subtiele
        // knoptekst hierboven ("Bezig…") -- klacht was dat niet duidelijk
        // genoeg te zien was dat het systeem daadwerkelijk aan het zoeken
        // is (dit kan tot ~30s duren, zie maxDuration in matches-verversen/
        // route.ts, want Funda wordt live doorzocht via de proxy).
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#EEF0FF] px-3.5 py-3 text-[12px] font-semibold text-accent">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
          Bezig met zoeken naar nieuwe woningen op Funda…
        </div>
      )}

      {matches.length === 0 && !ververst ? (
        <p className="mt-4 text-[12px] text-ink/40">
          Nog geen woningen gevonden die aan de zoekopdracht voldoen. Geen paniek -- als ze er niet zijn, zijn ze er niet; zodra er een
          passende advertentie verschijnt, staat die hier.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActieveMatch(m)}
              className="flex flex-col overflow-hidden rounded-xl border border-ink/[0.06] text-left hover:border-accent/30 hover:shadow-sm"
            >
              <div className="h-32 w-full bg-mist">
                <MatchThumbnail fotoUrl={m.fotoUrl} index={i} />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-[#EAF3DE] px-1.5 py-0.5 text-[9px] font-bold text-[#3B6D11]">
                    {BRON_LABEL[m.bron] ?? m.bron}
                  </span>
                  <span className="text-[10px] text-ink/40">{relatieveTijd(m.gevondenOp)}</span>
                </div>
                <p className="truncate text-[12.5px] font-semibold text-ink">{m.titel}</p>
                {m.prijsLabel && <p className="text-[11.5px] text-ink/50">{m.prijsLabel}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {actieveMatch && (
        <MatchActieMenu
          match={actieveMatch}
          dossierId={dossierId}
          gekoppeldRapport={vindGekoppeldRapport(actieveMatch.titel, rapporten)}
          onSluiten={() => setActieveMatch(null)}
        />
      )}
    </div>
  );
}
