"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { B2bWoningMatch, B2bRapportAanvraag, B2bZoekopdracht, B2bKoperVoorkeuren } from "@/types/b2b";
import { B2B_PRIORITEITEN, B2B_DEALBREAKERS } from "@/types/b2b";
import { vindGekoppeldRapport } from "@/lib/services/matchRapportKoppeling";
import type { MatchScore, MatchScoreOnderdeel, MatchScoreDetailRegel } from "@/lib/services/matchScore";
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
//
// MATCHINGMODEL V3 (zie het Cowork-gesprek hierover, "ik twijfel over ons
// filtersysteem met punten; een match kan 90 punten krijgen die in een heel
// ander gebied ligt"): elke woning die hier getoond wordt, heeft de 7 harde
// eisen van fase 1 (budget, locatie, woningtype, kamers, oppervlak,
// buitenruimte, energielabel) al gehaald -- dat gebeurt server-side vóór het
// opslaan (zie voldoetAanHardeEisen() in matchScore.ts), dus is hier geen
// aparte "voldoet niet"-status meer nodig. De score/scorecirkel drukt sinds
// v3 dus NIET meer uit "voldoet dit wel of niet", maar "hoeveel beter dan het
// gevraagde minimum is dit" -- puur om de al-gekwalificeerde matches
// onderling te rangschikken.
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

// Groen bij een uitstekende match, ink-grijs daaronder -- bewust maar twee
// niveaus (geen driekleurenschaal) om de kaarten rustig te houden. Alle
// woningen hier voldoen al aan de harde eisen (zie hierboven) -- dit
// onderscheidt alleen HOEVEEL beter dan het gevraagde minimum, niet of het
// een match is.
function scoreKleur(score: number): string {
  return score >= 85 ? "#3B6D11" : "#8A8A85";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Uitstekend boven het gevraagde";
  if (score >= 60) return "Ruim boven het gevraagde";
  return "Voldoet aan het gevraagde";
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

// Getabde scoretoelichting (Cowork-gesprek "visualize deze schermen dat je
// bovenaan kan klikken", eerst als mockup goedgekeurd) -- verving de vorige
// platte lijst van alle 11 onderdelen onder elkaar. Vier tabs, elk met een
// eigen invalshoek op dezelfde `score.onderdelen`:
//   - Algemeen: de 8 rangschikkende/harde-eis-onderdelen (budget t/m parkeren)
//     als rustige label+balkje+cijfer-rijen, BEWUST zonder iconen of badges
//     (Sjoerd: "mooier maken maar niet te druk") -- alleen de balkkleur
//     verschuift van groen naar amber/rood bij een lager percentage.
//   - Voorzieningen/Belangrijkst: elk één onderdeel met een `detail`-array
//     (per-voorziening afstand resp. per-prioriteit deelscore) -- die
//     detailregels renderen als kleine kleurgecodeerde pilletjes
//     (DetailRegel hieronder), gedeeld tussen alle tabs.
//   - Inleveren: TWEE onderdelen onder elkaar, dealbreakers (vraag 11) en
//     afwegingen (vraag 12, zie scoreAfwegingen in matchScore.ts) -- inhoudelijk
//     verwant (allebei "wat kan deze koper hebben"), dus bewust samen op één
//     tab i.p.v. een aparte vijfde tab erbij.
const ALGEMEEN_KEYS = ["budget", "locatie", "type", "kamers", "oppervlak", "buitenruimte", "energielabel", "parkeren"];

type ScoreTabKey = "algemeen" | "voorzieningen" | "inleveren" | "belangrijkst";

const SCORE_TABS: { key: ScoreTabKey; label: string }[] = [
  { key: "algemeen", label: "Algemeen" },
  { key: "voorzieningen", label: "Voorzieningen" },
  { key: "inleveren", label: "Inleveren" },
  { key: "belangrijkst", label: "Belangrijkst" },
];

const DETAIL_STATUS_STIJL: Record<MatchScoreDetailRegel["status"], { bg: string; tekst: string }> = {
  goed: { bg: "bg-[#EAF3DE]", tekst: "text-[#27500A]" },
  matig: { bg: "bg-[#FAEEDA]", tekst: "text-[#633806]" },
  slecht: { bg: "bg-[#FBEAEA]", tekst: "text-rust" },
  onbekend: { bg: "bg-ink/5", tekst: "text-ink/40" },
};

function DetailRegel({ regel }: { regel: MatchScoreDetailRegel }) {
  const stijl = DETAIL_STATUS_STIJL[regel.status];
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-[11.5px] text-ink/70">{regel.label}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stijl.bg} ${stijl.tekst}`}>{regel.waarde}</span>
    </div>
  );
}

function AlgemeenRegel({ onderdeel }: { onderdeel: MatchScoreOnderdeel }) {
  const ratio = onderdeel.maxPunten > 0 ? Math.max(0, Math.min(1, onderdeel.punten / onderdeel.maxPunten)) : 0;
  const kleur = ratio >= 0.75 ? "#3B6D11" : ratio >= 0.5 ? "#D97706" : "#B7302B";
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="flex-1 text-[11.5px] text-ink/70">{onderdeel.label}</span>
      <div className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: kleur }} />
      </div>
      <span className="w-10 shrink-0 text-right text-[11px] font-semibold text-ink/60">
        {onderdeel.punten}/{onderdeel.maxPunten}
      </span>
    </div>
  );
}

function OnderdeelKop({ onderdeel }: { onderdeel: MatchScoreOnderdeel }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11.5px] font-semibold text-ink">{onderdeel.label}</span>
      <span className="text-[13px] font-semibold text-ink">
        {onderdeel.punten}
        <span className="font-normal text-ink/40">/{onderdeel.maxPunten}</span>
      </span>
    </div>
  );
}

function ScoreTabs({ score }: { score: MatchScore }) {
  const [tab, setTab] = useState<ScoreTabKey>("algemeen");
  const perKey = Object.fromEntries(score.onderdelen.map((o) => [o.key, o])) as Record<string, MatchScoreOnderdeel>;
  const algemeenOnderdelen = ALGEMEEN_KEYS.map((k) => perKey[k]).filter((o): o is MatchScoreOnderdeel => o != null);
  const voorzieningen = perKey.voorzieningen;
  const dealbreakers = perKey.dealbreakers;
  const afwegingen = perKey.afwegingen;
  const prioriteiten = perKey.prioriteiten;

  return (
    <div>
      <div className="flex gap-1 border-b border-line">
        {SCORE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 border-b-2 px-1 pb-2 text-[11px] font-semibold transition-colors ${
              tab === t.key ? "border-accent text-ink" : "border-transparent text-ink/40 hover:text-ink/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-3">
        {tab === "algemeen" && (
          <div className="flex flex-col divide-y divide-mist">
            {algemeenOnderdelen.map((o) => (
              <AlgemeenRegel key={o.key} onderdeel={o} />
            ))}
          </div>
        )}

        {tab === "voorzieningen" && voorzieningen && (
          <div>
            <OnderdeelKop onderdeel={voorzieningen} />
            <p className="mt-1 text-[10.5px] text-ink/40">{voorzieningen.toelichting}</p>
            {voorzieningen.detail && voorzieningen.detail.length > 0 && (
              <div className="mt-2 flex flex-col divide-y divide-mist">
                {voorzieningen.detail.map((d) => (
                  <DetailRegel key={d.label} regel={d} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "inleveren" && dealbreakers && (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-semibold text-ink">Dealbreakers</span>
              <span className={`text-[11.5px] font-semibold ${dealbreakers.punten < 0 ? "text-rust" : "text-[#27500A]"}`}>
                {dealbreakers.toelichting}
              </span>
            </div>
            {dealbreakers.detail && dealbreakers.detail.length > 0 ? (
              <div className="mt-2 flex flex-col divide-y divide-mist">
                {dealbreakers.detail.map((d) => (
                  <DetailRegel key={d.label} regel={d} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[10.5px] text-ink/40">Geen dealbreakers opgegeven.</p>
            )}
            {afwegingen && (
              <div className="mt-4">
                <OnderdeelKop onderdeel={afwegingen} />
                <p className="mt-1 text-[10.5px] text-ink/40">{afwegingen.toelichting}</p>
                {afwegingen.detail && afwegingen.detail.length > 0 && (
                  <div className="mt-2 flex flex-col divide-y divide-mist">
                    {afwegingen.detail.map((d) => (
                      <DetailRegel key={d.label} regel={d} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "belangrijkst" && prioriteiten && (
          <div>
            <OnderdeelKop onderdeel={prioriteiten} />
            <p className="mt-1 text-[10.5px] text-ink/40">{prioriteiten.toelichting}</p>
            {prioriteiten.detail && prioriteiten.detail.length > 0 ? (
              <div className="mt-2 flex flex-col divide-y divide-mist">
                {prioriteiten.detail.map((d) => (
                  <DetailRegel key={d.label} regel={d} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[10.5px] text-ink/40">Geen prioriteiten opgegeven.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Overlay-schermpje voor de puntenverdeling van ÉÉN match -- vervangt de
// vorige, altijd-zichtbare tekstblokken onder de kaarten ("puur een i per
// huis": de uitleg staat nu alleen hier, nooit standaard op de pagina).
function ScoreModal({ match, score, onSluiten }: { match: B2bWoningMatch; score: MatchScore; onSluiten: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={onSluiten}>
      <div className="w-full max-w-[380px] rounded-2xl bg-white p-5 shadow-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-ink">{match.titel}</p>
            {match.prijsLabel && <p className="mt-0.5 text-[11.5px] text-ink/50">{match.prijsLabel}</p>}
          </div>
          <ScoreRing score={score.totaal} groot />
        </div>
        <p className="mt-4 text-[10.5px] font-bold uppercase tracking-wide text-ink/35">Waarom deze score</p>
        <div className="mt-2.5">
          <ScoreTabs score={score} />
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
// backend verwerkt de antwoorden al wel, zie berekenMatchScore/fundaFeed,
// maar nergens op DEZE pagina was dat eerder terug te zien).
//
// MATCHINGMODEL V2: het oude 4-vragen-formulier (prioriteit/bouwstijl/
// budgetFlexibel/kenmerkenFlexibel) bestaat niet meer -- de meest
// betekenisvolle samenvatting van de nieuwe 13-vragen-lijst is wat de koper
// als belangrijkst aanwees (Vraag 13) en waar de harde dealbreakers zitten
// (Vraag 11), dus die twee worden hier getoond.
function koperVoorkeurenSamenvatting(koperVoorkeuren: B2bKoperVoorkeuren | null | undefined): string[] {
  if (!koperVoorkeuren) return [];
  const zinnen: string[] = [];
  if (koperVoorkeuren.prioriteiten.length > 0) {
    const labels = koperVoorkeuren.prioriteiten.map((p) => B2B_PRIORITEITEN.find((o) => o.waarde === p)?.label.toLowerCase() ?? p);
    zinnen.push(`belangrijkst: ${labels.join(", ")}`);
  }
  if (koperVoorkeuren.dealbreakers.length > 0) {
    const labels = koperVoorkeuren.dealbreakers.map((d) =>
      d === "other" ? koperVoorkeuren.dealbreakerAnders ?? "anders" : B2B_DEALBREAKERS.find((o) => o.waarde === d)?.label.toLowerCase() ?? d
    );
    zinnen.push(`dealbreakers: ${labels.join(", ")}`);
  }
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
  // MATCHINGMODEL V2: berekenMatchScore is nu async (Component 9/10 kunnen
  // een gratis, maar niet-instante CBS-voorzieningenopzoeking triggeren, zie
  // matchScore.ts) -- de scores worden daarom hier in een effect berekend
  // i.p.v. synchroon tijdens het renderen, met een korte laadstand terwijl
  // dat gebeurt.
  const [gescoord, setGescoord] = useState<{ match: B2bWoningMatch; score: MatchScore }[]>([]);
  const [scoresLaden, setScoresLaden] = useState(true);

  const koperVoorkeuren = zoekopdracht?.koperVoorkeuren ?? null;

  // BUGFIX (Sjoerd: "de CBS databron geeft bij voorzieningen aan bij allemaal
  // onbekend"): berekenMatchScore() deed hier voorheen rechtstreeks een CBS-
  // OData-opzoeking (voorzieningenMatch.ts/buurtprofiel.ts) VANUIT DE BROWSER
  // -- live geverifieerd dat opendata.cbs.nl geen CORS-headers zet, dus die
  // fetch faalde daar altijd stilzwijgend op (PDOK zet wél `Access-Control-
  // Allow-Origin: *`, dus de adresresolutie werkte toevallig wel). De
  // berekening is daarom verplaatst naar een nieuwe server-side route
  // (/api/zakelijk/klanten/[id]/matches-score, server-naar-server heeft geen
  // CORS-beperking) -- deze effect roept die nu aan i.p.v. berekenMatchScore
  // rechtstreeks te importeren en client-side uit te voeren.
  useEffect(() => {
    let actief = true;
    setScoresLaden(true);
    (async () => {
      try {
        const res = await fetch(`/api/zakelijk/klanten/${dossierId}/matches-score`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { gescoord: { match: B2bWoningMatch; score: MatchScore }[] } = await res.json();
        if (!actief) return;
        setGescoord(data.gescoord);
      } catch {
        // Val bij een mislukte aanroep terug op de matches zonder score
        // (allemaal 0, geen onderdelen) i.p.v. de hele lijst stil te laten
        // verdwijnen -- de kaarten blijven zo zichtbaar, alleen de
        // rangschikking/toelichting ontbreekt dan tijdelijk.
        if (actief) {
          setGescoord(matches.map((match) => ({ match, score: { totaal: 0, ruwTotaal: 0, onderdelen: [], dealbreakersGetriggerd: [] } })));
        }
      } finally {
        if (actief) setScoresLaden(false);
      }
    })();
    return () => {
      actief = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, dossierId]);

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
  const zichtbaar = gescoord.slice(0, aantalZichtbaar);
  const voorkeurenZinnen = koperVoorkeurenSamenvatting(koperVoorkeuren);

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

      <p className="mt-2 text-[10.5px] text-ink/40">
        Elke woning hier voldoet al aan de harde eisen (budget, locatie, type, kamers, oppervlak, buitenruimte, energielabel) -- de score
        rangschikt alleen hoe ver ze daar bovenop uitkomen.
      </p>

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
        // BUGFIX (klacht "dit staat er erg klein, ik wil een mooi kadertje"):
        // was een smalle eenregelige balk -- nu een groot, centraal kader dat
        // niet te missen is (kan tot ~60s duren, zie maxDuration in
        // matches-verversen/route.ts, want Funda wordt over meerdere
        // pagina's live doorzocht via de proxy).
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-accent/20 bg-[#EEF0FF] px-6 py-10 text-center">
          <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" />
          <div>
            <p className="text-[14px] font-bold text-accent">Bezig met zoeken naar nieuwe woningen op Funda…</p>
            <p className="mt-1 text-[11.5px] text-accent/70">Dit kan tot een minuut duren -- we doorzoeken meerdere pagina's voor de volledige lijst.</p>
          </div>
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
      ) : scoresLaden && !ververst ? (
        <p className="mt-4 text-[12px] text-ink/40">Scores worden berekend…</p>
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
