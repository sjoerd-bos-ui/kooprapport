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
