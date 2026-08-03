import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Statische bevestigingspagina na een afmelding voor de Marktupdates-
// nieuwsbrief (zie app/api/marktupdates/afmelden/route.ts). robots: noindex,
// zelfde reden als app/afmelden/bevestigd/page.tsx.
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Afgemeld",
  robots: { index: false, follow: true },
};

export default function MarktupdatesAfgemeldPagina() {
  return (
    <main id="main-content" className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container width="narrow" className="py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Afgemeld</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          U ontvangt geen marktupdates meer
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
          Dit e-mailadres is afgemeld voor de Marktupdates-nieuwsbrief. Meldt u zich later opnieuw aan, dan krijgt u
          gewoon weer een bevestigingsmail.
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
