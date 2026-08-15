import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { ArrowRightIcon } from "@/components/report/icons";
import { ARTIKELEN, KLEUR_STIJL } from "@/lib/content/koopgids";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Koopgids-hub: overzicht van alle artikelen, één per rapportonderdeel.
// Zelfde opzet als /contact, /privacy, /voorwaarden (statische, voor iedereen
// identieke pagina, eigen metadata + canonical, opgenomen in app/sitemap.ts).
//
// Eerst als visualize-mockup afgestemd met Sjoerd (hero met dot-pattern +
// gelaagde kleurvlekken, uitgelicht artikel, kaartgrid) voordat dit gebouwd
// is — zelfde volgorde als bij de PDF-herstyling eerder in dit project.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/koopgids";
// SEO-audit: "Koopgids" alleen is interne productnaam, geen zoekvraag.
// Reële zoekintentie is "huis kopen stappenplan/checklist" (geverifieerd
// via live zoekresultaten -- Vereniging Eigen Huis en Hypotheker titelen
// hun vergelijkbare hubs exact zo). Title/description leiden nu met die
// vraag i.p.v. met de productnaam.
const PAGINA_OMSCHRIJVING =
  "Huis kopen? Complete checklist van bod tot sleuteloverdracht: woningwaarde, energielabel, funderingsrisico en overbieden, stap voor stap uitgelegd.";

export const metadata: Metadata = {
  title: "Huis kopen: complete koopgids met checklist",
  description: PAGINA_OMSCHRIJVING,
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Huis kopen: complete koopgids met checklist · Kooprapport",
    description: PAGINA_OMSCHRIJVING,
    url: `${APP_BASE_URL}${CANONICAL_PATH}`,
    type: "website",
  },
};

// JSON-LD voor de hub: CollectionPage met alle artikelen als ItemList, plus
// een BreadcrumbList (Home > Koopgids). Zelfde aanpak als de losse
// artikelpagina's, zie app/koopgids/[slug]/page.tsx.
const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Koopgids",
  description: metadata.description,
  url: `${APP_BASE_URL}${CANONICAL_PATH}`,
  inLanguage: "nl-NL",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: ARTIKELEN.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.titel,
      url: `${APP_BASE_URL}/koopgids/${a.slug}`,
    })),
  },
};
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
    { "@type": "ListItem", position: 2, name: "Koopgids", item: `${APP_BASE_URL}${CANONICAL_PATH}` },
  ],
};

export default function KoopgidsPage() {
  const [uitgelicht, ...rest] = ARTIKELEN;
  const UitgelichtIcon = uitgelicht.icoon;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader />
      {/* Zelfde parchment-canvas + zachte kleurvlekken als Werkwijze/
          Marktupdates/Koopgids-artikelen -- deze hub had nog de oudere
          stippenpatroon-hero die destijds bewust van de homepage is
          weggehaald, en week daardoor visueel af van de rest van de site. */}
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
        <Container className="relative py-14 sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF0FF] px-3.5 py-1.5 text-xs font-bold text-accent">
            Koopgids
          </span>
          <h1 className="mt-4 max-w-xl font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Alles wat u moet weten voordat u koopt.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/60">
            Elk onderdeel van uw rapport haarfijn uitgelegd, gebaseerd op dezelfde officiële bronnen als het rapport
            zelf.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {ARTIKELEN.length} onderwerpen
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-sun" />
              Bijgewerkt bij elk nieuw rapportonderdeel
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3B6D11]" />
              Bronnen: RVO, Kadaster, PDOK
            </span>
          </div>
        </Container>

        <Container className="relative py-10 sm:py-14">
          {/* Uitgelicht artikel */}
          <Link
            href={`/koopgids/${uitgelicht.slug}`}
            className="mb-6 flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-overlay transition-shadow hover:shadow-lg sm:flex-row sm:items-center sm:p-7"
          >
            <div className="flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wider3 text-accent">
                Uitgelicht · {uitgelicht.categorie}
              </p>
              <p className="mt-2 font-display text-xl font-bold text-ink sm:text-2xl">{uitgelicht.titel}</p>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink/60">{uitgelicht.samenvatting}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                Lees meer <ArrowRightIcon className="h-3.5 w-3.5" />
              </span>
            </div>
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${KLEUR_STIJL[uitgelicht.kleur].bg} ${KLEUR_STIJL[uitgelicht.kleur].tekst}`}
            >
              <UitgelichtIcon className="h-7 w-7" />
            </span>
          </Link>

          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider3 text-ink/40">Alle onderwerpen</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((artikel) => {
              const Icon = artikel.icoon;
              const stijl = KLEUR_STIJL[artikel.kleur];
              return (
                <Link
                  key={artikel.slug}
                  href={`/koopgids/${artikel.slug}`}
                  className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-[11px] ${stijl.bg} ${stijl.tekst}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <p className="mt-3.5 text-sm font-bold text-ink">{artikel.titel}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink/55">{artikel.samenvatting}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Lees meer <ArrowRightIcon className="h-3 w-3" />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* CTA -- ontbrak hier eerder helemaal: iemand die via een
              Koopgids-artikel of zoekmachine op deze hub landde, moest terug
              naar de header of de homepage om daadwerkelijk iets te
              proberen. Zelfde echte, werkende AddressSearchBar en
              kaartstijl als onderaan elk los Koopgids-artikel. */}
          <div className="mt-10 rounded-2xl bg-[#EEF0FF] p-6">
            <p className="text-sm font-bold text-ink">Liever meteen zelf kijken?</p>
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
