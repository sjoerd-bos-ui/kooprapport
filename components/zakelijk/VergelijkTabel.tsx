import Link from "next/link";
import type { B2bRapportAanvraag } from "@/types/b2b";
import { berekenBiedadvies } from "@/lib/services/biedadvies";
import { duidEnergielabel } from "@/lib/utils/energielabel";
import { TrendingUpIcon, BoltIcon, ScaleIcon, AlertTriangleIcon, MapPinIcon, HomeIcon, ArrowRightIcon, RulerIcon, PlusIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Gedeelde, visueel opgewaardeerde vergelijktabel -- één rijen-op-kolommen
// tabel i.p.v. losse, herhalende kaarten, zodat elk kenmerk (waarde,
// woonoppervlak, biedadvies, energielabel, fundering, buurt) in één oogopslag
// naast elkaar staat. Hergebruikt door zowel de losse vergelijkpagina
// (app/zakelijk/(dashboard)/vergelijken) als het klantdossier
// (DossierVergelijken.tsx), zodat beide plekken exact dezelfde, ene
// implementatie tonen i.p.v. twee losse die uiteen kunnen lopen.
//
// HERONTWERP V2 (zie het Cowork-gesprek "even terug naar de vergelijkings-
// pagina, visualize dit echt veel mooier en handiger"): drie toevoegingen
// bovenop de eerste opwaardering:
//   1. Woonoppervlak als nieuwe rij -- de data (report.building.data?.
//      oppervlakteM2, BAG-bron) bestond al in elk rapport, werd alleen nog
//      nergens in de vergelijking getoond.
//   2. Delta-cijfers ("− € 28.000", "− 12 m²") naast elke niet-winnende
//      numerieke waarde, i.p.v. alleen een kleur/badge -- scheelt de
//      makelaar zelf te moeten aftrekken. Categorische rijen (energielabel,
//      fundering) hebben geen zinnig numeriek verschil, die houden de
//      bestaande "beste"-badge.
//   3. Een "Beste keuze"-lint op de kolom die op de meeste van de vier
//      meetbare rijen (waarde, woonoppervlak, energielabel, fundering) wint
//      -- alleen getoond bij een ondubbelzinnige winnaar (geen gelijkspel,
//      minstens 1 stem), zie berekenOverallWinnaar hieronder. Biedadvies en
//      buurtprofiel tellen bewust niet mee: biedadvies is rechtstreeks
//      afgeleid van dezelfde waarde-indicatie (zou dubbel tellen) en
//      buurtprofiel is puur tekstueel, geen vergelijkbare grootheid.
// -----------------------------------------------------------------------------

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

// Geeft "− <verschil>" t.o.v. de beste waarde in de rij, of null als deze
// kolom zelf de beste is (of als er geen zinnige vergelijking is, bv. maar
// 1 geldige waarde in de hele rij). `richting` bepaalt of laag of hoog wint
// -- "min" voor waarde/biedadvies (goedkoper = beter voor de koper), "max"
// voor woonoppervlak (groter = meer woonruimte voor hetzelfde vergelijkings-
// doel). Altijd een "−"-teken: per constructie is elke kolom die dit label
// krijgt per definitie slechter dan de winnaar op die rij, een "+" zou
// hetzelfde zeggen maar verwarrender ogen naast een minteken op de winnaar.
function deltaLabel(waarde: number | null, beste: number | null, richting: "min" | "max", formatteer: (n: number) => string): string | null {
  if (waarde == null || beste == null || waarde === beste) return null;
  const verschil = richting === "min" ? waarde - beste : beste - waarde;
  return `− ${formatteer(Math.abs(verschil))}`;
}

function besteVanRij(waarden: (number | null)[], richting: "min" | "max"): number | null {
  const geldig = waarden.filter((w): w is number => w != null);
  if (geldig.length < 2) return null;
  return richting === "min" ? Math.min(...geldig) : Math.max(...geldig);
}

const FUNDERING_VOLGORDE: Record<string, number> = { laag: 0, midden: 1, hoog: 2 };
const FUNDERING_KLEUR: Record<string, { tekst: string; bg: string }> = {
  laag: { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]" },
  midden: { tekst: "text-[#8A6200]", bg: "bg-[#FBF2DC]" },
  hoog: { tekst: "text-rust", bg: "bg-[#FBEAE0]" },
};

interface RijConfig {
  label: string;
  icoon: typeof TrendingUpIcon;
}

const RIJEN: RijConfig[] = [
  { label: "Waarde-indicatie", icoon: TrendingUpIcon },
  { label: "Woonoppervlak", icoon: RulerIcon },
  { label: "Biedadvies", icoon: ScaleIcon },
  { label: "Energielabel", icoon: BoltIcon },
  { label: "Funderingsrisico", icoon: AlertTriangleIcon },
  { label: "Buurtprofiel", icoon: MapPinIcon },
];

export default function VergelijkTabel({
  details,
  aantalMeerBeschikbaar = 0,
  publiek = false,
}: {
  details: B2bRapportAanvraag[];
  aantalMeerBeschikbaar?: number;
  // Publieke, niet-ingelogde weergave (zie app/deelvergelijking/[token]) --
  // de voetregel-link naar het volledige rapport mag dan NOOIT naar de
  // interne, login-vereisende /zakelijk/rapporten/[id] wijzen (een koper zou
  // daar alleen tegen een loginscherm aanlopen). Gebruikt in plaats daarvan
  // het bestaande per-rapport deelToken (zie B2bRapportAanvraag.deelToken)
  // als dat er is, en laat de link anders gewoon weg i.p.v. een dode/foute
  // link te tonen.
  publiek?: boolean;
}) {
  if (details.length === 0) return null;

  const waardes = details.map((d) => d.report.market.data?.geschatteWaarde ?? d.report.market.data?.bandbreedteMin ?? null);
  const minWaarde = besteVanRij(waardes, "min");
  const maxWaarde = besteVanRij(waardes, "max");

  const oppervlakken = details.map((d) => d.report.building.data?.oppervlakteM2 ?? null);
  const besteOppervlak = besteVanRij(oppervlakken, "max");

  const funderingNiveaus = details.map((d) => d.report.fundering.data?.niveau ?? null);
  const besteFundering =
    funderingNiveaus.some((n) => n != null) && new Set(funderingNiveaus.filter(Boolean)).size > 1
      ? funderingNiveaus.reduce<string | null>((beste, huidig) => {
          if (!huidig) return beste;
          if (!beste) return huidig;
          return FUNDERING_VOLGORDE[huidig] < FUNDERING_VOLGORDE[beste] ? huidig : beste;
        }, null)
      : null;

  const energieIndexen = details.map((d) => (d.report.energy.data?.klasse ? duidEnergielabel(d.report.energy.data.klasse)?.index ?? null : null));
  const besteEnergieIndex =
    energieIndexen.some((i) => i != null) && new Set(energieIndexen.filter((i) => i != null)).size > 1
      ? Math.min(...energieIndexen.filter((i): i is number => i != null))
      : null;

  // "Beste keuze"-lint: stem per rij toe aan elke kolom die op die rij de
  // beste (eventueel gedeelde) waarde heeft, tel op, en wijs alleen een
  // winnaar aan bij een ÉÉNDUIDIGE hoogste stemmenteller (>0). Bij een
  // gelijkspel liever geen lint dan een misleidend willekeurige keuze.
  const stemmen = new Map<string, number>(details.map((d) => [d.id, 0]));
  function stem(waarden: (string | number | null)[], beste: string | number | null) {
    if (beste == null) return;
    details.forEach((d, i) => {
      if (waarden[i] === beste) stemmen.set(d.id, (stemmen.get(d.id) ?? 0) + 1);
    });
  }
  stem(waardes, minWaarde);
  stem(oppervlakken, besteOppervlak);
  stem(funderingNiveaus, besteFundering);
  stem(energieIndexen, besteEnergieIndex);
  const hoogsteStemmen = Math.max(...stemmen.values());
  const winnaars = [...stemmen.entries()].filter(([, v]) => v === hoogsteStemmen).map(([id]) => id);
  const overallWinnaarId = hoogsteStemmen > 0 && winnaars.length === 1 ? winnaars[0] : null;

  const toonToevoegSlot = details.length < 3 && aantalMeerBeschikbaar > 0;
  const kolomAantal = details.length + (toonToevoegSlot ? 1 : 0);
  // Aantal meetbare rijen waarop een winnaar sowieso kón worden bepaald (dus
  // los van of "deze" winnaar ze allemaal heeft gewonnen) -- gebruikt in de
  // samenvattingszin hieronder als noemer ("wint op N van de M punten").
  const meetbareRijen = [minWaarde, besteOppervlak, besteFundering, besteEnergieIndex].filter((x) => x != null).length;
  const winnaarDetail = overallWinnaarId ? details.find((d) => d.id === overallWinnaarId) ?? null : null;

  return (
    <div>
      {winnaarDetail && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-[#EEF0FF] px-4 py-3">
          <TrendingUpIcon className="h-4 w-4 shrink-0 text-accent" />
          <p className="text-[12px] text-[#26215C]">
            <span className="font-bold">
              {winnaarDetail.adres.straat} {winnaarDetail.adres.huisnummer}
              {winnaarDetail.adres.huisletter ?? ""}
            </span>{" "}
            wint op {hoogsteStemmen} van de {meetbareRijen} vergeleken punten.
          </p>
        </div>
      )}
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <div className="min-w-[560px]" style={{ display: "grid", gridTemplateColumns: `152px repeat(${kolomAantal}, minmax(160px, 1fr))` }}>
        {/* Kopregel: adres per kolom, met "Beste keuze"-lint op de winnaar */}
        <div className="border-b border-ink/[0.06] px-4 py-3.5" />
        {details.map((d) => (
          <div key={`kop-${d.id}`} className="relative border-b border-l border-ink/[0.06] px-4 py-3.5">
            {d.id === overallWinnaarId && (
              <span className="absolute right-0 top-0 rounded-bl-lg bg-accent px-2.5 py-1 text-[9px] font-bold text-white">Beste keuze</span>
            )}
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                <HomeIcon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-extrabold text-ink">
                  {d.adres.straat} {d.adres.huisnummer}
                  {d.adres.huisletter ?? ""}
                </p>
                <p className="truncate text-[10px] text-ink/45">{d.adres.plaats}</p>
              </div>
            </div>
          </div>
        ))}
        {toonToevoegSlot && (
          <div className="border-b border-l border-ink/[0.06] px-4 py-3.5">
            <ToevoegSlot />
          </div>
        )}

        {RIJEN.map((rij, rijIndex) => (
          <RijGroep
            key={rij.label}
            rij={rij}
            details={details}
            minWaarde={minWaarde}
            maxWaarde={maxWaarde}
            besteOppervlak={besteOppervlak}
            besteFundering={besteFundering}
            besteEnergieIndex={besteEnergieIndex}
            gestreept={rijIndex % 2 === 1}
            toonToevoegSlot={toonToevoegSlot}
          />
        ))}

        {/* Voetregel: link naar volledig rapport */}
        <div className="px-4 py-3" />
        {details.map((d) => {
          const voetHref = publiek ? (d.deelToken ? `/deelrapport/${d.deelToken}` : null) : `/zakelijk/rapporten/${d.id}`;
          return (
            <div key={`voet-${d.id}`} className="border-l border-ink/[0.06] px-4 py-3">
              {voetHref && (
                <Link href={voetHref} className="flex items-center gap-1 text-[10.5px] font-semibold text-accent hover:underline">
                  Volledig rapport <ArrowRightIcon className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          );
        })}
        {toonToevoegSlot && <div className="border-l border-ink/[0.06] px-4 py-3" />}
      </div>
    </div>
    </div>
  );
}

// Bewust GEEN losse popover/dropdown hier -- de kiezer bestaat al boven de
// tabel (page.tsx / DossierVergelijken.tsx). Deze knop scrollt ernaartoe
// i.p.v. de selectielogica te dupliceren; #rapport-kiezer wordt door beide
// aanroepers op hun chip-container gezet.
function ToevoegSlot() {
  function scrollNaarKiezer() {
    document.getElementById("rapport-kiezer")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return (
    <button
      type="button"
      onClick={scrollNaarKiezer}
      className="flex h-full w-full flex-col items-center justify-center gap-1.5 py-2 text-ink/35 hover:text-accent"
    >
      <PlusIcon className="h-4 w-4" />
      <span className="text-[10px] font-semibold">Rapport toevoegen</span>
    </button>
  );
}

function RijGroep({
  rij,
  details,
  minWaarde,
  maxWaarde,
  besteOppervlak,
  besteFundering,
  besteEnergieIndex,
  gestreept,
  toonToevoegSlot,
}: {
  rij: RijConfig;
  details: B2bRapportAanvraag[];
  minWaarde: number | null;
  maxWaarde: number | null;
  besteOppervlak: number | null;
  besteFundering: string | null;
  besteEnergieIndex: number | null;
  gestreept: boolean;
  toonToevoegSlot: boolean;
}) {
  const Icon = rij.icoon;
  const achtergrond = gestreept ? "bg-parchment/40" : "";

  return (
    <>
      <div className={`flex items-center gap-2 border-b border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
        <Icon className="h-3.5 w-3.5 shrink-0 text-ink/35" />
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink/45">{rij.label}</span>
      </div>
      {details.map((d) => {
        if (rij.label === "Waarde-indicatie") {
          const waarde = d.report.market.data?.geschatteWaarde ?? null;
          const bandbreedteMin = d.report.market.data?.bandbreedteMin;
          const bandbreedteMax = d.report.market.data?.bandbreedteMax;
          const delta = deltaLabel(waarde, minWaarde, "min", euro);
          return (
            <div key={d.id} className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
              <p className="text-[12.5px] font-bold text-ink">
                {euro(bandbreedteMin ?? waarde)}
                {bandbreedteMax ? ` – ${euro(bandbreedteMax)}` : ""}
              </p>
              {delta && <p className="mt-0.5 text-[10px] font-semibold text-rust">{delta}</p>}
            </div>
          );
        }
        if (rij.label === "Woonoppervlak") {
          const oppervlak = d.report.building.data?.oppervlakteM2 ?? null;
          const delta = deltaLabel(oppervlak, besteOppervlak, "max", (n) => `${n} m²`);
          return (
            <div key={d.id} className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
              <p className="text-[12.5px] font-bold text-ink">{oppervlak != null ? `${oppervlak} m²` : "onbekend"}</p>
              {delta && <p className="mt-0.5 text-[10px] font-semibold text-rust">{delta}</p>}
            </div>
          );
        }
        if (rij.label === "Biedadvies") {
          const advies = berekenBiedadvies(d.report.market.data?.geschatteWaarde, d.adres.plaats);
          const ondergrenzen = details.map((d2) => berekenBiedadvies(d2.report.market.data?.geschatteWaarde, d2.adres.plaats)?.ondergrens ?? null);
          const besteOndergrens = besteVanRij(ondergrenzen, "min");
          const delta = deltaLabel(advies?.ondergrens ?? null, besteOndergrens, "min", euro);
          return (
            <div key={d.id} className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
              {advies ? (
                <>
                  <p className="text-[12.5px] font-bold text-ink">
                    {euro(advies.ondergrens)} – {euro(advies.bovengrens)}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-ink/40">
                    {advies.niveau === "regio" ? advies.regioNaam : "landelijk"} · {advies.periodeLabel}
                  </p>
                  {delta && <p className="mt-0.5 text-[10px] font-semibold text-rust">{delta}</p>}
                </>
              ) : (
                <p className="text-[11.5px] text-ink/40">niet beschikbaar</p>
              )}
            </div>
          );
        }
        if (rij.label === "Energielabel") {
          const klasse = d.report.energy.data?.klasse ?? null;
          const duiding = klasse ? duidEnergielabel(klasse) : null;
          const isBeste = duiding != null && duiding.index === besteEnergieIndex;
          return (
            <div key={d.id} className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
              {klasse ? (
                <span
                  className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md px-2 text-[12px] font-extrabold text-white"
                  style={{ backgroundColor: duiding?.kleur ?? "#9CA3AF" }}
                >
                  {klasse}
                </span>
              ) : (
                <p className="text-[11.5px] text-ink/40">onbekend</p>
              )}
              {isBeste && <Badge tekst="beste" kleur="bg-[#EAF3DE] text-[#3B6D11]" />}
            </div>
          );
        }
        if (rij.label === "Funderingsrisico") {
          const niveau = d.report.fundering.data?.niveau ?? null;
          const kleur = niveau ? FUNDERING_KLEUR[niveau] : null;
          const isBeste = niveau != null && niveau === besteFundering;
          return (
            <div key={d.id} className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
              {niveau && kleur ? (
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${kleur.bg} ${kleur.tekst}`}>
                  {niveau}
                </span>
              ) : (
                <p className="text-[11.5px] text-ink/40">onbekend</p>
              )}
              {isBeste && <Badge tekst="beste" kleur="bg-[#EAF3DE] text-[#3B6D11]" />}
            </div>
          );
        }
        // Buurtprofiel
        const samenvatting = d.report.buurtprofiel.data?.samenvatting ?? null;
        return (
          <div key={d.id} className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
            <p className="line-clamp-3 text-[11px] leading-relaxed text-ink/65">{samenvatting ?? "niet beschikbaar"}</p>
          </div>
        );
      })}
      {toonToevoegSlot && <div className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`} />}
    </>
  );
}

function Badge({ tekst, kleur }: { tekst: string; kleur: string }) {
  return <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${kleur}`}>{tekst}</span>;
}
