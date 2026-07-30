import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import { ArrowRightIcon } from "@/components/report/icons";
import { ARTIKELEN, KLEUR_STIJL } from "@/lib/content/koopgids";

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

export const metadata: Metadata = {
  title: "Koopgids",
  description:
    "Alles wat u moet weten voordat u een woning koopt: woningwaarde, energielabel, funderingsrisico en meer, per onderdeel uitgelegd.",
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
};

export default function KoopgidsPage() {
  const [uitgelicht, ...rest] = ARTIKELEN;
  const UitgelichtIcon = uitgelicht.icoon;

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero — zelfde dot-pattern als de rest van de site, plus twee
            zachte kleurvlekken (indigo/amber) voor wat diepte, zoals in de
            laatste visualize-ronde afgestemd. */}
        <div className="relative overflow-hidden bg-parchment py-14 sm:py-20">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "radial-gradient(#4F46E51F 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          />
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(79,70,229,0.14) 0%, rgba(79,70,229,0) 70%)" }}
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-[-100px] h-64 w-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(217,119,6,0.10) 0%, rgba(217,119,6,0) 70%)" }}
          />
          <Container className="relative">
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
        </div>

        <Container className="py-10 sm:py-14">
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
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
