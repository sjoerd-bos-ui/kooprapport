import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import { ArrowRightIcon, TrendingUpIcon } from "@/components/report/icons";
import { MARKTUPDATES } from "@/lib/content/marktupdates";
import { APP_BASE_URL } from "@/lib/config/payment";
import AbonneerFormulier from "@/components/marktupdates/AbonneerFormulier";
import AddressSearchBar from "@/components/address/AddressSearchBar";

// -----------------------------------------------------------------------------
// Marktupdates-hub: overzicht van alle kwartaalupdates, nieuwste eerst.
// Zelfde opzet als /koopgids (statische pagina, eigen metadata + canonical,
// opgenomen in app/sitemap.ts). Net als de Koopgids-hub: de nieuwste update
// krijgt een eigen, uitgelichte kaart (met statjes, zelfde stijl als de
// uitlichting op de homepage), de rest verschijnt eronder als compacte,
// duidelijk "archief"-ogende lijst.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/marktupdates";
// SEO-audit: "Marktupdates" alleen is interne productnaam. Reële zoekintentie
// is "huizenprijzen"/"woningmarkt cijfers"/"overbieden" per kwartaal
// (geverifieerd via live zoekresultaten -- CBS en NVM zelf, en concurrenten
// als Calcasa, titelen hun cijferoverzichten zo).
const PAGINA_OMSCHRIJVING =
  "Actuele huizenprijzen, verkooptijd en overbiedpercentages per regio, elk kwartaal bijgewerkt met de nieuwste cijfers van NVM, Kadaster en CBS.";

export const metadata: Metadata = {
  title: "Woningmarktcijfers: huizenprijzen en overbieden per kwartaal",
  description: PAGINA_OMSCHRIJVING,
  alternates: {
    canonical: CANONICAL_PATH,
    // RSS-feed (zie app/marktupdates/feed.xml/route.ts) -- laat feedlezers
    // en browsers 'm automatisch vinden via <link rel="alternate">.
    types: { "application/rss+xml": `${APP_BASE_URL}/marktupdates/feed.xml` },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Woningmarktcijfers: huizenprijzen en overbieden per kwartaal · Kooprapport",
    description: PAGINA_OMSCHRIJVING,
    url: `${APP_BASE_URL}${CANONICAL_PATH}`,
    type: "website",
  },
};

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Marktupdates",
  description: metadata.description,
  url: `${APP_BASE_URL}${CANONICAL_PATH}`,
  inLanguage: "nl-NL",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: MARKTUPDATES.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.titel,
      url: `${APP_BASE_URL}/marktupdates/${m.slug}`,
    })),
  },
};
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
    { "@type": "ListItem", position: 2, name: "Marktupdates", item: `${APP_BASE_URL}${CANONICAL_PATH}` },
  ],
};

export default function MarktupdatesPagina() {
  const [nieuwste, ...eerdereOplopend] = [...MARKTUPDATES].reverse(); // nieuwste eerst
  const nadrukStat =
    nieuwste.landelijkeCijfers.stats.find((s) => s.nadruk) ?? nieuwste.landelijkeCijfers.stats[0];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader />
      {/* Zelfde parchment-canvas + zachte kleurvlekken als /werkwijze en de
          homepage -- deze hub miste die kleurwas-behandeling nog. */}
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
            Marktupdates
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            De woningmarkt in cijfers, elk kwartaal opnieuw
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/65">
            Verkoopprijzen, overbieden en de verschillen per regio: elk kwartaal zetten we de belangrijkste cijfers
            op een rijtje, gebaseerd op de nieuwste cijfers van NVM, Kadaster en CBS.
          </p>
          <a
            href="/marktupdates/feed.xml"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/45 hover:text-ink"
          >
            RSS-feed
          </a>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-bold text-ink">Mis geen enkele update</p>
              <p className="mt-0.5 text-xs text-ink/55">Eén e-mail per kwartaal, zodra de nieuwe cijfers binnen zijn.</p>
            </div>
            <AbonneerFormulier variant="compact" />
          </div>

          {/* Uitgelicht: de nieuwste update, met statjes -- zelfde
              behandeling als de uitlichting op de homepage. */}
          <Link
            href={`/marktupdates/${nieuwste.slug}`}
            className="mt-6 block rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:p-7"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
                <TrendingUpIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-wider3 text-accent">
                Nieuwste update · {nieuwste.periodeLabel}
              </span>
            </div>
            <p className="mt-2.5 font-display text-lg font-bold text-ink sm:text-xl">{nieuwste.titel}</p>
            <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-ink/60">{nieuwste.samenvatting}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {nieuwste.landelijkeCijfers.stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-[10px] p-3 text-center ${stat === nadrukStat ? "bg-[#EEF0FF]" : "bg-parchment"}`}
                >
                  <p className={`text-[15px] font-extrabold ${stat === nadrukStat ? "text-accent" : "text-ink"}`}>
                    {stat.waarde}
                  </p>
                  <p className={`mt-0.5 text-[9px] ${stat === nadrukStat ? "text-accent" : "text-ink/50"}`}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-ink/[0.06] pt-3.5">
              <span className="text-xs text-ink/45">{nieuwste.gepubliceerd}</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
                Lees de marktupdate <ArrowRightIcon className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Eerdere updates: bewust compacter en zonder statjes, zodat het
              verschil met de uitgelichte, actuele update duidelijk blijft. */}
          {eerdereOplopend.length > 0 && (
            <>
              <p className="mb-3 mt-8 text-[11px] font-bold uppercase tracking-wider3 text-ink/40">
                Eerdere updates
              </p>
              <div className="flex flex-col gap-3">
                {eerdereOplopend.map((update) => (
                  <Link
                    key={update.slug}
                    href={`/marktupdates/${update.slug}`}
                    className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 transition-shadow hover:shadow-lg sm:p-5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-parchment text-ink/50">
                      <TrendingUpIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider3 text-ink/40">
                        {update.periodeLabel} · {update.gepubliceerd}
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink">{update.titel}</p>
                    </div>
                    <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* CTA -- deze hub had alleen het nieuwsbrief-formulier bovenaan,
              geen directe manier om het product zelf te proberen. Marktcijfers
              op landelijk niveau zijn interessant, maar het eigen adres is
              waar iemand hier waarschijnlijk daarna aan denkt. */}
          <div className="mt-8 rounded-2xl bg-[#EEF0FF] p-6">
            <p className="text-sm font-bold text-ink">En hoe zit het met uw eigen adres?</p>
            <p className="mt-1 text-xs text-ink/55">Typ een adres en bekijk in enkele seconden een gratis preview.</p>
            <div className="mt-4">
              <AddressSearchBar />
            </div>
          </div>

          {/* De overbiedcijfers op deze pagina zijn precies de databron achter
              /biedadvies -- wie hier de landelijke cijfers leest, wil vaak
              daarna weten wat dat voor het eigen bod betekent. */}
          <Link
            href="/biedadvies"
            className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4 transition-shadow hover:shadow-lg"
          >
            <div>
              <p className="text-sm font-bold text-ink">Wat is in uw regio een goed bod?</p>
              <p className="mt-0.5 text-xs text-ink/55">Zie in drie scenario&apos;s wat hier realistisch is, van veilig tot scherp.</p>
            </div>
            <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-ink/30" />
          </Link>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
