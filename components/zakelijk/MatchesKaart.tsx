"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { B2bWoningMatch, B2bRapportAanvraag, B2bZoekopdracht } from "@/types/b2b";
import { vindGekoppeldRapport } from "@/lib/services/matchRapportKoppeling";
import { berekenMatchScore, type MatchScore } from "@/lib/services/matchScore";
import {
  BoltIcon,
  ArrowRightIcon,
  FileCheckIcon,
  InfoIcon,
  LayersIcon,
  RulerIcon,
  ChevronDownIcon,
  AlertTriangleIcon,
  CheckIcon,
} from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Matches (#2) -- HERONTWERP na duidelijke afkeuring van de vorige versie
// (hero-blok + altijd-open puntenverdeling eronder: "ziet er echt niet uit,
// niet alleen de teksten ook visueel"). Uitgangspunten voor deze versie,
// letterlijk overgenomen uit de feedback dit hele traject:
//   - "Puur een i per huis" -- elke kaart toont alleen een scorecirkel en één
//     klein (i)-knopje. De volledige puntenverdeling staat NERGENS meer
//     standaard op de pagina, alleen in een los overlay-schermpje na een
//     klik op dat knopje (ScoreModal hieronder).
//   - "Overzichtelijker" -- geen apart, breder hero-blok voor de topmatch
//     meer (dat maakte de layout juist onrustiger); alle kaarten zijn nu
//     gelijk van vorm in één grid, de topmatch krijgt alleen een label.
//   - "Meer woningen (tot max 30) met een knop" -- de grid toont in eerste
//     instantie een beperkt aantal, met een "Toon meer"-knop die oploopt tot
//     het volledige aantal opgeslagen matches (server-side al begrensd op
//     MAX_ZICHTBARE_MATCHEN, zie types/b2b.ts).
//   - "De vragen zijn niet verwerkt" -- dat klopte functioneel niet (de
//     koper-voorkeuren-antwoorden worden wel degelijk in de score verwerkt,
//     live geverifieerd), maar er was nergens op DEZE pagina een zichtbaar
//     bewijs daarvan. `koperVoorkeurenSamenvatting` hieronder zet dat nu in
//     platte taal boven de resultaten.
//   - Losstaande bugfix in dezelfde ronde: een mislukte zoekaanvraag (bv. een
//     proxy-timeout, zie fundaFeed.ts) zag er voorheen identiek uit als "0
//     passende woningen" -- de "Ververs"-knop toont nu een aparte
//     foutmelding i.p.v. dat stilzwijgend te verbergen.
// -----------------------------------------------------------------------------

const HUIS_KLEUREN = [
  { lucht: "#D7E6F2", dak: "#8B5E3C", muur: "#EFE3CE" },
  { lucht: "#E3D9EC", dak: "#6B5544", muur: "#F2EAD8" },
  { lucht: "#DDE7EF", dak: "#7A4A34", muur: "#E9DFC9" },
];

function HuisIllustratie({ index }: { index: number }) {
  const k = HUIS_KLEUREN[index % HUIS_KLEUREN.length];
  return (
    <svg width="100%" height="100%" viewBox="0 0 104 88" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%" }}>
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
  if (!fotoUrl || fout) return <HuisIllustratie index={index} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fotoUrl} alt="" className="h-full w-full object-cover" onError={() => setFout(true)} />
  );
}

// Groen bij een sterke match, ink-grijs daaronder -- bewust maar twee
// niveaus (geen driekleurenschaal) om de kaarten rustig te houden.
function scoreKleur(score: number): string {
  return score >= 85 ? "#3B6D11" : "#8A8A85";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Sterke match";
  if (score >= 60) return "Goede match";
  return "Match";
}

function ScoreRing({ score, groot }: { score: number; groot?: boolean }) {
  const straal = groot ? 22 : 15;
  const strokeBreedte = groot ? 5 : 4;
  const omtrek = 2 * Math.PI * straal;
  const fractie = Math.max(0, Math.min(100, score)) / 100;
  const kleur = scoreKleur(score);
  const midden = straal + strokeBreedte;
  const grootte = midden * 2;
  return (
    <svg width={grootte} height={grootte} viewBox={`0 0 ${grootte} ${grootte}`} className="shrink-0">
      <circle cx={midden} cy={midden} r={straal} fill="none" stroke="#EEEEE6" strokeWidth={strokeBreedte} />
      <circle
        cx={midden}
        cy={midden}
        r={straal}
        fill="none"
        stroke={kleur}
        strokeWidth={strokeBreedte}
        strokeLinecap="round"
        strokeDasharray={omtrek}
        strokeDashoffset={omtrek * (1 - fractie)}
        transform={`rotate(-90 ${midden} ${midden})`}
      />
      <text x={midden} y={midden + (groot ? 5 : 4)} textAnchor="middle" fontSize={groot ? 15 : 11} fontWeight={700} fill="#26251F">
        {Math.round(score)}
      </text>
    </svg>
  );
}

function ScoreToelichting({ score }: { score: MatchScore }) {
  return (
    <div className="flex flex-col gap-2.5">
      {score.onderdelen.map((o) => (
        <div key={o.label}>
          <div className="flex items-center justify-between gap-2 text-[11.5px]">
            <span className="text-ink/60">{o.label}</span>
            <span className={`font-semibold ${o.behaald < 0 ? "text-rust" : "text-ink/40"}`}>
              {o.behaald < 0 ? o.behaald : `${o.behaald}/${o.maximum}`}
            </span>
          </div>
          {o.maximum > 0 && (
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-[#3B6D11]"
                style={{ width: `${Math.max(0, Math.min(100, (o.behaald / o.maximum) * 100))}%` }}
              />
            </div>
          )}
          <p className="mt-0.5 text-[10.5px] text-ink/40">{o.toelichting}</p>
        </div>
      ))}
    </div>
  );
}

// Overlay-schermpje voor de puntenverdeling van ÉÉN match -- vervangt de
// vorige, altijd-zichtbare tekstblokken onder de kaarten ("puur een i per
// huis": de uitleg staat nu alleen hier, nooit standaard op de pagina).
function ScoreModal({ match, score, onSluiten }: { match: B2bWoningMatch; score: MatchScore; onSluiten: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onSluiten}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-ink">{match.titel}</p>
            {match.prijsLabel && <p className="mt-0.5 text-[11.5px] text-ink/50">{match.prijsLabel}</p>}
          </div>
          <ScoreRing score={score.totaal} groot />
        </div>
        <p className="mt-4 text-[10.5px] font-bold uppercase tracking-wide text-ink/35">Waarom deze score</p>
        <div className="mt-2.5">
          <ScoreToelichting score={score} />
        </div>
        <button
          type="button"
          onClick={onSluiten}
          className="mt-4 w-full rounded-lg bg-mist px-4 py-2.5 text-[11.5px] font-semibold text-ink/60 hover:bg-ink/10"
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}

function Kenmerkenchips({ match }: { match: B2bWoningMatch }) {
  const v = match.verificatie;
  if (!v) return null;
  const chips = [
    v.slaapkamers != null ? { icoon: LayersIcon, label: `${v.slaapkamers} slaapk.` } : null,
    v.woonoppervlak != null ? { icoon: RulerIcon, label: `${v.woonoppervlak} m²` } : null,
    v.energielabel ? { icoon: BoltIcon, label: `Label ${v.energielabel}` } : null,
  ].filter((x): x is { icoon: typeof LayersIcon; label: string } => x !== null);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2.5">
      {chips.map((c) => (
        <span key={c.label} className="flex items-center gap-1 text-[10.5px] text-ink/50">
          <c.icoon className="h-3 w-3 text-ink/30" />
          {c.label}
        </span>
      ))}
    </div>
  );
}

// Zet de ingevulde koper-voorkeuren om in korte, leesbare zinnetjes -- puur
// om zichtbaar te maken dat de vragenlijst daadwerkelijk iets doet (de
// backend verwerkte de antwoorden al wel, zie berekenMatchScore/fundaFeed,
// maar nergens op DEZE pagina was dat eerder terug te zien). Neutrale
// antwoorden ("gelijk", "geen_voorkeur") leveren bewust geen zin op -- die
// veranderen niets aan de standaardverdeling, dus niets te melden.
// Zelfde percentage als BUDGET_FLEXIBEL_MARGE in lib/data-sources/fundaFeed.ts
// (server-only, met scraping-logica) -- hier bewust als losse weergavewaarde
// gedupliceerd i.p.v. geïmporteerd, want dit is een "use client"-component en
// fundaFeed.ts hoort niet in de browserbundle terecht te komen. Puur een
// weergavegetal, wijzigt de server-side marge zelf niet.
const BUDGET_FLEXIBEL_MARGE_WEERGAVE_PCT = 10;

function koperVoorkeurenSamenvatting(zoekopdracht: B2bZoekopdracht | undefined): string[] {
  const v = zoekopdracht?.koperVoorkeuren;
  if (!v) return [];
  const zinnen: string[] = [];
  if (v.prioriteit === "prijs") zinnen.push("scherpe prijs weegt zwaarder");
  if (v.prioriteit === "kenmerken") zinnen.push("ruimte en kenmerken wegen zwaarder");
  if (v.bouwstijl === "nieuw") zinnen.push("voorkeur voor nieuwbouw/modern");
  if (v.bouwstijl === "karakter") zinnen.push("voorkeur voor karakter, ook als het ouder is");
  if (v.budgetFlexibel) zinnen.push(`budget tot ${BUDGET_FLEXIBEL_MARGE_WEERGAVE_PCT}% erboven bespreekbaar`);
  if (v.kenmerkenFlexibel) zinnen.push("toont ook woningen die één gevraagd kenmerk missen");
  return zinnen;
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

// Aantal kaarten dat direct zichtbaar is; "Toon meer" telt hier telkens
// STAP bij op, tot het totaal (server-side al begrensd op
// MAX_ZICHTBARE_MATCHEN, zie types/b2b.ts). Op 9 gezet zodat de eerste
// weergave een nette 3x3-grid vormt op het breedste kolomaantal.
const INITIEEL_ZICHTBAAR = 9;
const STAP_ZICHTBAAR = 9;

export default function MatchesKaart({
  matches,
  rapporten,
  dossierId,
  matchenActief,
  zoekopdracht,
}: {
  matches: B2bWoningMatch[];
  rapporten: B2bRapportAanvraag[];
  dossierId: string;
  matchenActief: boolean;
  zoekopdracht?: B2bZoekopdracht;
}) {
  const router = useRouter();
  const [actieveMatch, setActieveMatch] = useState<B2bWoningMatch | null>(null);
  const [scoreWeergave, setScoreWeergave] = useState<{ match: B2bWoningMatch; score: MatchScore } | null>(null);
  const [ververst, setVerverst] = useState(false);
  const [zoekFout, setZoekFout] = useState(false);
  const [aantalZichtbaar, setAantalZichtbaar] = useState(INITIEEL_ZICHTBAAR);

  async function ververs() {
    setVerverst(true);
    setZoekFout(false);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}/matches-verversen`, { method: "POST" });
      // BUGFIX (klacht "geeft nog steeds 0 matches zonder extra filter"):
      // een mislukte zoekaanvraag (netwerk/timeout, zie fundaFeed.ts) zag
      // er voorheen identiek uit als "0 passende woningen" -- dit toont nu
      // een aparte melding i.p.v. dat stilzwijgend te verbergen.
      const body = await res.json().catch(() => null);
      if (body?.zoekFout) setZoekFout(true);
      router.refresh();
    } finally {
      setVerverst(false);
    }
  }

  const laatstGevonden = matches[0]?.gevondenOp;

  // Gesorteerd op score i.p.v. vindmoment (matchingmodel, zie
  // lib/services/matchScore.ts) -- geen apart hero-blok meer voor de beste
  // match (afgekeurd als "onrustig"), alleen een label op de eerste kaart.
  const gescoord = matches
    .map((match) => ({ match, score: berekenMatchScore(match, zoekopdracht) }))
    .sort((a, b) => b.score.totaal - a.score.totaal);
  const zichtbaar = gescoord.slice(0, aantalZichtbaar);
  const voorkeurenZinnen = koperVoorkeurenSamenvatting(zoekopdracht);

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

      {voorkeurenZinnen.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-[#EEF0FF]/60 px-3 py-2">
          <CheckIcon className="h-3 w-3 shrink-0 text-accent" />
          <span className="text-[10.5px] font-semibold text-accent">Verwerkt uit de voorkeuren van de koper:</span>
          {voorkeurenZinnen.map((zin) => (
            <span key={zin} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-ink/60">
              {zin}
            </span>
          ))}
        </div>
      )}

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

      {zoekFout && !ververst && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-rust/10 px-3.5 py-3 text-[12px] font-semibold text-rust">
          <AlertTriangleIcon className="h-4 w-4 shrink-0" />
          Zoeken naar nieuwe woningen op Funda is niet gelukt (netwerkprobleem) -- probeer het over een paar minuten opnieuw.
        </div>
      )}

      {matches.length === 0 && !ververst ? (
        <p className="mt-4 text-[12px] text-ink/40">
          Nog geen woningen gevonden die aan de zoekopdracht voldoen. Geen paniek -- als ze er niet zijn, zijn ze er niet; zodra er een
          passende advertentie verschijnt, staat die hier.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {zichtbaar.map(({ match: m, score }, i) => (
              <div key={m.id} className="flex flex-col overflow-hidden rounded-xl border border-ink/[0.06] hover:border-accent/30 hover:shadow-sm">
                <button type="button" onClick={() => setActieveMatch(m)} className="relative block h-36 w-full bg-mist text-left">
                  <MatchThumbnail fotoUrl={m.fotoUrl} index={i} />
                  {i === 0 && score.totaal >= 85 && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-[#3B6D11] px-2.5 py-1 text-[10.5px] font-bold text-white">
                      Topmatch
                    </span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#EAF3DE] px-1.5 py-0.5 text-[9px] font-bold text-[#3B6D11]">
                      {BRON_LABEL[m.bron] ?? m.bron}
                    </span>
                    <span className="text-[10px] text-ink/40">{relatieveTijd(m.gevondenOp)}</span>
                  </div>
                  <button type="button" onClick={() => setActieveMatch(m)} className="text-left hover:underline">
                    <p className="truncate text-[12.5px] font-semibold text-ink">{m.titel}</p>
                    {m.prijsLabel && <p className="text-[11.5px] text-ink/50">{m.prijsLabel}</p>}
                  </button>
                  <Kenmerkenchips match={m} />
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5">
                      <ScoreRing score={score.totaal} />
                      <span className="text-[10.5px] font-semibold text-ink/50">{scoreLabel(score.totaal)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScoreWeergave({ match: m, score })}
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-ink/15 text-ink/40 hover:border-accent/40 hover:bg-mist hover:text-accent"
                      aria-label="Waarom deze score"
                    >
                      <InfoIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {aantalZichtbaar < gescoord.length && (
            <button
              type="button"
              onClick={() => setAantalZichtbaar((n) => n + STAP_ZICHTBAAR)}
              className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg border border-ink/15 px-4 py-2 text-[11.5px] font-semibold text-ink/60 hover:bg-mist"
            >
              Toon meer ({zichtbaar.length} van {gescoord.length})
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}

      {actieveMatch && (
        <MatchActieMenu
          match={actieveMatch}
          dossierId={dossierId}
          gekoppeldRapport={vindGekoppeldRapport(actieveMatch.titel, rapporten)}
          onSluiten={() => setActieveMatch(null)}
        />
      )}
      {scoreWeergave && (
        <ScoreModal match={scoreWeergave.match} score={scoreWeergave.score} onSluiten={() => setScoreWeergave(null)} />
      )}
    </div>
  );
}
