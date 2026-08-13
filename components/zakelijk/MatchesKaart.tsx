"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { B2bWoningMatch, B2bRapportAanvraag, B2bZoekopdracht, B2bKoperVoorkeuren } from "@/types/b2b";
import { B2B_WONINGTYPE_VOORKEUREN } from "@/types/b2b";
import { vindGekoppeldRapport } from "@/lib/services/matchRapportKoppeling";
import { BoltIcon, ArrowRightIcon, FileCheckIcon, LayersIcon, RulerIcon, ChevronDownIcon, AlertTriangleIcon, CheckIcon, StarIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Matches -- VEREENVOUDIGD (Sjoerd, na de visuele herontwerp-sessie van het
// zoekfilterproces: "vragenlijst echt inkorten tot alleen harde eisen" /
// "score helemaal weg, alleen voldoet/voldoet niet"). Dit component toonde
// tot nu toe een matchingsscore per woning (scorecirkel + een getabde
// "waarom deze score"-overlay met dealbreakers/afwegingen/prioriteiten-
// weging, matchingmodel v4) -- dat hele scoreproces is verwijderd (zie
// matchScore.ts). Elke woning die hier getoond wordt, voldoet aan de harde
// eisen (dat gebeurt server-side vóór het opslaan, zie voldoetAanHardeEisen()
// in matchScore.ts) -- er is dus geen ranking of percentage meer nodig, en
// ook geen aparte client-side scoreberekening (de vroegere fetch naar
// /api/zakelijk/klanten/[id]/matches-score, die bestond puur om de CBS-
// voorzieningenscore server-side te berekenen, is vervallen samen met die
// route). De `matches`-prop komt al newest-first van de server
// (listMatchenVoorKlant in b2bStore.ts) en wordt hier direct getoond.
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

// Zet de ingevulde harde-eisen-voorkeuren om in korte, leesbare zinnetjes --
// puur om zichtbaar te maken dat de vragenlijst daadwerkelijk iets doet.
// VEREENVOUDIGING: sinds "vragenlijst echt inkorten tot alleen harde eisen"
// bestaan dealbreakers/prioriteiten niet meer als koperVoorkeuren-velden --
// deze samenvatting toont nu budget/locatie/woningtype, precies de velden
// die nog wél bestaan en die de Funda-zoekopdracht ook daadwerkelijk sturen.
function koperVoorkeurenSamenvatting(koperVoorkeuren: B2bKoperVoorkeuren | null | undefined): string[] {
  if (!koperVoorkeuren) return [];
  const zinnen: string[] = [];
  if (typeof koperVoorkeuren.maxKoopprijs === "number") {
    const budgetLabel = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
      koperVoorkeuren.maxKoopprijs
    );
    zinnen.push(`budget: tot ${budgetLabel}`);
  }
  if (koperVoorkeuren.voorkeurLocaties.length > 0) {
    zinnen.push(`locatie: ${koperVoorkeuren.voorkeurLocaties.map((l) => l.label).join(", ")}`);
  }
  if (koperVoorkeuren.woningtypes.length > 0) {
    const labels = koperVoorkeuren.woningtypes.map((w) =>
      w === "other" ? koperVoorkeuren.woningtypeAnders ?? "anders" : B2B_WONINGTYPE_VOORKEUREN.find((o) => o.waarde === w)?.label.toLowerCase() ?? w
    );
    zinnen.push(`type: ${labels.join(", ")}`);
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
  favorietWaarschuwingen = {},
}: {
  matches: B2bWoningMatch[];
  rapporten: B2bRapportAanvraag[];
  dossierId: string;
  matchenActief: boolean;
  zoekopdracht?: B2bZoekopdracht;
  // Sinds favorieten niet meer automatisch worden opgeruimd (zie
  // ruimVerouderdeMatchenOp in b2bStore.ts, "favoriet alleen verwijderen als
  // de koper daarop klikt") kan een favoriet blijven staan terwijl hij niet
  // meer aan de zoekopdracht voldoet of niet meer beschikbaar is -- dat mag
  // nooit onopgemerkt blijven. match.id -> waarschuwingstekst, BEWUST
  // server-side berekend in page.tsx (via voldoetAanHardeEisen uit
  // matchScore.ts) en hier als kant-en-klare prop doorgegeven, i.p.v.
  // matchScore.ts hier client-side te importeren -- dat bestand hangt via
  // fundaFeed.ts aan server-only env-secrets (BRIGHTDATA_API_TOKEN e.d.),
  // exact het CORS/bundel-probleem dat de voorzieningenscore al eens
  // veroorzaakte (zie de bugfix daarvoor in de git-geschiedenis).
  favorietWaarschuwingen?: Record<string, string>;
}) {
  const router = useRouter();
  const [actieveMatch, setActieveMatch] = useState<B2bWoningMatch | null>(null);
  const [ververst, setVerverst] = useState(false);
  const [zoekFout, setZoekFout] = useState(false);
  const [aantalZichtbaar, setAantalZichtbaar] = useState(INITIEEL_ZICHTBAAR);
  // "Bewaar als interessant": optimistische override bovenop match.interessant
  // (dat via de `matches`-prop van de server komt) -- zo reageert de
  // ster-toggle meteen, zonder te wachten op de PATCH-respons of een volledige
  // router.refresh(). Alleen ids die de gebruiker deze sessie heeft aangeraakt
  // staan hierin; voor de rest valt de weergave terug op match.interessant.
  const [interessantOverrides, setInteressantOverrides] = useState<Record<string, boolean>>({});

  const koperVoorkeuren = zoekopdracht?.koperVoorkeuren ?? null;

  function isInteressant(match: B2bWoningMatch): boolean {
    return interessantOverrides[match.id] ?? match.interessant === true;
  }

  async function toggleInteressant(match: B2bWoningMatch) {
    const nieuweWaarde = !isInteressant(match);
    setInteressantOverrides((o) => ({ ...o, [match.id]: nieuweWaarde }));
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}/matches/${match.id}/interessant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interessant: nieuweWaarde }),
      });
      if (!res.ok) throw new Error("mislukt");
      router.refresh();
    } catch {
      // Terugdraaien bij een mislukte aanvraag -- geen stille inconsistentie
      // tussen wat de gebruiker ziet en wat er echt is opgeslagen.
      setInteressantOverrides((o) => ({ ...o, [match.id]: !nieuweWaarde }));
    }
  }

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
  const zichtbaar = matches.slice(0, aantalZichtbaar);
  const voorkeurenZinnen = koperVoorkeurenSamenvatting(koperVoorkeuren);
  // "Favorieten": losse, compacte sectie bovenaan met alleen de door de
  // makelaar aangevinkte matches (zie het Cowork-gesprek "echt de favorieten
  // pagina") -- een shortlist los van de volledige (potentieel lange)
  // matcheslijst eronder, met de twee acties die er het meest toe doen
  // meteen zichtbaar i.p.v. achter het actiemenu verstopt.
  const favorieten = matches.filter((m) => isInteressant(m));

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
        Elke woning hier voldoet aan de harde eisen: budget, locatie, type, kamers, oppervlak, buitenruimte en energielabel.
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

      {favorieten.length > 0 && (
        // HERONTWERP (klacht "de favorieten zijn erg onduidelijk aangegeven"
        // -- een klein sterretje in de kaarthoek viel te weinig op, en de
        // vorige lichte bg-mist/50-tint week nauwelijks af van de rest van de
        // pagina) -- EN meteen weer getemperd na de klacht "dat gouden blok
        // is wel heel heftig": geen fel verloop naar donker amber meer, maar
        // een vlakke, lichte was (bg-sun/10, dezelfde amber-tint die het
        // dashboard al gebruikt voor "wachten op koper") -- nog steeds een
        // duidelijk eigen sectie t.o.v. de rest van de pagina, maar rustig
        // genoeg om niet te schreeuwen.
        <div className="mt-3 rounded-2xl bg-sun/10 p-4">
          <div className="flex items-center gap-2">
            <StarIcon className="h-4 w-4 text-sun" filled />
            <p className="text-[13px] font-bold text-ink">Favorieten van deze koper</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-sun">{favorieten.length}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {favorieten.map((m, i) => {
              const gekoppeldRapport = vindGekoppeldRapport(m.titel, rapporten);
              const waarschuwing = favorietWaarschuwingen[m.id];
              return (
                <div key={m.id} className="overflow-hidden rounded-xl border border-ink/[0.06] bg-white">
                  <div className="relative h-24 w-full bg-mist">
                    <MatchThumbnail fotoUrl={m.fotoUrl} index={i} />
                    <button
                      type="button"
                      onClick={() => toggleInteressant(m)}
                      aria-label="Niet meer interessant"
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#BA7517] shadow-sm"
                    >
                      <StarIcon className="h-3.5 w-3.5" filled />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[12px] font-semibold text-ink">{m.titel}</p>
                    {m.prijsLabel && <p className="text-[11px] text-ink/50">{m.prijsLabel}</p>}
                    {waarschuwing && (
                      <p className="mt-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-rust">
                        <AlertTriangleIcon className="h-3 w-3 shrink-0" /> {waarschuwing}
                      </p>
                    )}
                    <div className="mt-2 flex gap-1.5">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-lg border border-ink/15 py-1.5 text-center text-[10.5px] font-semibold text-ink/60 hover:bg-mist"
                      >
                        Advertentie
                      </a>
                      {gekoppeldRapport ? (
                        <Link
                          href={`/zakelijk/rapporten/${gekoppeldRapport.id}`}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#EAF3DE] py-1.5 text-[10.5px] font-semibold text-[#3B6D11]"
                        >
                          <CheckIcon className="h-3 w-3" /> Rapport
                        </Link>
                      ) : (
                        <Link
                          href={`/zakelijk/rapporten/nieuw?klantId=${dossierId}&adres=${encodeURIComponent(m.titel)}`}
                          className="flex-1 rounded-lg bg-[#EEF0FF] py-1.5 text-center text-[10.5px] font-semibold text-accent"
                        >
                          Rapport
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {zichtbaar.map((m, i) => (
              <div key={m.id} className="flex flex-col overflow-hidden rounded-xl border border-ink/[0.06] hover:border-accent/30 hover:shadow-sm">
                <div className="relative h-36 w-full bg-mist">
                  <button type="button" onClick={() => setActieveMatch(m)} className="block h-full w-full text-left">
                    <MatchThumbnail fotoUrl={m.fotoUrl} index={i} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleInteressant(m);
                    }}
                    aria-label={isInteressant(m) ? "Niet meer interessant" : "Bewaar als interessant"}
                    className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-colors ${
                      isInteressant(m) ? "bg-[#FAC775] text-[#633806]" : "bg-white/90 text-ink/40 hover:text-ink/60"
                    }`}
                  >
                    <StarIcon className="h-4 w-4" filled={isInteressant(m)} />
                  </button>
                </div>
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
                  <div className="mt-auto flex items-center gap-1.5 pt-2">
                    <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[#3B6D11]" />
                    <span className="text-[10.5px] font-semibold text-[#3B6D11]">Voldoet aan alle eisen</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {aantalZichtbaar < matches.length && (
            <button
              type="button"
              onClick={() => setAantalZichtbaar((n) => n + STAP_ZICHTBAAR)}
              className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg border border-ink/15 px-4 py-2 text-[11.5px] font-semibold text-ink/60 hover:bg-mist"
            >
              Toon meer ({zichtbaar.length} van {matches.length})
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
    </div>
  );
}
