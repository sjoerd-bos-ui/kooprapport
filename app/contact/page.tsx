import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Contactpagina — zelfde opzet/SEO-behandeling als app/privacy/page.tsx en
// app/voorwaarden/page.tsx (statische pagina, altijd identiek voor iedereen,
// eigen generateMetadata + canonical, indexeerbaar, semantische h1/h2,
// opgenomen in app/sitemap.ts).
//
// BEWUST GEEN webformulier: er is in dit project nog geen e-mail-verzend-
// koppeling (geen Resend/SendGrid/Postmark o.i.d. in package.json) — een
// formulier bouwen dat een bericht "verstuurt" zonder dat er iets aankomt,
// zou tegen het "nooit iets voorspiegelen dat niet klopt"-principe van deze
// app ingaan. Een mailto-link is dus de eerlijke, meteen werkende oplossing;
// zie de toelichting in de chat voor de optie om hier later een echt
// formulier (met bv. Resend, zelfde mode: mock/live-patroon als
// lib/config/dataSources.ts) aan toe te voegen.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Vraag over uw rapport, een klacht of iets anders? Neem contact op met Kooprapport.",
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Container width="narrow" className="py-14 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Contact</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">Neem contact op</h1>
          <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-ink/65">
            Vraag over een rapport, een technisch probleem, een klacht of iets anders? Stuur gerust een bericht — we
            reageren zo snel mogelijk.
          </p>

          <div className="mt-10 overflow-hidden rounded-2xl border border-ink/10">
            <div
              className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
              style={{
                backgroundColor: "#4F46E5",
                backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider3 text-white/70">E-mail</p>
                <a
                  href="mailto:info@kooprapport.nl"
                  className="mt-1 block font-display text-2xl font-bold text-white underline underline-offset-4"
                >
                  info@kooprapport.nl
                </a>
              </div>
              <a
                href="mailto:info@kooprapport.nl"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-white/90"
              >
                Stuur een e-mail
              </a>
            </div>

            <div className="bg-white p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-wider3 text-ink/45">Bedrijfsgegevens</p>
              <dl className="mt-3 space-y-2 text-[14px] text-ink/70">
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-ink/45">Naam</dt>
                  <dd className="text-ink">Kooprapport</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-ink/45">KvK-nummer</dt>
                  <dd className="text-ink">87451387</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-ink/45">Adres</dt>
                  <dd className="text-ink">Pleinweg 66D, 3083 EH Rotterdam</dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="mt-8 text-[13px] text-ink/45">
            Vragen over hoe we met uw gegevens omgaan? Zie onze{" "}
            <a href="/privacy" className="text-accent underline underline-offset-2">
              privacyverklaring
            </a>
            . Klachten over een bestelling behandelen we volgens artikel 11 van onze{" "}
            <a href="/voorwaarden" className="text-accent underline underline-offset-2">
              voorwaarden
            </a>
            .
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
