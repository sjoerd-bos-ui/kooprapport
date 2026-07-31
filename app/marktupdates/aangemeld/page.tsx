import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Statische bevestigingspagina na een klik op de dubbele-opt-in-link (zie
// app/api/marktupdates/bevestigen/route.ts, die de daadwerkelijke bevestiging
// verwerkt en hierheen doorstuurt). Bewust gescheiden van de route zelf: dit
// is een gewone pagina zonder bijwerkingen, de mutatie gebeurt uitsluitend in
// de route handler. robots: noindex, net als de vergelijkbare /afmelden/
// bevestigd-pagina — een utility-pagina hoort niet in zoekresultaten.
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Aangemeld",
  robots: { index: false, follow: true },
};

export default async function MarktupdatesAangemeldPagina({
  searchParams,
}: {
  searchParams: Promise<{ ongeldig?: string }>;
}) {
  const { ongeldig } = await searchParams;

  return (
    <main className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container width="narrow" className="py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Marktupdates</p>
        {ongeldig ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Deze bevestigingslink werkt niet meer
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
              Mogelijk is de link verlopen of al eerder gebruikt. Meld u gerust opnieuw aan op de marktupdates-pagina.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">Aanmelding bevestigd</h1>
            <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
              U ontvangt vanaf nu elk kwartaal de nieuwe marktupdate in uw inbox. Afmelden kan altijd met één klik
              via de link onderaan die e-mail.
            </p>
          </>
        )}
        <Link
          href="/marktupdates"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Naar de marktupdates
        </Link>
      </Container>
      <SiteFooter />
    </main>
  );
}
