"use client";

import { useState } from "react";
import type {
  B2bKoperVoorkeuren,
  B2bLocatie,
  B2bBudgetOptie,
  B2bKostenKoperOptie,
  B2bWoningtypeVoorkeur,
  B2bMinKamersOptie,
  B2bMinOppervlakOptie,
  B2bBuitenruimteVoorkeur,
  B2bMinEnergielabelOptie,
  B2bVoorzieningWens,
  B2bParkerenVoorkeur,
  B2bDealbreaker,
  B2bAfweging,
  B2bPrioriteitOptie,
} from "@/types/b2b";
import {
  B2B_BUDGET_OPTIES,
  B2B_KOSTEN_KOPER_OPTIES,
  B2B_WONINGTYPE_VOORKEUREN,
  B2B_MIN_KAMERS_OPTIES,
  B2B_MIN_OPPERVLAK_OPTIES,
  B2B_BUITENRUIMTE_OPTIES,
  B2B_MIN_ENERGIELABEL_OPTIES,
  B2B_VOORZIENING_WENSEN,
  B2B_PARKEREN_OPTIES,
  B2B_DEALBREAKERS,
  B2B_AFWEGINGEN,
  B2B_PRIORITEITEN,
  MAX_VOORKEUR_LOCATIES,
  MAX_DEALBREAKERS,
  MAX_AFWEGINGEN,
  MAX_PRIORITEITEN,
} from "@/types/b2b";
import LocatieAutocomplete from "@/components/zakelijk/LocatieAutocomplete";
import { CheckIcon, ArrowRightIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Matchingmodel v2 -- de volledige 13-vragen/7-stappen-vragenlijst (zie het
// Cowork-gesprek hierover, "matchingsproces onder de loep"). Dit ÉNE, gedeelde
// component wordt hergebruikt door zowel de makelaar (in het dashboard, zie
// ZoekopdrachtForm.tsx) als de koper (publieke link, zie KoperVoorkeurenForm.tsx)
// -- beide invulkanalen blijven bestaan (zie het gesprek hierover), alleen de
// vragenlijst zelf is nu overal identiek, i.p.v. twee losse implementaties
// van (voorheen) 4 vragen.
//
// Bewust ALLES-OF-NIETS: `onOpslaan` wordt pas aangeroepen met een compleet,
// geldig B2bKoperVoorkeuren-object -- een half ingevulde lijst wordt hier niet
// tussentijds opgeslagen (elke vraag is "Required: true" in de opgave, op
// Vraag 9 na). De wizard bewaart de voortgang alleen lokaal in React-state
// zolang de gebruiker aan het invullen is.
// -----------------------------------------------------------------------------

interface Draft {
  maxKoopprijs: B2bBudgetOptie | null;
  kostenKoper: B2bKostenKoperOptie | null;
  voorkeurLocaties: B2bLocatie[];
  woningtypes: B2bWoningtypeVoorkeur[];
  woningtypeAnders: string;
  minKamers: B2bMinKamersOptie | null;
  minOppervlak: B2bMinOppervlakOptie | null;
  buitenruimte: B2bBuitenruimteVoorkeur | null;
  minEnergielabel: B2bMinEnergielabelOptie | null;
  belangrijkeVoorzieningen: B2bVoorzieningWens[];
  parkeren: B2bParkerenVoorkeur | null;
  dealbreakers: B2bDealbreaker[];
  dealbreakerAnders: string;
  afwegingen: B2bAfweging[];
  prioriteiten: B2bPrioriteitOptie[];
}

function leegDraft(bestaand: B2bKoperVoorkeuren | null): Draft {
  return {
    maxKoopprijs: bestaand?.maxKoopprijs ?? null,
    kostenKoper: bestaand?.kostenKoper ?? null,
    voorkeurLocaties: bestaand?.voorkeurLocaties ?? [],
    woningtypes: bestaand?.woningtypes ?? [],
    woningtypeAnders: bestaand?.woningtypeAnders ?? "",
    minKamers: bestaand?.minKamers ?? null,
    minOppervlak: bestaand?.minOppervlak ?? null,
    buitenruimte: bestaand?.buitenruimte ?? null,
    minEnergielabel: bestaand?.minEnergielabel ?? null,
    // Zelfde bescherming als bij dealbreakers hierboven: "workplace" bestond
    // eerder als optie (zie types/b2b.ts) en is verwijderd -- een bestaand
    // dossier met die waarde nog in belangrijkeVoorzieningen filteren we hier
    // weg, anders lijkt de stap "ingevuld" terwijl de server 'm alsnog zou
    // afwijzen bij opslaan.
    belangrijkeVoorzieningen: (bestaand?.belangrijkeVoorzieningen ?? []).filter((w) => B2B_VOORZIENING_WENSEN.some((o) => o.waarde === w)),
    parkeren: bestaand?.parkeren ?? null,
    // BUGFIX (matchingmodel v3, B2B_DEALBREAKERS is van 11 naar 7 opties
    // getrimd): een bestaand dossier kan nog een inmiddels verwijderde
    // waarde bevatten (bv. "no_outdoor_space"). MultiSelect toont zo'n
    // waarde niet als chip (zit niet meer in `opties`), maar de array bleef
    // wel gevuld -- de stap leek dus al "klaar" (length > 0) terwijl de
    // server 'm bij opslaan alsnog afwijst omdat de waarde niet meer geldig
    // is. Daarom hier al filteren tegen de actuele lijst, zodat het
    // formulier meteen laat zien wat er nog écht gekozen moet worden.
    dealbreakers: (bestaand?.dealbreakers ?? []).filter((d) => B2B_DEALBREAKERS.some((o) => o.waarde === d)),
    dealbreakerAnders: bestaand?.dealbreakerAnders ?? "",
    afwegingen: bestaand?.afwegingen ?? [],
    prioriteiten: bestaand?.prioriteiten ?? [],
  };
}

function Keuze({ actief, disabled, label, onClick }: { actief: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        actief ? "border-accent bg-[#EEF0FF] text-accent" : "border-ink/10 bg-mist/50 text-ink/60 hover:bg-mist"
      }`}
    >
      {actief && <CheckIcon className="mr-1 inline h-3 w-3 -translate-y-px" />}
      {label}
    </button>
  );
}

function SingleSelect<T extends string>({
  opties,
  waarde,
  onKiezen,
}: {
  opties: { waarde: T; label: string }[];
  waarde: T | null;
  onKiezen: (w: T) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {opties.map((o) => (
        <Keuze key={o.waarde} actief={waarde === o.waarde} label={o.label} onClick={() => onKiezen(o.waarde)} />
      ))}
    </div>
  );
}

function MultiSelect<T extends string>({
  opties,
  waarden,
  max,
  onWijzigen,
}: {
  opties: { waarde: T; label: string }[];
  waarden: T[];
  max?: number;
  onWijzigen: (w: T[]) => void;
}) {
  function toggle(w: T) {
    if (waarden.includes(w)) {
      onWijzigen(waarden.filter((x) => x !== w));
    } else if (!max || waarden.length < max) {
      onWijzigen([...waarden, w]);
    }
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {opties.map((o) => (
        <Keuze
          key={o.waarde}
          actief={waarden.includes(o.waarde)}
          disabled={!waarden.includes(o.waarde) && Boolean(max) && waarden.length >= (max ?? Infinity)}
          label={o.label}
          onClick={() => toggle(o.waarde)}
        />
      ))}
    </div>
  );
}

// Landelijke multi-locatiekeuze (Vraag 3, max MAX_VOORKEUR_LOCATIES) --
// hergebruikt dezelfde live PDOK-autocomplete als de oude zoekopdracht
// (LocatieAutocomplete.tsx is van zichzelf een single-value component). Elke
// gekozen locatie wordt een verwijderbare chip; zodra er ruimte over is
// (waarden.length < max) staat er een leeg invoerveld klaar voor de
// volgende. `invoerKey` dwingt na elke keuze een remount van
// LocatieAutocomplete af (het component synct zijn interne teksttoestand
// niet automatisch terug naar een lege `waarde`-prop, zie de toelichting in
// dat bestand) zodat het invoerveld weer leeg begint voor de volgende keuze.
function LocatiePicker({ waarden, max, onWijzigen }: { waarden: B2bLocatie[]; max: number; onWijzigen: (w: B2bLocatie[]) => void }) {
  const [invoerKey, setInvoerKey] = useState(0);

  function voegToe(locatie: B2bLocatie | null) {
    if (!locatie) return;
    const bestaatAl = waarden.some((w) => w.plaatsSlug === locatie.plaatsSlug && w.wijkSlug === locatie.wijkSlug);
    if (bestaatAl) return;
    onWijzigen([...waarden, locatie]);
    setInvoerKey((k) => k + 1);
  }
  function verwijder(index: number) {
    onWijzigen(waarden.filter((_, i) => i !== index));
  }

  return (
    <div className="mt-2">
      {waarden.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {waarden.map((locatie, i) => (
            <span
              key={`${locatie.plaatsSlug}-${locatie.wijkSlug ?? ""}`}
              className="flex items-center gap-1.5 rounded-full border border-accent bg-[#EEF0FF] px-3 py-1.5 text-[12.5px] font-semibold text-accent"
            >
              {locatie.label}
              <button type="button" onClick={() => verwijder(i)} className="text-accent/50 hover:text-accent" aria-label={`${locatie.label} verwijderen`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {waarden.length < max ? (
        <LocatieAutocomplete key={invoerKey} waarde={null} onKiezen={voegToe} />
      ) : (
        <p className="text-[11px] text-ink/40">Maximum van {max} locaties bereikt -- verwijder er eerst één om een andere te kiezen.</p>
      )}
    </div>
  );
}

function Stappenbalk({ stap, totaal }: { stap: number; totaal: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totaal }).map((_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= stap ? "bg-accent" : "bg-ink/[0.08]"}`} />
      ))}
    </div>
  );
}

const STAP_LABELS = ["Budget", "Locatie", "Woning", "Voorzieningen", "Dealbreakers", "Afwegingen", "Prioriteiten"];
const TOTAAL_STAPPEN = STAP_LABELS.length;

export default function VoorkeurenVragenlijst({
  bestaand,
  onOpslaan,
  bezig,
  opslaanLabel = "Voorkeuren opslaan",
}: {
  bestaand: B2bKoperVoorkeuren | null;
  onOpslaan: (waarde: B2bKoperVoorkeuren) => void;
  bezig: boolean;
  opslaanLabel?: string;
}) {
  const [stap, setStap] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => leegDraft(bestaand));

  function zet<K extends keyof Draft>(key: K, waarde: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: waarde }));
  }

  const stapGeldig: boolean[] = [
    Boolean(draft.maxKoopprijs && draft.kostenKoper),
    draft.voorkeurLocaties.length > 0,
    Boolean(
      draft.woningtypes.length > 0 &&
        (!draft.woningtypes.includes("other") || draft.woningtypeAnders.trim()) &&
        draft.minKamers &&
        draft.minOppervlak &&
        draft.buitenruimte &&
        draft.minEnergielabel
    ),
    Boolean(draft.parkeren), // Vraag 9 (voorzieningen) is optioneel, Vraag 10 (parkeren) niet
    Boolean(draft.dealbreakers.length > 0 && (!draft.dealbreakers.includes("other") || draft.dealbreakerAnders.trim())),
    draft.afwegingen.length > 0,
    draft.prioriteiten.length > 0,
  ];
  const huidigeStapGeldig = stapGeldig[stap];
  const alleStappenGeldig = stapGeldig.every(Boolean);

  function volgende() {
    if (!huidigeStapGeldig) return;
    if (stap < TOTAAL_STAPPEN - 1) setStap((s) => s + 1);
  }
  function vorige() {
    if (stap > 0) setStap((s) => s - 1);
  }

  function versturen() {
    if (!alleStappenGeldig) return;
    onOpslaan({
      maxKoopprijs: draft.maxKoopprijs!,
      kostenKoper: draft.kostenKoper!,
      voorkeurLocaties: draft.voorkeurLocaties,
      woningtypes: draft.woningtypes,
      woningtypeAnders: draft.woningtypes.includes("other") ? draft.woningtypeAnders.trim() || null : null,
      minKamers: draft.minKamers!,
      minOppervlak: draft.minOppervlak!,
      buitenruimte: draft.buitenruimte!,
      minEnergielabel: draft.minEnergielabel!,
      belangrijkeVoorzieningen: draft.belangrijkeVoorzieningen,
      parkeren: draft.parkeren!,
      dealbreakers: draft.dealbreakers,
      dealbreakerAnders: draft.dealbreakers.includes("other") ? draft.dealbreakerAnders.trim() || null : null,
      afwegingen: draft.afwegingen,
      prioriteiten: draft.prioriteiten,
      ingevuldOp: new Date().toISOString(),
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">
          Stap {stap + 1}/{TOTAAL_STAPPEN} -- {STAP_LABELS[stap]}
        </p>
      </div>
      <div className="mt-2">
        <Stappenbalk stap={stap} totaal={TOTAAL_STAPPEN} />
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {stap === 0 && (
          <>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Wat is je maximale koopprijs?</p>
              <SingleSelect opties={B2B_BUDGET_OPTIES} waarde={draft.maxKoopprijs} onKiezen={(w) => zet("maxKoopprijs", w)} />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Is kosten koper in dat bedrag meegenomen?</p>
              <SingleSelect opties={B2B_KOSTEN_KOPER_OPTIES} waarde={draft.kostenKoper} onKiezen={(w) => zet("kostenKoper", w)} />
            </div>
          </>
        )}

        {stap === 1 && (
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Waar wil je wonen?</p>
            <p className="mt-0.5 text-[11.5px] text-ink/45">Zoek een plaats of wijk -- kies maximaal {MAX_VOORKEUR_LOCATIES}.</p>
            <LocatiePicker waarden={draft.voorkeurLocaties} max={MAX_VOORKEUR_LOCATIES} onWijzigen={(w) => zet("voorkeurLocaties", w)} />
          </div>
        )}

        {stap === 2 && (
          <>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Wat voor type woning zoek je?</p>
              <MultiSelect opties={B2B_WONINGTYPE_VOORKEUREN} waarden={draft.woningtypes} onWijzigen={(w) => zet("woningtypes", w)} />
              {draft.woningtypes.includes("other") && (
                <input
                  value={draft.woningtypeAnders}
                  onChange={(e) => zet("woningtypeAnders", e.target.value)}
                  placeholder="Welk type precies?"
                  className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-2 text-[12.5px] font-medium text-ink focus:border-accent focus:outline-none"
                />
              )}
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Hoeveel kamers wil je minimaal?</p>
              <SingleSelect opties={B2B_MIN_KAMERS_OPTIES} waarde={draft.minKamers} onKiezen={(w) => zet("minKamers", w)} />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Minimale woonoppervlakte?</p>
              <SingleSelect opties={B2B_MIN_OPPERVLAK_OPTIES} waarde={draft.minOppervlak} onKiezen={(w) => zet("minOppervlak", w)} />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Buitenruimte?</p>
              <SingleSelect opties={B2B_BUITENRUIMTE_OPTIES} waarde={draft.buitenruimte} onKiezen={(w) => zet("buitenruimte", w)} />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Minimaal energielabel?</p>
              <SingleSelect opties={B2B_MIN_ENERGIELABEL_OPTIES} waarde={draft.minEnergielabel} onKiezen={(w) => zet("minEnergielabel", w)} />
            </div>
          </>
        )}

        {stap === 3 && (
          <>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Welke voorzieningen zijn belangrijk?</p>
              <p className="mt-0.5 text-[11.5px] text-ink/45">Optioneel.</p>
              <MultiSelect
                opties={B2B_VOORZIENING_WENSEN}
                waarden={draft.belangrijkeVoorzieningen}
                onWijzigen={(w) => zet("belangrijkeVoorzieningen", w)}
              />
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">Parkeergelegenheid?</p>
              <SingleSelect opties={B2B_PARKEREN_OPTIES} waarde={draft.parkeren} onKiezen={(w) => zet("parkeren", w)} />
            </div>
          </>
        )}

        {stap === 4 && (
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Wat zijn je absolute dealbreakers?</p>
            <p className="mt-0.5 text-[11.5px] text-ink/45">Kies maximaal {MAX_DEALBREAKERS}.</p>
            <MultiSelect opties={B2B_DEALBREAKERS} waarden={draft.dealbreakers} max={MAX_DEALBREAKERS} onWijzigen={(w) => zet("dealbreakers", w)} />
            {draft.dealbreakers.includes("other") && (
              <input
                value={draft.dealbreakerAnders}
                onChange={(e) => zet("dealbreakerAnders", e.target.value)}
                placeholder="Welke dealbreaker precies?"
                className="mt-2 w-full rounded-lg border border-ink/15 px-3 py-2 text-[12.5px] font-medium text-ink focus:border-accent focus:outline-none"
              />
            )}
          </div>
        )}

        {stap === 5 && (
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Waar zou je op willen inleveren?</p>
            <p className="mt-0.5 text-[11.5px] text-ink/45">Kies maximaal {MAX_AFWEGINGEN}.</p>
            <MultiSelect opties={B2B_AFWEGINGEN} waarden={draft.afwegingen} max={MAX_AFWEGINGEN} onWijzigen={(w) => zet("afwegingen", w)} />
          </div>
        )}

        {stap === 6 && (
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Wat is het allerbelangrijkste?</p>
            <p className="mt-0.5 text-[11.5px] text-ink/45">Kies maximaal {MAX_PRIORITEITEN}.</p>
            <MultiSelect opties={B2B_PRIORITEITEN} waarden={draft.prioriteiten} max={MAX_PRIORITEITEN} onWijzigen={(w) => zet("prioriteiten", w)} />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={vorige}
          disabled={stap === 0}
          className="rounded-lg bg-ink/5 px-3.5 py-2 text-[11.5px] font-semibold text-ink/60 hover:bg-ink/10 disabled:opacity-40"
        >
          Vorige
        </button>
        {stap < TOTAAL_STAPPEN - 1 ? (
          <button
            type="button"
            onClick={volgende}
            disabled={!huidigeStapGeldig}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-40"
          >
            Volgende
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={versturen}
            disabled={!alleStappenGeldig || bezig}
            className="rounded-lg bg-accent px-3.5 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {bezig ? "Opslaan…" : opslaanLabel}
          </button>
        )}
      </div>
    </div>
  );
}
