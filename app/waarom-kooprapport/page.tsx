import type { ComponentType } from "react";
import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import {
  LayersIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  LeafIcon,
  HistoryIcon,
  MapPinIcon,
  StoreIcon,
  RulerIcon,
  ShieldCheckIcon,
} from "@/components/report/icons";
import { KLEUR_STIJL, type KoopgidsKleur } from "@/lib/content/koopgids";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// /waarom-kooprapport — marketingpagina die uitlegt waarom Kooprapport
// onafhankelijk is (eigen model, los van alle partijen rond de aankoop of
// verkoop) en welke concrete situaties dat voorkomt. Bewust GEEN losse
// bronnennamen genoemd (zelfde keuze als /werkwijze) en bewust GEEN "wij vs.
// makelaar/taxateur"-toon: die partijen kunnen ook samenwerkingspartners
// zijn, dus de "Samen sterker"-sectie zet ze neer als aanvullend, niet als
// mindere alternatieven. Cijfers/situaties hieronder zijn algemene,
// herkenbare scenario's gekoppeld aan een echt onderdeel van het rapport,
// geen verzonnen klantcasussen.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/waarom-kooprapport";

const PAGINA_OMSCHRIJVING =
  "Kooprapport bundelt openbare en officiële gegevens per adres in één onafhankelijk model, zelf ontwikkeld en los van alle partijen rond de aankoop of verkoop.";

export const metadata: Metadata = {
  title: "Waarom Kooprapport",
  description: PAGINA_OMSCHRIJVING,
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Waarom Kooprapport · Kooprapport",
    description: PAGINA_OMSCHRIJVING,
    url: `${APP_BASE_URL}${CANONICAL_PATH}`,
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
    { "@type": "ListItem", position: 2, name: "Waarom Kooprapport", item: `${APP_BASE_URL}${CANONICAL_PATH}` },
  ],
};

interface Situatie {
  titel: string;
  tekst: string;
  tag: string;
  icoon: ComponentType<{ className?: string }>;
  kleur: KoopgidsKleur;
}

const SITUATIES: Situatie[] = [
  {
    titel: "Te veel overbieden op gevoel",
    tekst: "U biedt zonder onderbouwing en zit achteraf fors boven vergelijkbare verkopen in de straat.",
    tag: "Waarde-indicatie + biedadvies",
    icoon: TrendingUpIcon,
    kleur: "indigo",
  },
  {
    titel: "Onverwacht funderingsrisico",
    tekst: "Pas na de koop blijkt het bouwjaar en de grondsoort een risico te vormen, met hoge herstelkosten.",
    tag: "Funderingsrisico",
    icoon: AlertTriangleIcon,
    kleur: "rust",
  },
  {
    titel: "Verrast door een laag energielabel",
    tekst: "U ontdekt pas na de sleuteloverdracht wat er moet gebeuren om te verduurzamen, en wat dat kost.",
    tag: "Energielabel + verduurzamingsadvies",
    icoon: LeafIcon,
    kleur: "green",
  },
  {
    titel: "De vraagprijs verkeerd inschatten",
    tekst:
      "Te laag zetten en geld laten liggen, of te hoog zetten waardoor u de prijs later zichtbaar moet verlagen.",
    tag: "Waarde-indicatie + verkopen in de buurt",
    icoon: HistoryIcon,
    kleur: "indigo",
  },
  {
    titel: "Een buurt die niet past bij uw situatie",
    tekst: "De buurt oogt op papier goed, maar mist juist de voorzieningen die voor u belangrijk blijken.",
    tag: "Buurtprofiel",
    icoon: MapPinIcon,
    kleur: "indigo",
  },
];

export default function WaaromKooprapportPagina() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader />
      <main className="relative overflow-hidden bg-parchment">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, #4F46E524 0%, rgba(79,70,229,0) 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-[380px] h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, #8B85EE20 0%, rgba(139,133,238,0) 70%)" }}
        />
        <Container width="narrow" className="relative py-12 sm:py-16">
          <span className="inline-flex items-center rounded-full bg-[#EEF0FF] px-3.5 py-1.5 text-xs font-bold text-accent">
            Waarom Kooprapport
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Eén eigen model, opgebouwd uit vele lagen.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/65">{PAGINA_OMSCHRIJVING}</p>

          {/* Model-visual: zelfde "gestapelde lagen -> één rapport"-beeld als
              afgestemd in Cowork, vertaald naar een rustige kaart i.p.v. een
              letterlijke bronnenopsomming. */}
          <div className="relative mt-9 overflow-hidden rounded-[24px] bg-white p-6 shadow-sm sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
              style={{ background: "radial-gradient(circle, #4F46E52A 0%, rgba(79,70,229,0) 70%)" }}
            />
            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-dark shadow-md">
                <LayersIcon className="h-7 w-7 text-white" />
              </span>
              <div>
                <p className="text-base font-extrabold text-ink">Het Kooprapport-model</p>
                <p className="mt-0.5 text-xs text-ink/50">11,95 euro · direct beschikbaar als PDF</p>
              </div>
            </div>
            <p className="relative mt-4 max-w-md text-[13px] leading-relaxed text-ink/55">
              Losse gegevens zeggen op zichzelf weinig. Ons model combineert ze tot één samenhangend beeld per
              adres — dat is het werk dat Kooprapport toevoegt.
            </p>
          </div>

          {/* Wat dit voorkomt */}
          <p className="mt-10 text-[11px] font-bold uppercase tracking-wide text-ink/40">Wat dit voorkomt</p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-ink">
            Situaties die u met dit rapport vermijdt
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SITUATIES.map((situatie) => {
              const Icon = situatie.icoon;
              const stijl = KLEUR_STIJL[situatie.kleur];
              return (
                <div key={situatie.titel} className="rounded-2xl bg-white p-5 shadow-sm">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${stijl.bg} ${stijl.tekst}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-[13px] font-bold text-ink">{situatie.titel}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink/55">{situatie.tekst}</p>
                  <span
                    className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-bold ${stijl.bg} ${stijl.tekst}`}
                  >
                    {situatie.tag}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Samen sterker -- bewust geen "wij vs. hen"-vergelijking: makelaar
              en taxateur staan hier als aanvulling naast Kooprapport, niet
              als mindere alternatieven (dit kunnen ook samenwerkingspartners
              zijn). */}
          <p className="mt-10 text-[11px] font-bold uppercase tracking-wide text-ink/40">Samen sterker</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink/5 text-ink">
                <StoreIcon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-ink">Uw makelaar</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/55">
                Begeleidt bezichtigingen, onderhandelingen en de verkoop zelf.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink/5 text-ink">
                <RulerIcon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-ink">Uw taxateur</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/55">
                Levert het officiële rapport dat de bank voor de hypotheek vraagt.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-accent bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-white">
                <ShieldCheckIcon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[13px] font-bold text-accent">Kooprapport</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink/65">
                Onafhankelijke onderbouwing vooraf, als goede basis voor dat gesprek.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-9 rounded-2xl bg-[#EEF0FF] p-6">
            <p className="text-sm font-bold text-ink">Eén model, gebouwd om onafhankelijk te blijven</p>
            <p className="mt-1 text-xs text-ink/55">
              Goed te combineren met het advies van uw makelaar of taxateur. Typ een adres en bekijk in enkele
              seconden een gratis preview.
            </p>
            <div className="mt-4">
              <AddressSearchBar />
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
