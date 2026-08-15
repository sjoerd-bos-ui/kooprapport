import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { ArrowRightIcon } from "@/components/report/icons";
import { STEDEN, getStadBySlug, getStadCijfers } from "@/lib/content/steden";
import { getRegioVoorStadSlug, regioWeergaveNaam, regioWeergaveSlug } from "@/lib/content/woningmarktRegios";
import type { RegioRichting } from "@/lib/content/marktupdates";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Losse stadspagina (/woningmarkt/[stad]). Statisch gegenereerd, net als de
// Koopgids-/Marktupdate-artikelen. Toont ALLEEN cijfers die al ergens in een
// Marktupdate zijn gepubliceerd (zie lib/content/steden.ts) -- geen eigen,
// los verzonnen stadscijfer.
// -----------------------------------------------------------------------------

export function generateStaticParams() {
  return STEDEN.map((s) => ({ stad: s.slug }));
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

export async function generateMetadata({ params }: { params: Promise<{ stad: string }> }): Promise<Metadata> {
  const { stad: stadSlug } = await params;
  const stad = getStadBySlug(stadSlug);
  if (!stad) return {};
  const canonicalPath = `/woningmarkt/${stad.slug}`;
  // SEO-audit: periodeLabel van het nieuwste kwartaal in de title -- zonder
  // dat oogt een "actuele cijfers"-pagina in Google al snel verouderd, met
  // een kwartaallabel erbij is voor de zoeker meteen duidelijk hoe vers de
  // cijfers zijn (zelfde reden als bij de Marktupdates-artikelen zelf).
  const nieuwsteCijfer = getStadCijfers(stad.naam)[0];
  const title = nieuwsteCijfer
    ? `Huizenprijzen in ${stad.naam} — ${nieuwsteCijfer.periodeLabel}`
    : `Huizenprijzen in ${stad.naam}`;
  const description = `Actuele prijsontwikkeling en overbiedpercentage in ${stad.naam}, per kwartaal, gebaseerd op de NVM-cijfers uit onze Marktupdates.`;
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

const breadcrumbJsonLdVoor = (stad: { naam: string; slug: string }) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
    { "@type": "ListItem", position: 2, name: "Woningmarkt per stad", item: `${APP_BASE_URL}/woningmarkt` },
    { "@type": "ListItem", position: 3, name: stad.naam, item: `${APP_BASE_URL}/woningmarkt/${stad.slug}` },
  ],
});

export default async function StadPagina({ params }: { params: Promise<{ stad: string }> }) {
  const { stad: stadSlug } = await params;
  const stad = getStadBySlug(stadSlug);
  if (!stad) notFound();

  const cijfers = getStadCijfers(stad.naam);
  const regio = getRegioVoorStadSlug(stad.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLdVoor(stad)) }}
      />
      <SiteHeader />
      <main>
        <Container width="narrow" className="py-12 sm:py-16">
          <Link href="/woningmarkt" className="text-xs font-semibold text-ink/45 hover:text-ink">
            ← Woningmarkt per stad
          </Link>

          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Huizenprijzen in {stad.naam}
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/65">
            Prijsontwikkeling en overbieden in {stad.naam}, per kwartaal, uit onze Marktupdates -- gebaseerd op
            NVM-cijfers, niet geschat.
          </p>
          {regio && (
            <p className="mt-2 text-[12.5px] text-ink/50">
              {stad.naam} valt onder de regio {regioWeergaveNaam(regio.regio)} -- benieuwd naar het overbiedpercentage
              voor de hele regio?{" "}
              <Link href={`/woningmarkt/regio/${regioWeergaveSlug(regio.regio)}`} className="font-semibold text-accent underline underline-offset-2">
                bekijk {regioWeergaveNaam(regio.regio)}
              </Link>
              .
            </p>
          )}

          {cijfers.length > 0 ? (
            <div className="mt-8 flex flex-col gap-1.5">
              <div className="grid grid-cols-[1fr_1fr_1fr_0.3fr] gap-2 px-3 text-[10.5px] font-bold uppercase tracking-wider3 text-ink/40">
                <span>Kwartaal</span>
                <span>T.o.v. vorig jaar</span>
                <span>Overig</span>
                <span />
              </div>
              {cijfers.map((rij) => (
                <Link
                  key={rij.periodeLabel}
                  href={`/marktupdates/${rij.marktupdateSlug}`}
                  className="grid grid-cols-[1fr_1fr_1fr_0.3fr] items-center gap-2 rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <span className="text-[13px] font-semibold text-ink">{rij.periodeLabel}</span>
                  <span className="text-xs text-ink/60">{rij.jaarVergelijking}</span>
                  <span className="text-xs text-ink/60">{rij.extra}</span>
                  <span className={`text-right text-sm font-bold ${richtingKleur(rij.richting)}`}>
                    {richtingPijl(rij.richting)}
                  </span>
                </Link>
              ))}
              <p className="mt-2 text-[11px] text-ink/40">
                Bron: NVM-cijfers per kwartaal, zie de bijbehorende{" "}
                <Link href={`/marktupdates/${cijfers[0].marktupdateSlug}`} className="underline underline-offset-2">
                  Marktupdate
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink/60">
              Er is voor {stad.naam} nog geen apart kwartaalcijfer gepubliceerd in onze Marktupdates. Zodra dat
              verandert, verschijnt het hier automatisch. Bekijk in de tussentijd de{" "}
              <Link href="/marktupdates" className="font-semibold text-accent underline underline-offset-2">
                landelijke marktupdates
              </Link>
              .
            </div>
          )}

          {/* CTA -- zelfde echte, werkende AddressSearchBar als op de andere
              hub-/artikelpagina's. */}
          <div className="mt-10 rounded-2xl bg-[#EEF0FF] p-6">
            <p className="text-sm font-bold text-ink">En hoe zit het met uw eigen adres in {stad.naam}?</p>
            <p className="mt-1 text-xs text-ink/55">Typ een adres en bekijk in enkele seconden een gratis preview.</p>
            <div className="mt-4">
              <AddressSearchBar />
            </div>
          </div>

          <p className="mt-6 text-xs text-ink/45">
            Benieuwd naar andere steden?{" "}
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
