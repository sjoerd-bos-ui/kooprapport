import type { ReactNode } from "react";
import Link from "next/link";
import type { B2bWoningMatch, B2bRapportAanvraag } from "@/types/b2b";
import { duidEnergielabel } from "@/lib/utils/energielabel";
import { vindGekoppeldRapport } from "@/lib/services/matchRapportKoppeling";
import { TrendingUpIcon, RulerIcon, LayersIcon, BoltIcon, CalendarIcon, LeafIcon, LiftIcon, HomeIcon, ArrowRightIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// "Favorieten vergelijken" (zie het Cowork-gesprek "vergelijk favorieten,
// vanuit funda data"): een lichte vergelijking van de door de makelaar
// gemarkeerde favorieten (B2bWoningMatch.interessant), puur op de
// Funda-verificatiedata die al bij elke match wordt opgeslagen (zie
// B2bMatchVerificatie in types/b2b.ts) -- GEEN rapport nodig. Bewust
// hetzelfde rijen-op-kolommen grid-patroon als VergelijkTabel.tsx (dezelfde
// 152px-labelkolom, dezelfde "beste"-badge-stijl) zodat dit meteen herkenbaar
// aanvoelt als "dezelfde soort vergelijking, maar lichter", i.p.v. een nieuw
// visueel taaltje te verzinnen. De echte, diepe vergelijking (bouwtechnisch
// risico, leefbaarheid, biedadvies) blijft de bestaande "Vergelijken"-tab,
// die wél een volledig rapport per pand vereist -- de banner onderaan hier
// linkt daar bewust naartoe i.p.v. die functionaliteit te dupliceren.
// -----------------------------------------------------------------------------

function euro(bedrag: number | null): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function besteVanRij(waarden: (number | null)[], richting: "min" | "max"): number | null {
  const geldig = waarden.filter((w): w is number => w != null);
  if (geldig.length < 2) return null;
  return richting === "min" ? Math.min(...geldig) : Math.max(...geldig);
}

export default function FavorietenVergelijken({
  favorieten,
  rapporten,
  dossierId,
}: {
  favorieten: B2bWoningMatch[];
  rapporten: B2bRapportAanvraag[];
  dossierId: string;
}) {
  if (favorieten.length < 2) {
    return (
      <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
        <p className="text-[12.5px] text-ink/50">
          Markeer minstens twee matches als favoriet (het sterretje bij Matches) om ze hier naast elkaar te zien.
        </p>
      </div>
    );
  }

  const prijzen = favorieten.map((m) => m.prijs);
  const bestePrijs = besteVanRij(prijzen, "min");

  const oppervlakken = favorieten.map((m) => m.verificatie?.woonoppervlak ?? null);
  const besteOppervlak = besteVanRij(oppervlakken, "max");

  const bouwjaren = favorieten.map((m) => m.verificatie?.bouwjaar ?? null);
  const besteBouwjaar = besteVanRij(bouwjaren, "max");

  const energieIndexen = favorieten.map((m) => (m.verificatie?.energielabel ? (duidEnergielabel(m.verificatie.energielabel)?.index ?? null) : null));
  const besteEnergieIndex = besteVanRij(energieIndexen, "min");

  const kolomAantal = favorieten.length;
  const zonderRapport = favorieten.filter((m) => !vindGekoppeldRapport(m.titel, rapporten));

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <div className="min-w-[560px]" style={{ display: "grid", gridTemplateColumns: `152px repeat(${kolomAantal}, minmax(150px, 1fr))` }}>
          {/* Kopregel: foto/titel/prijs per favoriet, met link naar de advertentie */}
          <div className="border-b border-ink/[0.06] px-4 py-3.5" />
          {favorieten.map((m) => (
            <div key={`kop-${m.id}`} className="border-b border-l border-ink/[0.06] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                  <HomeIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-extrabold text-ink">{m.titel}</p>
                  {m.prijsLabel && <p className="truncate text-[10px] text-ink/45">{m.prijsLabel}</p>}
                </div>
              </div>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-ink/50 hover:text-accent"
              >
                Advertentie <ArrowRightIcon className="h-2.5 w-2.5" />
              </a>
            </div>
          ))}

          <RijLabel label="Vraagprijs" icoon={TrendingUpIcon} />
          {favorieten.map((m) => (
            <Cel key={`prijs-${m.id}`} beste={m.prijs != null && m.prijs === bestePrijs}>
              {m.prijsLabel ?? euro(m.prijs)}
            </Cel>
          ))}

          <RijLabel label="Woonoppervlak" icoon={RulerIcon} gestreept />
          {favorieten.map((m) => {
            const opp = m.verificatie?.woonoppervlak ?? null;
            return (
              <Cel key={`opp-${m.id}`} beste={opp != null && opp === besteOppervlak} gestreept>
                {opp != null ? `${opp} m²` : "onbekend"}
              </Cel>
            );
          })}

          <RijLabel label="Kamers / slaapkamers" icoon={LayersIcon} />
          {favorieten.map((m) => (
            <Cel key={`kamers-${m.id}`}>
              {m.verificatie?.kamers ?? "?"} / {m.verificatie?.slaapkamers ?? "?"}
            </Cel>
          ))}

          <RijLabel label="Bouwjaar" icoon={CalendarIcon} gestreept />
          {favorieten.map((m) => {
            const bouwjaar = m.verificatie?.bouwjaar ?? null;
            return (
              <Cel key={`bj-${m.id}`} beste={bouwjaar != null && bouwjaar === besteBouwjaar} gestreept>
                {bouwjaar ?? "onbekend"}
              </Cel>
            );
          })}

          <RijLabel label="Energielabel" icoon={BoltIcon} />
          {favorieten.map((m) => {
            const klasse = m.verificatie?.energielabel ?? null;
            const duiding = klasse ? duidEnergielabel(klasse) : null;
            const isBeste = duiding != null && duiding.index === besteEnergieIndex;
            return (
              <div key={`el-${m.id}`} className="border-b border-l border-ink/[0.06] px-4 py-3.5">
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
                {isBeste && <Badge />}
              </div>
            );
          })}

          <RijLabel label="Buitenruimte" icoon={LeafIcon} gestreept />
          {favorieten.map((m) => {
            const delen = [m.verificatie?.heeftTuin && "tuin", m.verificatie?.heeftBalkon && "balkon", m.verificatie?.heeftDakterras && "dakterras"].filter(
              Boolean,
            ) as string[];
            return (
              <Cel key={`buiten-${m.id}`} gestreept>
                {delen.length > 0 ? delen.join(", ") : "geen"}
              </Cel>
            );
          })}

          <RijLabel label="Lift" icoon={LiftIcon} />
          {favorieten.map((m) => (
            <Cel key={`lift-${m.id}`}>{m.verificatie?.heeftLift ? "Ja" : "Nee"}</Cel>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[#EEF0FF] px-4 py-3.5">
        <TrendingUpIcon className="h-4 w-4 shrink-0 text-accent" />
        <p className="min-w-[220px] flex-1 text-[12px] text-[#26215C]">
          Deze vergelijking is gebaseerd op Funda-advertentiegegevens. Vraag voor deze panden een rapport aan voor bouwtechnisch risico,
          leefbaarheid en biedadvies naast elkaar in de tab <span className="font-bold">Vergelijken</span>.
        </p>
        {zonderRapport.length > 0 && (
          <Link
            href={`/zakelijk/rapporten/nieuw?klantId=${dossierId}&adres=${encodeURIComponent(zonderRapport[0].titel)}`}
            className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-accent-dark"
          >
            Rapport aanvragen
          </Link>
        )}
      </div>
    </div>
  );
}

function RijLabel({ label, icoon: Icon, gestreept }: { label: string; icoon: typeof TrendingUpIcon; gestreept?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border-b border-ink/[0.06] px-4 py-3.5 ${gestreept ? "bg-parchment/40" : ""}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 text-ink/35" />
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink/45">{label}</span>
    </div>
  );
}

function Cel({ children, beste, gestreept }: { children: ReactNode; beste?: boolean; gestreept?: boolean }) {
  return (
    <div className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${gestreept ? "bg-parchment/40" : ""}`}>
      <p className="text-[12.5px] font-bold text-ink">{children}</p>
      {beste && <Badge />}
    </div>
  );
}

function Badge() {
  return <span className="mt-1 inline-block rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[9px] font-bold text-[#3B6D11]">beste</span>;
}
