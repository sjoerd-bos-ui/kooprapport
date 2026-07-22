import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Statische bevestigingspagina na een afmelding (zie app/afmelden/route.ts,
// die de daadwerkelijke afmelding verwerkt en hierheen doorstuurt). Bewust
// gescheiden van de route zelf: dit is een gewone, cachebare pagina zonder
// bijwerkingen, de mutatie zelf gebeurt uitsluitend in de route handler.
// robots: noindex, net als not-found.tsx — een utility-pagina zonder content
// hoort niet in zoekresultaten.
// -----------------------------------------------------------------------------
export const metadata: Metadata = {
  title: "Afgemeld",
  robots: { index: false, follow: true },
};

export default function AfmeldenBevestigdPage() {
  return (
    <main className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container width="narrow" className="py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Afgemeld</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          U ontvangt geen herinnering meer
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
          Dit e-mailadres is afgemeld voor de herinneringsmail bij een bewaarde preview. Vraagt u later opnieuw een
          preview per e-mail aan, dan kunt u zich daar desgewenst weer voor aanmelden.
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
