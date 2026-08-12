import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Statische bevestigingspagina na een klik op de dubbele-opt-in-link voor
// koper-matchmeldingen (zie app/api/koper-mail/bevestigen/route.ts, die de
// daadwerkelijke bevestiging verwerkt en hierheen doorstuurt). Zelfde opzet
// als app/marktupdates/aangemeld/page.tsx: bewust gescheiden van de route
// zelf, dit is een gewone pagina zonder bijwerkingen. robots: noindex, een
// utility-pagina hoort niet in zoekresultaten.
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Mailmeldingen bevestigd",
  robots: { index: false, follow: true },
};

export default async function KoperMailBevestigdPagina({
  searchParams,
}: {
  searchParams: Promise<{ ongeldig?: string }>;
}) {
  const { ongeldig } = await searchParams;

  return (
    <main className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container width="narrow" className="py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Kooprapport</p>
        {ongeldig ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Deze bevestigingslink werkt niet meer
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
              Mogelijk is de link verlopen, al eerder gebruikt, of is het e-mailadres inmiddels gewijzigd. Vraag uw
              makelaar om een nieuwe bevestigingsmail te sturen.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">Mailmeldingen bevestigd</h1>
            <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
              U ontvangt vanaf nu een e-mail zodra er een nieuwe passende woning wordt gevonden. Wilt u dit niet meer,
              vraag dan uw makelaar om de melding uit te zetten.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Naar kooprapport.nl
        </Link>
      </Container>
      <SiteFooter />
    </main>
  );
}
