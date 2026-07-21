"use client";

import { useState, type ReactNode, type ReactElement, type FormEvent } from "react";
import type { Report, NearbySale } from "@/types/report";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import ReportHero from "@/components/report/ReportHero";
import ReportSection from "@/components/report/ReportSection";
import ReportTabs from "@/components/report/ReportTabs";
import PreviewSummary from "@/components/report/PreviewSummary";
import DataCard from "@/components/report/DataCard";
import PaywallModal from "@/components/report/PaywallModal";
import VeiligheidsScore from "@/components/report/VeiligheidsScore";
import FunderingRedenering from "@/components/report/FunderingRedenering";
import InfoTooltip from "@/components/report/InfoTooltip";
import { berekenVeiligheidsscore, bepaalVeiligheidsBand, VEILIGHEID_BAND } from "@/lib/utils/veiligheidsscore";
import StatusChip, { type ChipToon, TOON_HEX } from "@/components/report/StatusChip";
import {
  CalendarIcon,
  BoltIcon,
  AlertTriangleIcon,
  RulerIcon,
  MapPinIcon,
  BuildingIcon,
  BoxIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  UsersIcon,
  StoreIcon,
  StethoscopeIcon,
  SchoolIcon,
  FileCheckIcon,
  InfoIcon,
  ArrowRightIcon,
  DoorIcon,
  FlagIcon,
  BulbIcon,
  ChevronDownIcon,
  HomeIcon,
  CheckIcon,
  LayersIcon,
  ApotheekIcon,
  KinderdagverblijfIcon,
  TreinIcon,
  OpritIcon,
  ParkIcon,
  KavelIcon,
  BestemmingIcon,
  MailIcon,
} from "@/components/report/icons";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { duidEnergielabel, ENERGIELABEL_SCHAAL, ENERGIELABEL_KLEUREN } from "@/lib/utils/energielabel";
import { buildSamenvatting, type SamenvattingKernstat } from "@/lib/services/samenvatting";
import { VOORZIENING_THEMA_VOLGORDE, VOORZIENING_THEMA_LABEL, VOORZIENING_KLEUR } from "@/lib/utils/voorzieningenStijl";

// Herbruikbare uitleg bij de geschatte woningwaarde — expliciet vereist:
// dit is een automatische modelschatting (Altum AI AVM), geen taxatie, geen
// WOZ-waarde en geen bevestigde verkoopprijs.
function WoningwaardeUitleg() {
  return (
    <>
      Dit is een <strong>automatische schatting van een rekenmodel</strong> (we noemen dat een AVM, Automated
      Valuation Model). Het model kijkt naar meer dan 150 kenmerken, zoals oppervlakte, bouwjaar, locatie en type
      woning. Let op: dit is <strong>geen officiële taxatie</strong>, <strong>geen WOZ-waarde</strong> (de
      waardering die de gemeente gebruikt voor de belasting) en <strong>geen bevestigde verkoopprijs</strong>. De
      bandbreedte laat zien hoe zeker het model is van zijn schatting.
    </>
  );
}

// React 19: het globale "JSX"-namespace bestaat niet meer automatisch (zie
// de Next.js 16-migratie) — ReactElement uit "react" zelf i.p.v. JSX.Element.
type IconComp = (props: { className?: string }) => ReactElement;

// Doorklikbare rij voor een buurtverkoop op het "Verkopen in de buurt"-
// tabblad — vervangt de vorige kale tabelrij. vergelijkbaar/deltaPct komen
// al kant-en-klaar uit enrichNearbySales() (lib/services/insights.ts): dat
// vergelijkt zelf al met de oppervlakte/prijs-per-m² van DEZE woning
// (±22%-marge voor "vergelijkbaar"), dus hier wordt niets opnieuw verzonnen.
//
// De m²-vergelijking in het uitgeklapte paneel was eerder onduidelijk (twee
// kale getallen naast elkaar: "79 m² (deze woning: 88 m²)") — nu expliciet
// in woorden ("10% kleiner dan deze woning") zodat meteen duidelijk is wat
// het verschil betekent, niet alleen wát de twee getallen zijn.
function VerkoopRij({
  verkoop,
  subjectOppervlakte,
  maxPrijsPerM2,
  isExpanded,
  onToggle,
}: {
  verkoop: NearbySale;
  subjectOppervlakte: number | null;
  maxPrijsPerM2: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const barPct = maxPrijsPerM2 > 0 ? Math.round((verkoop.prijsPerM2 / maxPrijsPerM2) * 100) : 0;
  const deltaTekst =
    verkoop.deltaPct == null
      ? null
      : Math.abs(verkoop.deltaPct) <= 3
        ? "vrijwel gelijk aan deze woning"
        : `${verkoop.deltaPct > 0 ? "+" : ""}${verkoop.deltaPct}% t.o.v. deze woning`;
  const deltaKleur =
    verkoop.deltaPct == null || Math.abs(verkoop.deltaPct) <= 3
      ? "text-ink/40"
      : verkoop.deltaPct > 0
        ? "text-[#9A6A0C]"
        : "text-ink/45";

  const oppervlakteVergelijking =
    subjectOppervlakte != null
      ? (() => {
          const verschilPct = Math.round(((verkoop.oppervlakteM2 - subjectOppervlakte) / subjectOppervlakte) * 100);
          const richting =
            Math.abs(verschilPct) <= 3
              ? "nagenoeg even groot als"
              : verschilPct > 0
                ? `${Math.abs(verschilPct)}% groter dan`
                : `${Math.abs(verschilPct)}% kleiner dan`;
          return `${verkoop.oppervlakteM2} m², ${richting} deze woning (${subjectOppervlakte} m²)`;
        })()
      : `${verkoop.oppervlakteM2} m², oppervlakte van deze woning onbekend, geen vergelijking mogelijk`;

  return (
    <div className={`rounded-xl ${verkoop.vergelijkbaar ? "bg-[#EEF0FF]" : "bg-parchment"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <span
          className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${
            verkoop.vergelijkbaar ? "bg-white" : "bg-[#E6FBF7]"
          }`}
        >
          <BuildingIcon className={`h-3.5 w-3.5 ${verkoop.vergelijkbaar ? "text-accent-dark" : "text-[#0F766E]"}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`truncate text-[12.5px] font-semibold ${verkoop.vergelijkbaar ? "text-accent-dark" : "text-ink"}`}>
              {verkoop.adres}
            </span>
            {verkoop.vergelijkbaar && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[9.5px] font-semibold text-white">
                Vergelijkbaar
              </span>
            )}
          </div>
          <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${verkoop.vergelijkbaar ? "bg-white" : "bg-line"}`}>
            <div className={`h-full ${verkoop.vergelijkbaar ? "bg-accent" : "bg-[#AFA9EC]"}`} style={{ width: `${barPct}%` }} />
          </div>
        </div>
        <div className="w-24 shrink-0 text-right">
          <p className={`text-[12.5px] font-semibold ${verkoop.vergelijkbaar ? "text-accent-dark" : "text-ink"}`}>
            {formatCurrency(verkoop.prijsPerM2)}
          </p>
          {deltaTekst && <p className={`text-[10.5px] ${deltaKleur}`}>{deltaTekst}</p>}
        </div>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            verkoop.vergelijkbaar ? "text-accent-dark" : "text-ink/35"
          } ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>
      {isExpanded && (
        <div
          className={`grid grid-cols-1 gap-3 px-3.5 pb-3.5 pl-[62px] sm:grid-cols-2 ${
            verkoop.vergelijkbaar ? "text-accent-dark" : "text-ink"
          }`}
        >
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-60">Verkoopdatum</p>
            <p className="mt-0.5 text-[12.5px] font-semibold">{formatDate(verkoop.verkoopdatum)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide opacity-60">Verkoopprijs</p>
            <p className="mt-0.5 text-[12.5px] font-semibold">
              {verkoop.verkoopprijsMin != null && verkoop.verkoopprijsMax != null
                ? `Verkocht tussen ${formatCurrency(verkoop.verkoopprijsMin)} en ${formatCurrency(verkoop.verkoopprijsMax)}`
                : formatCurrency(verkoop.verkoopprijs)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wide opacity-60">Oppervlakte t.o.v. deze woning</p>
            <p className="mt-0.5 text-[12.5px] font-semibold">{oppervlakteVergelijking}</p>
          </div>
          {verkoop.vergelijkbaar && (
            <div className="sm:col-span-2">
              <p className="text-[10px] uppercase tracking-wide opacity-60">Waarom vergelijkbaar</p>
              <p className="mt-0.5 text-[12.5px] font-semibold">
                De oppervlakte zit binnen ±22% van deze woning. Dat is onze grens voor &quot;vergelijkbaar&quot;.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Kleine sectiekop binnen een tabblad — icoon + label, zelfde taal als de
// rest van het rapport, maar zonder de volledige ReportSection-machinerie
// (lock/meta), omdat een tabblad meerdere brondomeinen combineert.
function SubKop({ icon: Icon, children }: { icon: IconComp; children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
      <Icon className="h-3.5 w-3.5 text-accent" />
      {children}
    </p>
  );
}

// Doorklikbare sectorkaart op het Rapportoverzicht-tabblad — springt naar het
// bijbehorende volledige tabblad. Zelfde SubKop-taal als hierboven, nu als
// klikbare knop met een pijltje dat op hover verschijnt, zodat duidelijk is
// dat dit een snelkoppeling is en geen doodlopende kaart.
function NavKaart({
  icon: Icon,
  label,
  onClick,
  children,
  bg = "bg-parchment hover:bg-[#EEF0FF]",
}: {
  icon: IconComp;
  label: string;
  onClick: () => void;
  children: ReactNode;
  bg?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full rounded-xl p-4 text-left transition-colors ${bg}`}
    >
      <p className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink/50">
        <span className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-accent" />
          {label}
        </span>
        <ArrowRightIcon className="h-3.5 w-3.5 text-ink/25 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
      {children}
    </button>
  );
}

// Stappenreeks-knoop voor de onderbouwing van de Waarde-indicatie. Twee
// varianten, bewust visueel verschillend om nooit een los, bevestigd feit
// (oppervlakte, bouwjaar, ...) te verwarren met een algemene modelinput:
// "feit" (teal, "Bevestigd") voor een specifiek geverifieerd kenmerk van
// dít pand, "model" (indigo/accent, "Ook meegewogen") voor het bredere,
// samengestelde kenmerkenpakket dat het model gebruikt maar dat niet één
// controleerbaar getal voor dit specifieke adres is. De verbindingslijn
// (absoluut gepositioneerd, achter de cirkel) suggereert visueel dat deze
// kenmerken "optellen" tot de uitkomst — i.p.v. alleen los opgesomde chips.
function StepperNode({
  icon: Icon,
  value,
  first = false,
  variant = "feit",
}: {
  icon: IconComp;
  value: string;
  first?: boolean;
  variant?: "feit" | "model";
}) {
  const stijl =
    variant === "model"
      ? { bg: "bg-mist", tekst: "text-accent", caption: "Ook meegewogen" }
      : { bg: "bg-[#E6FBF7]", tekst: "text-[#0F766E]", caption: "Bevestigd" };
  return (
    <div className="relative flex flex-1 flex-col items-center px-1">
      <div className={`absolute top-[17px] h-0.5 bg-line ${first ? "left-1/2 w-1/2" : "left-0 w-full"}`} />
      <span className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ${stijl.bg}`}>
        <Icon className={`h-4 w-4 ${stijl.tekst}`} />
      </span>
      <p className="mt-2 text-center text-[11.5px] font-semibold text-ink">{value}</p>
      <p className={`text-[10px] ${stijl.tekst}`}>{stijl.caption}</p>
    </div>
  );
}

// Laatste knoop van de reeks: de uitkomst zelf. De gestippelde ring (i.p.v.
// een dichte rand zoals de andere knopen) is bewust anders — dat geeft
// visueel aan dat dit, anders dan de bevestigde kenmerken ervoor, geen hard
// feit is maar een indicatie die nog kan bewegen (zie ook de toelichting
// "kan afwijken door vraag en aanbod" onder de bandbreedte).
function UitkomstNode({ value }: { value: string }) {
  return (
    <div className="relative flex flex-1 flex-col items-center px-1">
      <div className="absolute left-0 top-[17px] h-0.5 w-1/2 bg-line" />
      <span className="relative z-10 -mt-2.5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-accent/40">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
          <FlagIcon className="h-4 w-4 text-white" />
        </span>
      </span>
      <p className="mt-2 text-center text-xs font-bold text-accent-dark">{value}</p>
      <p className="text-[10px] text-ink/40">uitkomst, indicatief</p>
    </div>
  );
}

// Eén uitklapbare toelichtingssectie op "Energieprestatie en label" — drie
// van deze naast elkaar (stookkosten/hoe vastgesteld/geldigheid) i.p.v. één
// lange tekstblok, zodat de kaart compact blijft en de koper zelf kiest
// welk deel hij wil lezen. Kleuren komen uit dezelfde TOON_HEX-set als
// StatusChip (zie components/report/StatusChip.tsx) i.p.v. een eigen,
// tweede kopie van dezelfde vijf tonen.
function EnergieAccordionRij({
  icon: Icon,
  titel,
  toon = "neutraal",
  open,
  onToggle,
  children,
}: {
  icon: IconComp;
  titel: string;
  toon?: ChipToon;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const stijl = TOON_HEX[toon];
  return (
    <div className={`overflow-hidden rounded-xl ${open ? "" : "bg-parchment"}`} style={open ? { backgroundColor: stijl.bg } : undefined}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className={open ? "" : "text-ink/40"} style={open ? { color: stijl.tekst } : undefined}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className={`text-[12.5px] font-semibold ${open ? "" : "text-ink"}`} style={open ? { color: stijl.tekst } : undefined}>
            {titel}
          </span>
        </span>
        <span className={open ? "" : "text-ink/40"} style={open ? { color: stijl.tekst } : undefined}>
          <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && <div className="px-3.5 pb-3.5 pl-9 text-xs leading-relaxed text-ink/60">{children}</div>}
    </div>
  );
}

// Icoon per kernstat-sleutel op het Samenvatting-tabblad — alleen presentatie,
// geen nieuwe data (zelfde vier sleutels als lib/services/samenvatting.ts).
const SAMENVATTING_ICONS: Record<string, IconComp> = {
  fundering: AlertTriangleIcon,
  veiligheid: ShieldCheckIcon,
  energie: BoltIcon,
  voorzieningen: MapPinIcon,
};

// Icoon per voorziening-key (zie VOORZIENING_DEFINITIES in
// lib/data-sources/buurtprofiel.ts voor de keys) — de kleur per key staat
// gedeeld met de PDF in lib/utils/voorzieningenStijl.ts, het icoon zelf kan
// dat niet zijn (React-component vs. @react-pdf/renderer-component), dus
// blijft hier lokaal.
const VOORZIENING_ICON: Record<string, IconComp> = {
  huisarts: StethoscopeIcon,
  apotheek: ApotheekIcon,
  supermarkt: StoreIcon,
  basisschool: SchoolIcon,
  voortgezetOnderwijs: SchoolIcon,
  kinderdagverblijf: KinderdagverblijfIcon,
  treinstation: TreinIcon,
  opritHoofdweg: OpritIcon,
  park: ParkIcon,
};

// Kernstat-kaart voor het Samenvatting-tabblad — herontworpen (was een
// ringgauge met de toelichting eronder, waarbij een lange toelichtingstekst
// bij een ander adres de kaart kon laten "groeien" op een manier die niet
// meer in verhouding stond tot de andere, kortere kaarten in dezelfde grid-
// rij, zie het visuele herontwerp dat eerder is doorgesproken). Nu een
// vaste, kolomgewijze flex-opbouw (icoon+label boven, waarde, toelichting
// eronder) — elk element staat in normale documentflow, dus niets kan meer
// over iets anders heen vallen, ongeacht hoe lang de toelichting is.
function KernstatKaart({ stat }: { stat: SamenvattingKernstat }) {
  const stijl = TOON_HEX[stat.toon];
  const Icon = SAMENVATTING_ICONS[stat.key] ?? InfoIcon;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: stijl.bg, color: stijl.tekst }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[11.5px] text-ink/50">{stat.label}</p>
      </div>
      <p className="font-display text-[18px] font-bold leading-none text-ink">{stat.waarde}</p>
      <p className="text-[12.5px] leading-relaxed text-ink/55">{stat.toelichting}</p>
    </div>
  );
}

export default function ReportView({
  report,
  isUnlocked,
  isConfirmingPayment = false,
  onUnlock,
  kortingToken,
}: {
  report: Report;
  isUnlocked: boolean;
  // BUGFIX: net terug van Mollie wordt de betaalstatus nog server-side
  // geverifieerd (polling in ReportPageClient, meestal een paar seconden).
  // Zolang dat loopt is isUnlocked nog gewoon false — zonder deze prop bleef
  // in die paar seconden het volledige verkoopblok staan ("Ontgrendel nu voor
  // €11,95"), wat verwarrend is vlak nadat iemand al heeft afgerekend. Met
  // deze prop tonen we in plaats daarvan een korte "wordt bevestigd"-melding.
  isConfirmingPayment?: boolean;
  // Async: het daadwerkelijke ontgrendelen doet nu ook de (kostenveroorzakende)
  // Altum-aanroep via /api/rapport/premium — zie ReportPageClient. Krijgt de
  // bestellingId van de zojuist afgeronde betaling mee, zodat die route
  // server-side kan verifiëren dat er écht is betaald.
  onUnlock: (bestellingId: string) => void | Promise<void>;
  // Uit de ?korting=-queryparam (herinneringsmail) -- zie ReportPageClient.tsx.
  kortingToken?: string;
}) {
  const [showPaywall, setShowPaywall] = useState(false);
  // Welk tabblad actief is — ReportTabs is nu een controlled component, zodat
  // de doorklikbare kaarten op het Rapportoverzicht-tabblad hier ook zelf
  // naartoe kunnen springen (i.p.v. dat alleen de tabbalk zelf dit beheert).
  const [activeTabId, setActiveTabId] = useState("overzicht");
  // Welke buurtverkoop-rij is uitgeklapt op "Verkopen in de buurt" — één
  // tegelijk, accordion-stijl, key = adres+verkoopdatum (zelfde sleutel als
  // de React key hieronder).
  const [expandedVerkoop, setExpandedVerkoop] = useState<string | null>(null);
  // Welke toelichtingssectie openstaat op "Energieprestatie en label" — één
  // tegelijk, accordion-stijl. "stookkosten" staat standaard open (de vraag
  // die de meeste kopers als eerste hebben), de andere twee kunnen ernaast
  // opengeklapt worden.
  const [energieAccordion, setEnergieAccordion] = useState<string | null>("stookkosten");
  // PDF-download: het al opgehaalde/ontgrendelde `report`-object gaat mee in
  // de aanvraag (zie app/api/rapport/pdf/route.tsx) — geen nieuwe Altum-
  // aanroep, geen risico dat de PDF andere cijfers toont dan wat hierboven
  // al te zien is.
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  // "Verstuur naar e-mail" bij de "Rapport gereed"-kaart — zelfde
  // vertrouwensmodel als de PDF-download hierboven (het al opgehaalde
  // `report`-object gaat mee, zie app/api/rapport/email/route.tsx).
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const { core, building, energy, market, nearbySales, buurtprofiel, fundering, kavel, bestemming } = report;
  // Compacte, feitelijke eindsamenvatting (Samenvatting-tabblad + laatste
  // stuk van de PDF) — bouwt uitsluitend voort op velden die al hierboven in
  // `report` staan, zie lib/services/samenvatting.ts voor de regels.
  const samenvatting = buildSamenvatting(report);

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/rapport/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!res.ok) throw new Error("PDF-aanvraag gaf HTTP " + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kooprapport-${core.address.slug}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("De PDF kon nu niet worden gemaakt. Probeer het straks opnieuw.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSendEmail(e: FormEvent) {
    e.preventDefault();
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch("/api/rapport/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, email: emailInput.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setEmailStatus({ kind: "error", message: data.error ?? "Versturen is niet gelukt. Probeer het opnieuw." });
        return;
      }
      setEmailStatus({ kind: "success", message: `Verstuurd naar ${emailInput.trim()}.` });
      setEmailInput("");
    } catch {
      setEmailStatus({ kind: "error", message: "Versturen is niet gelukt. Probeer het opnieuw." });
    } finally {
      setSendingEmail(false);
    }
  }

  // Kerncijfers voor het "Overzicht"-tabblad — dezelfde velden als de
  // gratis samenvatting, plus een blik op waarde/fundering/veiligheid.
  const niveauToon: ChipToon =
    fundering.data?.niveau === "laag"
      ? "gunstig"
      : fundering.data?.niveau === "midden"
        ? "aandacht"
        : fundering.data?.niveau === "hoog"
          ? "risico"
          : "neutraal";
  const niveauTekst =
    fundering.data?.niveau === "laag"
      ? "Laag"
      : fundering.data?.niveau === "midden"
        ? "Midden"
        : fundering.data?.niveau === "hoog"
          ? "Hoog"
          : "Onbekend";

  // Zelfde veiligheidsscore als op het Buurt-tabblad (VeiligheidsScore.tsx)
  // — één berekening via lib/utils/veiligheidsscore, zodat Overzicht en
  // Buurt altijd hetzelfde cijfer en dezelfde kleur tonen voor veiligheid.
  const veiligheidsScore =
    buurtprofiel.data?.veiligheid.misdrijvenPer1000 != null
      ? berekenVeiligheidsscore(buurtprofiel.data.veiligheid.misdrijvenPer1000)
      : null;
  const veiligheidsBand = veiligheidsScore != null ? bepaalVeiligheidsBand(veiligheidsScore) : null;
  const veiligheidsToon: ChipToon = veiligheidsBand ?? "neutraal";

  // Onderbouwing van de Waarde-indicatie: prijs per m² van deze woning
  // (afgeleid van de modelschatting + de bevestigde BAG-oppervlakte, geen
  // aparte bron) vergeleken met het buurtgemiddelde uit nearbySales — beide
  // moeten bekend zijn, anders geen vergelijking (geen half gegokt cijfer).
  const dezeWoningPerM2 =
    market.data?.geschatteWaarde != null && building.data?.oppervlakteM2
      ? Math.round(market.data.geschatteWaarde / building.data.oppervlakteM2)
      : null;
  const buurtPerM2 = nearbySales.data?.gemiddeldePrijsPerM2 ?? null;
  const waardeDeltaPctRuw =
    dezeWoningPerM2 != null && buurtPerM2 != null && buurtPerM2 > 0
      ? Math.round(((dezeWoningPerM2 - buurtPerM2) / buurtPerM2) * 100)
      : null;
  // Verstandige grens: bij een extreme uitkomst (zoals de Altum-sandbox soms
  // per adres teruggeeft — zie de opmerking bij fetchLive in
  // lib/data-sources/woningwaarde.ts over "opvallend hoge" sandboxwaarden) is
  // een percentage als "+333459%" geen zinvolle buurtvergelijking meer, maar
  // een signaal dat de modelschatting zelf voor dit (test)adres onbetrouwbaar
  // is. Dan liever de vergelijking weglaten (terugvallen op de simpele kaart
  // hieronder) dan een overduidelijk kapot getal tonen.
  const waardeDeltaPct = waardeDeltaPctRuw != null && Math.abs(waardeDeltaPctRuw) <= 300 ? waardeDeltaPctRuw : null;
  // De stappenreeks (oppervlakte -> bouwjaar -> [kamers] -> vergelijkbare
  // verkopen -> 150+ kenmerken -> uitkomst) toont zodra deze drie kernfeiten
  // er zijn — een reeks met een "gat" erin zou de suggestie van optellende
  // onderbouwing juist ondermijnen. "Kamers" staat hier bewust NIET meer
  // tussen: de Woningwaarde+ API van Altum (avmplus, zie fetchLive in
  // lib/data-sources/woningwaarde.ts) levert geen Rooms-veld meer, waardoor
  // market.data.rooms voor elk live rapport permanent undefined is. Die knoop
  // hard vereisen liet de hele stepper dus altijd verdwijnen; nu is hij een
  // losse, optionele knoop die alleen verschijnt als de waarde er wél is
  // (bv. in het handmatig samengestelde voorbeeldrapport).
  const stepperVolledig =
    building.data?.oppervlakteM2 != null &&
    building.data?.bouwjaar != null &&
    nearbySales.data?.aantalLaatste12Maanden != null;

  // Zelfde randgeval als in de PDF-opbouw (lib/pdf/ReportDocument.tsx): een
  // extreme uitkomst t.o.v. het buurtgemiddelde is geen zinvolle vergelijking
  // meer, maar een signaal dat de modelschatting zelf onbetrouwbaar is voor
  // dit (test)adres — apart benoemd i.p.v. de vergelijking stilzwijgend te
  // laten verdwijnen.
  const waardeImplausibel = waardeDeltaPctRuw != null && Math.abs(waardeDeltaPctRuw) > 300;
  const bandbreedteGelijk =
    market.data?.bandbreedteMin != null && market.data?.bandbreedteMax != null && market.data.bandbreedteMin === market.data.bandbreedteMax;
  // Positie van de bandbreedte-marker: waar de puntschatting binnen
  // [min, max] valt (0-100%) — geen aanname, gewoon de rekensom.
  const bandbreedteOffsetPct =
    market.data?.geschatteWaarde != null &&
    market.data?.bandbreedteMin != null &&
    market.data?.bandbreedteMax != null &&
    market.data.bandbreedteMax > market.data.bandbreedteMin
      ? Math.max(
          0,
          Math.min(
            100,
            ((market.data.geschatteWaarde - market.data.bandbreedteMin) / (market.data.bandbreedteMax - market.data.bandbreedteMin)) * 100
          )
        )
      : 50;

  // Kerncijfers gegroepeerd per sector, met de definitieve 7-delige
  // naamgeving die overal in het rapport en in de vergelijkingstabel wordt
  // gebruikt: Rapportoverzicht (deze paginatitel), Objectgegevens,
  // Energieprestatie en label, Waarde-indicatie, Verkopen in de buurt,
  // Funderingsrisico, Buurtprofiel — samen precies 7 kopjes op deze pagina
  // (1 paginatitel + 6 sector-kopjes).
  // Rapportoverzicht: hero-tegel (Waarde-indicatie, het meest gevraagde
  // cijfer) + een rij doorklikbare sectorkaarten voor de overige vijf
  // onderdelen. Elke kaart springt naar het bijbehorende volledige tabblad
  // (ReportTabs is hierboven controlled gemaakt) — i.p.v. dode kaarten die
  // hetzelfde cijfer alleen dupliceren, is dit nu een echt navigatiemiddel.
  const overzichtTab = (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6 sm:p-8">
      <h2 className="font-display text-lg font-bold text-ink">Rapportoverzicht</h2>
      <p className="mt-1.5 text-[13px] text-ink/45">Kerncijfers en de belangrijkste indicaties in één oogopslag</p>

      <button
        type="button"
        onClick={() => setActiveTabId("waarde")}
        className="group mt-6 flex w-full items-center justify-between gap-4 rounded-2xl bg-[#EEF0FF] p-5 text-left transition-colors hover:bg-[#E2E5FB]"
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <TrendingUpIcon className="h-3.5 w-3.5" />
            Waarde-indicatie
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold leading-none text-accent sm:text-[28px]">
            {market.data ? formatCurrency(market.data.geschatteWaarde) : "Onbekend"}
          </p>
          {market.data && (
            <span className="mt-2 inline-block rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-accent">
              Modelschatting
            </span>
          )}
        </div>
        <ArrowRightIcon className="h-5 w-5 shrink-0 text-accent/40 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
      </button>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NavKaart icon={BuildingIcon} label="Objectgegevens" onClick={() => setActiveTabId("object")}>
          <p className="font-display text-xl font-extrabold leading-none text-ink">
            {building.data?.bouwjaar ?? "Onbekend"}
          </p>
          <p className="mt-1.5 text-[11px] text-ink/55">
            {building.data?.oppervlakteM2 != null ? `${building.data.oppervlakteM2} m²` : "Onbekend"}
            {building.data?.woningtype ? ` · ${building.data.woningtype}` : ""}
          </p>
        </NavKaart>

        <NavKaart icon={BoltIcon} label="Energieprestatie en label" onClick={() => setActiveTabId("energie")}>
          <p className="font-display text-xl font-extrabold leading-none text-ink">{energy.data?.klasse ?? "Onbekend"}</p>
          <p className="mt-1.5 text-[11px] text-ink/55">Energielabel</p>
        </NavKaart>

        <NavKaart icon={TrendingUpIcon} label="Verkopen in de buurt" onClick={() => setActiveTabId("verkopen")}>
          <p className="font-display text-xl font-extrabold leading-none text-ink">
            {nearbySales.data?.gemiddeldePrijsPerM2 ? formatCurrency(nearbySales.data.gemiddeldePrijsPerM2) : "Onbekend"}
          </p>
          <p className="mt-1.5 text-[11px] text-ink/55">Gem. prijs per m²</p>
        </NavKaart>

        <NavKaart icon={AlertTriangleIcon} label="Funderingsrisico" onClick={() => setActiveTabId("fundering")}>
          <p className="font-display text-xl font-extrabold leading-none text-ink">{niveauTekst}</p>
          <div className="mt-2">
            <StatusChip toon={niveauToon}>{fundering.data?.niveau ? "Indicatie" : "Onbekend"}</StatusChip>
          </div>
        </NavKaart>

        <NavKaart icon={ShieldCheckIcon} label="Buurtprofiel" onClick={() => setActiveTabId("buurt")}>
          <p className="font-display text-xl font-extrabold leading-none text-ink">
            {veiligheidsScore != null ? `${veiligheidsScore} / 10` : "Onbekend"}
          </p>
          <div className="mt-2">
            <StatusChip toon={veiligheidsToon}>{veiligheidsBand ? VEILIGHEID_BAND[veiligheidsBand].tekst : "Onbekend"}</StatusChip>
          </div>
        </NavKaart>
      </div>
    </div>
  );

  const waardeIndicatieTab = (
    <>
      <ReportSection
        title="Waarde-indicatie"
        subtitle="Modelschatting van deze woning, geen taxatie, geen WOZ-waarde"
        meta={market.meta}
        hasData={market.data !== null}
      >
        {market.data && (
          <div className="flex flex-col gap-4">
            {/* Splitscherm-hero blijft nu ALTIJD staan (voorheen alleen bij
                een berekenbare buurtvergelijking, met een kale platte kaart
                als terugval) — de "buurtgemiddelde"-kant toont eerlijk
                "Onbekend" i.p.v. te verdwijnen wanneer die vergelijking niet
                mogelijk is, zoals nu bij dit adres. */}
            <div className="relative grid overflow-hidden rounded-2xl sm:grid-cols-2">
              <div className="bg-accent px-6 py-6">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/70">Deze woning</p>
                <p className="mt-2 font-display text-[27px] font-extrabold leading-none text-white">
                  {formatCurrency(market.data.geschatteWaarde)}
                </p>
                {dezeWoningPerM2 != null && <p className="mt-1.5 text-xs text-white/70">{formatCurrency(dezeWoningPerM2)} /m²</p>}
                <p className="mt-1 text-[11px] text-white/55">
                  {market.data.waarderingsdatum
                    ? `Gewaardeerd op ${formatDate(market.data.waarderingsdatum)}`
                    : "Waarderingsdatum onbekend"}
                </p>
              </div>
              <div className="bg-parchment px-6 py-6 sm:text-right">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink/40">Buurtgemiddelde /m²</p>
                <p className="mt-2 font-display text-[27px] font-extrabold leading-none text-ink">
                  {buurtPerM2 != null ? formatCurrency(buurtPerM2) : "Onbekend"}
                </p>
                {nearbySales.data?.aantalLaatste12Maanden != null && (
                  <p className="mt-1.5 text-xs text-ink/45">
                    {nearbySales.data.aantalLaatste12Maanden} vergelijkbare verkopen, {nearbySales.data.zoekvensterMaanden} mnd
                  </p>
                )}
              </div>
              {waardeDeltaPct != null && (
                <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-paper">
                  <span className="text-[13px] font-bold text-[#9A6A0C]">
                    {waardeDeltaPct > 0 ? "+" : ""}
                    {waardeDeltaPct}%
                  </span>
                </div>
              )}
            </div>

            {waardeDeltaPct != null && (
              <div className="flex items-start gap-3 rounded-xl bg-parchment p-3.5">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#FEF3E2]">
                  <BulbIcon className="h-3.5 w-3.5 text-[#9A6A0C]" />
                </span>
                <p className="pt-0.5 text-[12.5px] leading-relaxed text-ink/60">
                  {waardeDeltaPct > 0 ? `${waardeDeltaPct}% boven` : `${Math.abs(waardeDeltaPct)}% onder`} het buurtgemiddelde.
                  Het model kijkt niet alleen naar de m²-prijs van de buurt, maar ook naar bouwjaar, oppervlakte en
                  het aantal kamers.
                </p>
              </div>
            )}

            {/* Randgeval: buurtvergelijking wél berekend maar zo extreem dat
                ze geen betekenis meer heeft (zie waardeImplausibel hierboven)
                — apart benoemd i.p.v. de vergelijking stilzwijgend te laten
                verdwijnen, zoals nu voor dit (test)adres het geval is. */}
            {waardeImplausibel && (
              <div className="flex items-start gap-3 rounded-xl bg-[#FEF3E2] p-3.5">
                <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#9A6A0C]" />
                <p className="text-[12.5px] leading-relaxed text-[#9A6A0C]">
                  Dit modelcijfer wijkt zo sterk af van vergelijkbare woningen in de buurt dat een zinvolle
                  vergelijking hier niet mogelijk is. Wees extra voorzichtig met de schatting hierboven voor dit
                  adres.
                </p>
              </div>
            )}

            {stepperVolledig && (
              // Bij alle 6 knopen tegelijk (oppervlakte, bouwjaar, kamers,
              // verkopen, "150+ kenmerken", uitkomst) is de opgetelde
              // minimale breedte van de labels breder dan een mobiel scherm.
              // Zonder containment brak dat eerder uit de kaart/pagina heen
              // (horizontale scroll van de hele pagina). Nu blijft die
              // scroll beperkt tot deze ene rij; op desktop/tablet is er
              // altijd genoeg ruimte en gebeurt er visueel niets anders dan
              // voorheen.
              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex items-start pt-2">
                  <StepperNode first icon={RulerIcon} value={`${building.data!.oppervlakteM2} m²`} />
                  <StepperNode icon={CalendarIcon} value={String(building.data!.bouwjaar)} />
                  {market.data.rooms != null && <StepperNode icon={DoorIcon} value={`${market.data.rooms} kamers`} />}
                  <StepperNode icon={MapPinIcon} value={`${nearbySales.data!.aantalLaatste12Maanden} verkopen`} />
                  <StepperNode icon={LayersIcon} value="150+ kenmerken" variant="model" />
                  <UitkomstNode value={formatCurrency(market.data.geschatteWaarde)} />
                </div>
              </div>
            )}

            <div className="rounded-xl bg-parchment p-4">
              {market.data.bandbreedteMin != null && market.data.bandbreedteMax != null ? (
                <>
                  {/* Echte visuele balk + marker (positie = waar de
                      puntschatting binnen [min, max] valt) i.p.v. alleen drie
                      losse tekstlabels. */}
                  <div className="relative h-2 rounded-full bg-[#EEF0FF]">
                    <div
                      className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
                      style={{ left: `${bandbreedteOffsetPct}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-ink/45">
                    <span>{formatCurrency(market.data.bandbreedteMin)}</span>
                    <span className="font-semibold text-ink">90% zeker binnen deze bandbreedte</span>
                    <span>{formatCurrency(market.data.bandbreedteMax)}</span>
                  </div>
                  {bandbreedteGelijk ? (
                    <p className="mt-2 text-[11px] text-ink/35">
                      Het model geeft hier dezelfde boven- als ondergrens. Deze bandbreedte zegt dus niet extra veel
                      voor dit adres.
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-ink/35">
                      De uiteindelijke verkoopprijs kan hiervan afwijken, bijvoorbeeld door vraag en aanbod op het
                      moment van verkoop.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink/50">Geen bandbreedte beschikbaar voor dit adres.</p>
              )}
            </div>

            <div>
              <h3 className="font-display text-[13px] font-bold text-ink">Wat kun je met deze schatting?</h3>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {[
                  "Onderhandelingsbasis bij aan-/verkoop",
                  "Oriëntatie bij hypotheek of herfinanciering",
                  "Richtlijn voor de verzekerde waarde",
                  "Startpunt voor vermogensplanning",
                ].map((tip) => (
                  <div key={tip} className="flex items-center gap-2.5 rounded-lg bg-parchment px-3 py-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink/30" />
                    <span className="text-[12px] text-ink">{tip}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-ink/35">Dit zijn algemene toepassingen, geen advies dat speciaal voor dit pand is.</p>
            </div>

            <div className="rounded-xl border-l-[3px] border-accent bg-[#EEF0FF] p-4">
              <p className="text-[12.5px] font-bold text-accent-dark">Wat is een modelschatting?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink">
                <WoningwaardeUitleg />
              </p>
            </div>
          </div>
        )}
      </ReportSection>
    </>
  );

  const verkopenBuurtTab = (
    <>
      <ReportSection
        title="Verkopen in de buurt"
        subtitle={
          nearbySales.data
            ? `${nearbySales.data.aantalLaatste12Maanden} verkopen in de laatste ${nearbySales.data.zoekvensterMaanden} maanden`
            : undefined
        }
        meta={nearbySales.meta}
        hasData={nearbySales.data !== null}
      >
        {nearbySales.data && (
          <div className="flex flex-col gap-4">
            {nearbySales.data.verruimd && (
              <p className="rounded-lg bg-[#FFF7E6] px-3.5 py-2.5 text-xs text-[#9A6A0C]">
                Er waren te weinig vergelijkbare verkopen in de directe buurt binnen 12 maanden. Daarom is er breder
                gezocht: in een grotere omgeving en/of over een langere periode ({nearbySales.data.zoekvensterMaanden}{" "}
                maanden).
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent px-6 py-5">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/70">Gemiddelde prijs per m²</p>
                <p className="mt-1 font-display text-[27px] font-extrabold leading-none text-white">
                  {nearbySales.data.gemiddeldePrijsPerM2 ? formatCurrency(nearbySales.data.gemiddeldePrijsPerM2) : "Onbekend"}
                </p>
              </div>
              <p className="shrink-0 text-xs text-white/70">
                {nearbySales.data.verkopen.length} {nearbySales.data.verkopen.length === 1 ? "verkoop" : "verkopen"} · laatste{" "}
                {nearbySales.data.zoekvensterMaanden} maanden
              </p>
            </div>

            {nearbySales.data.verkopen.length > 0 ? (
              <div className="flex flex-col gap-2">
                {(() => {
                  const maxPrijsPerM2 = Math.max(...nearbySales.data!.verkopen.map((x) => x.prijsPerM2));
                  return nearbySales.data!.verkopen.map((v) => {
                    const key = `${v.adres}-${v.verkoopdatum}`;
                    return (
                      <VerkoopRij
                        key={key}
                        verkoop={v}
                        subjectOppervlakte={building.data?.oppervlakteM2 ?? null}
                        maxPrijsPerM2={maxPrijsPerM2}
                        isExpanded={expandedVerkoop === key}
                        onToggle={() => setExpandedVerkoop((cur) => (cur === key ? null : key))}
                      />
                    );
                  });
                })()}
              </div>
            ) : (
              <p className="text-sm text-ink/50">
                Geen geregistreerde verkopen gevonden in de laatste {nearbySales.data.zoekvensterMaanden} maanden
                {nearbySales.data.verruimd ? ", ook niet in de bredere omgeving" : " voor deze buurt"}.
              </p>
            )}

            <div className="rounded-xl border-l-[3px] border-accent bg-[#EEF0FF] p-4">
              <p className="text-[12.5px] font-bold text-accent-dark">Waarom een prijsklasse, geen exact bedrag?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink">
                Om de privacy van verkopers te beschermen, laten we geen exact bedrag zien. In plaats daarvan tonen
                we een smalle prijsklasse (bijvoorbeeld €275.000–€300.000). De woning is ergens binnen die klasse
                verkocht.
              </p>
            </div>
          </div>
        )}
      </ReportSection>
    </>
  );

  // Inhoud tonen we nu bij voorkeur als Altum's eigen modelschatting
  // (market.data.volume) i.p.v. de oude, zelf-berekende vuistregel op
  // building.data.inhoudM3 — die laatste blijft de terugval als Altum geen
  // waarde teruggaf. Op verzoek van de opdrachtgever presenteren we alle
  // kenmerken hier bewust zonder herkomst-labels (geen BAG- vs. Altum-
  // onderscheid meer in de UI) — dat betekent niet dat de onderliggende
  // bron minder feitelijk is, alleen dat we dat verschil hier niet meer apart benoemen.
  const objectInhoudM3 = market.data?.volume ?? building.data?.inhoudM3;
  const objectKenmerken = building.data
    ? [
        { icon: <RulerIcon className="h-4 w-4" />, waarde: building.data.oppervlakteM2 != null ? `${building.data.oppervlakteM2} m²` : "Onbekend", label: "Oppervlakte" },
        ...(kavel.data?.oppervlakteM2 != null
          ? [
              {
                icon: <KavelIcon className="h-4 w-4" />,
                waarde: `${kavel.data.oppervlakteM2} m²`,
                label: "Kavel",
                // Alleen een toelichting nodig bij meerdere eenheden in het
                // pand: dan is de kavel niet exclusief van deze wooneenheid.
                // Bij precies 1 eenheid (of onbekend aantal) is de kavel
                // gewoon van deze woning, geen verduidelijking nodig.
                extra:
                  building.data.aantalVerblijfsobjecten != null && building.data.aantalVerblijfsobjecten !== 1 ? (
                    <InfoTooltip label="Uitleg bij kavel">
                      Let op: deze kavel is van het hele pand, niet van deze ene woning. Bij meerdere eenheden in het
                      pand delen de bewoners dit stuk grond.
                    </InfoTooltip>
                  ) : undefined,
              },
            ]
          : []),
        { icon: <BoxIcon className="h-4 w-4" />, waarde: objectInhoudM3 != null ? `${objectInhoudM3} m³` : "Onbekend", label: "Inhoud" },
        { icon: <BuildingIcon className="h-4 w-4" />, waarde: building.data.aantalVerblijfsobjecten ?? "Onbekend", label: "Eenheden in pand" },
        ...(market.data?.rooms != null ? [{ icon: <DoorIcon className="h-4 w-4" />, waarde: market.data.rooms, label: "Kamers" }] : []),
        ...(bestemming.data?.bestemmingen.length
          ? [
              {
                icon: <BestemmingIcon className="h-4 w-4" />,
                waarde: bestemming.data.bestemmingen.join(", "),
                label: "Bestemming",
              },
            ]
          : []),
      ]
    : [];

  const objectgegevensTab = (
    <>
      <ReportSection title="Objectgegevens" meta={building.meta} hasData={building.data !== null}>
        {building.data && (
          <div
            className="relative overflow-hidden rounded-2xl bg-parchment p-6 sm:p-8"
            style={{
              backgroundImage: "radial-gradient(circle at 88% 12%, rgba(79,70,229,0.08), transparent 55%)",
            }}
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mist text-accent">
                <HomeIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-2xl font-extrabold leading-tight text-ink">
                  {building.data.woningtype ?? "Onbekend"}
                </p>
                <p className="mt-0.5 text-xs text-ink/45">Woningtype van dit pand</p>
              </div>
            </div>

            {objectKenmerken.length > 0 && (
              <div className="relative mt-6 flex flex-wrap gap-2.5">
                {objectKenmerken.map((k) => (
                  <div key={k.label} className="flex items-center gap-2.5 rounded-full bg-paper py-2 pl-2 pr-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-accent">
                      {k.icon}
                    </span>
                    <p className="text-sm text-ink">
                      <span className="font-semibold">{k.waarde}</span>{" "}
                      <span className="text-ink/45">{k.label.toLowerCase()}</span>
                    </p>
                    {"extra" in k && k.extra}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ReportSection>
    </>
  );

  // Waar dit specifieke label op de A+++–G schaal valt, en wat dat betekent
  // — puur relatieve/educatieve duiding (geen verzonnen verbruikscijfer voor
  // dít pand, zie lib/utils/energielabel.ts).
  const energieDuiding = energy.data?.klasse ? duidEnergielabel(energy.data.klasse) : null;

  const energieprestatieTab = (
    <>
      <ReportSection title="Energieprestatie en label" meta={energy.meta} hasData={energy.data !== null}>
        {energy.data && (
          <div className="rounded-2xl bg-parchment p-6 sm:p-8">
            {energieDuiding ? (
              <>
                <div className="flex gap-[3px]">
                  {ENERGIELABEL_SCHAAL.map((klasse, i) => {
                    const isHuidig = i === energieDuiding.index;
                    return (
                      <div
                        key={klasse}
                        className={`relative flex h-9 flex-1 items-center justify-center ${
                          i === 0 ? "rounded-l-xl" : ""
                        } ${i === ENERGIELABEL_SCHAAL.length - 1 ? "rounded-r-xl" : ""}`}
                        style={{ backgroundColor: ENERGIELABEL_KLEUREN[i] }}
                      >
                        {isHuidig && <span className="text-sm font-bold text-white">{klasse}</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex justify-between text-[9.5px] text-ink/35">
                  {ENERGIELABEL_SCHAAL.map((klasse) => (
                    <span key={klasse}>{klasse}</span>
                  ))}
                </div>

                <p className="mt-3 text-xs font-semibold" style={{ color: energieDuiding.kleur }}>
                  Klasse {energy.data.klasse}, {energieDuiding.kwartTekst}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <EnergieAccordionRij
                    icon={BoltIcon}
                    titel="Wat betekent dit voor stookkosten?"
                    toon={energieDuiding.toon}
                    open={energieAccordion === "stookkosten"}
                    onToggle={() => setEnergieAccordion(energieAccordion === "stookkosten" ? null : "stookkosten")}
                  >
                    Dit label ({energy.data.klasse}) zit in de {energieDuiding.kwartTekst}, {energieDuiding.stookkostenTekst}{" "}
                    Let op: het label zegt niets over hoeveel de huidige bewoners écht verbruiken. Dat hangt ook af
                    van hun eigen gebruik.
                  </EnergieAccordionRij>

                  <EnergieAccordionRij
                    icon={FileCheckIcon}
                    titel="Hoe is dit vastgesteld?"
                    open={energieAccordion === "vastgesteld"}
                    onToggle={() => setEnergieAccordion(energieAccordion === "vastgesteld" ? null : "vastgesteld")}
                  >
                    Een erkend energieadviseur stelt het energielabel vast, onder meer op basis van isolatie,
                    verwarmingsinstallatie en glasoort. Je kunt het label opzoeken in het landelijke
                    EP-Online-register.
                  </EnergieAccordionRij>

                  <EnergieAccordionRij
                    icon={CalendarIcon}
                    titel="Geldigheid en isolatie"
                    open={energieAccordion === "geldigheid"}
                    onToggle={() => setEnergieAccordion(energieAccordion === "geldigheid" ? null : "geldigheid")}
                  >
                    {energy.data.registratiedatum && <>Geregistreerd op {formatDate(energy.data.registratiedatum)}. </>}
                    {energy.data.geldigTot && <>Geldig tot {formatDate(energy.data.geldigTot)}. </>}
                    {energy.data.isolatie ? (
                      <>
                        Dak: {energy.data.isolatie.dak}, gevel: {energy.data.isolatie.gevel}, vloer:{" "}
                        {energy.data.isolatie.vloer}, beglazing: {energy.data.isolatie.beglazing}.
                      </>
                    ) : (
                      <>
                        Isolatiegegevens per bouwdeel (dak, gevel, vloer, beglazing) staan niet apart in de publieke
                        energielabel-bronnen (EP-Online / overheid.io). Dat geldt voor elk adres, niet alleen dit
                        pand.
                      </>
                    )}
                  </EnergieAccordionRij>
                </div>
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {energy.data.registratiedatum && (
                  <DataCard icon={<CalendarIcon className="h-4 w-4" />} iconColor="#4F46E5" label="Registratiedatum" value={formatDate(energy.data.registratiedatum)} />
                )}
                {energy.data.geldigTot && (
                  <DataCard icon={<CalendarIcon className="h-4 w-4" />} iconColor="#0D9488" label="Geldig tot" value={formatDate(energy.data.geldigTot)} />
                )}
              </div>
            )}
          </div>
        )}
      </ReportSection>
    </>
  );

  const funderingsrisicoTab = (
    <>
      <ReportSection title="Funderingsrisico" subtitle="Hoe we tot deze inschatting komen" meta={fundering.meta} hasData={fundering.data?.duiding != null}>
        {fundering.data?.duiding && (
          <FunderingRedenering
            niveau={fundering.data.niveau}
            bouwjaarGebruikt={fundering.data.bouwjaarGebruikt}
            bodemclassificatie={fundering.data.bodemclassificatie}
            bodemclassificatieUitleg={fundering.data.bodemclassificatieUitleg}
            percentageVoor1970Postcode={fundering.data.percentageVoor1970Postcode}
            duidingCaveat={fundering.data.duidingCaveat}
            duidingAdvies={fundering.data.duidingAdvies}
            toelichting={fundering.data.toelichting}
          />
        )}
      </ReportSection>
    </>
  );

  const buurtTab = (
    <ReportSection
      title="Buurtprofiel"
      subtitle="CBS wijk- en buurtcijfers, politiecijfers"
      meta={buurtprofiel.meta}
      hasData={Boolean(
        buurtprofiel.data?.veiligheid.tekst ||
          buurtprofiel.data?.sociaal.tekst ||
          buurtprofiel.data?.fysiek.tekst ||
          buurtprofiel.data?.voorzieningen.tekst
      )}
    >
      {buurtprofiel.data && (
        <div className="flex flex-col gap-6">
          {buurtprofiel.data.veiligheid.misdrijvenPer1000 != null && (
            <div>
              <SubKop icon={ShieldCheckIcon}>Veiligheid</SubKop>
              <VeiligheidsScore
                misdrijvenPer1000={buurtprofiel.data.veiligheid.misdrijvenPer1000}
                aantalMisdrijven={buurtprofiel.data.veiligheid.aantalMisdrijven}
                peiljaar={buurtprofiel.data.peiljaar}
              />
            </div>
          )}

          {(buurtprofiel.data.sociaal.inwoners != null || buurtprofiel.data.sociaal.huishoudens != null) && (
            <div>
              <SubKop icon={UsersIcon}>Bevolking en huishoudens</SubKop>
              <div className="grid gap-2.5 sm:grid-cols-5">
                <DataCard label="Inwoners" value={buurtprofiel.data.sociaal.inwoners?.toLocaleString("nl-NL") ?? "Onbekend"} />
                <DataCard label="Huishoudens" value={buurtprofiel.data.sociaal.huishoudens?.toLocaleString("nl-NL") ?? "Onbekend"} />
                <DataCard
                  label="Pers. per huishouden"
                  value={
                    buurtprofiel.data.sociaal.gemiddeldeHuishoudensgrootte != null
                      ? String(buurtprofiel.data.sociaal.gemiddeldeHuishoudensgrootte).replace(".", ",")
                      : "Onbekend"
                  }
                />
                <DataCard
                  label="Eenpersoonshuishoudens"
                  value={buurtprofiel.data.sociaal.percentageEenpersoons != null ? `${buurtprofiel.data.sociaal.percentageEenpersoons}%` : "Onbekend"}
                />
                <DataCard
                  label="Huishoudens met kinderen"
                  value={buurtprofiel.data.sociaal.percentageMetKinderen != null ? `${buurtprofiel.data.sociaal.percentageMetKinderen}%` : "Onbekend"}
                />
              </div>
            </div>
          )}

          {buurtprofiel.data.fysiek.bevolkingsdichtheid != null && (
            <div>
              <SubKop icon={BuildingIcon}>Bebouwingsdichtheid</SubKop>
              <div className="rounded-xl bg-parchment p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg font-extrabold text-ink">
                    {buurtprofiel.data.fysiek.bevolkingsdichtheid.toLocaleString("nl-NL")}{" "}
                    <span className="text-xs font-normal text-ink/45">inwoners/km²</span>
                  </p>
                  <span className="shrink-0 rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[11px] font-semibold text-accent">
                    {buurtprofiel.data.fysiek.bevolkingsdichtheid >= 2500
                      ? "Dichtbebouwd stedelijk"
                      : buurtprofiel.data.fysiek.bevolkingsdichtheid >= 1000
                        ? "Matig dichtbebouwd"
                        : "Landelijk, dunbevolkt"}
                  </span>
                </div>
                {(buurtprofiel.data.fysiek.percentageEengezinswoning != null ||
                  buurtprofiel.data.fysiek.percentageMeergezinswoning != null) && (
                  <>
                    <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
                      <div className="bg-[#7F77DD]" style={{ width: `${buurtprofiel.data.fysiek.percentageEengezinswoning ?? 0}%` }} />
                      <div className="bg-[#0D9488]" style={{ width: `${buurtprofiel.data.fysiek.percentageMeergezinswoning ?? 0}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10.5px] text-ink/45">
                      <span>{buurtprofiel.data.fysiek.percentageEengezinswoning ?? 0}% eengezinswoningen</span>
                      <span>{buurtprofiel.data.fysiek.percentageMeergezinswoning ?? 0}% meergezinswoningen</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {buurtprofiel.data.voorzieningen.items.length > 0 && (
            <div>
              <SubKop icon={MapPinIcon}>Voorzieningen</SubKop>
              <div className="flex flex-col gap-4">
                {VOORZIENING_THEMA_VOLGORDE.map((thema) => {
                  const items = buurtprofiel.data!.voorzieningen.items.filter((i) => i.thema === thema);
                  if (items.length === 0) return null;
                  return (
                    <div key={thema}>
                      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink/50">
                        {VOORZIENING_THEMA_LABEL[thema]}
                      </p>
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {items.map((item) => {
                          const Icon = VOORZIENING_ICON[item.key] ?? MapPinIcon;
                          return (
                            <DataCard
                              key={item.key}
                              icon={<Icon className="h-4 w-4" />}
                              iconColor={VOORZIENING_KLEUR[item.key] ?? "#4F46E5"}
                              label={item.label}
                              value={`${String(item.afstandKm).replace(".", ",")} km`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </ReportSection>
  );

  // Samenvatting — compacte, visuele afsluiting van het rapport (laatste
  // tabblad). Indigo hero-band met het totaalbeeld, 4 kernstat-kaarten voor
  // de kernstats die daadwerkelijk data hebben, 3 kolommen (pluspunten /
  // aandachtspunten / wat kun je hiermee), en een niet-cursieve
  // "Eindconclusie"-paneel als afsluiting. Alle tekst komt uit
  // buildSamenvatting() — hier wordt niets extra verzonnen, alleen opgemaakt.
  const samenvattingTab = (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-6 text-white sm:p-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/70">
          <FlagIcon className="h-3.5 w-3.5" />
          Samenvatting
        </p>
        <h2 className="mt-2 font-display text-xl font-bold leading-snug sm:text-2xl">{samenvatting.titel}</h2>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-white/85">{samenvatting.totaalbeeld}</p>
        {market.data && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5">
            <TrendingUpIcon className="h-3.5 w-3.5" />
            <span className="text-[12.5px] font-semibold">Geschatte waarde: {formatCurrency(market.data.geschatteWaarde)}</span>
          </div>
        )}
      </div>

      {samenvatting.kernstats.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {samenvatting.kernstats.map((stat) => (
            <KernstatKaart key={stat.key} stat={stat} />
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#0F766E]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E6FBF7]">
              <CheckIcon className="h-3 w-3" />
            </span>
            Pluspunten
          </p>
          <ul className="flex flex-col gap-2.5">
            {samenvatting.pluspunten.map((tekst, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink/70">
                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]" />
                {tekst}
              </li>
            ))}
            {samenvatting.pluspunten.length === 0 && <li className="text-[12.5px] text-ink/40">Geen bekend voor dit adres.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#9A6A0C]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FEF3E2]">
              <AlertTriangleIcon className="h-3 w-3" />
            </span>
            Aandachtspunten
          </p>
          <ul className="flex flex-col gap-2.5">
            {samenvatting.aandachtspunten.map((tekst, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink/70">
                <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A6A0C]" />
                {tekst}
              </li>
            ))}
            {samenvatting.aandachtspunten.length === 0 && <li className="text-[12.5px] text-ink/40">Geen bekend voor dit adres.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF0FF]">
              <BulbIcon className="h-3 w-3" />
            </span>
            Wat kun je hiermee?
          </p>
          <ul className="flex flex-col gap-2.5">
            {samenvatting.gebruiksblok.map((tekst, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink/70">
                <ArrowRightIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {tekst}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl bg-[#EEF0FF] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Eindconclusie</p>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink/80">{samenvatting.eindconclusie}</p>
      </div>
    </div>
  );

  return (
    <main className="bg-parchment">
      <SiteHeader />
      <Container width="narrow">
        {/* Eén doorlopend paneel i.p.v. losse gestapelde kaarten: indigo hero
            (adres, kenmerken, locatie) en de vergelijkingstabel delen nu
            dezelfde buitenrand/afronding, met alleen een interne
            scheidingslijn ertussen — geen zwevend wit kaartje meer dat over
            de blauwe band heen valt, en geen los teaserblok/tweede CTA meer
            eronder (die herhaalden gewoon wat de tabel al zei). */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-ink/10">
          <ReportHero
            address={core.address}
            building={building.data}
            energy={energy.data}
            fundering={fundering.data}
            lonLat={core.lonLat}
          />
          {/* BUGFIX: dit paywall/verkoopblok (met de geblurde "Voorbeeld"-
              waarde en de "Ontgrendel nu"-knop) werd voorheen ALTIJD getoond,
              ook na een geslaagde betaling — de bezoeker kwam dan terug op
              een pagina die er nog identiek uitzag aan de niet-betaalde
              staat, met het daadwerkelijk ontgrendelde rapport (ReportTabs
              hieronder) pas zichtbaar na scrollen. Nu, net als bij ReportTabs
              zelf, alleen tonen zolang er nog niet ontgrendeld is — én niet
              tijdens de paar seconden waarin de zojuist afgeronde betaling
              nog bevestigd wordt (isConfirmingPayment), anders zou iemand
              die al heeft afgerekend alsnog kort "Ontgrendel nu voor €11,95"
              te zien krijgen. */}
          {!isUnlocked && !isConfirmingPayment && (
            <PreviewSummary onUnlockClick={() => setShowPaywall(true)} adresLabel={report.core.address.label} />
          )}
          {isConfirmingPayment && (
            <div className="border-t border-ink/10 bg-white px-5 py-10 text-center sm:px-6">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-accent/25 border-t-accent" />
              <p className="mt-3 text-sm font-semibold text-ink">Betaling wordt bevestigd…</p>
              <p className="mt-1 text-xs text-ink/50">Een moment geduld, het rapport wordt zo ontgrendeld.</p>
            </div>
          )}
        </div>

        {/* Ontgrendeld rapport: 7 sticky tabbladen, precies de canonieke
            7-delige naamgeving die ook in de vergelijkingstabel en het
            inkijkje wordt gebruikt — i.p.v. 4 tabbladen die meerdere van die
            onderdelen samen groepeerden. */}
        {isUnlocked && (
          <ReportTabs
            activeId={activeTabId}
            onChange={setActiveTabId}
            tabs={[
              { id: "overzicht", label: "Rapportoverzicht", content: overzichtTab },
              { id: "waarde", label: "Waarde-indicatie", content: waardeIndicatieTab },
              { id: "verkopen", label: "Verkopen in de buurt", content: verkopenBuurtTab },
              { id: "object", label: "Objectgegevens", content: objectgegevensTab },
              { id: "energie", label: "Energieprestatie en label", content: energieprestatieTab },
              { id: "fundering", label: "Funderingsrisico", content: funderingsrisicoTab },
              { id: "buurt", label: "Buurtprofiel", content: buurtTab },
              { id: "samenvatting", label: "Samenvatting", content: samenvattingTab },
            ]}
          />
        )}

        {isUnlocked && (
          <div className="mt-6 rounded-2xl border border-ink/10 bg-paper p-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6FBF7] text-[#0F766E]">
                  <FileCheckIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-ink">Rapport gereed</p>
                  <p className="mt-0.5 text-sm text-ink/50">Download de PDF, of ontvang 'm per e-mail.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                  {downloadingPdf ? "PDF wordt gemaakt…" : "Download PDF"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowEmailForm((v) => !v);
                    setEmailStatus(null);
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <MailIcon className="h-3.5 w-3.5" />
                    Verstuur naar mail
                  </span>
                </Button>
              </div>
            </div>

            {showEmailForm && (
              <form onSubmit={handleSendEmail} className="mt-5 border-t border-ink/10 pt-5">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="naam@voorbeeld.nl"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <Button type="submit" disabled={sendingEmail || emailInput.trim().length === 0}>
                    {sendingEmail ? "Versturen…" : "Verstuur"}
                  </Button>
                </div>
                {emailStatus && (
                  <p className={`mt-2 text-xs ${emailStatus.kind === "success" ? "text-[#0F766E]" : "text-rust"}`}>
                    {emailStatus.message}
                  </p>
                )}
                <p className="mt-2 text-xs text-ink/40">
                  We bewaren dit e-mailadres niet, alleen gebruikt om deze ene PDF te versturen. Kom je 'm niet
                  tegen? Check ook even je spam- of ongewenste-mailbox.
                </p>
              </form>
            )}
          </div>
        )}
      </Container>
      <SiteFooter />

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        address={core.address}
        kortingToken={kortingToken}
        onConfirm={async (bestellingId) => {
          await onUnlock(bestellingId);
          setShowPaywall(false);
        }}
      />
    </main>
  );
}
