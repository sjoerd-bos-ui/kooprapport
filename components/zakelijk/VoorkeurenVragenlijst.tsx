"use client";

import { useState, type ReactElement } from "react";
import type {
  B2bKoperVoorkeuren,
  B2bLocatie,
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
  BUDGET_MIN,
  BUDGET_MAX,
  BUDGET_STAP,
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
import {
  CheckIcon,
  ArrowRightIcon,
  EuroIcon,
  MapPinIcon,
  BuildingIcon,
  BoxIcon,
  HomeIcon,
  DoorIcon,
  RulerIcon,
  LeafIcon,
  SunIcon,
  CompassIcon,
  ScaleIcon,
  BoltIcon,
} from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Matchingmodel v2 -- de volledige 13-vragen-vragenlijst (zie het Cowork-
// gesprek hierover, "matchingsproces onder de loep"). Dit ÉNE, gedeelde
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
//
// HERONTWERP ZOEKFILTERPROCES (Sjoerd, visuele redesign-sessie: "Mooier
// design / Duidelijkere keuzes / Alleen de harde eisen", uitgevoerd zonder
// live backend-aanroep): de oude Stap 0 (budget/kosten koper), Stap 1
// (locatie) en Stap 2 (woningtype/kamers/oppervlak/buitenruimte/energielabel)
// zijn hier samengevoegd tot ÉÉN "Harde eisen"-stap -- dat zijn precies de 8
// harde eisen uit Fase 0 van het scoreproces (zie voldoetAanHardeEisen in
// matchScore.ts), die inhoudelijk bij elkaar horen en nu ook zo gepresenteerd
// worden i.p.v. als drie losse, willekeurig aanvoelende stappen. Budget is
// vervangen door een doorlopende schuifregelaar (zie BudgetSlider hieronder
// en de toelichting bij BUDGET_MIN in types/b2b.ts) i.p.v. 6 vaste buckets --
// BEWUST GEEN live aantal-passende-woningen-teller hierboven (zou een
// backend-aanroep per klik vereisen, zie het gesprek hierover), de golfvorm
// achter de schuifregelaar is puur decoratief.
// -----------------------------------------------------------------------------

interface Draft {
  maxKoopprijs: number | null;
  // Los van `maxKoopprijs` zelf bijgehouden: `null` is zowel de starttoestand
  // (nog niets gekozen, stap ongeldig) als een geldige eindkeuze ("nog geen
  // vast maximum", stap juist wél geldig) -- zonder deze vlag zou er geen
  // onderscheid te maken zijn tussen die twee, en zou de stap dus nooit
  // geldig kunnen worden als de koper bewust "geen vast maximum" kiest.
  budgetAangeraakt: boolean;
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
    // BUGFIX/migratie (continu budget i.p.v. buckets, zie de toelichting bij
    // BUDGET_MIN in types/b2b.ts): een bestaand dossier kan hier nog een oude
    // bucket-string (bv. "350k_450k") bevatten i.p.v. een getal -- die
    // behandelen we hier hetzelfde als "nog geen vast maximum" (null), nooit
    // een crash of NaN op verouderde data.
    maxKoopprijs: typeof bestaand?.maxKoopprijs === "number" ? bestaand.maxKoopprijs : null,
    // Bij een bestaand dossier is deze stap al eerder (al dan niet expliciet
    // op "geen vast maximum") ingevuld, dus meteen als aangeraakt markeren --
    // anders zou een koper die eerder bewust "geen vast maximum" koos hier
    // opnieuw als "nog niets gekozen" verschijnen.
    budgetAangeraakt: bestaand != null,
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
    // BUGFIX (matchingmodel v3, B2B_DEALBREAKERS is van 11 naar 7 naar 3
    // opties getrimd): een bestaand dossier kan nog een inmiddels verwijderde
    // waarde bevatten (bv. "no_outdoor_space", "no_parking"). MultiSelect
    // toont zo'n waarde niet als chip (zit niet meer in `opties`), maar de
    // array bleef wel gevuld -- de stap leek dus al "klaar" (length > 0)
    // terwijl de server 'm bij opslaan alsnog afwijst omdat de waarde niet
    // meer geldig is. Daarom hier al filteren tegen de actuele lijst, zodat
    // het formulier meteen laat zien wat er nog écht gekozen moet worden.
    dealbreakers: (bestaand?.dealbreakers ?? []).filter((d) => B2B_DEALBREAKERS.some((o) => o.waarde === d)),
    dealbreakerAnders: bestaand?.dealbreakerAnders ?? "",
    // NIEUW SCOREPROCES (v4): dezelfde bescherming als bij dealbreakers/
    // voorzieningen hierboven, nu ook toegepast op afwegingen/prioriteiten --
    // beide lijsten zijn met de overstap naar v4 getrimd (afwegingen verloor
    // "less_parking"/"fewer_rooms", prioriteiten verloor "rooms"/
    // "amenities_nearby"/"condition_year"), dus een ouder dossier kan hier nu
    // ook stale waarden bevatten. Zonder filter zou de server
    // (koperVoorkeurenValidatie.ts) zo'n dossier bij opnieuw opslaan alsnog
    // afwijzen, terwijl het formulier zelf allang "ingevuld" leek.
    afwegingen: (bestaand?.afwegingen ?? []).filter((a) => B2B_AFWEGINGEN.some((o) => o.waarde === a)),
    prioriteiten: (bestaand?.prioriteiten ?? []).filter((p) => B2B_PRIORITEITEN.some((o) => o.waarde === p)),
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

// Herontwerp: een rijtje aaneengesloten segmenten (i.p.v. losse pillen) voor
// keuzes met een natuurlijke oplopende volgorde -- kamers en oppervlak
// hieronder. Voelt aan als "kies een punt op een schaal" i.p.v. "kies een
// los label uit een lijst", en is compacter dan de vorige pil-rij.
function SegmentSelect<T extends string>({
  opties,
  waarde,
  onKiezen,
}: {
  opties: { waarde: T; label: string }[];
  waarde: T | null;
  onKiezen: (w: T) => void;
}) {
  return (
    <div className="mt-2 flex overflow-hidden rounded-xl border border-ink/10">
      {opties.map((o, i) => (
        <button
          key={o.waarde}
          type="button"
          onClick={() => onKiezen(o.waarde)}
          className={`flex-1 px-2 py-2.5 text-center text-[11.5px] font-semibold leading-tight transition-colors ${
            i > 0 ? "border-l border-ink/10" : ""
          } ${waarde === o.waarde ? "bg-accent text-white" : "bg-white text-ink/55 hover:bg-mist/70"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type IconComponent = (props: { className?: string }) => ReactElement;

// Eén icoon-kaart -- gedeelde presentatie-primitive voor zowel de
// multi-keuze (woningtype) als de single-keuze (buitenruimte) variant
// hieronder. Duidelijker en herkenbaarder dan een tekstpil, precies wat
// Sjoerd vroeg met "Duidelijkere keuzes".
function IconKaart({
  actief,
  icon: Icon,
  label,
  onClick,
}: {
  actief: boolean;
  icon: IconComponent;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
        actief ? "border-accent bg-[#EEF0FF] text-accent" : "border-ink/10 bg-white text-ink/60 hover:bg-mist/70"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </button>
  );
}

function IconKaartMultiSelect<T extends string>({
  opties,
  iconen,
  waarden,
  onWijzigen,
}: {
  opties: { waarde: T; label: string }[];
  iconen: Record<T, IconComponent>;
  waarden: T[];
  onWijzigen: (w: T[]) => void;
}) {
  function toggle(w: T) {
    onWijzigen(waarden.includes(w) ? waarden.filter((x) => x !== w) : [...waarden, w]);
  }
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {opties.map((o) => (
        <IconKaart key={o.waarde} actief={waarden.includes(o.waarde)} icon={iconen[o.waarde]} label={o.label} onClick={() => toggle(o.waarde)} />
      ))}
    </div>
  );
}

function IconKaartSingleSelect<T extends string>({
  opties,
  iconen,
  waarde,
  onKiezen,
}: {
  opties: { waarde: T; label: string }[];
  iconen: Record<T, IconComponent>;
  waarde: T | null;
  onKiezen: (w: T) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {opties.map((o) => (
        <IconKaart key={o.waarde} actief={waarde === o.waarde} icon={iconen[o.waarde]} label={o.label} onClick={() => onKiezen(o.waarde)} />
      ))}
    </div>
  );
}

const WONINGTYPE_ICONEN: Record<B2bWoningtypeVoorkeur, IconComponent> = {
  apartment: BuildingIcon,
  studio: BoxIcon,
  terraced: HomeIcon,
  corner: HomeIcon,
  semi_detached: HomeIcon,
  detached: HomeIcon,
  other: BoxIcon,
};

const BUITENRUIMTE_ICONEN: Record<B2bBuitenruimteVoorkeur, IconComponent> = {
  garden_required: LeafIcon,
  balcony_ok: SunIcon,
  no_preference: CompassIcon,
  not_important: ScaleIcon,
};

// EU-energielabel-achtige chevron-rij -- herkenbare vorm (iedereen kent het
// gekleurde energielabel-blokje van Funda/de meterkast), maar met een eigen
// kleurverloop van groen (A) naar geel (D) en een neutrale, grijze laatste
// chevron voor "geen voorkeur" (bewust géén EU-kleur: dat is geen label,
// maar "maakt niet uit").
const ENERGIELABEL_KLEUREN: Record<B2bMinEnergielabelOptie, string> = {
  A_plus: "#1A9850",
  B_plus: "#66BD63",
  C_plus: "#A6D96A",
  D_plus: "#FEE08B",
  no_preference: "#E4E2F5",
};

function energielabelKorteLabel(optie: B2bMinEnergielabelOptie, label: string): string {
  if (optie === "no_preference") return "—";
  return label.replace("Label ", "").replace(" of beter", "+");
}

function EnergielabelSelect({ waarde, onKiezen }: { waarde: B2bMinEnergielabelOptie | null; onKiezen: (w: B2bMinEnergielabelOptie) => void }) {
  return (
    <div className="mt-2 flex">
      {B2B_MIN_ENERGIELABEL_OPTIES.map((o, i) => {
        const actief = waarde === o.waarde;
        return (
          <button
            key={o.waarde}
            type="button"
            onClick={() => onKiezen(o.waarde)}
            style={{
              backgroundColor: ENERGIELABEL_KLEUREN[o.waarde],
              clipPath: "polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%, 12% 50%)",
              marginLeft: i === 0 ? 0 : "-10px",
              zIndex: actief ? 10 : i,
            }}
            className={`relative flex h-11 flex-1 items-center justify-center pl-3 pr-1 text-[12px] font-bold text-ink/70 transition-opacity ${
              actief ? "opacity-100 outline outline-2 outline-offset-1 outline-accent" : "opacity-75 hover:opacity-100"
            }`}
          >
            {energielabelKorteLabel(o.waarde, o.label)}
          </button>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Budget-schuifregelaar (vervangt de oude 6-buckets SingleSelect, zie de
// toelichting bij BUDGET_MIN in types/b2b.ts). De golfvorm achter de
// schuifregelaar is BEWUST een statische, decoratieve skyline -- geen live
// verdeling van daadwerkelijk beschikbare woningen (dat zou een
// backend-aanroep per klik vereisen, zie het gesprek hierover: "live
// aanroep niet nodig"). De gevulde kleur loopt gewoon mee met de
// schuifpositie, als puur visueel "hoever ben ik" -- geen enkele claim over
// aantallen woningen.
// -----------------------------------------------------------------------------
const BUDGET_DEFAULT = 450000;
const BUDGET_GOLF_PAD =
  "M0,50 C28,18 52,44 88,26 C124,10 148,42 188,24 C228,8 252,36 292,20 C328,6 352,28 400,10 L400,56 L0,56 Z";

function BudgetSlider({
  waarde,
  aangeraakt,
  onWijzigen,
  onGeenMaximum,
}: {
  waarde: number | null;
  aangeraakt: boolean;
  onWijzigen: (w: number) => void;
  onGeenMaximum: () => void;
}) {
  const sliderWaarde = waarde ?? BUDGET_DEFAULT;
  const fractie = Math.min(1, Math.max(0, (sliderWaarde - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)));
  const geenMaximum = aangeraakt && waarde === null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[21px] font-bold text-ink">
          {geenMaximum ? "Geen vast maximum" : `Tot € ${sliderWaarde.toLocaleString("nl-NL")}`}
        </p>
        <button
          type="button"
          onClick={onGeenMaximum}
          className={`text-[11px] font-semibold hover:underline ${geenMaximum ? "text-accent" : "text-ink/40"}`}
        >
          Nog geen vast maximum
        </button>
      </div>

      <div className="relative mt-3 h-14 w-full">
        <svg viewBox="0 0 400 56" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <clipPath id="budgetGolfClip">
              <rect x="0" y="0" width={fractie * 400} height="56" />
            </clipPath>
          </defs>
          <path d={BUDGET_GOLF_PAD} className="fill-ink/[0.07]" />
          <path d={BUDGET_GOLF_PAD} className={geenMaximum ? "fill-ink/[0.14]" : "fill-accent/30"} clipPath="url(#budgetGolfClip)" />
        </svg>
        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STAP}
          value={sliderWaarde}
          onChange={(e) => onWijzigen(Number(e.target.value))}
          aria-label="Maximale koopprijs"
          className="absolute inset-x-0 bottom-0 h-7 w-full cursor-pointer appearance-none bg-transparent accent-accent"
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-ink/35">
        <span>€ {BUDGET_MIN.toLocaleString("nl-NL")}</span>
        <span>€ {BUDGET_MAX.toLocaleString("nl-NL")}+</span>
      </div>
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

// HERONTWERP: de oude Budget/Locatie/Woning-stappen (3 losse stappen) zijn nu
// samen ÉÉN "Harde eisen"-stap -- zie de toelichting bovenaan dit bestand.
const STAP_LABELS = ["Harde eisen", "Voorzieningen", "Dealbreakers", "Afwegingen", "Prioriteiten"];
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
    // Harde eisen -- combinatie van de oude drie stappen (budget/kosten
    // koper, locatie, woning) in één geldigheidscheck.
    Boolean(
      draft.budgetAangeraakt &&
        draft.kostenKoper &&
        draft.voorkeurLocaties.length > 0 &&
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
      // Geen non-null-assertion meer: `null` ("nog geen vast maximum") is nu
      // een legitieme, geldige waarde -- zie de toelichting bij BUDGET_MIN in
      // types/b2b.ts. De geldigheid van deze stap wordt bewaakt door
      // `budgetAangeraakt` in stapGeldig hierboven, niet door de waarde zelf.
      maxKoopprijs: draft.maxKoopprijs,
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
              <div className="flex items-center gap-1.5">
                <EuroIcon className="h-4 w-4 text-ink/40" />
                <p className="text-[12.5px] font-semibold text-ink">Maximale koopprijs</p>
              </div>
              <BudgetSlider
                waarde={draft.maxKoopprijs}
                aangeraakt={draft.budgetAangeraakt}
                onWijzigen={(w) => setDraft((d) => ({ ...d, maxKoopprijs: w, budgetAangeraakt: true }))}
                onGeenMaximum={() => setDraft((d) => ({ ...d, maxKoopprijs: null, budgetAangeraakt: true }))}
              />
              <p className="mt-3.5 text-[12.5px] font-semibold text-ink">Is kosten koper hierin meegenomen?</p>
              <SingleSelect opties={B2B_KOSTEN_KOPER_OPTIES} waarde={draft.kostenKoper} onKiezen={(w) => zet("kostenKoper", w)} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="h-4 w-4 text-ink/40" />
                <p className="text-[12.5px] font-semibold text-ink">Waar wil je wonen?</p>
              </div>
              <p className="mt-0.5 text-[11.5px] text-ink/45">Zoek een plaats of wijk -- kies maximaal {MAX_VOORKEUR_LOCATIES}.</p>
              <LocatiePicker waarden={draft.voorkeurLocaties} max={MAX_VOORKEUR_LOCATIES} onWijzigen={(w) => zet("voorkeurLocaties", w)} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <BuildingIcon className="h-4 w-4 text-ink/40" />
                <p className="text-[12.5px] font-semibold text-ink">Wat voor type woning zoek je?</p>
              </div>
              <IconKaartMultiSelect
                opties={B2B_WONINGTYPE_VOORKEUREN}
                iconen={WONINGTYPE_ICONEN}
                waarden={draft.woningtypes}
                onWijzigen={(w) => zet("woningtypes", w)}
              />
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
              <div className="flex items-center gap-1.5">
                <DoorIcon className="h-4 w-4 text-ink/40" />
                <p className="text-[12.5px] font-semibold text-ink">Hoeveel kamers wil je minimaal?</p>
              </div>
              <SegmentSelect opties={B2B_MIN_KAMERS_OPTIES} waarde={draft.minKamers} onKiezen={(w) => zet("minKamers", w)} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <RulerIcon className="h-4 w-4 text-ink/40" />
                <p className="text-[12.5px] font-semibold text-ink">Minimale woonoppervlakte?</p>
              </div>
              <SegmentSelect opties={B2B_MIN_OPPERVLAK_OPTIES} waarde={draft.minOppervlak} onKiezen={(w) => zet("minOppervlak", w)} />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <LeafIcon className="h-4 w-4 text-ink/40" />
                <p className="text-[12.5px] font-semibold text-ink">Buitenruimte?</p>
              </div>
              <IconKaartSingleSelect
                opties={B2B_BUITENRUIMTE_OPTIES}
                iconen={BUITENRUIMTE_ICONEN}
                waarde={draft.buitenruimte}
                onKiezen={(w) => zet("buitenruimte", w)}
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <BoltIcon className="h-4 w-4 text-ink/40" />
                <p className="text-[12.5px] font-semibold text-ink">Minimaal energielabel?</p>
              </div>
              <EnergielabelSelect waarde={draft.minEnergielabel} onKiezen={(w) => zet("minEnergielabel", w)} />
            </div>
          </>
        )}

        {stap === 1 && (
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

        {stap === 2 && (
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

        {stap === 3 && (
          <div>
            <p className="text-[12.5px] font-semibold text-ink">Waar zou je op willen inleveren?</p>
            <p className="mt-0.5 text-[11.5px] text-ink/45">Kies maximaal {MAX_AFWEGINGEN}.</p>
            <MultiSelect opties={B2B_AFWEGINGEN} waarden={draft.afwegingen} max={MAX_AFWEGINGEN} onWijzigen={(w) => zet("afwegingen", w)} />
          </div>
        )}

        {stap === 4 && (
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
