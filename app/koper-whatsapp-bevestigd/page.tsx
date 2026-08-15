import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Statische bevestigingspagina na een klik op de dubbele-opt-in-link voor
// koper-WhatsApp-meldingen (zie app/api/koper-whatsapp/bevestigen/route.ts).
// Zelfde opzet als app/koper-mail-bevestigd/page.tsx hiernaast.
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "WhatsApp-meldingen bevestigd",
  robots: { index: false, follow: true },
};

export default async function KoperWhatsappBevestigdPagina({
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
              Mogelijk is de link verlopen, al eerder gebruikt, of is het telefoonnummer inmiddels gewijzigd. Vraag uw
              makelaar om een nieuw bevestigingsbericht te sturen.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">WhatsApp-meldingen bevestigd</h1>
            <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
              U ontvangt vanaf nu een WhatsApp-bericht zodra er een nieuwe passende woning wordt gevonden. Wilt u dit
              niet meer, vraag dan uw makelaar om de melding uit te zetten.
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
