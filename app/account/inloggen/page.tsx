import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AccountInlogForm from "@/components/account/AccountInlogForm";

// SEO-audit: had geen eigen robots-directive, erfde dus de site-brede default
// (index: true) -- exact hetzelfde soort gat als /account zelf al had
// afgedekt (zie de noindex daar). Een kaal inlogformulier zonder inhoud heeft
// niets te zoeken in de zoekresultaten.
export const metadata: Metadata = {
  title: "Inloggen · Mijn rapporten",
  robots: { index: false, follow: true },
};

export default async function AccountInloggenPagina({
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
          <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Mijn rapporten</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">Inloggen</h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink/60">
            Geen wachtwoord nodig — vul je e-mailadres in en we sturen je een inloglink.
          </p>
          {ongeldig && (
            <p className="mt-4 rounded-lg bg-[#FCEBEB] px-3.5 py-2.5 text-[12.5px] font-semibold text-rust">
              Deze link werkt niet meer. Vraag hieronder een nieuwe aan.
            </p>
          )}
          <div className="mt-6 text-left">
            <AccountInlogForm />
          </div>
        </div>
      </Container>
      <SiteFooter />
    </main>
  );
}
