import Link from "next/link";
import type { B2bRapportAanvraag } from "@/types/b2b";
import { berekenBiedadvies } from "@/lib/services/biedadvies";
import { duidEnergielabel } from "@/lib/utils/energielabel";
import { TrendingUpIcon, BoltIcon, ScaleIcon, AlertTriangleIcon, MapPinIcon, HomeIcon, ArrowRightIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Gedeelde, visueel opgewaardeerde vergelijktabel (#2) -- één rijen-op-
// kolommen tabel i.p.v. losse, herhalende kaarten, zodat elk kenmerk
// (waarde, biedadvies, energielabel, fundering, buurt) in één oogopslag naast
// elkaar staat. Hergebruikt door zowel de losse vergelijkpagina
// (app/zakelijk/(dashboard)/vergelijken) als het klantdossier
// (KlantVergelijken.tsx), zodat beide plekken exact dezelfde, ene
// implementatie tonen i.p.v. twee losse die uiteen kunnen lopen.
// -----------------------------------------------------------------------------

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
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
  { label: "Biedadvies", icoon: ScaleIcon },
  { label: "Energielabel", icoon: BoltIcon },
  { label: "Funderingsrisico", icoon: AlertTriangleIcon },
  { label: "Buurtprofiel", icoon: MapPinIcon },
];

export default function VergelijkTabel({ details }: { details: B2bRapportAanvraag[] }) {
  if (details.length === 0) return null;

  const waardes = details.map((d) => d.report.market.data?.geschatteWaarde ?? d.report.market.data?.bandbreedteMin ?? null);
  const geldigeWaardes = waardes.filter((w): w is number => w != null);
  const minWaarde = geldigeWaardes.length > 1 ? Math.min(...geldigeWaardes) : null;
  const maxWaarde = geldigeWaardes.length > 1 ? Math.max(...geldigeWaardes) : null;

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

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <div className="min-w-[560px]" style={{ display: "grid", gridTemplateColumns: `152px repeat(${details.length}, minmax(160px, 1fr))` }}>
        {/* Kopregel: adres per kolom */}
        <div className="border-b border-ink/[0.06] px-4 py-3.5" />
        {details.map((d) => (
          <div key={`kop-${d.id}`} className="border-b border-l border-ink/[0.06] px-4 py-3.5">
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

        {RIJEN.map((rij, rijIndex) => (
          <RijGroep
            key={rij.label}
            rij={rij}
            details={details}
            minWaarde={minWaarde}
            maxWaarde={maxWaarde}
            besteFundering={besteFundering}
            besteEnergieIndex={besteEnergieIndex}
            gestreept={rijIndex % 2 === 1}
          />
        ))}

        {/* Voetregel: link naar volledig rapport */}
        <div className="px-4 py-3" />
        {details.map((d) => (
          <div key={`voet-${d.id}`} className="border-l border-ink/[0.06] px-4 py-3">
            <Link
              href={`/zakelijk/rapporten/${d.id}`}
              className="flex items-center gap-1 text-[10.5px] font-semibold text-accent hover:underline"
            >
              Volledig rapport <ArrowRightIcon className="h-2.5 w-2.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function RijGroep({
  rij,
  details,
  minWaarde,
  maxWaarde,
  besteFundering,
  besteEnergieIndex,
  gestreept,
}: {
  rij: RijConfig;
  details: B2bRapportAanvraag[];
  minWaarde: number | null;
  maxWaarde: number | null;
  besteFundering: string | null;
  besteEnergieIndex: number | null;
  gestreept: boolean;
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
          const isLaagste = waarde != null && waarde === minWaarde;
          const isHoogste = waarde != null && waarde === maxWaarde;
          return (
            <div key={d.id} className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${achtergrond}`}>
              <p className="text-[12.5px] font-bold text-ink">
                {euro(bandbreedteMin ?? waarde)}
                {bandbreedteMax ? ` – ${euro(bandbreedteMax)}` : ""}
              </p>
              {isLaagste && <Badge tekst="laagste" kleur="bg-[#EAF3DE] text-[#3B6D11]" />}
              {isHoogste && <Badge tekst="hoogste" kleur="bg-[#FBEAE0] text-rust" />}
            </div>
          );
        }
        if (rij.label === "Biedadvies") {
          const advies = berekenBiedadvies(d.report.market.data?.geschatteWaarde, d.adres.plaats);
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
    </>
  );
}

function Badge({ tekst, kleur }: { tekst: string; kleur: string }) {
  return <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${kleur}`}>{tekst}</span>;
}
