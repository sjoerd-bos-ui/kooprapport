import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { ArrowRightIcon } from "@/components/report/icons";
import { ARTIKELEN, getArtikelBySlug, KLEUR_STIJL } from "@/lib/content/koopgids";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Los Koopgids-artikel. Statisch gegenereerd (generateStaticParams): dit zijn
// vaste, door Sjoerd geschreven artikelen, geen per-bezoeker content, dus
// geen enkele reden om dit per request te renderen.
//
// De CTA halverwege/onderaan is de ECHTE AddressSearchBar-component (geen
// losse mockup-inputveld) — wie vanuit een artikel doorklikt, kan dus
// meteen een adres opzoeken en komt op precies dezelfde manier bij een
// rapport uit als via de homepage.
// -----------------------------------------------------------------------------

export function generateStaticParams() {
  return ARTIKELEN.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const artikel = getArtikelBySlug(slug);
  if (!artikel) return {};
  const canonicalPath = `/koopgids/${artikel.slug}`;
  return {
    title: artikel.titel,
    description: artikel.metaBeschrijving,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title: artikel.titel,
      description: artikel.metaBeschrijving,
      url: `${APP_BASE_URL}${canonicalPath}`,
      type: "article",
    },
  };
}

export default async function KoopgidsArtikelPagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artikel = getArtikelBySlug(slug);
  if (!artikel) notFound();

  const Icon = artikel.icoon;
  const stijl = KLEUR_STIJL[artikel.kleur];

  return (
    <>
      <SiteHeader />
      <main>
        <Container width="narrow" className="py-12 sm:py-16">
          <Link href="/koopgids" className="text-xs font-semibold text-ink/45 hover:text-ink">
            ← Koopgids
          </Link>

          <div className="mt-4 flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stijl.bg} ${stijl.tekst}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-wider3 text-accent">{artikel.categorie}</span>
            <span className="h-1 w-1 rounded-full bg-ink/25" />
            <span className="text-xs text-ink/45">{artikel.leestijdMinuten} min leestijd</span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {artikel.titel}
          </h1>

          {artikel.intro && <p className="mt-4 text-[15px] leading-relaxed text-ink/70">{artikel.intro}</p>}

          <article className="mt-8 space-y-8">
            {artikel.secties.map((sectie, idx) => {
              const Illustratie = sectie.illustratie;
              return (
                <section key={idx}>
                  <h2 className="font-display text-lg font-bold text-ink">{sectie.kop}</h2>
                  {sectie.paragrafen.map((p, i) => (
                    <p key={i} className="mt-3 text-[15px] leading-relaxed text-ink/70">
                      {p}
                    </p>
                  ))}
                  {Illustratie && <Illustratie />}
                </section>
              );
            })}

            {/* CTA aan het einde van het artikel — echte, werkende
                adreszoekbalk, geen mockup-invoerveld. */}
            <div className="rounded-2xl bg-[#EEF0FF] p-6">
              <p className="text-sm font-bold text-ink">{artikel.ctaTekst}</p>
              <p className="mt-1 text-xs text-ink/55">Typ een adres en bekijk in enkele seconden een gratis preview.</p>
              <div className="mt-4">
                <AddressSearchBar />
              </div>
            </div>
          </article>

          <div className="mt-12 border-t border-ink/10 pt-8">
            <p className="text-[11px] font-bold uppercase tracking-wider3 text-ink/40">Andere onderwerpen</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ARTIKELEN.filter((a) => a.slug !== artikel.slug).map((a) => (
                <Link
                  key={a.slug}
                  href={`/koopgids/${a.slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-accent hover:text-accent"
                >
                  {a.titel} <ArrowRightIcon className="h-3 w-3" />
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
