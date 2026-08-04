import Link from "next/link";
import Container from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import SiteNavLink from "@/components/layout/SiteNavLink";
import MobileNavMenu from "@/components/layout/MobileNavMenu";

// Exact dezelfde lichte masthead als de lokale header op de homepage
// (zelfde bg-white, border-b border-ink/10, wordmark-formaat en CTA-stijl)
// — geen crosshair-motief en geen colofon-navrij meer, zodat rapportpagina's
// en homepage visueel identiek ogen.
//
// Koopgids-, Werkwijze- en Marktupdates-links toegevoegd als rustige
// tekstlinks naast de bestaande CTA-knop, bewust geen extra knoppen: "Nieuw
// adres opzoeken" blijft de enige echte call-to-action in de header (zie de
// visualize-afstemming hierover).
//
// BUGFIX: op smalle schermen (mobiel) verdrongen de drie tekstlinks + de
// CTA-knop elkaar, met "Marktupdates" dat half buiten beeld viel. De links
// zijn daarom verborgen onder de sm-breakpoint (`hidden sm:flex`).
//
// CORRECTIE op de eerdere aanname hieronder: er werd destijds vanuit gegaan
// dat de koopgids/werkwijze/marktupdates-secties op mobiel via de footer
// bereikbaar zouden blijven, en dat een hamburgermenu daarom overbodig was.
// Die footer linkte in werkelijkheid nooit naar die pagina's (alleen naar
// Privacy/Voorwaarden/Contact) -- op mobiel waren deze secties dus nergens
// vandaan bereikbaar. MobileNavMenu (hieronder) lost dat op met een
// standaard hamburgermenu, alleen zichtbaar onder sm. De footer-links zijn
// via SiteFooter.tsx alsnog toegevoegd als extra pad.
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white">
      <Container className="flex items-center justify-between py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-6 sm:flex">
            <SiteNavLink href="/waarom-kooprapport" label="Waarom Kooprapport" />
            <SiteNavLink href="/koopgids" label="Koopgids" />
            <SiteNavLink href="/werkwijze" label="Werkwijze" />
            <SiteNavLink href="/marktupdates" label="Marktupdates" />
            <SiteNavLink href="/biedadvies" label="Biedadvies" />
          </div>
          <MobileNavMenu />
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
