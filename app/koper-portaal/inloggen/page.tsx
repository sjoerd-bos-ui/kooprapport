import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";

// -----------------------------------------------------------------------------
// Landingspagina voor een verlopen/ongeldige koperportaal-inloglink (zie het
// Cowork-gesprek "Koperportaal voor Zakelijk-klanten"). BEWUST geen
// self-service "vraag een nieuwe link aan"-formulier zoals bij
// app/account/inloggen -- een koperportaal-sessie hoort bij één specifiek
// klantdossier van één specifieke makelaar, niet bij een los e-mailadres, dus
// alleen de makelaar (vanuit het dossier, zie
// components/zakelijk/ZoekopdrachtForm.tsx: "Nodig koper uit voor portaal")
// kan een nieuwe uitnodiging versturen -- de koper zelf heeft geen
// dossier-id om zo'n aanvraag aan te koppelen.
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Inloggen · Woningportaal",
  robots: { index: false, follow: true },
};

export default async function KoperPortaalInloggenPagina({
  searchParams,
}: {
  searchParams: Promise<{ ongeldig?: string }>;
}) {
  const { ongeldig } = await searchParams;

  return (
    <main className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container width="narrow" className="py-24">
        <div className="mx-auto max-w-[420px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Woningportaal</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">Inloggen</h1>
          {ongeldig ? (
            <p className="mt-4 rounded-lg bg-[#FCEBEB] px-3.5 py-2.5 text-[12.5px] font-semibold text-rust">
              Deze link werkt niet meer. Vraag uw makelaar om een nieuwe uitnodiging.
            </p>
          ) : (
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink/60">
              U bent hier via een link uit een e-mail van uw makelaar. Gebruik die link om in te loggen, of vraag uw
              makelaar om een nieuwe uitnodiging als de link niet meer werkt.
            </p>
          )}
        </div>
      </Container>
      <SiteFooter />
    </main>
  );
}
