"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

// -----------------------------------------------------------------------------
// Gewone Error Boundary (audit-punt: deze bestond nog nergens) -- vangt een
// crash op in een willekeurige pagina/component ONDER de root layout, dus
// SiteHeader/SiteFooter zelf werken hier nog gewoon (in tegenstelling tot
// app/global-error.tsx, dat pas aanslaat als de root layout zelf faalt).
// Rapporteert de fout ook meteen aan Sentry, zodat een crash niet alleen een
// nette pagina toont maar ook daadwerkelijk ergens zichtbaar wordt voor ons.
// -----------------------------------------------------------------------------
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container width="narrow" className="py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Foutmelding</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">Er ging iets mis</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/65">
          Deze pagina kon niet worden geladen. Probeer het opnieuw, of ga terug naar de homepage. Blijft dit
          gebeuren, neem dan contact op — we zien deze melding nu automatisch binnenkomen.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => reset()}>
            Probeer opnieuw
          </Button>
          <Button variant="primary" onClick={() => (window.location.href = "/")}>
            Naar de homepage
          </Button>
        </div>
      </Container>
      <SiteFooter />
    </main>
  );
}
