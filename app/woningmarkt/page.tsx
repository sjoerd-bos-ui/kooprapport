import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { ArrowRightIcon, MapPinIcon } from "@/components/report/icons";
import { STEDEN, getStadCijfers } from "@/lib/content/steden";
import { LAUNCH_REGIOS, regioWeergaveNaam, regioWeergaveSlug } from "@/lib/content/woningmarktRegios";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// /woningmarkt-hub: overzicht van de steden waarvoor we een eigen
// kwartaaloverzicht bijhouden (zie app/woningmarkt/[stad]/page.tsx). Zelfde
// opzet als de Koopgids-/Marktupdates-hub: statische pagina, eigen metadata +
// canonical, opgenomen in app/sitemap.ts.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/woningmarkt";
// SEO-audit: "Woningmarkt per stad" is beschrijvend maar mist het woord
// waarop mensen daadwerkelijk zoeken ("huizenprijzen"). Reële zoekintentie
// is "huizenprijzen [stad]"/"huizenprijzen per regio" (geverifieerd via live
// zoekresultaten -- Funda, Calcasa en CBS titelen hun vergelijkbare
// overzichten allemaal met "huizenprijzen" voorop).
const PAGINA_OMSCHRIJVING =
  "Huizenprijzen en overbiedpercentage per stad en regio, gebaseerd op NVM-cijfers: Amsterdam, Rotterdam, Den Haag, Utrecht en 11 andere regio's.";

export const metadata: Metadata = {
  title: "Huizenprijzen per stad en regio (NVM-cijfers)",
  description: PAGINA_OMSCHRIJVING,
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Huizenprijzen per stad en regio (NVM-cijfers) · Kooprapport",
    description: PAGINA_OMSCHRIJVING,
    url: `${APP_BASE_URL}${CANONICAL_PATH}`,
    type: "website",
  },
};

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Woningmarkt per stad",
  description: metadata.description,
  url: `${APP_BASE_URL}${CANONICAL_PATH}`,
  inLanguage: "nl-NL",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: [
      ...STEDEN.map((stad, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: stad.naam,
        url: `${APP_BASE_URL}/woningmarkt/${stad.slug}`,
      })),
      ...LAUNCH_REGIOS.map((regio, i) => ({
        "@type": "ListItem",
        position: STEDEN.length + i + 1,
        name: regioWeergaveNaam(regio.regio),
        url: `${APP_BASE_URL}/woningmarkt/regio/${regioWeergaveSlug(regio.regio)}`,
      })),
    ],
  },
};
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
    { "@type": "ListItem", position: 2, name: "Woningmarkt per stad", item: `${APP_BASE_URL}${CANONICAL_PATH}` },
  ],
};

export default function WoningmarktHub() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF0FF] px-3.5 py-1.5 text-xs font-bold text-accent">
            Woningmarkt per stad
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Huizenprijzen per stad, per kwartaal
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/65">
            Dezelfde cijfers als in onze Marktupdates, per stad op een rijtje: prijsontwikkeling, overbieden en hoe
            dat zich per kwartaal ontwikkelt.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {STEDEN.map((stad) => {
              const cijfers = getStadCijfers(stad.naam);
              const laatste = cijfers[0];
              return (
                <Link
                  key={stad.slug}
                  href={`/woningmarkt/${stad.slug}`}
                  className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#EEF0FF] text-accent">
                    <MapPinIcon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3.5 text-sm font-bold text-ink">{stad.naam}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink/55">
                    {laatste
                      ? `${laatste.jaarVergelijking} · ${laatste.periodeLabel}`
                      : "Cijfers verschijnen zodra deze stad in een Marktupdate voorkomt."}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Bekijk cijfers <ArrowRightIcon className="h-3 w-3" />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Regio's -- naast de stadspagina's hierboven (kwartaaltrend uit de
              Marktupdates), dekken deze het overbiedpercentage per NVM COROP-
              regio (zie lib/content/woningmarktRegios.ts voor waarom dit een
              kleinere eerste batch is i.p.v. alle 40 regio's meteen). */}
          <p className="mb-3 mt-10 text-[11px] font-bold uppercase tracking-wider3 text-ink/40">
            Overbieden per regio
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LAUNCH_REGIOS.map((regio) => (
              <Link
                key={regio.regio}
                href={`/woningmarkt/regio/${regioWeergaveSlug(regio.regio)}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 transition-shadow hover:shadow-lg"
              >
                <div>
                  <p className="text-sm font-bold text-ink">{regioWeergaveNaam(regio.regio)}</p>
                  <p className="mt-0.5 text-xs text-ink/55">
                    {regio.percentageBovenVraagprijs}% boven vraagprijs · {regio.periodeLabel}
                  </p>
                </div>
                <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-ink/30" />
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-[#EEF0FF] p-6">
            <p className="text-sm font-bold text-ink">Liever de cijfers voor uw eigen adres?</p>
            <p className="mt-1 text-xs text-ink/55">Typ een adres en bekijk in enkele seconden een gratis preview.</p>
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
