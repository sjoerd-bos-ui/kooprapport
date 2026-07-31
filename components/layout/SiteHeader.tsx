import Link from "next/link";
import Container from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import SiteNavLink from "@/components/layout/SiteNavLink";

// Exact dezelfde lichte masthead als de lokale header op de homepage
// (zelfde bg-white, border-b border-ink/10, wordmark-formaat en CTA-stijl)
// — geen crosshair-motief en geen colofon-navrij meer, zodat rapportpagina's
// en homepage visueel identiek ogen.
//
// Koopgids-, Werkwijze- en Marktupdates-links toegevoegd als rustige
// tekstlinks naast de bestaande CTA-knop, bewust geen extra knoppen: "Nieuw
// adres opzoeken" blijft de enige echte call-to-action in de header (zie de
// visualize-afstemming hierover).
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white">
      <Container className="flex items-center justify-between py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-6">
          <SiteNavLink href="/koopgids" label="Koopgids" />
          <SiteNavLink href="/werkwijze" label="Werkwijze" />
          <SiteNavLink href="/marktupdates" label="Marktupdates" />
          <Link
            href="/"
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Nieuw adres opzoeken
          </Link>
        </div>
      </Container>
    </header>
  );
}
