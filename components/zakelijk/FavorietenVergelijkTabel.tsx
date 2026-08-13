import type { ReactNode } from "react";
import type { B2bWoningMatch } from "@/types/b2b";
import { duidEnergielabel } from "@/lib/utils/energielabel";
import { EuroIcon, RulerIcon, DoorIcon, CalendarIcon, BoltIcon, LeafIcon, LiftIcon, HomeIcon, ArrowRightIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Zuiver presentatiecomponent voor de favorieten-vergelijking (zie het
// Cowork-gesprek "vergelijk favorieten, vanuit funda data" en de daarop-
// volgende herontwerpronde "ook foto van app. erin"). BEWUST gescheiden van
// FavorietenVergelijken.tsx (die de CTA-banner/deelknop/klantdossier-context
// toevoegt) zodat exact dezelfde tabel ook op de publieke, niet-ingelogde
// deelpagina (app/deelfavorieten/[token]) hergebruikt kan worden -- geen
// tweede implementatie die uiteen kan lopen.
//
// Alleen "Slaapkamers" (niet meer "Kamers / slaapkamers" in één cel, zie de
// klacht "2 / ? is onduidelijk") -- het totaal aantal kamers (incl. woonkamer
// e.d.) voegt in een korte vergelijking weinig toe t.o.v. slaapkamers, en de
// halve cel met een los "?" was verwarrend. Ontbrekende data toont nu
// "onbekend" (net als bij woonoppervlak/bouwjaar), nooit een kaal
// vraagteken.
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

function MatchFoto({ fotoUrl }: { fotoUrl: string | null }) {
  if (!fotoUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-mist">
        <HomeIcon className="h-7 w-7 text-accent/40" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
  );
}

export default function FavorietenVergelijkTabel({ favorieten }: { favorieten: B2bWoningMatch[] }) {
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

  const slaapkamers = favorieten.map((m) => m.verificatie?.slaapkamers ?? null);
  const besteSlaapkamers = besteVanRij(slaapkamers, "max");

  const bouwjaren = favorieten.map((m) => m.verificatie?.bouwjaar ?? null);
  const besteBouwjaar = besteVanRij(bouwjaren, "max");

  const energieIndexen = favorieten.map((m) => (m.verificatie?.energielabel ? (duidEnergielabel(m.verificatie.energielabel)?.index ?? null) : null));
  const besteEnergieIndex = besteVanRij(energieIndexen, "min");

  const kolomAantal = favorieten.length;

  return (
    <div>
      {/* Fotokaarten: prijs als badge over de foto, "Beste prijs"-lint op de goedkoopste */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${kolomAantal}, minmax(0, 1fr))` }}>
        {favorieten.map((m) => (
          <div key={`foto-${m.id}`} className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-white shadow-sm">
            <div className="relative h-28 w-full">
              <MatchFoto fotoUrl={m.fotoUrl} />
              {m.prijs != null && m.prijs === bestePrijs && (
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[9px] font-bold text-white">Beste prijs</span>
              )}
              <span className="absolute bottom-2 left-2 rounded-lg bg-ink/75 px-2.5 py-1 text-[11.5px] font-bold text-white">
                {m.prijsLabel ?? euro(m.prijs)}
              </span>
            </div>
            <div className="p-3">
              <p className="truncate text-[12px] font-extrabold text-ink">{m.titel}</p>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-ink/45 hover:text-accent"
              >
                Advertentie <ArrowRightIcon className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Kenmerkentabel: zelfde grid-patroon als VergelijkTabel.tsx */}
      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <div className="min-w-[560px]" style={{ display: "grid", gridTemplateColumns: `152px repeat(${kolomAantal}, minmax(150px, 1fr))` }}>
          <RijLabel label="Vraagprijs" icoon={EuroIcon} />
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

          <RijLabel label="Slaapkamers" icoon={DoorIcon} />
          {favorieten.map((m) => {
            const sk = m.verificatie?.slaapkamers ?? null;
            return (
              <Cel key={`sk-${m.id}`} beste={sk != null && sk === besteSlaapkamers} onbekend={sk == null}>
                {sk ?? "onbekend"}
              </Cel>
            );
          })}

          <RijLabel label="Bouwjaar" icoon={CalendarIcon} gestreept />
          {favorieten.map((m) => {
            const bouwjaar = m.verificatie?.bouwjaar ?? null;
            return (
              <Cel key={`bj-${m.id}`} beste={bouwjaar != null && bouwjaar === besteBouwjaar} onbekend={bouwjaar == null} gestreept>
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
            <Cel key={`lift-${m.id}`} onbekend={!m.verificatie?.heeftLift}>
              {m.verificatie?.heeftLift ? "Ja" : "Nee"}
            </Cel>
          ))}
        </div>
      </div>
    </div>
  );
}

function RijLabel({ label, icoon: Icon, gestreept }: { label: string; icoon: typeof EuroIcon; gestreept?: boolean }) {
  return (
    <div className={`flex items-center gap-2 border-b border-ink/[0.06] px-4 py-3.5 ${gestreept ? "bg-parchment/40" : ""}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 text-ink/35" />
      <span className="text-[10.5px] font-bold uppercase tracking-wide text-ink/45">{label}</span>
    </div>
  );
}

function Cel({
  children,
  beste,
  onbekend,
  gestreept,
}: {
  children: ReactNode;
  beste?: boolean;
  onbekend?: boolean;
  gestreept?: boolean;
}) {
  return (
    <div className={`border-b border-l border-ink/[0.06] px-4 py-3.5 ${gestreept ? "bg-parchment/40" : ""}`}>
      <p className={`text-[12.5px] font-bold ${onbekend ? "italic text-ink/40" : "text-ink"}`}>{children}</p>
      {beste && <Badge />}
    </div>
  );
}

function Badge() {
  return <span className="mt-1 inline-block rounded-full bg-[#EAF3DE] px-2 py-0.5 text-[9px] font-bold text-[#3B6D11]">beste</span>;
}
