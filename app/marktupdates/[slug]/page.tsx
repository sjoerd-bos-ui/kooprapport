import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { ArrowRightIcon, TrendingUpIcon } from "@/components/report/icons";
import { MARKTUPDATES, getMarktupdateBySlug, type RegioRichting } from "@/lib/content/marktupdates";
import { APP_BASE_URL } from "@/lib/config/payment";
import AbonneerFormulier from "@/components/marktupdates/AbonneerFormulier";
import { MailIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Losse Marktupdate-pagina. Statisch gegenereerd (generateStaticParams), zelfde
// vaste sjabloon elk kwartaal: intro, landelijke cijfers, per regio,
// betaalbaarheid t.o.v. de NHG-grens, wat dit betekent, vergelijking met het
// vorige kwartaal. Zie lib/content/marktupdates.ts voor de databron en de
// toelichting over waarom dit een vaste opzet is.
// -----------------------------------------------------------------------------

export function generateStaticParams() {
  return MARKTUPDATES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const update = getMarktupdateBySlug(slug);
  if (!update) return {};
  const canonicalPath = `/marktupdates/${update.slug}`;
  return {
    title: update.titel,
    description: update.metaBeschrijving,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title: update.titel,
      description: update.metaBeschrijving,
      url: `${APP_BASE_URL}${canonicalPath}`,
      type: "article",
    },
  };
}

function richtingKleur(richting: RegioRichting) {
  if (richting === "up") return "text-[#3B6D11]";
  if (richting === "down") return "text-[#854F0B]";
  return "text-ink/50";
}
function richtingPijl(richting: RegioRichting) {
  if (richting === "up") return "↑";
  if (richting === "down") return "↓";
  return "→";
}

export default async function MarktupdatePagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const update = getMarktupdateBySlug(slug);
  if (!update) notFound();

  const canonicalUrl = `${APP_BASE_URL}/marktupdates/${update.slug}`;

  // De vorige update in MARKTUPDATES (chronologische array, dus één positie
  // eerder) -- als die bestaat, wordt "Vorig kwartaal" hieronder een echte
  // interne link naar die pagina i.p.v. losse tekst. Bij de eerst-gepubliceerde
  // update (nu Q1 2026) bestaat die vorige pagina simpelweg nog niet, dan
  // blijft het bij platte tekst.
  const huidigeIndex = MARKTUPDATES.findIndex((m) => m.slug === update.slug);
  const vorigeUpdate = huidigeIndex > 0 ? MARKTUPDATES[huidigeIndex - 1] : null;

  // Percentage van de NHG-grens t.o.v. de gemiddelde prijs, voor de twee
  // vergelijkingsbalken (nooit boven de 100% laten uitsteken op de kortste
  // balk, de langste balk is altijd de hoogste van de twee waarden).
  const hoogsteWaarde = Math.max(update.betaalbaarheid.nhgGrens, update.betaalbaarheid.gemPrijs);
  const nhgPercentage = Math.round((update.betaalbaarheid.nhgGrens / hoogsteWaarde) * 100);
  const prijsPercentage = Math.round((update.betaalbaarheid.gemPrijs / hoogsteWaarde) * 100);

  const artikelJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: update.titel,
    description: update.metaBeschrijving,
    url: canonicalUrl,
    inLanguage: "nl-NL",
    isPartOf: {
      "@type": "WebSite",
      name: "Kooprapport",
      url: APP_BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Kooprapport",
      logo: {
        "@type": "ImageObject",
        url: `${APP_BASE_URL}/logo-email.png`,
      },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
      { "@type": "ListItem", position: 2, name: "Marktupdates", item: `${APP_BASE_URL}/marktupdates` },
      { "@type": "ListItem", position: 3, name: update.titel, item: canonicalUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(artikelJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader />
      {/* Zelfde parchment-canvas + zachte kleurvlekken als Werkwijze/
          Koopgids-artikelen -- deze paginas stonden nog op kaal wit, terwijl
          de rest van de site al op de nieuwe stijl over is. */}
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
          <Link href="/marktupdates" className="text-xs font-semibold text-ink/45 hover:text-ink">
            ← Alle marktupdates
          </Link>

          <div className="mt-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
              <TrendingUpIcon className="h-4 w-4" />
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-wider3 text-accent">
              Marktupdate · {update.periodeLabel}
            </span>
            <span className="h-1 w-1 rounded-full bg-ink/25" />
            <span className="text-xs text-ink/45">
              gepubliceerd {update.gepubliceerd} · {update.leestijdMinuten} min leestijd
            </span>
          </div>

          <h1 className="mt-3 max-w-xl font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            {update.titel}
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/70">{update.intro}</p>

          <article className="mt-8 space-y-6">
            {/* De cijfers landelijk */}
            <section className="rounded-[20px] bg-white p-6 shadow-sm sm:p-7">
              <h2 className="font-display text-lg font-bold text-ink">De cijfers landelijk</h2>
              {update.landelijkeCijfers.tekst.map((p, i) => (
                <p key={i} className="mt-3 text-[14.5px] leading-relaxed text-ink/65">
                  {p}
                </p>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {update.landelijkeCijfers.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl p-3 text-center ${stat.nadruk ? "bg-[#EEF0FF]" : "bg-parchment"}`}
                  >
                    <p className={`text-[15px] font-extrabold ${stat.nadruk ? "text-accent" : "text-ink"}`}>
                      {stat.waarde}
                    </p>
                    <p className={`mt-0.5 text-[10px] ${stat.nadruk ? "text-accent" : "text-ink/50"}`}>{stat.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">{update.landelijkeCijfers.tekstNaStats}</p>
            </section>

            {/* Per regio */}
            <section className="rounded-[20px] bg-white p-6 shadow-sm sm:p-7">
              <h2 className="font-display text-lg font-bold text-ink">Per regio: waar het gebeurt</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">{update.perRegio.tekst}</p>
              <div className="mt-4 flex flex-col gap-1.5">
                {update.perRegio.rijen.map((rij) => (
                  <div
                    key={rij.naam}
                    className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.3fr] items-center gap-2 rounded-lg bg-parchment px-3 py-2.5"
                  >
                    <span className="text-[13px] font-semibold text-ink">{rij.naam}</span>
                    <span className="text-xs text-ink/60">{rij.jaarVergelijking}</span>
                    <span className="text-xs text-ink/60">{rij.extra}</span>
                    <span className={`text-right text-sm font-bold ${richtingKleur(rij.richting)}`}>
                      {richtingPijl(rij.richting)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">{update.perRegio.conclusie}</p>
            </section>

            {/* Betaalbaarheid */}
            <section className="rounded-[20px] bg-white p-6 shadow-sm sm:p-7">
              <h2 className="font-display text-lg font-bold text-ink">Betaalbaarheid: de grens die dichterbij komt</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">{update.betaalbaarheid.tekst}</p>
              <div className="mt-4 rounded-xl bg-parchment p-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-ink/55">{update.betaalbaarheid.nhgGrensLabel}</span>
                  <span className="font-bold text-ink">
                    €{update.betaalbaarheid.nhgGrens.toLocaleString("nl-NL")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-ink/10">
                  <div className="h-2 rounded-full bg-[#3B6D11]" style={{ width: `${nhgPercentage}%` }} />
                </div>
                <div className="mb-1 mt-2.5 flex justify-between text-xs">
                  <span className="text-ink/55">{update.betaalbaarheid.gemPrijsLabel}</span>
                  <span className="font-bold text-[#B7302B]">
                    €{update.betaalbaarheid.gemPrijs.toLocaleString("nl-NL")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-ink/10">
                  <div className="h-2 rounded-full bg-[#B7302B]" style={{ width: `${prijsPercentage}%` }} />
                </div>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">{update.betaalbaarheid.conclusie}</p>
            </section>

            {/* Wat dit betekent */}
            <section>
              <h2 className="font-display text-lg font-bold text-ink">Wat dit voor u betekent</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">{update.watDitBetekent}</p>
            </section>

            {/* Nieuwsbrief-aanmelding */}
            <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF0FF] text-accent">
                  <MailIcon className="h-[18px] w-[18px]" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">Nieuwe marktupdate direct in uw inbox</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/55">
                    Vier keer per jaar, geen extra reclame ertussen. Afmelden kan met één klik.
                  </p>
                  <AbonneerFormulier variant="groot" />
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl bg-[#EEF0FF] p-6">
              <p className="text-sm font-bold text-ink">{update.ctaTekst}</p>
              <p className="mt-1 text-xs text-ink/55">Typ een adres en bekijk in enkele seconden een gratis preview.</p>
              <div className="mt-4">
                <AddressSearchBar />
              </div>
            </div>
          </article>

          <p className="mt-8 text-[12px] text-ink/45">
            Vorig kwartaal (
            {vorigeUpdate ? (
              <Link
                href={`/marktupdates/${vorigeUpdate.slug}`}
                className="font-semibold text-accent underline underline-offset-2"
              >
                {update.vorigKwartaal.periodeLabel}
              </Link>
            ) : (
              update.vorigKwartaal.periodeLabel
            )}
            ): {update.vorigKwartaal.overbieden}, gemiddelde prijs {update.vorigKwartaal.gemPrijs}.{" "}
            <Link href="/marktupdates" className="font-semibold text-accent underline underline-offset-2">
              Bekijk alle marktupdates
            </Link>
          </p>

          <div className="mt-10 border-t border-ink/10 pt-8">
            <p className="text-[11px] font-bold uppercase tracking-wider3 text-ink/40">Meer weten</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {/* De overbiedcijfers hierboven zijn precies de databron achter /biedadvies
                  -- de meest voor de hand liggende vervolgstap vanaf deze pagina. */}
              <Link
                href="/biedadvies"
                className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-mist px-3.5 py-1.5 text-xs font-semibold text-accent-dark hover:border-accent"
              >
                Wat is een goed bod in uw regio? <ArrowRightIcon className="h-3 w-3" />
              </Link>
              <Link
                href="/koopgids/woningwaarde-bepalen"
                className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-accent hover:text-accent"
              >
                Hoe bepaalt u de waarde van een woning? <ArrowRightIcon className="h-3 w-3" />
              </Link>
              <Link
                href="/koopgids/verkopen-in-de-buurt"
                className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-3.5 py-1.5 text-xs font-semibold text-ink/70 hover:border-accent hover:text-accent"
              >
                Verkopen in de buurt <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
