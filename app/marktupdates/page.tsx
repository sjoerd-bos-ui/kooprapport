import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import { ArrowRightIcon, TrendingUpIcon } from "@/components/report/icons";
import { MARKTUPDATES } from "@/lib/content/marktupdates";
import { APP_BASE_URL } from "@/lib/config/payment";
import AbonneerFormulier from "@/components/marktupdates/AbonneerFormulier";

// -----------------------------------------------------------------------------
// Marktupdates-hub: overzicht van alle kwartaalupdates, nieuwste eerst.
// Zelfde opzet als /koopgids (statische pagina, eigen metadata + canonical,
// opgenomen in app/sitemap.ts). Bewust een simpele lijst i.p.v. een
// uitgelicht-artikel-plus-grid zoals de Koopgids: hier is er altijd maar één
// "actuele" update, de rest is archief.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/marktupdates";

export const metadata: Metadata = {
  title: "Marktupdates",
  description:
    "Elk kwartaal de belangrijkste cijfers over de Nederlandse woningmarkt: verkoopprijzen, overbieden en verschillen per regio.",
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
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
  const updates = [...MARKTUPDATES].reverse(); // nieuwste eerst

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader />
      <main>
        <Container width="narrow" className="py-12 sm:py-16">
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

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-bold text-ink">Mis geen enkele update</p>
              <p className="mt-0.5 text-xs text-ink/55">Eén e-mail per kwartaal, zodra de nieuwe cijfers binnen zijn.</p>
            </div>
            <AbonneerFormulier variant="compact" />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {updates.map((update) => (
              <Link
                key={update.slug}
                href={`/marktupdates/${update.slug}`}
                className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg sm:flex-row sm:items-center"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
                  <TrendingUpIcon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider3 text-accent">
                    {update.periodeLabel} · {update.gepubliceerd}
                  </p>
                  <p className="mt-1.5 font-display text-lg font-bold text-ink">{update.titel}</p>
                  <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink/60">{update.samenvatting}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent">
                  Lees meer <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
