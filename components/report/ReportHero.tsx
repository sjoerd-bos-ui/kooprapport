import type { AddressMeta, BuildingData, EnergyData, FunderingData } from "@/types/report";
import type { ReactNode } from "react";
import { CalendarIcon, BoltIcon, AlertTriangleIcon, RulerIcon, MapPinIcon } from "./icons";
import { TOON_HEX } from "./StatusChip";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";
import InfoTooltip from "./InfoTooltip";

// Kleur/tekst per funderingsniveau — afgeleid van dezelfde drie toon-kleuren
// die StatusChip en elke andere risico-indicatie in het rapport gebruiken
// (laag → gunstig/teal, midden → aandacht/amber, hoog → risico/rood), i.p.v.
// een eigen, los gekopieerde hex-set die op den duur uit de pas kan lopen.
const FUNDERING_STIJL: Record<"laag" | "midden" | "hoog", { tekst: string; kleur: string; bg: string }> = {
  laag: { tekst: "Laag", kleur: TOON_HEX.gunstig.tekst, bg: TOON_HEX.gunstig.bg },
  midden: { tekst: "Midden", kleur: TOON_HEX.aandacht.tekst, bg: TOON_HEX.aandacht.bg },
  hoog: { tekst: "Hoog", kleur: TOON_HEX.risico.tekst, bg: TOON_HEX.risico.bg },
};

// Eén rustige, neutrale kaartstijl voor alle 4 tegels i.p.v. 4 losse,
// individueel gekleurde vlakken naast elkaar (dat oogde als een
// bonte rij en trok de aandacht evenveel naar bijv. "Oppervlakte" als naar
// het risiconiveau). Kleur wordt nu alleen nog ingezet waar hij betekenis
// draagt: het energielabel (teal) en het funderingsrisico (gunstig/
// aandacht/risico-kleur) — bouwjaar en oppervlakte zijn neutrale feiten en
// krijgen dus geen fel gekleurd vlak meer.
function StatTegel({
  icon,
  iconColor,
  valueColor,
  value,
  label,
  extra,
}: {
  icon: ReactNode;
  iconColor: string;
  valueColor?: string;
  value: string;
  label: string;
  extra?: ReactNode;
}) {
  return (
    <div className="bg-white p-3.5">
      <span style={{ color: iconColor }}>{icon}</span>
      <p className="mt-2 font-display text-base font-extrabold leading-none" style={{ color: valueColor ?? "#1F1F2E" }}>
        {value}
      </p>
      <div className="mt-1 flex items-center justify-between gap-1">
        <p className="text-[11px] text-ink/45">{label}</p>
        {extra}
      </div>
    </div>
  );
}

// Bovenste helft van het gecombineerde hero+tabel-paneel (zie ReportView.tsx
// — dit component en PreviewSummary delen samen één buitenrand/afronding,
// dit component heeft dus zelf GEEN eigen border/rounded/margin meer).
//
// De locatie-regel zit nu ín de indigo band zelf (wit op blauw) i.p.v. een
// apart wit kaartje dat met een negatieve marge over de band heen viel —
// dat gaf in de praktijk een rommelig randje waar blauw en wit elkaar
// overlapten. Nu is er een harde, voorspelbare grens: boven blauw, eronder
// wit, nergens overlap.
export default function ReportHero({
  address,
  building,
  energy,
  fundering,
  lonLat,
}: {
  address: AddressMeta;
  building: BuildingData | null;
  energy: EnergyData | null;
  fundering: FunderingData | null;
  // Precies adrespunt (WGS84), zie PropertyCore.lonLat — geeft een preciezere
  // "Kaart →"-link dan Google zelf de adrestekst laten geocoderen (vooral bij
  // nieuwbouw of een groot pand met meerdere verblijfsobjecten). Ontbreekt
  // 'm (opzoeking niet gelukt), dan valt de link terug op de adrestekst,
  // precies zoals voorheen.
  lonLat?: { lon: number; lat: number } | null;
}) {
  const adresRegel = `${address.straat} ${address.huisnummer}${address.huisletter ?? ""}${
    address.toevoeging ? `-${address.toevoeging}` : ""
  }, ${address.postcode} ${address.plaats}`;
  const mapsUrl = lonLat
    ? `https://www.google.com/maps?q=${lonLat.lat},${lonLat.lon}`
    : `https://www.google.com/maps?q=${encodeURIComponent(adresRegel)}`;
  const funderingStijl = fundering?.niveau ? FUNDERING_STIJL[fundering.niveau] : null;

  return (
    <div>
      <div
        className="px-6 py-7 sm:px-8 sm:py-9"
        style={{
          backgroundColor: "#4F46E5",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        <div className="flex flex-wrap gap-2">
          {building?.woningtype && (
            <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white">
              {building.woningtype}
            </span>
          )}
          {building?.bouwjaar != null && (
            <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white">
              Bouwjaar {building.bouwjaar}
            </span>
          )}
          {energy?.klasse && (
            <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F766E]">
              Label {energy.klasse}
            </span>
          )}
          {!building?.woningtype && building?.bouwjaar == null && !energy?.klasse && (
            <span className="rounded-full border border-dashed border-white/40 px-3.5 py-1.5 text-xs text-white/70">
              Kenmerken nog niet beschikbaar
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
          {address.straat} {address.huisnummer}
          {address.huisletter ?? ""}
          {address.toevoeging ? `-${address.toevoeging}` : ""}
        </h1>
        <p className="mt-1.5 text-sm text-white/70">
          {address.postcode} {address.plaats}
        </p>

        <div className="mt-5 flex items-center gap-3 border-t border-white/15 pt-4">
          <MapPinIcon className="h-4 w-4 shrink-0 text-white/70" />
          <span className="min-w-0 flex-1 truncate text-[13px] text-white/85">{adresRegel}</span>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 whitespace-nowrap rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-accent"
          >
            Kaart →
          </a>
        </div>
      </div>

      <div className="bg-white px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-2 divide-x divide-y divide-line overflow-hidden rounded-xl border border-line sm:grid-cols-4 sm:divide-y-0">
          <StatTegel
            icon={<CalendarIcon className="h-4 w-4" />}
            iconColor="#4F46E5"
            value={building?.bouwjaar != null ? String(building.bouwjaar) : "Onbekend"}
            label="Bouwjaar"
          />
          <StatTegel
            icon={<BoltIcon className="h-4 w-4" />}
            iconColor="#0F766E"
            valueColor="#0F766E"
            value={energy?.klasse ?? "Onbekend"}
            label="Energielabel"
          />
          <StatTegel
            icon={<AlertTriangleIcon className="h-4 w-4" />}
            iconColor={funderingStijl?.kleur ?? "#8A8A99"}
            valueColor={funderingStijl?.kleur ?? "#8A8A99"}
            value={funderingStijl?.tekst ?? "Onbekend"}
            label="Funderingsrisico"
            extra={
              <a
                href="#ontgrendel"
                className="whitespace-nowrap text-[10px] font-bold"
                style={{ color: funderingStijl?.kleur ?? "#8A8A99" }}
              >
                Meer →
              </a>
            }
          />
          <StatTegel
            icon={<RulerIcon className="h-4 w-4" />}
            iconColor="#8A8A99"
            value={building?.oppervlakteM2 != null ? `${building.oppervlakteM2} m²` : "Onbekend"}
            label="Oppervlakte"
            extra={
              <InfoTooltip label="Uitleg bij oppervlakte">
                We halen dit getal rechtstreeks en live op, nooit geschat. Woningsites tellen meestal alleen de
                woonkamers en slaapkamers mee. Wij tellen het hele pand, dus ook een aangebouwde berging of
                bijgebouw.
              </InfoTooltip>
            }
          />
        </div>

        {/* Prijs verankerd aan de inzet: €11,95 voelt verwaarloosbaar t.o.v.
            een verkeerde inschatting bij een bod van tonnen. */}
        <p className="mt-4 text-center text-[11px] text-ink/45">
          Een verkeerde inschatting bij bieden kan duizenden euro&apos;s kosten. Het volledige rapport kost eenmalig{" "}
          <span className="font-semibold text-ink">{RAPPORT_PRIJS}</span>.
        </p>
      </div>
    </div>
  );
}
