"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bZoekopdracht, B2bLocatie, B2bKenmerken, B2bWoningtype } from "@/types/b2b";
import { B2B_WONINGTYPES, B2B_ENERGIELABELS, legeKenmerken } from "@/types/b2b";
import LocatieAutocomplete from "@/components/zakelijk/LocatieAutocomplete";
import {
  MapPinIcon,
  HomeIcon,
  BuildingIcon,
  DoorIcon,
  LayersIcon,
  LeafIcon,
  SunIcon,
  ParkIcon,
  OpritIcon,
  LiftIcon,
  BoltIcon,
  CheckIcon,
  RulerIcon,
} from "@/components/report/icons";

function euro(bedrag: number | null): string {
  if (bedrag == null) return "";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

// Duizendtal-scheidingstekens tijdens typen (bv. "450000" -> "450.000") --
// BUGFIX: zonder deze opmaak was op het oog nauwelijks te zien hoeveel er
// al ingevuld was in het budgetveld, zie het gesprek hierover. Intern blijft
// alleen de kale cijferreeks (budgetMin/budgetMax state) de bron van
// waarheid; dit is puur weergave-opmaak.
function formatDuizendtal(ruweCijfers: string): string {
  if (!ruweCijfers) return "";
  return new Intl.NumberFormat("nl-NL").format(Number(ruweCijfers));
}

// Sneltoetsen voor het budget -- "makkelijker in te voeren" i.p.v. alleen
// twee kale tekstvelden: één klik zet meteen een realistische bandbreedte.
const BUDGET_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Tot € 300.000", min: null, max: 300_000 },
  { label: "€ 300k – € 500k", min: 300_000, max: 500_000 },
  { label: "€ 500k – € 750k", min: 500_000, max: 750_000 },
  { label: "€ 750.000+", min: 750_000, max: null },
];

// Vaste stappen i.p.v. een vrij invoerveld voor kamers/slaapkamers/m² -- dit
// zijn de numerieke kenmerken die als tegel (aan/uit, net als de rest van de
// checklist) blijven werken. Slaapkamers begint bewust bij 1 (was 2 t/m 4) --
// zie ook de bugfix hieronder: minSlaapkamers werd voorheen HELEMAAL niet
// aan Funda doorgegeven (zie lib/data-sources/fundaFeed.ts), dus "filter op
// 2 slaapkamers" leverde ook 1-slaapkamerwoningen op. Nu écht een filter,
// dus 1+ is een zinvolle (en veelgevraagde) ondergrens.
const KAMERS_OPTIES = [3, 4, 5];
const SLAAPKAMERS_OPTIES = [1, 2, 3, 4];
const M2_OPTIES = [50, 75, 100, 125, 150];

const WONINGTYPE_ICOON: Record<B2bWoningtype, typeof HomeIcon> = {
  tussenwoning: HomeIcon,
  hoekwoning: HomeIcon,
  "2-onder-1-kapwoning": HomeIcon,
  "vrijstaande-woning": HomeIcon,
  appartement: BuildingIcon,
};

// Bewuste, begrensde budget-schaal (0 - 1.500.000) puur om de balk onder de
// twee bedragvelden visueel te vullen -- geen los interactief
// slider-element (drag/touch-logica voor twee onafhankelijke handvatten is
// foutgevoelig en voegt weinig toe boven de twee tekstvelden zelf, die al
// de daadwerkelijke invoer zijn).
const BUDGET_SCHAAL_MAX = 1_500_000;

function Tegel({
  actief,
  icoon: Icoon,
  label,
  onClick,
}: {
  actief: boolean;
  icoon: (props: { className?: string }) => React.ReactElement;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border px-2 py-2.5 text-center transition-colors ${
        actief ? "border-accent bg-[#EEF0FF]" : "border-ink/10 bg-mist/50 hover:bg-mist"
      }`}
    >
      {actief && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
          <CheckIcon className="h-2.5 w-2.5" />
        </span>
      )}
      <Icoon className={`mx-auto h-5 w-5 ${actief ? "text-accent" : "text-ink/40"}`} />
      <p className={`mt-1.5 text-[10.5px] font-semibold leading-tight ${actief ? "text-accent" : "text-ink/60"}`}>{label}</p>
    </button>
  );
}

// -----------------------------------------------------------------------------
// Zoekopdracht bewerken (#3), volledig herontworpen:
//   - locatie is nu een gestructureerde, via PDOK-autocomplete gekozen plaats
//     of wijk (LocatieAutocomplete.tsx) i.p.v. vrije tekst -- dat is meteen
//     ook de exacte Funda-zoekslug, dus geen los "matchInstelling"-veld meer.
//   - "moet hebben" is een vaste, aanvinkbare checklist i.p.v. een tekstvlak:
//     vrije tekst is voor een mens leesbaar maar onbruikbaar als filter op de
//     Funda-feed (zie kenmerkenSegmenten() in lib/data-sources/fundaFeed.ts).
//   - opslaan met een gekozen locatie haalt DIRECT (matches-verversen) tot 5
//     actueel te koop staande woningen op die aan de criteria voldoen, zodat
//     de makelaar niet hoeft te wachten op de eerstvolgende dagelijkse cron
//     (die daarna wél gewoon actief blijft zolang matchenActief aan staat).
// -----------------------------------------------------------------------------
export default function ZoekopdrachtForm({ dossierId, huidig }: { dossierId: string; huidig: B2bZoekopdracht | undefined }) {
  const router = useRouter();
  const [bewerken, setBewerken] = useState(false);
  const [budgetMin, setBudgetMin] = useState(huidig?.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(huidig?.budgetMax?.toString() ?? "");
  const [locatie, setLocatie] = useState<B2bLocatie | null>(huidig?.locatie ?? null);
  const [kenmerken, setKenmerken] = useState<B2bKenmerken>(huidig?.kenmerken ?? legeKenmerken());
  const [matchenActief, setMatchenActief] = useState(huidig?.matchenActief ?? false);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  // Los van `bezig` (dat dekt alleen het opslaan zelf) -- deze staat
  // specifiek aan tijdens het live doorzoeken van Funda ná het opslaan, zo
  // is precies te tonen WANNEER het "zoeken" (i.p.v. "opslaan") bezig is.
  // Zie ook MatchesKaart.tsx voor dezelfde, duidelijkere melding bij de
  // losse "Ververs"-knop.
  const [zoekBezig, setZoekBezig] = useState(false);

  const heeftData = huidig && (huidig.budgetMin || huidig.budgetMax || huidig.locatie || huidig.matchenActief);

  function zetBoolean(key: keyof B2bKenmerken) {
    setKenmerken((k) => ({ ...k, [key]: !k[key] }));
  }

  function zetGetal(key: "minKamers" | "minSlaapkamers" | "minWoonoppervlak", waarde: number) {
    setKenmerken((k) => ({ ...k, [key]: k[key] === waarde ? null : waarde }));
  }

  async function opslaan() {
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zoekopdracht: {
            budgetMin: budgetMin ? Number(budgetMin) : null,
            budgetMax: budgetMax ? Number(budgetMax) : null,
            locatie,
            kenmerken,
            matchenActief: matchenActief && Boolean(locatie),
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMelding(body.error ?? "Opslaan is niet gelukt.");
        setBezig(false);
        return;
      }

      if (locatie) {
        setMelding("Opgeslagen. Bezig met zoeken naar woningen op Funda…");
        setZoekBezig(true);
        try {
          const versRes = await fetch(`/api/zakelijk/klanten/${dossierId}/matches-verversen`, { method: "POST" });
          const versBody = await versRes.json();
          setMelding(versRes.ok ? `Opgeslagen -- ${versBody.nieuweMatches} nieuwe woning(en) gevonden.` : "Opgeslagen.");
        } catch {
          setMelding("Opgeslagen.");
        } finally {
          setZoekBezig(false);
        }
      } else {
        setMelding("Opgeslagen.");
      }

      setBezig(false);
      setBewerken(false);
      router.refresh();
    } catch {
      setMelding("Opslaan is niet gelukt.");
      setBezig(false);
    }
  }

  if (!bewerken) {
    const actieveKenmerken = [
      kenmerken.woningtype ? B2B_WONINGTYPES.find((w) => w.waarde === kenmerken.woningtype)?.label : null,
      kenmerken.minKamers ? `${kenmerken.minKamers}+ kamers` : null,
      kenmerken.minSlaapkamers ? `${kenmerken.minSlaapkamers}+ slaapkamers` : null,
      kenmerken.minWoonoppervlak ? `${kenmerken.minWoonoppervlak}+ m²` : null,
      kenmerken.tuin ? "Tuin" : null,
      kenmerken.balkon ? "Balkon" : null,
      kenmerken.dakterras ? "Dakterras" : null,
      kenmerken.garage ? "Garage" : null,
      kenmerken.lift ? "Lift" : null,
      kenmerken.minEnergielabel ? `Label ${kenmerken.minEnergielabel} of hoger` : null,
    ].filter((x): x is string => Boolean(x));

    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Zoekopdracht</p>
          <button type="button" onClick={() => setBewerken(true)} className="text-[10.5px] font-semibold text-accent hover:underline">
            {heeftData ? "Bewerken" : "+ Toevoegen"}
          </button>
        </div>
        {heeftData ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {huidig?.locatie && (
              <span className="flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-ink">
                <MapPinIcon className="h-3 w-3 shrink-0 text-ink/40" />
                {huidig.locatie.label}
              </span>
            )}
            {(huidig?.budgetMin || huidig?.budgetMax) && (
              <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-ink">
                {huidig?.budgetMin ? euro(huidig.budgetMin) : "€0"} – {huidig?.budgetMax ? euro(huidig.budgetMax) : "onbekend"}
              </span>
            )}
            {actieveKenmerken.map((label) => (
              <span key={label} className="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[11px] font-semibold text-accent">
                {label}
              </span>
            ))}
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                matchenActief ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-ink/5 text-ink/40"
              }`}
            >
              <BoltIcon className="h-3 w-3" />
              Automatisch {matchenActief ? "aan" : "uit"}
            </span>
          </div>
        ) : (
          <p className="mt-2 text-[11.5px] text-ink/40">Nog geen zoekopdracht vastgelegd voor dit dossier.</p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-ink/[0.06] p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Zoekopdracht bewerken</p>

        <p className="mt-3 text-[10.5px] font-semibold text-ink/40">Budget</p>
        <div className="mt-1.5 flex gap-2">
          <div className="relative w-1/2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] font-semibold text-ink/30">€</span>
            <input
              value={formatDuizendtal(budgetMin)}
              onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ""))}
              placeholder="Min."
              inputMode="numeric"
              className="w-full rounded-lg border border-ink/15 py-2.5 pl-6 pr-2.5 text-[13px] font-semibold text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div className="relative w-1/2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] font-semibold text-ink/30">€</span>
            <input
              value={formatDuizendtal(budgetMax)}
              onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ""))}
              placeholder="Max."
              inputMode="numeric"
              className="w-full rounded-lg border border-ink/15 py-2.5 pl-6 pr-2.5 text-[13px] font-semibold text-ink focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {BUDGET_PRESETS.map((preset) => {
            const actief = (preset.min?.toString() ?? "") === budgetMin && (preset.max?.toString() ?? "") === budgetMax;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setBudgetMin(preset.min ? preset.min.toString() : "");
                  setBudgetMax(preset.max ? preset.max.toString() : "");
                }}
                className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
                  actief ? "border-accent bg-[#EEF0FF] text-accent" : "border-ink/10 bg-mist/50 text-ink/55 hover:bg-mist"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="relative mt-3 h-2 rounded-full bg-ink/[0.06]">
          <div
            className="absolute h-2 rounded-full bg-accent"
            style={{
              left: `${Math.min(100, ((Number(budgetMin) || 0) / BUDGET_SCHAAL_MAX) * 100)}%`,
              right: `${Math.max(0, 100 - ((Number(budgetMax) || BUDGET_SCHAAL_MAX) / BUDGET_SCHAAL_MAX) * 100)}%`,
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9.5px] font-medium text-ink/30">
          <span>€ 0</span>
          <span>€ 750.000</span>
          <span>€ 1,5 mln+</span>
        </div>

        <p className="mt-3.5 text-[10.5px] font-semibold text-ink/40">Locatie</p>
        <div className="mt-1.5">
          <LocatieAutocomplete waarde={locatie} onKiezen={setLocatie} />
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10.5px] font-semibold text-ink/40">Kies eisen uit de lijst -- vrije tekst wordt niet meegenomen bij het matchen</p>

        <p className="mt-3 text-[10.5px] font-bold uppercase tracking-wide text-ink/30">Woningtype</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {B2B_WONINGTYPES.map((w) => (
            <Tegel
              key={w.waarde}
              actief={kenmerken.woningtype === w.waarde}
              icoon={WONINGTYPE_ICOON[w.waarde]}
              label={w.label}
              onClick={() => setKenmerken((k) => ({ ...k, woningtype: k.woningtype === w.waarde ? null : w.waarde }))}
            />
          ))}
        </div>

        <p className="mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-ink/30">Ruimte</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-7">
          {KAMERS_OPTIES.map((n) => (
            <Tegel
              key={`kamers-${n}`}
              actief={kenmerken.minKamers === n}
              icoon={DoorIcon}
              label={`${n}+ kamers`}
              onClick={() => zetGetal("minKamers", n)}
            />
          ))}
          {SLAAPKAMERS_OPTIES.map((n) => (
            <Tegel
              key={`slaapkamers-${n}`}
              actief={kenmerken.minSlaapkamers === n}
              icoon={LayersIcon}
              label={`${n}+ slaapkamers`}
              onClick={() => zetGetal("minSlaapkamers", n)}
            />
          ))}
          <Tegel actief={kenmerken.lift} icoon={LiftIcon} label="Lift" onClick={() => zetBoolean("lift")} />
        </div>

        <p className="mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-ink/30">Woonoppervlak</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {M2_OPTIES.map((n) => (
            <Tegel
              key={`m2-${n}`}
              actief={kenmerken.minWoonoppervlak === n}
              icoon={RulerIcon}
              label={`${n}+ m²`}
              onClick={() => zetGetal("minWoonoppervlak", n)}
            />
          ))}
        </div>

        <p className="mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-ink/30">Buiten en parkeren</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <Tegel actief={kenmerken.tuin} icoon={LeafIcon} label="Tuin" onClick={() => zetBoolean("tuin")} />
          <Tegel actief={kenmerken.balkon} icoon={SunIcon} label="Balkon" onClick={() => zetBoolean("balkon")} />
          <Tegel actief={kenmerken.dakterras} icoon={ParkIcon} label="Dakterras" onClick={() => zetBoolean("dakterras")} />
          <Tegel actief={kenmerken.garage} icoon={OpritIcon} label="Garage" onClick={() => zetBoolean("garage")} />
        </div>

        <p className="mt-3.5 text-[10.5px] font-bold uppercase tracking-wide text-ink/30">Energielabel</p>
        <p className="mt-1 text-[10px] text-ink/35">Elke keuze is een ondergrens -- "C" betekent C of beter.</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setKenmerken((k) => ({ ...k, minEnergielabel: null }))}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${
              kenmerken.minEnergielabel === null ? "border-accent bg-[#EEF0FF] text-accent" : "border-ink/10 bg-mist/50 text-ink/55 hover:bg-mist"
            }`}
          >
            {kenmerken.minEnergielabel === null && <CheckIcon className="h-3 w-3" />}
            Geen voorkeur
          </button>
          {B2B_ENERGIELABELS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setKenmerken((k) => ({ ...k, minEnergielabel: k.minEnergielabel === label ? null : label }))}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors ${
                kenmerken.minEnergielabel === label ? "border-accent bg-[#EEF0FF] text-accent" : "border-ink/10 bg-mist/50 text-ink/55 hover:bg-mist"
              }`}
            >
              <BoltIcon className={`h-3 w-3 ${kenmerken.minEnergielabel === label ? "text-accent" : "text-ink/30"}`} />
              {label} of hoger
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-ink/[0.06] bg-mist/40 px-4 py-3">
        <button
          type="button"
          onClick={() => setMatchenActief((v) => !v)}
          disabled={!locatie}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors disabled:opacity-40 ${
            matchenActief ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-ink/5 text-ink/50"
          }`}
          title={locatie ? undefined : "Kies eerst een locatie"}
        >
          <BoltIcon className="h-3 w-3" />
          Meldingen {matchenActief ? "aan" : "uit"}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBewerken(false)}
            disabled={bezig}
            className="rounded-lg bg-ink/5 px-3.5 py-2 text-[11.5px] font-semibold text-ink/60 hover:bg-ink/10"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={opslaan}
            disabled={bezig}
            className="rounded-lg bg-accent px-3.5 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {bezig ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
      {melding && (
        <p className="flex items-center gap-2 border-t border-ink/[0.06] px-4 py-2 text-[10.5px] font-semibold text-accent">
          {zoekBezig && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />}
          {melding}
        </p>
      )}
    </div>
  );
}
