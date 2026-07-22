import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// SEO-fix: er was nog helemaal geen eigen 404-pagina — Next.js viel terug op
// zijn eigen kale, onbestijlde standaardpagina. Functioneel gaf dat weliswaar
// al de juiste HTTP-status (404, zie Next.js' documentatie), dus dit was geen
// indexatiefout, maar wel een gemiste kans: een bezoeker die op een dode link
// of een oude/foutieve URL uitkomt, ziet nu een merkloze pagina zonder enige
// weg terug, en stuitert vermoedelijk meteen weg. robots: noindex hier is
// bewust, net als bij "Rapport niet gevonden" in app/rapport/[slug]/page.tsx
// — een lege foutpagina hoort nooit geïndexeerd te worden.
// -----------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "Pagina niet gevonden",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container width="narrow" className="py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">404</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">Pagina niet gevonden</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
          Deze pagina bestaat niet (meer), of het adres in de link klopt niet. Zoek hieronder opnieuw, of ga terug
          naar de homepage.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Naar de homepage
        </Link>
      </Container>
      <SiteFooter />
    </main>
  );
}
