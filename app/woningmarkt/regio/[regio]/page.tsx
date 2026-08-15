import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { ArrowRightIcon } from "@/components/report/icons";
import {
  LAUNCH_REGIOS,
  getRegioByWeergaveSlug,
  regioWeergaveSlug,
  regioWeergaveNaam,
  getStadVoorRegio,
  regioContextZin,
} from "@/lib/content/woningmarktRegios";
import { landelijkOverbiedPercentage } from "@/lib/services/biedadvies";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Regiopagina (/woningmarkt/regio/[regio]) -- eerste batch van 15 NVM COROP-
// regio's rond de grootste/bekendste steden, zie lib/content/
// woningmarktRegios.ts voor de volledige toelichting op deze aanpak (bewust
// niet alle 40 in één keer). Statisch gegenereerd, net als de Koopgids-/
// Marktupdate-/stadspagina's.
// -----------------------------------------------------------------------------

export function generateStaticParams() {
  return LAUNCH_REGIOS.map((r) => ({ regio: regioWeergaveSlug(r.regio) }));
}

export async function generateMetadata({ params }: { params: Promise<{ regio: string }> }): Promise<Metadata> {
  const { regio: slug } = await params;
  const regio = getRegioByWeergaveSlug(slug);
  if (!regio) return {};
  const naam = regioWeergaveNaam(regio.regio);
  const canonicalPath = `/woningmarkt/regio/${regioWeergaveSlug(regio.regio)}`;
  // SEO-audit: periodeLabel in de title, zelfde reden als bij de stadspagina
  // -- laat direct zien hoe actueel het cijfer is i.p.v. een tijdloos
  // ogende titel voor iets dat elk kwartaal verandert.
  const title = `Huizenprijzen in ${naam} — ${regio.periodeLabel}`;
  const gemeentenLabel = regio.gemeenten.slice(0, 4).join(", ") + (regio.gemeenten.length > 4 ? " en omgeving" : "");
  const description = `Overbiedpercentage en vraag-verkoopprijsverschil voor ${gemeentenLabel}, uit het officiële NVM Marktoverzicht ${regio.periodeLabel}.`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} · Kooprapport`,
      description,
      url: `${APP_BASE_URL}${canonicalPath}`,
      type: "website",
    },
  };
}

const breadcrumbJsonLdVoor = (regio: { regio: string }) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
    { "@type": "ListItem", position: 2, name: "Woningmarkt per stad", item: `${APP_BASE_URL}/woningmarkt` },
    {
      "@type": "ListItem",
      position: 3,
      name: regioWeergaveNaam(regio.regio),
      item: `${APP_BASE_URL}/woningmarkt/regio/${regioWeergaveSlug(regio.regio)}`,
    },
  ],
});

function pct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1).replace(".", ",") + "%";
}

export default async function RegioPagina({ params }: { params: Promise<{ regio: string }> }) {
  const { regio: slug } = await params;
  const regio = getRegioByWeergaveSlug(slug);
  if (!regio || !LAUNCH_REGIOS.some((r) => r.regio === regio.regio)) notFound();

  const naam = regioWeergaveNaam(regio.regio);
  const landelijkGemiddelde = landelijkOverbiedPercentage();
  const contextZin = regioContextZin(regio, landelijkGemiddelde);
  const stad = getStadVoorRegio(regio.regio);
  const hoofdplaatsen = regio.gemeenten.slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLdVoor(regio)) }}
      />
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
          <Link href="/woningmarkt" className="text-xs font-semibold text-ink/45 hover:text-ink">
            ← Woningmarkt per stad
          </Link>

          <span className="mt-4 inline-flex items-center rounded-full bg-[#EEF0FF] px-3.5 py-1.5 text-xs font-bold text-accent">
            Regio
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Huizenprijzen in {naam}
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/65">
            Cijfers voor {hoofdplaatsen.join(", ")}
            {regio.gemeenten.length > hoofdplaatsen.length ? " en omgeving" : ""}, uit het officiële NVM
            Marktoverzicht voor deze regio.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-ink/45">Boven vraagprijs verkocht</p>
              <p className="mt-1.5 font-display text-3xl font-extrabold text-ink">{regio.percentageBovenVraagprijs}%</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold text-ink/45">Gemiddeld overbod</p>
              <p className="mt-1.5 font-display text-3xl font-extrabold text-ink">{pct(regio.gemiddeldOverbod)}</p>
            </div>
          </div>

          <p className="mt-4 text-[13.5px] leading-relaxed text-ink/60">{contextZin}</p>

          <div className="mt-8">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider3 text-ink/40">
              Gemeenten in deze regio
            </p>
            <div className="flex flex-wrap gap-1.5">
              {regio.gemeenten.map((gemeente) =>
                stad && stad.naam === gemeente ? (
                  <Link
                    key={gemeente}
                    href={`/woningmarkt/${stad.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1.5 text-[12.5px] font-semibold text-accent hover:bg-[#E2E4FC]"
                  >
                    {gemeente} <ArrowRightIcon className="h-2.5 w-2.5" />
                  </Link>
                ) : (
                  <span key={gemeente} className="rounded-full bg-white px-3 py-1.5 text-[12.5px] text-ink/60">
                    {gemeente}
                  </span>
                )
              )}
            </div>
            {stad && (
              <p className="mt-2.5 text-[11.5px] text-ink/40">
                {stad.naam} heeft een eigen pagina met kwartaaltrend →{" "}
                <Link href={`/woningmarkt/${stad.slug}`} className="font-semibold text-accent underline underline-offset-2">
                  bekijk {stad.naam}
                </Link>
              </p>
            )}
          </div>

          <p className="mt-6 text-[11px] text-ink/40">
            Bron: {regio.bron}.{" "}
            <a href={regio.bronUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
              Bekijk het originele document
            </a>
            .
          </p>

          <div className="mt-8 rounded-2xl bg-[#EEF0FF] p-6">
            <p className="text-sm font-bold text-ink">En hoe zit het met uw eigen adres?</p>
            <p className="mt-1 text-xs text-ink/55">Typ een adres en bekijk in enkele seconden een gratis preview.</p>
            <div className="mt-4">
              <AddressSearchBar />
            </div>
          </div>

          <p className="mt-6 text-xs text-ink/45">
            Benieuwd naar andere regio&apos;s of steden?{" "}
            <Link href="/woningmarkt" className="font-semibold text-accent underline underline-offset-2">
              Bekijk het overzicht <ArrowRightIcon className="inline h-3 w-3" />
            </Link>
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
