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
      <Container className="flex items-center justify-between gap-6 py-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex items-center gap-4 xl:gap-6">
          <div className="hidden items-center gap-5 lg:flex xl:gap-7">
            <SiteNavLink href="/waarom-kooprapport" label="Waarom Kooprapport" />
            <SiteNavLink href="/koopgids" label="Koopgids" />
            <SiteNavLink href="/werkwijze" label="Werkwijze" />
            <SiteNavLink href="/marktupdates" label="Marktupdates" />
            <SiteNavLink href="/biedadvies" label="Biedadvies" />
          </div>
          <Link
            href="/account"
            aria-label="Mijn rapporten"
            title="Mijn rapporten"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-mist hover:text-ink lg:flex"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" />
            </svg>
          </Link>
          <MobileNavMenu />
          <Link
            href="/"
            className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Nieuw adres opzoeken
          </Link>
        </div>
      </Container>
    </header>
  );
}
