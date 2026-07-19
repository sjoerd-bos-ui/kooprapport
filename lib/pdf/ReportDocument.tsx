import { Document, Page, View, Text, StyleSheet, Font, Svg, Path, Circle, Rect, Line, Link } from "@react-pdf/renderer";
import type { Report, NearbySale, KavelData, BestemmingData } from "@/types/report";
import { unavailableResult } from "@/types/dataSource";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { TOON_HEX, type ChipToon } from "@/lib/utils/toonKleuren";
import { duidEnergielabel, ENERGIELABEL_SCHAAL, ENERGIELABEL_KLEUREN } from "@/lib/utils/energielabel";
import { berekenVeiligheidsscore, bepaalVeiligheidsBand, VEILIGHEID_BAND } from "@/lib/utils/veiligheidsscore";
import { buildSamenvatting, type SamenvattingKernstat } from "@/lib/services/samenvatting";
import { VOORZIENING_THEMA_VOLGORDE, VOORZIENING_THEMA_LABEL, VOORZIENING_KLEUR } from "@/lib/utils/voorzieningenStijl";

// -----------------------------------------------------------------------------
// PDF-versie van het rapport — bewust een EIGEN, op zichzelf staande opmaak
// (via @react-pdf/renderer), niet een screenshot/print van de webpagina zelf.
//
// v8 — acht aparte pagina's (opgebouwd via meerdere visualize-rondes met de
// gebruiker), elk gewijd aan precies één onderdeel zodat elke pagina zijn
// eigen volle, rustig leesbare ruimte krijgt i.p.v. twee onderdelen samen op
// één pagina te persen:
//   1) Cover — adres, kernquote + "bekijk online", vraag-gestileerde
//      inhoudsopgave (1 regel per volgende pagina).
//   2) Waarde-indicatie — hero (deze woning vs. buurtgemiddelde), duiding,
//      stepper-onderbouwing, bandbreedte, "wat kun je hiermee"-tips,
//      uitlegpaneel.
//   3) Verkopen in de buurt — kerncijfers, vergelijkbare verkopen
//      uitgelicht, overige verkopen gedempt, duiding "wat is vergelijkbaar".
//   4) Objectgegevens & Energieprestatie — objecthero met kenmerken,
//      losse energieblokken (klasse+meter, schaal, stookkosten, vaststelling
//      + geldigheid, isolatie, verduurzamingstips).
//   5) Funderingsrisico — tijdlijn + meter, doorlopende toelichting
//      (bodem/wat we niet weten/conclusie/percentage), algemene signalen,
//      advies bij twijfel.
//   6) Buurtprofiel — veiligheid- en bebouwingsring, bevolking +
//      voorzieningen, algemene tips, duiding.
//   7) Samenvatting — compacte, visuele eindsamenvatting (totaalbeeld,
//      kernstat-ringen, pluspunten/aandachtspunten/gebruiksblok,
//      eindconclusie). Bouwt uitsluitend voort op velden die op de andere
//      pagina's al staan (lib/services/samenvatting.ts) — geen nieuw feit.
//   8) Afsluiting — decoratief, geen data.
//
// Kleuren/getallen komen bewust uit dezelfde gedeelde bronnen als de
// webweergave (lib/utils/toonKleuren.ts, lib/utils/energielabel.ts,
// lib/utils/veiligheidsscore.ts, lib/utils/format.ts) — dit is een tweede
// weergave van hetzelfde model, geen tweede plek waar kleuren/cijfers apart
// worden bedacht.
//
// BELANGRIJK — feitelijk en verifieerbaar: alle "algemene tips"-blokjes
// (verduurzaming, funderingssignalen, buurt-aandachtspunten, wat-kun-je-
// hiermee bij de waarde-indicatie) zijn bewust generieke, altijd-geldige
// kennis — GEEN bevinding of advies specifiek voor dit pand — en expliciet
// zo gelabeld in de tekst zelf. Ze verschijnen alleen naast een sectie die
// wél echte data heeft, nooit als vervanging van ontbrekende data.
//
// De isolatie-per-bouwdeel-sectie toont de echte waarden als energy.data
// .isolatie gezet is, en anders de eerlijke tekst dat die data niet publiek
// geregistreerd wordt — voor geen enkel adres, dus geen tekortkoming van dit
// pand specifiek (zelfde tekst/logica als de EnergieAccordionRij "Geldigheid
// en isolatie" in components/report/ReportView.tsx).
//
// BEKENDE BEPERKING — QR-code: de cover verwijst naar de online versie via
// een tekstuele "bekijk online"-pil, GEEN echte QR-afbeelding. Een QR-code
// genereren vereist een pakket (bv. "qrcode") dat niet geïnstalleerd kon
// worden vanuit deze sandbox (geen toegang tot de npm-registry). Voer lokaal
// `npm install qrcode` uit, dan kan ik de echte, scanbare QR-code alsnog
// toevoegen — een nagemaakt QR-patroon dat niet scant zou hier erger zijn
// dan geen QR-code tonen.
//
// Deze component ontvangt het AL OPGEHAALDE Report-object vanuit de client —
// er wordt hier niets opnieuw bij Altum/BAG/CBS opgehaald.
// -----------------------------------------------------------------------------

Font.registerHyphenationCallback((word) => [word]);

const KLEUR = {
  accent: "#4F46E5",
  accentDark: "#4338CA",
  ink: "#1F1F2E",
  inkMuted: "#6B6B7A",
  inkFaint: "#9797A3",
  parchment: "#F5F5FA",
  paper: "#FFFFFF",
  mist: "#EEF0FF",
  line: "#E4E4EC",
};

const SIDEBAR_BREEDTE = "14%";
// Eén sectie per volgende pagina — zelfde volgorde als de vraag-gestileerde
// inhoudsopgave op de cover, zodat sidebar en cover elkaar 1-op-1 bevestigen.
const SECTIES = ["Overzicht", "Waarde", "Verkopen", "Object", "Fundering", "Buurt", "Samenvatting"];

const styles = StyleSheet.create({
  pageRow: {
    flexDirection: "row",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: KLEUR.ink,
  },
  sidebar: {
    width: SIDEBAR_BREEDTE,
    backgroundColor: KLEUR.accentDark,
    alignItems: "center",
    paddingTop: 30,
  },
  content: {
    flex: 1,
    position: "relative",
    paddingTop: 26,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  // Getinte pagina-achtergrond — overal behalve de cover (die vult zichzelf
  // al met de hero-afbeelding), zodat witte kaarten er echt uitspringen i.p.v.
  // te verdwijnen tegen een verder kale witte pagina.
  contentTinted: {
    flex: 1,
    position: "relative",
    paddingTop: 26,
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: KLEUR.parchment,
  },
  metaRegel: { fontSize: 7, color: KLEUR.inkFaint, marginBottom: 10 },
  pageTitel: { fontSize: 15, fontFamily: "Helvetica-Bold", color: KLEUR.ink },
  pageSubtitel: { fontSize: 8, color: KLEUR.inkMuted, marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: KLEUR.inkFaint,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: KLEUR.line,
  },
  kaart: {
    backgroundColor: KLEUR.paper,
    borderRadius: 9,
    padding: 11,
  },
  kaartOpWit: {
    backgroundColor: KLEUR.parchment,
    borderRadius: 7,
  },
  duidingPaneel: {
    backgroundColor: KLEUR.mist,
    borderLeftWidth: 3,
    borderLeftColor: KLEUR.accent,
    borderRadius: 8,
    padding: 10,
  },
  row: { flexDirection: "row" },
  divider: { height: 0.5, backgroundColor: "#EEEEF3" },
  chip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
});

function rond(waarde: number): string {
  return Math.round(waarde).toLocaleString("nl-NL");
}

function formatKm(waarde: number): string {
  return `${waarde.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatDecimaal(waarde: number, decimalen = 1): string {
  return waarde.toLocaleString("nl-NL", { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });
}

// Zelfde drempels/labels als de bebouwingsdichtheid-badge in
// components/report/ReportView.tsx (buurtTab, rond regel 914) — hier
// herhaald zodat PDF en webapp nooit een andere grens voor "dichtbebouwd"
// gebruiken.
function dichtheidLabel(bevolkingsdichtheid: number): string {
  if (bevolkingsdichtheid >= 2500) return "een dichtbebouwde, stedelijke buurt";
  if (bevolkingsdichtheid >= 1000) return "een matig dichtbebouwde buurt";
  return "een landelijke, dunbevolkte buurt";
}

// Korte badge-vorm van dezelfde drempels — zelfde tekst als de bebouwing-
// badge in ReportView.tsx ("Dichtbebouwd stedelijk"/"Matig dichtbebouwd"/
// "Landelijk, dunbevolkt"), hier apart omdat de PDF-bebouwingskaart een pil
// toont, geen volledige zin.
function dichtheidLabelKort(bevolkingsdichtheid: number): string {
  if (bevolkingsdichtheid >= 2500) return "Dichtbebouwd stedelijk";
  if (bevolkingsdichtheid >= 1000) return "Matig dichtbebouwd";
  return "Landelijk, dunbevolkt";
}

// Zie eerdere toelichting: Altum's Referentiewoningen-data heeft alleen
// maand+jaar-precisie, geen exacte dag — dus altijd deze functie voor
// verkoop.verkoopdatum, nooit formatDate() (die een "1 januari" zou tonen
// die geen echte bewering over de transactiedag is).
function formatMaandJaar(dateStr: string | null | undefined): string {
  if (!dateStr) return "onbekend";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(d);
}

// Zelfde classificatie-verkorting als bodemNodeTekst() in
// components/report/FunderingRedenering.tsx — hier lokaal herhaald omdat die
// functie daar niet geëxporteerd wordt en dit puur presentatie is (geen
// nieuwe logica).
function bodemNodeTekst(bodemclassificatie: string | null): string {
  if (!bodemclassificatie) return "Onbekend";
  if (bodemclassificatie.startsWith("Niet kwetsbaar")) return "Niet kwetsbaar";
  if (bodemclassificatie.startsWith("Kwetsbaar")) return "Kwetsbaar";
  if (bodemclassificatie.startsWith("Stedelijk")) return "Stedelijk";
  return "Onbekend";
}

type IconProps = { kleur: string; size?: number };
type IconComp = (p: IconProps) => React.ReactElement;

function Chip({ text, toon }: { text: string; toon: ChipToon }) {
  const { bg, tekst } = TOON_HEX[toon];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={{ color: tekst }}>{text}</Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Vector-iconen — Svg/Path, geen font-glyphs (zie eerdere toelichting).
// -----------------------------------------------------------------------------
function IcoonHuis({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 11.5L12 4l9 7.5M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonKalender({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={17} rx={2} stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M3 9h18M8 2v4M16 2v4" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonBlad({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonWaarschuwing({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3L2 20h20L12 3z" stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M12 10v4M12 17h.01" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonOppervlakte({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M3 9h18M9 21V9" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonInhoud({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M3 7l9 5 9-5M12 12v10" stroke={kleur} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

function IcoonDeur({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={3} width={12} height={18} rx={1} stroke={kleur} strokeWidth={2} fill="none" />
      <Circle cx={14} cy={12} r={1.1} fill={kleur} />
    </Svg>
  );
}

// PDF-equivalent van LayersIcon (components/report/icons.tsx) voor de
// nieuwe stepper-knoop "150+ kenmerken" — dezelfde gestapelde-lagen-vorm,
// om web en PDF ook hier niet te laten driften.
function IcoonLagen({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3.5 21 8.5l-9 5-9-5 9-5z" stroke={kleur} strokeWidth={1.6} fill="none" />
      <Path d="M3 12.5l9 5 9-5" stroke={kleur} strokeWidth={1.6} fill="none" />
      <Path d="M3 16.5l9 5 9-5" stroke={kleur} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

function IcoonCheck({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 13l4 4L19 7" stroke={kleur} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IcoonExternLink({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14 3h7v7M21 3l-9 9" stroke={kleur} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M19 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h5" stroke={kleur} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function IcoonEuro({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M15 9.5a3 3 0 00-3-1.5c-2 0-3 1.3-3 2.6 0 3 6 1.5 6 4.4 0 1.3-1.3 2.5-3 2.5a3.3 3.3 0 01-3-1.6" stroke={kleur} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

function IcoonTrend({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 19h16M6 15l4-5 3 3 5-7" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonSchild({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonHuisarts({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M19 14c1.5 2 1.5 4-1 6-4 3-9 3-13 0-2.5-2-2.5-4-1-6l3-5a4 4 0 017 0z" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonSupermarkt({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={8} width={18} height={13} rx={1} stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M3 8l2-5h14l2 5" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonSchool({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3L2 8l10 5 10-5-10-5z" stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M6 10.5V16c0 1 3 2.5 6 2.5s6-1.5 6-2.5v-5.5" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

// Onderstaande vijf iconen zijn het PDF-equivalent van de nieuwe web-iconen
// in components/report/icons.tsx (Apotheek/Kinderdagverblijf/Trein/Oprit/
// Park) — zelfde vormtaal, alleen als @react-pdf/renderer Svg/Path i.p.v.
// browser-SVG, zodat web en PDF hier niet driften.
function IcoonApotheek({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={16} height={16} rx={3} stroke={kleur} strokeWidth={2} fill="none" />
      <Line x1={12} y1={8} x2={12} y2={16} stroke={kleur} strokeWidth={2} />
      <Line x1={8} y1={12} x2={16} y2={12} stroke={kleur} strokeWidth={2} />
    </Svg>
  );
}

function IcoonKinderdagverblijf({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={13} r={6} stroke={kleur} strokeWidth={2} fill="none" />
      <Circle cx={7.5} cy={7} r={2} stroke={kleur} strokeWidth={2} fill="none" />
      <Circle cx={16.5} cy={7} r={2} stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonTrein({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={4} width={12} height={12} rx={3} stroke={kleur} strokeWidth={2} fill="none" />
      <Line x1={6} y1={12} x2={18} y2={12} stroke={kleur} strokeWidth={2} />
      <Circle cx={9} cy={19} r={1.4} fill={kleur} />
      <Circle cx={15} cy={19} r={1.4} fill={kleur} />
    </Svg>
  );
}

function IcoonOprit({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 3 5 21M16 3l3 18" stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M12 5v3M12 11v3M12 17v3" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function IcoonPark({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3c4 2 6 6 4 10-1 2-3 3-4 3s-3-1-4-3c-2-4 0-8 4-10z" stroke={kleur} strokeWidth={2} fill="none" />
      <Line x1={12} y1={13} x2={12} y2={21} stroke={kleur} strokeWidth={2} />
    </Svg>
  );
}

// PDF-equivalent van KavelIcon in components/report/icons.tsx — vier
// hoek-haakjes (meetkader), voor de Kavelgrootte-kenmerkpil op Objectgegevens.
function IcoonKavel({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
        stroke={kleur}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

// PDF-equivalent van BestemmingIcon in components/report/icons.tsx — een
// plattegrond met een gemarkeerd vlak, voor de Bestemming-kenmerkpil.
function IcoonBestemming({ kleur, size = 9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 5.5 9 4l6 1.5 5-1.5v14.5l-5 1.5-6-1.5-5 1.5V5.5Z"
        stroke={kleur}
        strokeWidth={2}
        fill="none"
      />
      <Path d="M9 4v14.5M15 5.5V20" stroke={kleur} strokeWidth={2} fill="none" />
    </Svg>
  );
}

// Icoon per voorziening-key — PDF-equivalent van VOORZIENING_ICON in
// ReportView.tsx. Kleur per key komt uit lib/utils/voorzieningenStijl.ts
// (gedeeld met web), het icoon-component zelf niet (react-pdf vs. browser-SVG).
const VOORZIENING_ICOON: Record<string, IconComp> = {
  huisarts: IcoonHuisarts,
  apotheek: IcoonApotheek,
  supermarkt: IcoonSupermarkt,
  basisschool: IcoonSchool,
  voortgezetOnderwijs: IcoonSchool,
  kinderdagverblijf: IcoonKinderdagverblijf,
  treinstation: IcoonTrein,
  opritHoofdweg: IcoonOprit,
  park: IcoonPark,
};

function IcoonMensen({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={8} cy={8} r={3} stroke={kleur} strokeWidth={2} fill="none" />
      <Path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={kleur} strokeWidth={2} fill="none" />
      <Circle cx={17.5} cy={8.5} r={2.4} stroke={kleur} strokeWidth={1.6} fill="none" />
      <Path d="M15 20c.2-2.6 1.9-4.6 4-5" stroke={kleur} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

function IcoonPin({ kleur, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 22s7-6.6 7-12a7 7 0 10-14 0c0 5.4 7 12 7 12z" stroke={kleur} strokeWidth={2} fill="none" />
      <Circle cx={12} cy={10} r={2.4} stroke={kleur} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

// Het echte Kooprapport-merkmerk (Variant A) — exact dezelfde paden als de
// kleine badge in Sidebar hierboven, alleen los getrokken tot een eigen
// functie zodat hij ook op de afsluitpagina (groot, i.p.v. IcoonHuis) kan
// worden hergebruikt. Kleur van de K en de achtergrond zijn los instelbaar,
// het amber knooppunt blijft altijd #D97706 (zelfde merkkleur overal).
function IcoonKooprapportLogo({ kleur, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={8.14} y={6} width={2.79} height={12} rx={0.9} fill={kleur} />
      <Path d="M10.93 11.14 L10.93 9.43 L15.64 5.57 L17.36 7.29 Z" fill={kleur} />
      <Path d="M10.93 12.86 L10.93 14.57 L15.64 18.43 L17.36 16.71 Z" fill={kleur} />
      <Circle cx={10.93} cy={12} r={1.46} fill="#D97706" />
    </Svg>
  );
}

function IconBadge({ icoon, toon, size = 16 }: { icoon: IconComp; toon: ChipToon; size?: number }) {
  const { bg, tekst } = TOON_HEX[toon];
  const Icoon = icoon;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Icoon kleur={tekst} size={size * 0.55} />
    </View>
  );
}

// Pil-vormig kenmerk (icoonbadge + waarde + label) — hetzelfde visuele
// patroon als de "satellite chips" op de Objectgegevens-tab in de webapp.
function Kenmerk({ icoon: Icoon, waarde, label }: { icoon: IconComp; waarde: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: KLEUR.parchment, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
      <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: KLEUR.mist, alignItems: "center", justifyContent: "center" }}>
        <Icoon kleur={KLEUR.accent} size={8} />
      </View>
      <Text style={{ fontSize: 7.5 }}>
        <Text style={{ fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>{waarde}</Text>
        <Text style={{ color: KLEUR.inkMuted }}> {label}</Text>
      </Text>
    </View>
  );
}

// Eén item in een "algemene tips"-grid (2 kolommen via flexWrap, react-pdf
// kent geen CSS grid). Bewust een simpele stip i.p.v. een eigen icoon per
// item — zelfde stijl als de goedgekeurde "Signalen om op te letten".
function TipItem({ tekst, dotKleur = KLEUR.inkFaint }: { tekst: string; dotKleur?: string }) {
  return (
    <View style={{ flexBasis: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: KLEUR.parchment, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 7 }}>
      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: dotKleur }} />
      <Text style={{ fontSize: 7, color: KLEUR.ink, flex: 1 }}>{tekst}</Text>
    </View>
  );
}

// Eén puntsgewijze regel (icoon + korte tekst) in het afsluitende
// buurt-samenvattingspaneel — vervangt de eerder gebruikte, dichte
// duiding-alinea (zie toelichting bij ReportDocument): dezelfde onderliggende
// cijfers, maar per onderwerp los getrokken i.p.v. één lopende tekst.
function Kernpunt({ icoon: Icoon, tekst }: { icoon: IconComp; tekst: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
      <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: KLEUR.accent, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 0.5 }}>
        <Icoon kleur="#FFFFFF" size={8} />
      </View>
      <Text style={{ flex: 1, fontSize: 7.3, color: KLEUR.ink, lineHeight: 1.5 }}>{tekst}</Text>
    </View>
  );
}

function TipsGrid({ titel, sublabel, items, dotKleur }: { titel: string; sublabel: string; items: string[]; dotKleur?: string }) {
  return (
    <View style={styles.kaart}>
      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 7 }}>
        {titel} <Text style={{ fontFamily: "Helvetica", color: KLEUR.inkFaint, fontSize: 7 }}>: {sublabel}</Text>
      </Text>
      <View style={[styles.row, { flexWrap: "wrap", gap: 5 }]}>
        {items.map((tekst) => (
          <TipItem key={tekst} tekst={tekst} dotKleur={dotKleur} />
        ))}
      </View>
    </View>
  );
}

function SectieKop({ titel, icoon, toon }: { titel: string; icoon: IconComp; toon: ChipToon }) {
  return (
    <View style={[styles.row, { alignItems: "center", gap: 6, marginBottom: 3 }]}>
      <IconBadge icoon={icoon} toon={toon} />
      <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>{titel}</Text>
    </View>
  );
}

// Vaste linker navigatiebalk. actief=-1 → geen enkel item gemarkeerd
// (gebruikt op de afsluitpagina, die geen eigen rapportonderdeel is).
function Sidebar({ actief }: { actief: number }) {
  return (
    <View style={styles.sidebar} fixed>
      {/* Kooprapport-merkmerk (Variant A) i.p.v. de losse letter "W" —
          zelfde blokvormige K met amber knooppunt als het app-icoon op de
          website, hier geschaald naar het kleine sidebar-badge-formaat. */}
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Rect x={8.14} y={6} width={2.79} height={12} rx={0.9} fill={KLEUR.accentDark} />
          <Path d="M10.93 11.14 L10.93 9.43 L15.64 5.57 L17.36 7.29 Z" fill={KLEUR.accentDark} />
          <Path d="M10.93 12.86 L10.93 14.57 L15.64 18.43 L17.36 16.71 Z" fill={KLEUR.accentDark} />
          <Circle cx={10.93} cy={12} r={1.46} fill="#D97706" />
        </Svg>
      </View>
      <View style={{ marginTop: 24, gap: 16 }}>
        {SECTIES.map((label, i) => (
          <View key={label} style={{ alignItems: "center", gap: 4, paddingHorizontal: 4 }}>
            <View
              style={{
                width: i === actief ? 7 : 4,
                height: i === actief ? 7 : 4,
                borderRadius: 4,
                backgroundColor: i === actief ? "#FFFFFF" : "#FFFFFF66",
              }}
            />
            <Text
              style={{
                fontSize: 5.3,
                textAlign: "center",
                lineHeight: 1.3,
                color: i === actief ? "#FFFFFF" : "#FFFFFF8C",
                fontFamily: i === actief ? "Helvetica-Bold" : "Helvetica",
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Footer({ gegenereerdOp }: { gegenereerdOp: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Bronnen: Kadaster (BAG), RVO/EP-Online, CBS, Altum AI</Text>
      <Text
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Pagina ${pageNumber} van ${totalPages} · gegenereerd op ${formatDate(gegenereerdOp)}`
        }
      />
    </View>
  );
}

// Alleen op het showcase-rapport (isVoorbeeld): een opvallende, volledige-
// breedte balk bovenaan de contentkolom — op ELKE pagina apart neergezet
// (react-pdf heeft geen document-brede "fixed", alleen per <Page>), zodat hij
// vanaf pagina 1 mee omhoog/omlaag "scrollt". Bewust een balk i.p.v. de
// eerdere kleine pil rechtsboven: die viel te weinig op, terwijl het doel
// juist is om de lezer zo snel mogelijk weer naar de site te leiden.
function VoorbeeldBanner({ siteUrl }: { siteUrl: string }) {
  return (
    <Link
      src={siteUrl}
      fixed
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        backgroundColor: KLEUR.accentDark,
        paddingVertical: 8,
        textDecoration: "none",
      }}
    >
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <IcoonHuis kleur={KLEUR.accentDark} size={8} />
      </View>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>
        Dit is een voorbeeldrapport. Bekijk het rapport van jouw eigen adres →
      </Text>
    </Link>
  );
}

// Decoratief vulicoon — alleen nog gebruikt in de "geen data"-fallbacks
// (zie NietBeschikbaar), niet meer standaard op elke pagina: bij volledige
// data vullen de echte inhoudsblokken de pagina nu zelf al.
// Dit is de daadwerkelijke crash-oorzaak achter "De PDF kon niet worden
// gemaakt" bij elk rapport waar een onderdeel niet beschikbaar is (dus niet
// specifiek energielabel): `flex: 1` op deze View probeerde de resterende
// ruimte te vullen in een ouder-kaart (styles.kaart, zie NietBeschikbaar)
// die zelf GEEN vaste/uitgerekte hoogte heeft. Yoga kan dan geen "resterende
// ruimte" bepalen en rekent de hoogte van deze View uit op 0 — waarna de
// <Svg> van het icoon met een geldige breedte (42) maar hoogte 0 bij
// @react-pdf/render's resolveAspectRatio() door 0 deelt en een
// "unsupported number: Infinity" crash geeft (bevestigd door reproductie:
// zie de terminal-stacktrace met een SVG-node {width:42, height:0}).
// Zonder flex/justifyContent werkt dit gewoon als een normaal, content-
// gedreven icoon, wat hier ook alles is wat nodig is.
function VulIcoon() {
  return (
    <View style={{ alignItems: "center", paddingBottom: 2 }}>
      <IcoonHuis kleur={KLEUR.line} size={42} />
    </View>
  );
}

function NietBeschikbaar({ tekst }: { tekst: string }) {
  return (
    <View style={[styles.kaart, { alignItems: "center", paddingVertical: 20 }]}>
      <Text style={{ fontSize: 9, color: KLEUR.inkMuted }}>{tekst}</Text>
      <VulIcoon />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Halfronde SVG-boogmeters (Energielabel, Funderingsrisico).
// -----------------------------------------------------------------------------
const ENERGIE_BOOG_KLEUREN = ENERGIELABEL_KLEUREN;
const ENERGIE_BOOG_PUNTEN: [number, number][] = [
  [10, 80],
  [13.42, 58.37],
  [23.37, 38.86],
  [38.86, 23.37],
  [58.37, 13.42],
  [80, 10],
  [101.63, 13.42],
  [121.14, 23.37],
  [136.63, 38.86],
  [146.58, 58.37],
  [150, 80],
];

function EnergielabelMeter({ index, klasse }: { index: number; klasse: string }) {
  const hoekGraden = 180 - (index + 0.5) * 18;
  const hoekRad = (hoekGraden * Math.PI) / 180;
  const naaldX = 80 + 60 * Math.cos(hoekRad);
  const naaldY = 80 - 60 * Math.sin(hoekRad);
  return (
    <View style={{ position: "relative", width: 150, height: 92, alignSelf: "center" }}>
      <Svg width={150} height={92} viewBox="0 0 160 98">
        {ENERGIE_BOOG_KLEUREN.map((kleur, i) => (
          <Path
            key={kleur}
            d={`M${ENERGIE_BOOG_PUNTEN[i][0]},${ENERGIE_BOOG_PUNTEN[i][1]} A70,70 0 0,1 ${ENERGIE_BOOG_PUNTEN[i + 1][0]},${ENERGIE_BOOG_PUNTEN[i + 1][1]}`}
            stroke={kleur}
            strokeWidth={10}
            fill="none"
            strokeLinecap={i === 0 || i === ENERGIE_BOOG_KLEUREN.length - 1 ? "round" : "butt"}
          />
        ))}
        <Line x1={80} y1={80} x2={naaldX} y2={naaldY} stroke={KLEUR.ink} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={80} cy={80} r={5} fill={KLEUR.ink} />
      </Svg>
      <Text style={{ position: "absolute", left: 0, right: 0, top: 30, textAlign: "center", fontSize: 22, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>
        {klasse}
      </Text>
    </View>
  );
}

function FunderingMeter({ niveau }: { niveau: "laag" | "midden" | "hoog" }) {
  const bandIndex = niveau === "laag" ? 0 : niveau === "midden" ? 1 : 2;
  const hoekGraden = 180 - (bandIndex + 0.5) * 60;
  const hoekRad = (hoekGraden * Math.PI) / 180;
  const naaldX = 55 + 40 * Math.cos(hoekRad);
  const naaldY = 55 - 40 * Math.sin(hoekRad);
  return (
    <View style={{ width: 108, height: 66, flexShrink: 0 }}>
      <Svg width={108} height={66} viewBox="0 0 110 68">
        <Path d="M5,55 A50,50 0 0,1 30,11.7" stroke={TOON_HEX.gunstig.tekst} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Path d="M30,11.7 A50,50 0 0,1 80,11.7" stroke={TOON_HEX.aandacht.tekst} strokeWidth={11} fill="none" />
        <Path d="M80,11.7 A50,50 0 0,1 105,55" stroke={TOON_HEX.risico.tekst} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Line x1={55} y1={55} x2={naaldX} y2={naaldY} stroke={KLEUR.ink} strokeWidth={2.2} strokeLinecap="round" />
        <Circle cx={55} cy={55} r={4.5} fill={KLEUR.ink} />
      </Svg>
    </View>
  );
}

// Ring-diagram (donut) — Veiligheidsscore (pct = score*10) en Bebouwing
// (pct = percentage eengezinswoningen, een echt complementair CBS-paar).
function Ring({
  pct,
  kleur,
  bgKleur,
  size = 44,
  dikte = 7,
  labelInside,
}: {
  pct: number;
  kleur: string;
  bgKleur: string;
  size?: number;
  dikte?: number;
  labelInside?: string;
}) {
  const r = (size - dikte) / 2;
  const omtrek = 2 * Math.PI * r;
  const gevuld = Math.max(0, Math.min(pct / 100, 1)) * omtrek;
  const c = size / 2;
  return (
    <View style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={c} cy={c} r={r} stroke={bgKleur} strokeWidth={dikte} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={kleur}
          strokeWidth={dikte}
          fill="none"
          strokeDasharray={`${gevuld},${omtrek}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      {labelInside && (
        <Text style={{ position: "absolute", left: 0, right: 0, top: size / 2 - 6, textAlign: "center", fontSize: 11, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>
          {labelInside}
        </Text>
      )}
    </View>
  );
}

// Eén kernstat-kaartje op de Samenvatting-pagina — herontworpen (was een
// ring+tekst-rij; bij een langere toelichting kon die rij dan hoger worden
// dan de ring zelf, wat het geheel scheef liet ogen naast de kortere
// kaartjes in dezelfde rij, zie het visuele herontwerp dat is doorgesproken).
// Nu een kolomgewijze kaart (label boven, waarde, toelichting eronder) —
// zelfde stat-object als het Samenvatting-tabblad in de webapp
// (lib/services/samenvatting.ts), nu ook met dezelfde opbouw als daar.
function SamenvattingKernstatKaart({ stat }: { stat: SamenvattingKernstat }) {
  const stijl = TOON_HEX[stat.toon];
  return (
    <View style={[styles.kaart, { flexBasis: "48%", flexGrow: 1 }]}>
      <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint, marginBottom: 3, textTransform: "uppercase" }}>{stat.label}</Text>
      <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: stijl.tekst, marginBottom: 3 }}>{stat.waarde}</Text>
      <Text style={{ fontSize: 6.3, color: KLEUR.inkMuted, lineHeight: 1.45 }}>{stat.toelichting}</Text>
    </View>
  );
}

// Eén regel (icoon + tekst) in de pluspunten/aandachtspunten/gebruiksblok-
// kolommen op de Samenvatting-pagina.
function SamenvattingPunt({ icoon: Icoon, kleur, tekst }: { icoon: IconComp; kleur: string; tekst: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 5 }}>
      <View style={{ marginTop: 1.5 }}>
        <Icoon kleur={kleur} size={7} />
      </View>
      <Text style={{ flex: 1, fontSize: 6.8, color: KLEUR.ink, lineHeight: 1.45 }}>{tekst}</Text>
    </View>
  );
}

// Kleine statcijfer-tegel — PDF-equivalent van de DataCard-stat in de app
// (grote waarde, kleine label eronder), gebruikt voor de bevolkingscijfers
// op de Buurtprofiel-pagina. Vervangt de eerdere percentage-balkjes: die
// toonden alleen twee van de vijf beschikbare cijfers (inwoners, huishoudens
// en personen-per-huishouden ontbraken in de PDF, terwijl de app ze wel al
// als stat-kaart toonde) — dit dicht dat verschil.
function BevolkingStat({ waarde, label }: { waarde: string; label: string }) {
  return (
    <View style={{ minWidth: 62 }}>
      <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>{waarde}</Text>
      <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// Horizontale 10-segmenten A+++–G-ladder — gebruikt de ECHTE, gedeelde
// schaal/kleuren uit lib/utils/energielabel.ts (dezelfde bron als de
// webladder), dus altijd 10 balken mét 10 bijpassende labels; de huidige
// klasse krijgt een rand + zijn letter zichtbaar in het segment.
function EnergieLadder({ activeIndex }: { activeIndex: number }) {
  return (
    <View>
      <View style={[styles.row, { gap: 1.5 }]}>
        {ENERGIELABEL_SCHAAL.map((klasse, i) => {
          const isActief = i === activeIndex;
          const isEerste = i === 0;
          const isLaatste = i === ENERGIELABEL_SCHAAL.length - 1;
          return (
            <View
              key={klasse}
              style={{
                flex: 1,
                height: 11,
                backgroundColor: ENERGIELABEL_KLEUREN[i],
                borderTopLeftRadius: isEerste ? 3 : 0,
                borderBottomLeftRadius: isEerste ? 3 : 0,
                borderTopRightRadius: isLaatste ? 3 : 0,
                borderBottomRightRadius: isLaatste ? 3 : 0,
                borderWidth: isActief ? 1.3 : 0,
                borderColor: KLEUR.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isActief && <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>{klasse}</Text>}
            </View>
          );
        })}
      </View>
      {/* Zelfde flex:1 + gap als de kleurenrij hierboven (i.p.v. eerder
          justifyContent:"space-between" met vrije tekstbreedte) — anders
          schuiven de labels t.o.v. hun segment weg zodra de tekstbreedte
          verschilt ("A+++" is veel breder dan "G"), en oogt de schaal scheef. */}
      <View style={[styles.row, { gap: 1.5, marginTop: 3 }]}>
        {ENERGIELABEL_SCHAAL.map((klasse, i) => (
          <Text
            key={klasse}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 5.2,
              color: i === activeIndex ? KLEUR.ink : KLEUR.inkFaint,
              fontFamily: i === activeIndex ? "Helvetica-Bold" : "Helvetica",
            }}
          >
            {klasse}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Stepper-onderbouwing van de Waarde-indicatie (oppervlakte → bouwjaar →
// [kamers] → verkopen → 150+ kenmerken → uitkomst) — zelfde reeks als de
// StepperNode/UitkomstNode-reeks in ReportView.tsx. Twee varianten, zelfde
// betekenis en zelfde kleuren als de webversie: "feit" (teal, TOON_HEX.gunstig)
// voor een specifiek, bevestigd kenmerk van dít pand, "model" (indigo,
// TOON_HEX.accent) voor het bredere, samengestelde kenmerkenpakket dat het
// model gebruikt maar dat geen apart controleerbaar getal voor dit adres is.
function StepperNode({
  icoon: Icoon,
  waarde,
  label,
  variant = "feit",
}: {
  icoon: IconComp;
  waarde: string;
  label: string;
  variant?: "feit" | "model";
}) {
  const stijl = variant === "model" ? TOON_HEX.accent : TOON_HEX.gunstig;
  return (
    <View style={{ alignItems: "center", gap: 2, flex: 1 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: stijl.bg, alignItems: "center", justifyContent: "center" }}>
        <Icoon kleur={stijl.tekst} size={10} />
      </View>
      <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginTop: 2 }}>{waarde}</Text>
      <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>{label}</Text>
    </View>
  );
}

function StepperLijn({ actief }: { actief?: boolean }) {
  return <View style={{ width: 14, height: 1, backgroundColor: actief ? KLEUR.accent : "#DCD8FB", marginBottom: 15 }} />;
}

export default function ReportDocument({
  report,
  isVoorbeeld = false,
  siteUrl = "/",
}: {
  report: Report;
  // Alleen aangezet vanuit app/api/rapport/voorbeeld-pdf/route.tsx voor het
  // met de hand samengestelde showcase-rapport — een echt, per-adres
  // gegenereerd rapport (POST /api/rapport/pdf) toont deze knop nooit, want
  // de lezer heeft dan al zijn eigen adres ingevoerd.
  isVoorbeeld?: boolean;
  // Absolute of same-origin URL waar de "eigen adres invoeren"-knop naartoe
  // linkt — same-origin resolveert prima als relatief pad ("/") omdat de PDF
  // zelf ook vanaf hetzelfde domein wordt geserveerd/geopend.
  siteUrl?: string;
}) {
  const { core, building, energy, market, nearbySales, buurtprofiel, fundering, gegenereerdOp } = report;
  // Defensieve fallback, NIET een normale "data onbeschikbaar"-staat: kavel
  // is het nieuwste veld op Report. Komt een PDF-aanvraag binnen met een
  // rapport-object dat dit veld nog mist (bv. een browser-tabblad dat het
  // rapport ophaalde vóór een servercode-update), dan crashte het renderen
  // eerder hard op `kavel.data` van undefined — nu valt dat netjes terug op
  // "niet beschikbaar" i.p.v. de hele PDF te laten mislukken.
  const kavel = report.kavel ?? unavailableResult<KavelData>("kavel", "Kavelgrootte (Kadaster, PDOK Kadastrale Kaart)", "live");
  // Zelfde defensieve fallback, zelfde reden: bestemming is een nog nieuwer veld.
  const bestemming =
    report.bestemming ??
    unavailableResult<BestemmingData>("bestemming", "Bestemming (Ruimtelijke Plannen / Omgevingsplan)", "live");
  const address = core.address;
  const adresRegel = `${address.straat} ${address.huisnummer}${address.huisletter ?? ""}${
    address.toevoeging ? `-${address.toevoeging}` : ""
  }, ${address.postcode} ${address.plaats}`;

  // --- Waarde-indicatie -----------------------------------------------------
  const dezeWoningPerM2 =
    market.data?.geschatteWaarde != null && building.data?.oppervlakteM2
      ? Math.round(market.data.geschatteWaarde / building.data.oppervlakteM2)
      : null;
  const buurtPerM2 = nearbySales.data?.gemiddeldePrijsPerM2 ?? null;
  const waardeDeltaPctRuw =
    dezeWoningPerM2 != null && buurtPerM2 != null && buurtPerM2 > 0
      ? Math.round(((dezeWoningPerM2 - buurtPerM2) / buurtPerM2) * 100)
      : null;
  const waardeDeltaPct = waardeDeltaPctRuw != null && Math.abs(waardeDeltaPctRuw) <= 300 ? waardeDeltaPctRuw : null;
  const waardeImplausibel = waardeDeltaPctRuw != null && Math.abs(waardeDeltaPctRuw) > 300;
  const bandbreedteGelijk =
    market.data?.bandbreedteMin != null && market.data?.bandbreedteMax != null && market.data.bandbreedteMin === market.data.bandbreedteMax;
  // "Kamers" staat bewust NIET meer in deze harde voorwaarde: de Woningwaarde+
  // API van Altum (avmplus) levert geen Rooms-veld meer, waardoor
  // market.data.rooms voor elk live rapport permanent undefined is (zie
  // fetchLive in lib/data-sources/woningwaarde.ts) — de knoop wordt hieronder
  // los, optioneel toegevoegd i.p.v. de hele stepper te blokkeren.
  const stepperVolledig =
    building.data?.oppervlakteM2 != null &&
    building.data?.bouwjaar != null &&
    nearbySales.data?.aantalLaatste12Maanden != null;
  // Positie van de bandbreedte-marker: waar de puntschatting binnen
  // [min, max] valt (0-100%) — geen aanname, gewoon de rekensom.
  const bandbreedteOffsetPct =
    market.data?.geschatteWaarde != null &&
    market.data?.bandbreedteMin != null &&
    market.data?.bandbreedteMax != null &&
    market.data.bandbreedteMax > market.data.bandbreedteMin
      ? Math.max(0, Math.min(100, ((market.data.geschatteWaarde - market.data.bandbreedteMin) / (market.data.bandbreedteMax - market.data.bandbreedteMin)) * 100))
      : 50;

  // --- Verkopen in de buurt ---------------------------------------------------
  const alleVerkopen = nearbySales.data?.verkopen ?? [];
  const vergelijkbareVerkopen = alleVerkopen.filter((v) => v.vergelijkbaar);
  const overigeVerkopen = alleVerkopen.filter((v) => !v.vergelijkbaar);
  const getoondeVergelijkbaar = vergelijkbareVerkopen.slice(0, 4);
  const getoondeOverige = overigeVerkopen.slice(0, 3);
  const nietGetoondAantal = alleVerkopen.length - getoondeVergelijkbaar.length - getoondeOverige.length;
  const maxPrijsPerM2 = alleVerkopen.length > 0 ? Math.max(...alleVerkopen.map((v) => v.prijsPerM2)) : 0;

  // --- Objectgegevens & Energieprestatie --------------------------------------
  const objectInhoudM3 = market.data?.volume ?? building.data?.inhoudM3;
  const energieDuiding = energy.data?.klasse ? duidEnergielabel(energy.data.klasse) : null;

  // --- Funderingsrisico --------------------------------------------------------
  const funderingToon: ChipToon =
    fundering.data?.niveau === "laag" ? "gunstig" : fundering.data?.niveau === "midden" ? "aandacht" : fundering.data?.niveau === "hoog" ? "risico" : "neutraal";
  const funderingNiveauTekst = fundering.data?.niveau ? fundering.data.niveau.charAt(0).toUpperCase() + fundering.data.niveau.slice(1) : "Onbekend";

  // --- Buurtprofiel --------------------------------------------------------
  const veiligheidScore =
    buurtprofiel.data?.veiligheid.misdrijvenPer1000 != null ? berekenVeiligheidsscore(buurtprofiel.data.veiligheid.misdrijvenPer1000) : null;
  const veiligheidBand = veiligheidScore != null ? bepaalVeiligheidsBand(veiligheidScore) : null;
  const sociaal = buurtprofiel.data?.sociaal;
  const fysiek = buurtprofiel.data?.fysiek;
  const bebouwingEengezinsPct = fysiek?.percentageEengezinswoning ?? null;
  const bebouwingMeergezinsPct = fysiek?.percentageMeergezinswoning ?? null;
  const voorzieningen = buurtprofiel.data?.voorzieningen;
  const voorzieningItems = voorzieningen?.items ?? [];
  // Puntsgewijze samenvatting onderaan het Buurtprofiel — opgebouwd uit
  // dezelfde structurele velden die hierboven al de ring/balken/afstanden
  // vullen, NIET door de losse duiding-alinea te hergebruiken of te
  // parsen (dat zou bij een andere zin-opbouw per adres kunnen breken).
  const buurtKernpunten: { icoon: IconComp; tekst: string }[] = [];
  if (buurtprofiel.data?.veiligheid.misdrijvenPer1000 != null) {
    const misdrijvenPer1000 = buurtprofiel.data.veiligheid.misdrijvenPer1000;
    const aantalMisdrijven = buurtprofiel.data.veiligheid.aantalMisdrijven;
    buurtKernpunten.push({
      icoon: IcoonSchild,
      tekst: `Veiligheid: de politie registreerde circa ${formatDecimaal(misdrijvenPer1000)} misdrijven per 1.000 inwoners${
        aantalMisdrijven != null ? ` (${rond(aantalMisdrijven)} in totaal)` : ""
      }${buurtprofiel.data.peiljaar ? ` in ${buurtprofiel.data.peiljaar}` : ""}.`,
    });
  }
  if (sociaal?.inwoners != null || sociaal?.huishoudens != null || sociaal?.percentageEenpersoons != null || sociaal?.percentageMetKinderen != null) {
    const delen: string[] = [];
    if (sociaal?.inwoners != null) {
      delen.push(
        `In deze buurt wonen circa ${rond(sociaal.inwoners)} mensen${sociaal.huishoudens != null ? `, verdeeld over ${rond(sociaal.huishoudens)} huishoudens` : ""}${
          sociaal.gemiddeldeHuishoudensgrootte != null ? `, gemiddeld ${formatDecimaal(sociaal.gemiddeldeHuishoudensgrootte)} personen per huishouden` : ""
        }.`
      );
    }
    if (sociaal?.percentageEenpersoons != null) delen.push(`Ongeveer ${rond(sociaal.percentageEenpersoons)}% van de huishoudens bestaat uit één persoon.`);
    if (sociaal?.percentageMetKinderen != null) delen.push(`Circa ${rond(sociaal.percentageMetKinderen)}% heeft thuiswonende kinderen.`);
    if (delen.length > 0) buurtKernpunten.push({ icoon: IcoonMensen, tekst: delen.join(" ") });
  }
  if (fysiek?.bevolkingsdichtheid != null) {
    buurtKernpunten.push({
      icoon: IcoonHuis,
      tekst: `Met circa ${rond(fysiek.bevolkingsdichtheid)} inwoners per km² is dit ${dichtheidLabel(fysiek.bevolkingsdichtheid)}${
        bebouwingEengezinsPct != null || bebouwingMeergezinsPct != null
          ? `; van de woningen hier is ${rond(bebouwingEengezinsPct ?? 0)}% eengezinswoningen en ${rond(bebouwingMeergezinsPct ?? 0)}% meergezinswoningen`
          : ""
      }.`,
    });
  }
  if (voorzieningItems.length > 0) {
    // Logische conclusie per thema (gemiddelde afstand), i.p.v. een losse
    // opsomming van alle losse voorzieningen — bij 9 mogelijke items wordt
    // die opsomming onleesbaar, en een gemiddelde per thema is een eerlijkere
    // samenvatting dan een willekeurige greep uit de losse cijfers.
    const gemiddeldePerThema = VOORZIENING_THEMA_VOLGORDE.map((thema) => {
      const items = voorzieningItems.filter((i) => i.thema === thema);
      if (items.length === 0) return null;
      const gemiddeld = Math.round((items.reduce((a, b) => a + b.afstandKm, 0) / items.length) * 10) / 10;
      return `${VOORZIENING_THEMA_LABEL[thema].toLowerCase()} gemiddeld ${formatDecimaal(gemiddeld)} km`;
    }).filter((d): d is string => d !== null);
    buurtKernpunten.push({
      icoon: IcoonPin,
      tekst: `Voorzieningen: ${gemiddeldePerThema.join(", ")}.`,
    });
  }

  const buurtSubtitel =
    buurtprofiel.data?.buurtnaam || buurtprofiel.data?.gemeentenaam
      ? `CBS wijk- en buurtcijfers, politiecijfers · ${[buurtprofiel.data?.buurtnaam, buurtprofiel.data?.gemeentenaam].filter(Boolean).join(", ")}${
          buurtprofiel.data?.peiljaar ? ` · cijfers ${buurtprofiel.data.peiljaar}` : ""
        }`
      : "CBS wijk- en buurtcijfers, politiecijfers";

  // --- Samenvatting ----------------------------------------------------------
  // Zelfde generator als het Samenvatting-tabblad in de webapp (bewust één
  // bron, zie lib/services/samenvatting.ts) — hier alleen anders opgemaakt.
  const samenvatting = buildSamenvatting(report);

  return (
    <Document title={`Kooprapport ${adresRegel}`} author="Kooprapport">
      {/* ================================================================== */}
      {/* Pagina 1 — Cover                                                   */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={0} />
        <View style={[styles.content, { paddingTop: isVoorbeeld ? 46 : 26 }]}>
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <View style={{ position: "relative", backgroundColor: KLEUR.accentDark, borderRadius: 12, padding: 18, marginBottom: 12, overflow: "hidden" }}>
            <Svg width={160} height={64} viewBox="0 0 160 64" style={{ position: "absolute", right: 0, bottom: 0 }}>
              <Rect x={10} y={24} width={18} height={40} fill="#FFFFFF1F" />
              <Rect x={32} y={10} width={18} height={54} fill="#FFFFFF1F" />
              <Rect x={54} y={28} width={18} height={36} fill="#FFFFFF1F" />
              <Rect x={76} y={0} width={18} height={64} fill="#FFFFFF1F" />
              <Rect x={98} y={18} width={18} height={46} fill="#FFFFFF1F" />
              <Rect x={120} y={32} width={18} height={32} fill="#FFFFFF1F" />
            </Svg>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFFB3", letterSpacing: 1 }}>PREMIUM WONINGRAPPORT</Text>
            <Text style={{ marginTop: 8, fontSize: 21, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>
              {address.straat} {address.huisnummer}
              {address.huisletter ?? ""}
              {address.toevoeging ? `-${address.toevoeging}` : ""}
            </Text>
            <Text style={{ marginTop: 3, fontSize: 9.5, color: "#FFFFFFCC" }}>
              {address.postcode} {address.plaats}
            </Text>
          </View>

          {/* Quote + "bekijk online" — zie bovenstaande toelichting: bewust
              geen nagemaakte QR-afbeelding. */}
          <View style={{ backgroundColor: KLEUR.accent, borderRadius: 10, padding: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 6, width: 26, height: 26, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IcoonExternLink kleur={KLEUR.accentDark} size={13} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8.5, color: "#FFFFFF", lineHeight: 1.4, fontFamily: "Helvetica-Bold" }}>
                &ldquo;Een woning kopen of verkopen begint met weten wat je écht in handen hebt.&rdquo;
              </Text>
              <Text style={{ fontSize: 6.5, color: "#FFFFFFB3", marginTop: 3 }}>Bekijk dit rapport ook online voor de actuele versie</Text>
            </View>
          </View>

          <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 8 }}>Wat dit rapport beantwoordt</Text>
          <View>
            {[
              "Wat is deze woning waard?",
              "Wat verkocht er recent in de buurt?",
              "Wat zijn de kenmerken van dit pand?",
              "Hoe energiezuinig is de woning?",
              "Is de fundering een aandachtspunt?",
              "Hoe is het wonen in deze buurt?",
            ].map((vraag, i) => (
              <View
                key={vraag}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 6,
                  borderBottomWidth: i === 5 ? 0 : 0.5,
                  borderBottomColor: KLEUR.line,
                }}
              >
                <View style={{ width: 15, height: 15, borderRadius: 7.5, backgroundColor: KLEUR.mist, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: KLEUR.accent }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 8.5, color: KLEUR.ink }}>{vraag}</Text>
              </View>
            ))}
          </View>

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>

      {/* ================================================================== */}
      {/* Pagina 2 — Waarde-indicatie                                        */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={1} />
        <View style={[styles.contentTinted, { paddingTop: isVoorbeeld ? 46 : 26 }]}>
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <Text style={styles.pageTitel}>Waarde-indicatie</Text>
          <Text style={[styles.pageSubtitel, { marginBottom: 10 }]}>Modelschatting van deze woning, geen taxatie, geen WOZ-waarde</Text>

          {market.data ? (
            <View style={{ gap: 8 }}>
              {/* Hero: deze woning vs. buurtgemiddelde */}
              <View style={{ position: "relative", flexDirection: "row", borderRadius: 10, overflow: "hidden" }}>
                <View style={{ flex: 1, backgroundColor: KLEUR.accent, padding: 12 }}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFFB3", letterSpacing: 0.5 }}>DEZE WONING</Text>
                  <Text style={{ marginTop: 4, fontSize: 18, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>{formatCurrency(market.data.geschatteWaarde)}</Text>
                  {dezeWoningPerM2 != null && <Text style={{ marginTop: 3, fontSize: 7.5, color: "#FFFFFFCC" }}>{`${formatCurrency(dezeWoningPerM2)} /m²`}</Text>}
                  {market.data.waarderingsdatum && (
                    <Text style={{ marginTop: 2, fontSize: 6.5, color: "#FFFFFF99" }}>{`Gewaardeerd op ${formatDate(market.data.waarderingsdatum)}`}</Text>
                  )}
                </View>
                <View style={{ flex: 1, backgroundColor: KLEUR.paper, padding: 12 }}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: KLEUR.inkMuted, letterSpacing: 0.5 }}>BUURTGEMIDDELDE /M²</Text>
                  <Text style={{ marginTop: 4, fontSize: 18, fontFamily: "Helvetica-Bold" }}>{buurtPerM2 != null ? formatCurrency(buurtPerM2) : "Onbekend"}</Text>
                  {nearbySales.data?.aantalLaatste12Maanden != null && (
                    <Text style={{ marginTop: 3, fontSize: 7.5, color: KLEUR.inkMuted }}>{`${rond(nearbySales.data.aantalLaatste12Maanden)} vergelijkbare verkopen, ${nearbySales.data.zoekvensterMaanden} mnd`}</Text>
                  )}
                </View>
                {waardeDeltaPct != null && (
                  <View
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      marginLeft: -15,
                      marginTop: -15,
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: "#FFFFFF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: TOON_HEX.aandacht.tekst }}>
                      {waardeDeltaPct > 0 ? `+${waardeDeltaPct}%` : `${waardeDeltaPct}%`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Doorlopende kaart: duiding + stepper + bandbreedte */}
              <View style={[styles.kaart, { gap: 8 }]}>
                {waardeDeltaPct != null && (
                  <View style={[styles.row, { alignItems: "flex-start", gap: 7 }]}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: TOON_HEX.aandacht.bg, alignItems: "center", justifyContent: "center" }}>
                      <IcoonWaarschuwing kleur={TOON_HEX.aandacht.tekst} size={8} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 7.5, color: KLEUR.ink, lineHeight: 1.5 }}>
                      {waardeDeltaPct > 0 ? `${waardeDeltaPct}% boven` : `${Math.abs(waardeDeltaPct)}% onder`} het buurtgemiddelde. Het model kijkt niet
                      alleen naar de m²-prijs van de buurt, maar ook naar bouwjaar, oppervlakte en het aantal kamers.
                    </Text>
                  </View>
                )}

                {waardeImplausibel && (
                  <View style={[styles.row, { alignItems: "flex-start", gap: 7, backgroundColor: TOON_HEX.aandacht.bg, borderRadius: 7, padding: 8 }]}>
                    <IcoonWaarschuwing kleur={TOON_HEX.aandacht.tekst} size={11} />
                    <Text style={{ flex: 1, fontSize: 7.5, lineHeight: 1.5, color: TOON_HEX.aandacht.tekst }}>
                      Dit modelcijfer wijkt zo sterk af van vergelijkbare woningen in de buurt dat een zinvolle vergelijking hier niet mogelijk is. Wees
                      extra voorzichtig met de schatting hierboven voor dit adres.
                    </Text>
                  </View>
                )}

                {stepperVolledig && (
                  <>
                    <View style={styles.divider} />
                    <View>
                      <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 8 }}>Hoe komt deze schatting tot stand?</Text>
                      <View style={[styles.row, { alignItems: "center" }]}>
                        <StepperNode icoon={IcoonOppervlakte} waarde={`${rond(building.data!.oppervlakteM2!)} m²`} label="Oppervlakte" />
                        <StepperLijn />
                        <StepperNode icoon={IcoonKalender} waarde={String(building.data!.bouwjaar)} label="Bouwjaar" />
                        <StepperLijn />
                        {market.data?.rooms != null && (
                          <>
                            <StepperNode icoon={IcoonDeur} waarde={`${market.data.rooms} kamers`} label="Indeling" />
                            <StepperLijn />
                          </>
                        )}
                        <StepperNode icoon={IcoonTrend} waarde={rond(nearbySales.data!.aantalLaatste12Maanden)} label="Verkopen" />
                        <StepperLijn actief />
                        <StepperNode icoon={IcoonLagen} waarde="150+" label="kenmerken" variant="model" />
                        <StepperLijn actief />
                        <View style={{ alignItems: "center", gap: 2, flex: 1.15 }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: KLEUR.accent, alignItems: "center", justifyContent: "center" }}>
                            <IcoonCheck kleur="#FFFFFF" size={11} />
                          </View>
                          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.accent, marginTop: 2 }}>{formatCurrency(market.data!.geschatteWaarde)}</Text>
                          <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>Uitkomst</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {market.data.bandbreedteMin != null && market.data.bandbreedteMax != null && (
                  <>
                    <View style={styles.divider} />
                    <View>
                      <View style={{ height: 7, borderRadius: 3.5, backgroundColor: KLEUR.mist, position: "relative" }}>
                        <View
                          style={{
                            position: "absolute",
                            left: `${bandbreedteOffsetPct}%`,
                            top: -2,
                            width: 2,
                            height: 11,
                            borderRadius: 1,
                            backgroundColor: KLEUR.ink,
                            marginLeft: -1,
                          }}
                        />
                      </View>
                      <View style={[styles.row, { justifyContent: "space-between", marginTop: 4 }]}>
                        <Text style={{ fontSize: 7, color: KLEUR.inkFaint }}>{formatCurrency(market.data.bandbreedteMin)}</Text>
                        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>90% zeker binnen deze bandbreedte</Text>
                        <Text style={{ fontSize: 7, color: KLEUR.inkFaint }}>{formatCurrency(market.data.bandbreedteMax)}</Text>
                      </View>
                      {bandbreedteGelijk && (
                        <Text style={{ fontSize: 6.5, color: KLEUR.inkFaint, lineHeight: 1.4, marginTop: 4 }}>
                          Het model geeft hier dezelfde boven- als ondergrens. Deze bandbreedte zegt dus niet extra veel voor dit adres.
                        </Text>
                      )}
                    </View>
                  </>
                )}
              </View>

              {/* Tips: wat kun je met deze schatting */}
              <TipsGrid
                titel="Wat kun je met deze schatting?"
                sublabel="algemene toepassingen"
                items={[
                  "Onderhandelingsbasis bij aan-/verkoop",
                  "Oriëntatie bij hypotheek of herfinanciering",
                  "Richtlijn voor de verzekerde waarde",
                  "Startpunt voor vermogensplanning",
                ]}
              />

              {/* Uitlegpaneel */}
              <View style={styles.duidingPaneel}>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.accentDark, marginBottom: 3 }}>Wat is een modelschatting?</Text>
                <Text style={{ fontSize: 7.3, color: KLEUR.ink, lineHeight: 1.55 }}>
                  Dit is een <Text style={{ fontFamily: "Helvetica-Bold" }}>automatische schatting van een rekenmodel</Text> (Automated Valuation
                  Model). Het model kijkt naar meer dan 150 kenmerken, zoals oppervlakte, bouwjaar, locatie en type woning. Dit is <Text style={{ fontFamily: "Helvetica-Bold" }}>geen officiële
                  taxatie</Text>, <Text style={{ fontFamily: "Helvetica-Bold" }}>geen WOZ-waarde</Text> en <Text style={{ fontFamily: "Helvetica-Bold" }}>geen
                  bevestigde verkoopprijs</Text>. Voor officiële doeleinden (zoals een hypotheekaanvraag) is vaak alsnog een erkende taxatie nodig.
                </Text>
              </View>
            </View>
          ) : (
            <NietBeschikbaar tekst="Geen modelschatting beschikbaar voor dit adres." />
          )}

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>

      {/* ================================================================== */}
      {/* Pagina 3 — Verkopen in de buurt                                    */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={2} />
        <View style={[styles.contentTinted, { paddingTop: isVoorbeeld ? 46 : 26 }]}>
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <Text style={styles.pageTitel}>Verkopen in de buurt</Text>
          <Text style={[styles.pageSubtitel, { marginBottom: 10 }]}>
            {nearbySales.data
              ? `Recent verkochte, vergelijkbare woningen · laatste ${nearbySales.data.zoekvensterMaanden} maanden`
              : "Recent verkochte, vergelijkbare woningen"}
          </Text>

          {nearbySales.data && alleVerkopen.length > 0 ? (
            <View style={{ gap: 8 }}>
              {nearbySales.data.verruimd && (
                <Text style={{ fontSize: 7, color: "#9A6A0C", backgroundColor: "#FFF7E6", borderRadius: 6, padding: 7, lineHeight: 1.4 }}>
                  Er waren te weinig vergelijkbare verkopen in de directe buurt binnen 12 maanden. Daarom is er breder
                  gezocht: in een grotere omgeving en/of over een langere periode ({nearbySales.data.zoekvensterMaanden} maanden).
                </Text>
              )}

              <View style={{ backgroundColor: KLEUR.accent, borderRadius: 10, padding: 11, flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontSize: 6.5, color: "#FFFFFFB3" }}>Aantal verkopen</Text>
                  <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginTop: 1 }}>{rond(nearbySales.data.aantalLaatste12Maanden)}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 6.5, color: "#FFFFFFB3" }}>Gem. prijs/m²</Text>
                  <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginTop: 1 }}>
                    {buurtPerM2 != null ? formatCurrency(buurtPerM2) : "Onbekend"}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 6.5, color: "#FFFFFFB3" }}>Deze woning</Text>
                  <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", marginTop: 1 }}>
                    {dezeWoningPerM2 != null ? formatCurrency(dezeWoningPerM2) : "Onbekend"}
                  </Text>
                </View>
              </View>

              <View style={[styles.kaart, { gap: 5 }]}>
                {getoondeVergelijkbaar.length > 0 && (
                  <>
                    <Text style={{ fontSize: 6.8, fontFamily: "Helvetica-Bold", color: KLEUR.accent, letterSpacing: 0.4 }}>VERGELIJKBAAR MET DEZE WONING</Text>
                    {getoondeVergelijkbaar.map((verkoop: NearbySale) => (
                      <VerkoopRij key={`${verkoop.adres}-${verkoop.verkoopdatum}`} verkoop={verkoop} maxPrijsPerM2={maxPrijsPerM2} nadruk />
                    ))}
                  </>
                )}

                {getoondeOverige.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <Text style={{ fontSize: 6.8, fontFamily: "Helvetica-Bold", color: KLEUR.inkFaint, letterSpacing: 0.4 }}>OVERIGE VERKOPEN IN DE BUURT</Text>
                    {getoondeOverige.map((verkoop: NearbySale) => (
                      <VerkoopRij key={`${verkoop.adres}-${verkoop.verkoopdatum}`} verkoop={verkoop} maxPrijsPerM2={maxPrijsPerM2} />
                    ))}
                  </>
                )}

                {nietGetoondAantal > 0 && (
                  <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint, marginTop: 1 }}>
                    {`+ ${nietGetoondAantal} andere verkopen niet getoond, wel meegenomen in het gemiddelde hierboven`}
                  </Text>
                )}
              </View>

              <View style={styles.duidingPaneel}>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.accentDark, marginBottom: 3 }}>Wat betekent &ldquo;vergelijkbaar&rdquo;?</Text>
                <Text style={{ fontSize: 7.3, color: KLEUR.ink, lineHeight: 1.55 }}>
                  Een verkoop telt als vergelijkbaar als de oppervlakte binnen circa 22%
                  {building.data?.oppervlakteM2 != null ? ` van deze woning (${rond(building.data.oppervlakteM2)} m²)` : " van deze woning"} zit. De rest
                  telt wel mee in het gemiddelde hierboven, maar zegt minder over dit specifieke pand.
                </Text>
              </View>

              <View style={styles.duidingPaneel}>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.accentDark, marginBottom: 3 }}>Waarom een prijsklasse, geen exact bedrag?</Text>
                <Text style={{ fontSize: 7.3, color: KLEUR.ink, lineHeight: 1.55 }}>
                  Om de privacy van verkopers te beschermen, laten we geen exact bedrag zien. In plaats daarvan tonen we
                  een smalle prijsklasse (bijvoorbeeld €275.000–€300.000). De woning is ergens binnen die klasse verkocht.
                </Text>
              </View>
            </View>
          ) : (
            <NietBeschikbaar
              tekst={
                nearbySales.data
                  ? `Geen geregistreerde verkopen gevonden in de laatste ${nearbySales.data.zoekvensterMaanden} maanden${
                      nearbySales.data.verruimd ? ", ook niet in de bredere omgeving" : " voor deze buurt"
                    }.`
                  : "Geen geregistreerde verkopen in de laatste 12 maanden voor deze buurt."
              }
            />
          )}

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>

      {/* ================================================================== */}
      {/* Pagina 4 — Objectgegevens & Energieprestatie en label              */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={3} />
        <View style={[styles.contentTinted, { paddingTop: isVoorbeeld ? 46 : 26 }]}>
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <Text style={styles.pageTitel}>Objectgegevens & Energieprestatie</Text>
          <Text style={[styles.pageSubtitel, { marginBottom: 10 }]}>Kenmerken van dit pand en het officieel geregistreerde energielabel</Text>

          <View style={{ gap: 8 }}>
            {building.data ? (
              <View style={[styles.kaart, { position: "relative", overflow: "hidden" }]}>
                <View style={[styles.row, { alignItems: "center", justifyContent: "space-between" }]}>
                  <View style={[styles.row, { alignItems: "center", gap: 8 }]}>
                    <IconBadge icoon={IcoonHuis} toon="accent" size={22} />
                    <View>
                      <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>{building.data.woningtype ?? "Onbekend"}</Text>
                      <Text style={{ fontSize: 6.5, color: KLEUR.inkFaint }}>Woningtype van dit pand</Text>
                    </View>
                  </View>
                  {building.data.pandStatus && (
                    <View style={{ backgroundColor: TOON_HEX.gunstig.bg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <IcoonCheck kleur={TOON_HEX.gunstig.tekst} size={7} />
                      <Text style={{ fontSize: 6.3, fontFamily: "Helvetica-Bold", color: TOON_HEX.gunstig.tekst }}>{building.data.pandStatus}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.row, { flexWrap: "wrap", gap: 5, marginTop: 8 }]}>
                  {building.data.oppervlakteM2 != null && <Kenmerk icoon={IcoonOppervlakte} waarde={`${rond(building.data.oppervlakteM2)} m²`} label="oppervlakte" />}
                  {kavel.data?.oppervlakteM2 != null && <Kenmerk icoon={IcoonKavel} waarde={`${rond(kavel.data.oppervlakteM2)} m²`} label="kavel" />}
                  {bestemming.data?.bestemmingen.length ? (
                    <Kenmerk icoon={IcoonBestemming} waarde={bestemming.data.bestemmingen.join(", ")} label="bestemming" />
                  ) : null}
                  {objectInhoudM3 != null && <Kenmerk icoon={IcoonInhoud} waarde={`${rond(objectInhoudM3)} m³`} label="inhoud" />}
                  {building.data.aantalVerblijfsobjecten != null && (
                    <Kenmerk icoon={IcoonHuis} waarde={String(building.data.aantalVerblijfsobjecten)} label="eenheid in pand" />
                  )}
                  {market.data?.rooms != null && <Kenmerk icoon={IcoonDeur} waarde={String(market.data.rooms)} label="kamers" />}
                  {building.data.bouwjaar != null && <Kenmerk icoon={IcoonKalender} waarde={String(building.data.bouwjaar)} label="bouwjaar" />}
                </View>
              </View>
            ) : (
              <NietBeschikbaar tekst="Geen objectgegevens beschikbaar voor dit adres." />
            )}

            {energy.data?.klasse && energieDuiding ? (
              <>
                <View style={[styles.kaart, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
                  <EnergielabelMeter index={energieDuiding.index} klasse={energy.data.klasse} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>Energieprestatie en label</Text>
                    <Text style={{ fontSize: 7.3, fontFamily: "Helvetica-Bold", color: energieDuiding.kleur, marginTop: 3 }}>
                      {`Klasse ${energy.data.klasse}, ${energieDuiding.kwartTekst}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.kaart}>
                  <EnergieLadder activeIndex={energieDuiding.index} />
                </View>

                <View style={styles.kaart}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 3 }}>Wat betekent dit voor de stookkosten?</Text>
                  <Text style={{ fontSize: 7.3, color: KLEUR.ink, lineHeight: 1.5 }}>
                    {energieDuiding.stookkostenTekst.charAt(0).toUpperCase() + energieDuiding.stookkostenTekst.slice(1)} Let op: het label zegt niets over
                    hoeveel de huidige bewoners écht verbruiken. Dat hangt sterk af van de thermostaat, ventilatiegedrag en hoeveel mensen er wonen.
                  </Text>
                </View>

                <View style={styles.kaart}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 3 }}>Hoe is dit vastgesteld?</Text>
                  <Text style={{ fontSize: 7.3, color: KLEUR.inkMuted, lineHeight: 1.5, marginBottom: 6 }}>
                    Een erkend energieadviseur stelt het label vast, onder meer op basis van isolatie, verwarmingsinstallatie en glasoort. Je kunt het
                    opzoeken in het landelijke EP-Online-register.
                  </Text>
                  {(energy.data.registratiedatum || energy.data.geldigTot) && (
                    <>
                      <View style={styles.divider} />
                      <View style={[styles.row, { justifyContent: "space-between", marginTop: 6 }]}>
                        <View>
                          <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint }}>Geregistreerd</Text>
                          <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginTop: 1 }}>
                            {energy.data.registratiedatum ? formatDate(energy.data.registratiedatum) : "Onbekend"}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint }}>Geldig tot</Text>
                          <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginTop: 1 }}>
                            {energy.data.geldigTot ? formatDate(energy.data.geldigTot) : "Onbekend"}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.kaart}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 3 }}>Isolatie per bouwdeel</Text>
                  {energy.data.isolatie ? (
                    <Text style={{ fontSize: 7.3, color: KLEUR.ink, lineHeight: 1.5 }}>
                      Dak: {energy.data.isolatie.dak}, gevel: {energy.data.isolatie.gevel}, vloer: {energy.data.isolatie.vloer}, beglazing:{" "}
                      {energy.data.isolatie.beglazing}.
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 7.3, color: KLEUR.inkMuted, lineHeight: 1.5 }}>
                      Isolatiegegevens per bouwdeel (dak, gevel, vloer, beglazing) staan niet apart in de publieke energielabel-bronnen (EP-Online /
                      overheid.io). Dat geldt voor elk adres, niet alleen dit pand.
                    </Text>
                  )}
                </View>

                <TipsGrid
                  titel="Mogelijkheden voor verduurzaming"
                  sublabel="algemene tips, geen advies specifiek voor dit pand"
                  items={["Dak- en vloerisolatie", "HR++ of triple glas", "Zonnepanelen", "Slimme thermostaat"]}
                  dotKleur={TOON_HEX.gunstig.tekst}
                />
              </>
            ) : (
              <NietBeschikbaar tekst="Geen geregistreerd energielabel gevonden voor dit adres." />
            )}
          </View>

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>

      {/* ================================================================== */}
      {/* Pagina 5 — Funderingsrisico                                        */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={4} />
        <View style={[styles.contentTinted, { paddingTop: isVoorbeeld ? 46 : 26 }]}>
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <Text style={styles.pageTitel}>Funderingsrisico</Text>
          <Text style={[styles.pageSubtitel, { marginBottom: 10 }]}>Indicatie, geen funderingsonderzoek</Text>

          {fundering.data?.niveau ? (
            <View style={{ gap: 8 }}>
              {/* Hero: tijdlijn + meter */}
              <View style={styles.kaart}>
                <View style={[styles.row, { alignItems: "flex-start" }]}>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.3, borderColor: KLEUR.line, backgroundColor: KLEUR.paper, alignItems: "center", justifyContent: "center" }}>
                      <IcoonKalender kleur={KLEUR.inkFaint} size={11} />
                    </View>
                    <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginTop: 4 }}>{fundering.data.bouwjaarGebruikt ?? "Onbekend"}</Text>
                    <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>bouwjaar</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.3, borderColor: KLEUR.line, backgroundColor: KLEUR.paper, alignItems: "center", justifyContent: "center" }}>
                      <IcoonSchild kleur={KLEUR.inkFaint} size={11} />
                    </View>
                    <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginTop: 4 }}>{bodemNodeTekst(fundering.data.bodemclassificatie)}</Text>
                    <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>bodemdata</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: TOON_HEX[funderingToon].tekst, alignItems: "center", justifyContent: "center" }}>
                      <IcoonWaarschuwing kleur="#FFFFFF" size={11} />
                    </View>
                    <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: TOON_HEX[funderingToon].tekst, marginTop: 4 }}>{funderingNiveauTekst}</Text>
                    <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>risiconiveau</Text>
                  </View>
                </View>

                <View style={[styles.divider, { marginTop: 10, marginBottom: 9 }]} />

                <View style={[styles.row, { alignItems: "center", gap: 14 }]}>
                  <FunderingMeter niveau={fundering.data.niveau} />
                  <View style={{ flex: 1 }}>
                    <Chip text={funderingNiveauTekst} toon={funderingToon} />
                    <View style={[styles.row, { gap: 10, marginTop: 5 }]}>
                      <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>Laag</Text>
                      <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>Midden</Text>
                      <Text style={{ fontSize: 6, color: KLEUR.inkFaint }}>Hoog</Text>
                    </View>
                    {fundering.data.toelichting && (
                      <Text style={{ fontSize: 7, color: KLEUR.inkMuted, lineHeight: 1.4, marginTop: 5 }}>{fundering.data.toelichting}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Doorlopende toelichtingskaart */}
              <View style={[styles.kaart, { gap: 7 }]}>
                {fundering.data.bodemclassificatie && fundering.data.bodemclassificatieUitleg && (
                  <>
                    <View style={[styles.row, { gap: 7, alignItems: "flex-start" }]}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: KLEUR.mist, alignItems: "center", justifyContent: "center" }}>
                        <IcoonSchild kleur={KLEUR.accent} size={8} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>{`Bodem: ${fundering.data.bodemclassificatie}`}</Text>
                        <Text style={{ fontSize: 7.2, color: KLEUR.inkMuted, lineHeight: 1.5, marginTop: 1 }}>{fundering.data.bodemclassificatieUitleg}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {fundering.data.duidingCaveat && (
                  <>
                    <View style={[styles.row, { gap: 7, alignItems: "flex-start" }]}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: KLEUR.parchment, alignItems: "center", justifyContent: "center" }}>
                        <IcoonWaarschuwing kleur={KLEUR.inkFaint} size={8} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>Wat we niet weten</Text>
                        <Text style={{ fontSize: 7.2, color: KLEUR.inkMuted, lineHeight: 1.5, marginTop: 1 }}>{fundering.data.duidingCaveat}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {fundering.data.duidingKern && (
                  <>
                    <View style={[styles.row, { gap: 7, alignItems: "flex-start" }]}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: TOON_HEX[funderingToon].tekst, alignItems: "center", justifyContent: "center" }}>
                        <IcoonWaarschuwing kleur="#FFFFFF" size={8} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>Conclusie</Text>
                        <Text style={{ fontSize: 7.2, color: KLEUR.ink, lineHeight: 1.5, marginTop: 1 }}>{fundering.data.duidingKern}</Text>
                      </View>
                    </View>
                  </>
                )}

                {fundering.data.percentageVoor1970Postcode != null && (
                  <>
                    <View style={styles.divider} />
                    <View>
                      <Text style={{ fontSize: 7, color: KLEUR.inkMuted, marginBottom: 4 }}>Panden vóór 1970 in dit postcodegebied</Text>
                      <View style={{ height: 7, borderRadius: 3.5, backgroundColor: KLEUR.parchment, overflow: "hidden" }}>
                        <View style={{ width: `${fundering.data.percentageVoor1970Postcode}%`, height: 7, backgroundColor: TOON_HEX.aandacht.tekst }} />
                      </View>
                      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginTop: 3 }}>{`${rond(fundering.data.percentageVoor1970Postcode)}%`}</Text>
                      <Text style={{ fontSize: 6.5, color: KLEUR.inkFaint, lineHeight: 1.4, marginTop: 3 }}>
                        Vóór 1970 werd vaak gebouwd op houten palen. Die palen gaan rotten als het grondwater zakt. Dit is een cijfer voor de hele buurt,
                        geen uitspraak over dit ene pand.
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <TipsGrid
                titel="Signalen om op te letten"
                sublabel="algemene kennis, geen bevinding over dit pand"
                items={["Scheve deuren/kozijnen", "Scheuren boven kozijnen", "Verzakte vloeren", "Scheiding aan-/hoofdbouw"]}
                dotKleur={TOON_HEX.aandacht.tekst}
              />

              {fundering.data.duidingAdvies && (
                <View style={styles.duidingPaneel}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.accentDark, marginBottom: 3 }}>Advies bij twijfel</Text>
                  <Text style={{ fontSize: 7.3, color: KLEUR.ink, lineHeight: 1.55 }}>{fundering.data.duidingAdvies}</Text>
                </View>
              )}
            </View>
          ) : (
            <NietBeschikbaar tekst="Geen funderingsindicatie mogelijk zonder bekend bouwjaar." />
          )}

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>

      {/* ================================================================== */}
      {/* Pagina 6 — Buurtprofiel                                            */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={5} />
        <View style={[styles.contentTinted, { paddingTop: isVoorbeeld ? 46 : 26 }]}>
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <Text style={styles.pageTitel}>Buurtprofiel</Text>
          <Text style={[styles.pageSubtitel, { marginBottom: 10 }]}>{buurtSubtitel}</Text>

          {buurtprofiel.data ? (
            <View style={{ gap: 8 }}>
              {/* Veiligheid — eigen kaart, ring + bandlabel, zelfde opbouw
                  als VeiligheidsScore.tsx in de app. */}
              <View style={[styles.kaart, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
                {veiligheidScore != null ? (
                  <>
                    <Ring pct={veiligheidScore * 10} kleur={TOON_HEX.gunstig.tekst} bgKleur={TOON_HEX.gunstig.bg} size={52} dikte={8} labelInside={String(veiligheidScore).replace(".", ",")} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 3 }}>Veiligheid</Text>
                      {veiligheidBand && (
                        <View
                          style={{
                            alignSelf: "flex-start",
                            backgroundColor: TOON_HEX.gunstig.bg,
                            borderRadius: 999,
                            paddingVertical: 2,
                            paddingHorizontal: 7,
                            marginBottom: 3,
                          }}
                        >
                          <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: TOON_HEX.gunstig.tekst }}>{VEILIGHEID_BAND[veiligheidBand].tekst}</Text>
                        </View>
                      )}
                      {buurtprofiel.data.veiligheid.misdrijvenPer1000 != null && (
                        <Text style={{ fontSize: 6.8, color: KLEUR.inkMuted }}>
                          {`${formatDecimaal(buurtprofiel.data.veiligheid.misdrijvenPer1000)} misdrijven per 1.000 inwoners${
                            buurtprofiel.data.peiljaar ? ` (${buurtprofiel.data.peiljaar})` : ""
                          }`}
                        </Text>
                      )}
                    </View>
                  </>
                ) : (
                  <Text style={{ fontSize: 7.5, color: KLEUR.inkMuted }}>Veiligheidscijfer onbekend</Text>
                )}
              </View>

              {/* Bebouwing — eigen kaart, gestapelde balk i.p.v. ring (zelfde
                  weergave als de app, die bebouwing nooit als ring toont). */}
              {bebouwingEengezinsPct != null && (
                <View style={styles.kaart}>
                  <View style={[styles.row, { justifyContent: "space-between", alignItems: "center", marginBottom: 8 }]}>
                    <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>
                      {fysiek?.bevolkingsdichtheid != null ? `${rond(fysiek.bevolkingsdichtheid)} inwoners/km²` : "Bebouwingsdichtheid"}
                    </Text>
                    <View style={{ backgroundColor: KLEUR.mist, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
                      <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: KLEUR.accent }}>{dichtheidLabelKort(fysiek?.bevolkingsdichtheid ?? 0)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", height: 6, borderRadius: 999, overflow: "hidden" }}>
                    <View style={{ width: `${bebouwingEengezinsPct}%`, backgroundColor: "#7F77DD" }} />
                    <View style={{ width: `${bebouwingMeergezinsPct ?? 0}%`, backgroundColor: "#0D9488" }} />
                  </View>
                  <View style={[styles.row, { justifyContent: "space-between", marginTop: 4 }]}>
                    <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint }}>{rond(bebouwingEengezinsPct)}% eengezinswoningen</Text>
                    <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint }}>{rond(bebouwingMeergezinsPct ?? 0)}% meergezinswoningen</Text>
                  </View>
                </View>
              )}

              {/* Bevolking — statcijfers, zelfde vijf als de app (was eerder
                  onvolledig: alleen twee percentages als balk). */}
              {(sociaal?.inwoners != null || sociaal?.huishoudens != null) && (
                <View style={styles.kaart}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 8 }}>Bevolking en huishoudens</Text>
                  <View style={[styles.row, { flexWrap: "wrap", gap: 12 }]}>
                    {sociaal?.inwoners != null && <BevolkingStat waarde={rond(sociaal.inwoners)} label="Inwoners" />}
                    {sociaal?.huishoudens != null && <BevolkingStat waarde={rond(sociaal.huishoudens)} label="Huishoudens" />}
                    {sociaal?.gemiddeldeHuishoudensgrootte != null && (
                      <BevolkingStat waarde={formatDecimaal(sociaal.gemiddeldeHuishoudensgrootte)} label="Pers. per huishouden" />
                    )}
                    {sociaal?.percentageEenpersoons != null && <BevolkingStat waarde={`${rond(sociaal.percentageEenpersoons)}%`} label="Eenpersoons" />}
                    {sociaal?.percentageMetKinderen != null && <BevolkingStat waarde={`${rond(sociaal.percentageMetKinderen)}%`} label="Met kinderen" />}
                  </View>
                </View>
              )}

              {/* Voorzieningen — thema-gegroepeerde tegel-grid, zelfde
                  indeling en kleuren als de app (VOORZIENING_KLEUR gedeeld
                  via lib/utils/voorzieningenStijl.ts). */}
              {voorzieningItems.length > 0 && (
                <View style={styles.kaart}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginBottom: 8 }}>Voorzieningen</Text>
                  {VOORZIENING_THEMA_VOLGORDE.map((thema) => {
                    const items = voorzieningItems.filter((i) => i.thema === thema);
                    if (items.length === 0) return null;
                    return (
                      <View key={thema} style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 6.3, fontFamily: "Helvetica-Bold", color: KLEUR.inkMuted, textTransform: "uppercase", marginBottom: 5 }}>
                          {VOORZIENING_THEMA_LABEL[thema]}
                        </Text>
                        <View style={[styles.row, { flexWrap: "wrap", gap: 6 }]}>
                          {items.map((item) => {
                            const Icoon = VOORZIENING_ICOON[item.key] ?? IcoonPin;
                            const kleur = VOORZIENING_KLEUR[item.key] ?? KLEUR.accent;
                            return (
                              <View key={item.key} style={{ width: "31%", backgroundColor: KLEUR.parchment, borderRadius: 8, padding: 8 }}>
                                <Icoon kleur={kleur} size={11} />
                                <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink, marginTop: 5 }}>{formatKm(item.afstandKm)}</Text>
                                <Text style={{ fontSize: 6, color: KLEUR.inkFaint, marginTop: 2 }}>{item.label}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <TipsGrid
                titel="Waar let je op bij het beoordelen van een buurt?"
                sublabel="algemeen"
                items={["Bezoek op verschillende dagdelen", "Spreek buurtbewoners", "Let op geluid en verkeer", "Check het bestemmingsplan"]}
              />

              {buurtKernpunten.length > 0 && (
                <View style={styles.duidingPaneel}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: KLEUR.accentDark, marginBottom: 7 }}>Wat dit betekent voor deze buurt</Text>
                  <View style={{ gap: 6 }}>
                    {buurtKernpunten.map((punt, i) => (
                      <Kernpunt key={i} icoon={punt.icoon} tekst={punt.tekst} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <NietBeschikbaar tekst="Geen buurtprofiel beschikbaar voor dit adres." />
          )}

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>

      {/* ================================================================== */}
      {/* Pagina 7 — Samenvatting (compacte, visuele eindsamenvatting)        */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={6} />
        <View style={[styles.contentTinted, { paddingTop: isVoorbeeld ? 46 : 26 }]}>
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <Text style={styles.pageTitel}>Samenvatting</Text>
          <Text style={[styles.pageSubtitel, { marginBottom: 10 }]}>Compacte, feitelijke afsluiting van dit rapport</Text>

          <View style={{ gap: 8 }}>
            {/* Hero: totaalbeeld + geschatte waarde */}
            <View style={{ backgroundColor: KLEUR.accentDark, borderRadius: 9, padding: 13 }}>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: "#FFFFFF", lineHeight: 1.35 }}>{samenvatting.titel}</Text>
              <Text style={{ fontSize: 7.6, color: "#FFFFFFD9", lineHeight: 1.55, marginTop: 6, maxWidth: 430 }}>{samenvatting.totaalbeeld}</Text>
              {market.data && (
                <View style={{ marginTop: 9, alignSelf: "flex-start", backgroundColor: "#FFFFFF26", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 7.6, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>
                    Geschatte waarde: {formatCurrency(market.data.geschatteWaarde)}
                  </Text>
                </View>
              )}
            </View>

            {/* Kernstat-kaarten — alleen de onderdelen die echt data hebben */}
            {samenvatting.kernstats.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {samenvatting.kernstats.map((stat) => (
                  <SamenvattingKernstatKaart key={stat.key} stat={stat} />
                ))}
              </View>
            )}

            {/* Drie kolommen: pluspunten / aandachtspunten / wat kun je hiermee */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={[styles.kaart, { flex: 1 }]}>
                <View style={[styles.row, { alignItems: "center", gap: 5, marginBottom: 6 }]}>
                  <IconBadge icoon={IcoonCheck} toon="gunstig" size={14} />
                  <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>Pluspunten</Text>
                </View>
                <View style={{ gap: 5 }}>
                  {samenvatting.pluspunten.map((tekst, i) => (
                    <SamenvattingPunt key={i} icoon={IcoonCheck} kleur={TOON_HEX.gunstig.tekst} tekst={tekst} />
                  ))}
                  {samenvatting.pluspunten.length === 0 && <Text style={{ fontSize: 6.8, color: KLEUR.inkFaint }}>Onbekend voor dit adres.</Text>}
                </View>
              </View>

              <View style={[styles.kaart, { flex: 1 }]}>
                <View style={[styles.row, { alignItems: "center", gap: 5, marginBottom: 6 }]}>
                  <IconBadge icoon={IcoonWaarschuwing} toon="aandacht" size={14} />
                  <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>Aandachtspunten</Text>
                </View>
                <View style={{ gap: 5 }}>
                  {samenvatting.aandachtspunten.map((tekst, i) => (
                    <SamenvattingPunt key={i} icoon={IcoonWaarschuwing} kleur={TOON_HEX.aandacht.tekst} tekst={tekst} />
                  ))}
                  {samenvatting.aandachtspunten.length === 0 && <Text style={{ fontSize: 6.8, color: KLEUR.inkFaint }}>Onbekend voor dit adres.</Text>}
                </View>
              </View>

              <View style={[styles.kaart, { flex: 1 }]}>
                <View style={[styles.row, { alignItems: "center", gap: 5, marginBottom: 6 }]}>
                  <IconBadge icoon={IcoonEuro} toon="accent" size={14} />
                  <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>Wat kun je hiermee?</Text>
                </View>
                <View style={{ gap: 5 }}>
                  {samenvatting.gebruiksblok.map((tekst, i) => (
                    <SamenvattingPunt key={i} icoon={IcoonTrend} kleur={KLEUR.accent} tekst={tekst} />
                  ))}
                </View>
              </View>
            </View>

            {/* Eindconclusie — bewust niet-cursief, geen sfeerquote */}
            <View style={styles.duidingPaneel}>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: KLEUR.accentDark, marginBottom: 4 }}>Eindconclusie</Text>
              <Text style={{ fontSize: 8, color: KLEUR.ink, lineHeight: 1.55 }}>{samenvatting.eindconclusie}</Text>
            </View>
          </View>

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>

      {/* ================================================================== */}
      {/* Pagina 8 — Afsluiting (decoratief, geen data)                      */}
      {/* ================================================================== */}
      <Page size="A4" style={styles.pageRow}>
        <Sidebar actief={-1} />
        <View
          style={[
            styles.contentTinted,
            { alignItems: "center", justifyContent: "center", paddingHorizontal: 60, paddingTop: isVoorbeeld ? 46 : 26 },
          ]}
        >
          {isVoorbeeld && <VoorbeeldBanner siteUrl={siteUrl} />}
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: KLEUR.mist, alignItems: "center", justifyContent: "center" }}>
            <IcoonKooprapportLogo kleur={KLEUR.accent} size={42} />
          </View>

          <View style={{ marginTop: 22, alignItems: "center" }}>
            <View style={{ width: 22, height: 1, backgroundColor: "#C9C3F5" }} />
            <Text style={{ fontSize: 11, color: KLEUR.ink, textAlign: "center", lineHeight: 1.6, marginTop: 12, marginBottom: 12, maxWidth: 300, fontFamily: "Helvetica-Bold" }}>
              &ldquo;Een goed onderbouwde keuze begint niet met een gevoel, maar met de juiste feiten op een rij.&rdquo;
            </Text>
            <View style={{ width: 22, height: 1, backgroundColor: "#C9C3F5" }} />
          </View>

          <View style={{ marginTop: 18, alignItems: "center" }}>
            <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: KLEUR.ink }}>Kooprapport</Text>
            <Text style={{ fontSize: 7, color: KLEUR.inkFaint, textAlign: "center", lineHeight: 1.5, marginTop: 3, maxWidth: 260 }}>
              Feitelijk, verifieerbaar en onafhankelijk, voor iedereen die een weloverwogen beslissing wil nemen over een woning.
            </Text>
          </View>

          <Footer gegenereerdOp={gegenereerdOp} />
        </View>
      </Page>
    </Document>
  );
}

// Compacte rij voor Verkopen in de buurt — adres/oppervlakte/datum links,
// een mini-staafje voor €/m² (zodat je in één oogopslag ziet welke verkopen
// relatief duur/goedkoop waren) en de verkoopprijs rechts.
function VerkoopRij({ verkoop, maxPrijsPerM2, nadruk }: { verkoop: NearbySale; maxPrijsPerM2: number; nadruk?: boolean }) {
  const barPct = maxPrijsPerM2 > 0 ? Math.max(4, Math.round((verkoop.prijsPerM2 / maxPrijsPerM2) * 100)) : 0;
  const prijsTekst =
    verkoop.verkoopprijsMin != null && verkoop.verkoopprijsMax != null
      ? `${formatCurrency(verkoop.verkoopprijsMin)}–${formatCurrency(verkoop.verkoopprijsMax)}`
      : formatCurrency(verkoop.verkoopprijs);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, opacity: nadruk ? 1 : 0.85 }}>
      <View style={{ flex: 1.6 }}>
        <Text style={{ fontSize: 7.6, fontFamily: nadruk ? "Helvetica-Bold" : "Helvetica", color: KLEUR.ink }}>{verkoop.adres}</Text>
        <Text style={{ fontSize: 6.3, color: KLEUR.inkFaint, marginTop: 1 }}>{`${rond(verkoop.oppervlakteM2)} m² · ${formatMaandJaar(verkoop.verkoopdatum)}`}</Text>
      </View>
      <View style={{ flex: 1.5 }}>
        <View style={{ height: 5, borderRadius: 2.5, backgroundColor: KLEUR.parchment, overflow: "hidden" }}>
          <View style={{ width: `${barPct}%`, height: 5, borderRadius: 2.5, backgroundColor: nadruk ? KLEUR.accent : "#C9C3F5" }} />
        </View>
        <Text style={{ fontSize: 6, color: KLEUR.inkFaint, marginTop: 1 }}>{`${formatCurrency(verkoop.prijsPerM2)}/m²`}</Text>
      </View>
      <Text style={{ fontSize: 7.6, fontFamily: nadruk ? "Helvetica-Bold" : "Helvetica", color: KLEUR.ink, flexShrink: 0 }}>{prijsTekst}</Text>
    </View>
  );
}
