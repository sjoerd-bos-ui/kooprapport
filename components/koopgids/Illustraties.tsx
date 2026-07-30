import { CheckIcon, HomeIcon, BuildingIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Kleine, zelfstandige illustraties tussen de lopende tekst van een
// Koopgids-artikel, specifiek voor "Hoe bepaalt u de waarde van een woning?"
// (lib/content/koopgids.ts, artikel "woningwaarde-bepalen"). Eerst als
// visualize-mockup afgestemd met Sjoerd voordat dit gebouwd is.
//
// Bewust GEEN losse afbeeldingsbestanden (geen stockfoto's, geen AI-
// gegenereerde plaatjes): dit zijn kleine, feitelijke datavisualisaties
// (dezelfde cijfers als in de lopende tekst hierboven/onder de illustratie),
// in dezelfde flat-design-taal als de rest van de site. Herbruikbaar
// opgezet als losse componenten zodat toekomstige artikelen dezelfde
// aanpak kunnen volgen.
// -----------------------------------------------------------------------------

export function DriePrijzenIllustratie() {
  return (
    <div className="my-5 grid grid-cols-3 gap-2.5">
      <div className="rounded-2xl bg-parchment p-3.5">
        <p className="text-[11.5px] font-bold text-ink">Vraagprijs</p>
        <p className="mt-1 text-[11px] leading-snug text-ink/55">Een strategische opening, geen feit.</p>
      </div>
      <div className="rounded-2xl bg-parchment p-3.5">
        <p className="text-[11.5px] font-bold text-ink">WOZ-waarde</p>
        <p className="mt-1 text-[11px] leading-snug text-ink/55">Voor de belasting, loopt achter.</p>
      </div>
      <div className="rounded-2xl border border-[#cfe3ba] bg-[#EAF3DE] p-3.5">
        <p className="flex items-center gap-1 text-[11.5px] font-bold text-[#27500A]">
          Verkoopprijs <CheckIcon className="h-3 w-3" />
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[#3B6D11]">Wat er écht betaald is.</p>
      </div>
    </div>
  );
}

const OVERBIEDEN_DATA = [
  { label: "Landelijk", percentage: "4,6%", hoogte: 38, kleur: "#C7C6F0" },
  { label: "Groot-A'dam", percentage: "5,9%", hoogte: 50, kleur: "#8B85E8" },
  { label: "Groningen", percentage: "8,8%", hoogte: 70, kleur: "#4F46E5" },
];

export function OverbiedenStaafjesIllustratie() {
  return (
    <div className="my-5 rounded-2xl bg-parchment p-5">
      <p className="mb-3.5 text-[11px] font-bold uppercase tracking-wider3 text-ink/45">
        Gemiddeld overboden · Q2 2026
      </p>
      <div className="flex h-20 items-end gap-4">
        {OVERBIEDEN_DATA.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] font-extrabold text-ink">{d.percentage}</span>
            <div className="w-full rounded-md" style={{ height: d.hoogte, backgroundColor: d.kleur }} />
            <span className="text-center text-[9.5px] text-ink/50">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BandbreedteIllustratie() {
  return (
    <div className="my-5 rounded-2xl bg-parchment p-5">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider3 text-ink/45">
        Voorbeeld: waarde-indicatie in een rapport
      </p>
      <div
        className="mb-2.5 h-2.5 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, #E4E4EC 0%, #C7C6F0 30%, #4F46E5 55%, #C7C6F0 80%, #E4E4EC 100%)",
        }}
      />
      <div className="flex justify-between text-[10.5px] text-ink/45">
        <span>€1.180.000</span>
        <span className="font-extrabold text-ink">€1.264.000</span>
        <span>€1.340.000</span>
      </div>
    </div>
  );
}

const GEBRUIKSSCENARIOS = [
  {
    titel: "Voor u biedt",
    tekst: "Vergelijk de vraagprijs met de bandbreedte, zo weet u waar u qua bod ongeveer aan toe bent.",
    icoon: CheckIcon,
  },
  {
    titel: "Bij verkoop",
    tekst: "Een handig ijkpunt vóór het gesprek met een makelaar, niet los een cijfer uit de lucht.",
    icoon: HomeIcon,
  },
  {
    titel: "Bij financiering",
    tekst: "Een vroeg beeld van de verhouding tussen vraagprijs en verwachte onderpandwaarde.",
    icoon: BuildingIcon,
  },
];

export function GebruiksscenariosIllustratie() {
  return (
    <div className="my-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {GEBRUIKSSCENARIOS.map((s) => {
        const Icon = s.icoon;
        return (
          <div key={s.titel} className="rounded-2xl border border-ink/10 bg-white p-3.5">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
              <Icon className="h-3 w-3" />
            </span>
            <p className="mt-2 text-[11px] font-bold text-ink">{s.titel}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-ink/55">{s.tekst}</p>
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Illustraties voor "Wat verkopen in uw buurt zeggen over de prijs"
// (artikel "verkopen-in-de-buurt").
// -----------------------------------------------------------------------------

const MARKTCIJFERS = [
  { waarde: "45.200", label: "verkocht Q2", accent: false },
  { waarde: "56.700", label: "te koop gezet", accent: false },
  { waarde: "€506k", label: "gem. prijs (+3,4%)", accent: true },
  { waarde: "28-32", label: "dagen te koop", accent: false },
];

export function MarktcijfersIllustratie() {
  return (
    <div className="my-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MARKTCIJFERS.map((m) => (
        <div
          key={m.label}
          className={`rounded-xl p-3 text-center ${m.accent ? "bg-[#EEF0FF]" : "bg-parchment"}`}
        >
          <p className={`text-[15px] font-extrabold ${m.accent ? "text-accent" : "text-ink"}`}>{m.waarde}</p>
          <p className={`mt-0.5 text-[9px] leading-snug ${m.accent ? "text-accent" : "text-ink/50"}`}>{m.label}</p>
        </div>
      ))}
    </div>
  );
}

export function KrimpflatieIllustratie() {
  return (
    <div className="my-5 rounded-2xl bg-parchment p-5">
      <p className="mb-3.5 text-[11px] font-bold uppercase tracking-wider3 text-ink/45">"Krimpflatie" in beeld</p>
      <div className="flex gap-6">
        <div className="flex-1">
          <p className="mb-1.5 text-[10px] text-ink/50">Prijs per m²</p>
          <svg viewBox="0 0 100 36" className="h-9 w-full">
            <polyline
              points="0,30 25,24 50,18 75,10 100,4"
              fill="none"
              stroke="#4F46E5"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="mb-1.5 text-[10px] text-ink/50">Gem. oppervlakte</p>
          <svg viewBox="0 0 100 36" className="h-9 w-full">
            <polyline
              points="0,6 25,12 50,18 75,24 100,28"
              fill="none"
              stroke="#D97706"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function OppervlakteTolerantieIllustratie() {
  return (
    <div className="my-5 rounded-2xl bg-parchment p-5">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider3 text-ink/45">
        ±22% oppervlaktetolerantie · voorbeeld bij 120 m²
      </p>
      <div className="relative mb-2 h-2 rounded-full bg-line">
        <div className="absolute inset-y-0 left-[22%] right-[22%] rounded-full bg-accent" />
        <div className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink" />
      </div>
      <div className="flex justify-between text-[10px] text-ink/45">
        <span>94 m²</span>
        <span className="font-extrabold text-ink">120 m² (uw woning)</span>
        <span>146 m²</span>
      </div>
    </div>
  );
}

const TIPS = [
  { emoji: "📈", titel: "Spreiding", tekst: "Eén uitschieter trekt het gemiddelde scheef." },
  { emoji: "🛠", titel: "Renovatie", tekst: "Zegt meer over de verbouwing dan de buurt." },
  { emoji: "☀️", titel: "Seizoen", tekst: "Zomer beweegt anders dan winter." },
  { emoji: "💳", titel: "Bijkomende kosten", tekst: "Overdrachtsbelasting zit niet in de koopsom." },
];

export function TipsGridIllustratie() {
  return (
    <div className="my-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {TIPS.map((t) => (
        <div key={t.titel} className="rounded-2xl border border-ink/10 bg-white p-3.5">
          <p className="text-[11px] font-bold text-ink">
            {t.emoji} {t.titel}
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-ink/55">{t.tekst}</p>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Illustraties voor "Wat bouwjaar, oppervlakte en gebruiksdoel u eigenlijk
// vertellen" (artikel "bouwjaar-en-gebruiksdoel").
// -----------------------------------------------------------------------------

const OVERIGE_GEBRUIKSFUNCTIES = ["Kantoorfunctie", "Winkelfunctie", "Bijeenkomstfunctie", "+ 7 andere"];

export function GebruiksfunctiesIllustratie() {
  return (
    <div className="my-5 flex flex-wrap gap-1.5">
      <span className="flex items-center gap-1.5 rounded-full border border-[#cfe3ba] bg-[#EAF3DE] px-3 py-1.5 text-[11px] font-bold text-[#27500A]">
        <CheckIcon className="h-2.5 w-2.5" /> Woonfunctie
      </span>
      {OVERIGE_GEBRUIKSFUNCTIES.map((f) => (
        <span key={f} className="rounded-full bg-parchment px-3 py-1.5 text-[11px] text-ink/55">
          {f}
        </span>
      ))}
    </div>
  );
}

const DRIE_LABELS = [
  { titel: "Gebruiksdoel", tekst: "BAG · vergund gebruik", accent: false },
  { titel: "Bestemmingsplan", tekst: "Gemeente · wat er mag", accent: false },
  { titel: "Feitelijk gebruik", tekst: "Wat er echt gebeurt", accent: true },
];

export function DrieLabelsIllustratie() {
  return (
    <div className="my-5 grid grid-cols-3 gap-2.5">
      {DRIE_LABELS.map((l) => (
        <div
          key={l.titel}
          className={`rounded-2xl p-3.5 text-center ${l.accent ? "border border-[#f0cccb] bg-[#FBEAEA]" : "bg-parchment"}`}
        >
          <p className={`text-[11px] font-bold ${l.accent ? "text-rust" : "text-ink"}`}>{l.titel}</p>
          <p className={`mt-1 text-[10px] leading-snug ${l.accent ? "text-rust" : "text-ink/55"}`}>{l.tekst}</p>
        </div>
      ))}
    </div>
  );
}

const ISOLATIE_PERIODES = [
  { label: "voor 1925", hoogte: 12, kleur: "#E4E4EC" },
  { label: "1925-1975", hoogte: 22, kleur: "#C7C6F0" },
  { label: "1992", hoogte: 34, kleur: "#8B85E8" },
  { label: "2000+", hoogte: 48, kleur: "#4F46E5" },
];

export function IsolatieTijdlijnIllustratie() {
  return (
    <div className="my-5 rounded-2xl bg-parchment p-5">
      <p className="mb-3.5 text-[11px] font-bold uppercase tracking-wider3 text-ink/45">
        Isolatiekwaliteit per bouwperiode
      </p>
      <div className="flex h-16 items-end gap-2.5">
        {ISOLATIE_PERIODES.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="w-full rounded-md" style={{ height: p.hoogte, backgroundColor: p.kleur }} />
            <span className="text-center text-[9px] text-ink/50">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const OPPERVLAKTE_ITEMS = [
  { tekst: "Woonkamer, keuken, slaapkamer", telt: true },
  { tekst: "Zolder vanaf 1,5 m hoogte", telt: true },
  { tekst: "Inpandige garage", telt: false },
  { tekst: "Balkon of terras", telt: false },
];

export function OppervlakteWelNietIllustratie() {
  return (
    <div className="my-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {OPPERVLAKTE_ITEMS.map((item) => (
        <div
          key={item.tekst}
          className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${item.telt ? "bg-[#EAF3DE]" : "bg-[#FBEAEA]"}`}
        >
          <span className={`font-extrabold ${item.telt ? "text-[#27500A]" : "text-rust"}`}>{item.telt ? "✓" : "✕"}</span>
          <span className={`text-[11px] font-semibold ${item.telt ? "text-[#27500A]" : "text-rust"}`}>{item.tekst}</span>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Illustraties voor "Energielabel uitgelegd: wat de letters betekenen"
// (artikel "energielabel-uitgelegd"). Bewust maar twee illustraties, rustiger
// dan de eerste opzet (4 illustraties met statkaarten oogde te druk) — de
// cijfers over labelverdeling, voorlopig/definitief en hypotheekimpact staan
// in de lopende tekst zelf, niet nog eens los in een kaartje.
// -----------------------------------------------------------------------------

const LABEL_KLASSEN = [
  { letter: "A", kleur: "#1F8A3D", tekst: "#fff" },
  { letter: "B", kleur: "#5BAA3B", tekst: "#fff" },
  { letter: "C", kleur: "#A8C93B", tekst: "#1F1F2E" },
  { letter: "D", kleur: "#F0C93B", tekst: "#1F1F2E" },
  { letter: "E", kleur: "#F0983B", tekst: "#fff" },
  { letter: "F", kleur: "#E8623B", tekst: "#fff" },
  { letter: "G", kleur: "#D8323B", tekst: "#fff" },
];

export function EnergielabelSchaalIllustratie() {
  return (
    <div className="my-5 flex h-[26px] overflow-hidden rounded-lg">
      {LABEL_KLASSEN.map((k) => (
        <div
          key={k.letter}
          className="flex flex-1 items-center justify-center text-[10.5px] font-extrabold"
          style={{ backgroundColor: k.kleur, color: k.tekst }}
        >
          {k.letter}
        </div>
      ))}
    </div>
  );
}

const DEADLINES = [
  { jaar: "2026", tekst: "geen verhuur label E" },
  { jaar: "2029", tekst: "huur min. label D" },
  { jaar: "2030", tekst: "-16% verbruik" },
  { jaar: "2035", tekst: "-20 tot 22%" },
];

export function DeadlineTijdlijnIllustratie() {
  return (
    <div className="relative my-5 px-1">
      <div className="absolute inset-x-0 top-[5px] h-0.5 bg-line" />
      <div className="relative flex justify-between">
        {DEADLINES.map((d) => (
          <div key={d.jaar} className="flex flex-col items-center gap-2.5">
            <div className="h-3 w-3 rounded-full border-2 border-white bg-accent" />
            <div>
              <p className="text-center text-[11px] font-extrabold text-ink">{d.jaar}</p>
              <p className="mt-0.5 max-w-[70px] text-center text-[9px] leading-snug text-ink/50">{d.tekst}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
