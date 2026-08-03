import Link from "next/link";
import Container from "@/components/ui/Container";

// Exact dezelfde lichte footer als op de homepage — geen donker bookend-paneel
// meer, zelfde feitelijke disclaimer, alleen in het lichte palet. "Privacy",
// "Voorwaarden" en "Contact" linken nu naar de echte pagina's (waren platte,
// dode tekst zolang die pagina's niet bestonden) — alleen KvK-nummer blijft
// bewust platte tekst (staat al wel op /contact en /privacy).
//
// De "Mockdata ter illustratie"-disclaimer (voorheen automatisch bepaald op
// basis van zes Vercel-omgevingsvariabelen: ENERGIELABEL_MODE/ALTUM_MODE/
// BUURTVERKOPEN_MODE/VERDUURZAMING_MODE/BETAAL_MODE=live + ALTUM_SANDBOX
// niet "true") is op uitdrukkelijk verzoek verwijderd: alle databronnen zijn
// inmiddels gekoppeld. Let op: die aanname staat nu hardcoded vast i.p.v.
// dynamisch gecontroleerd, dus er verschijnt geen waarschuwing meer als een
// van die bronnen ooit weer terugvalt op mockdata.
export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-white py-10">
      <Container className="flex flex-col justify-between gap-3 text-xs sm:flex-row sm:items-center">
        <span className="font-display font-semibold text-ink">© {new Date().getFullYear()} Kooprapport</span>
        <div className="flex flex-wrap gap-4">
          {/* Koopgids/Werkwijze/Marktupdates toegevoegd -- ontbraken hier
              eerder, terwijl het mobiele hamburgermenu (MobileNavMenu) er
              destijds juist bewust NIET kwam met als reden dat deze
              secties "ook via de footer" bereikbaar zouden zijn. Dat klopte
              niet: dit zijn de eerste échte links ernaartoe hier. */}
          <Link href="/koopgids" className="text-ink/70 underline underline-offset-2 hover:text-ink">
            Koopgids
          </Link>
          <Link href="/werkwijze" className="text-ink/70 underline underline-offset-2 hover:text-ink">
            Werkwijze
          </Link>
          <Link href="/marktupdates" className="text-ink/70 underline underline-offset-2 hover:text-ink">
            Marktupdates
          </Link>
          <Link href="/woningmarkt" className="text-ink/70 underline underline-offset-2 hover:text-ink">
            Woningmarkt per stad
          </Link>
          <Link href="/privacy" className="text-ink/70 underline underline-offset-2 hover:text-ink">
            Privacy
          </Link>
          <Link href="/voorwaarden" className="text-ink/70 underline underline-offset-2 hover:text-ink">
            Voorwaarden
          </Link>
          <Link href="/contact" className="text-ink/70 underline underline-offset-2 hover:text-ink">
            Contact
          </Link>
        </div>
      </Container>
    </footer>
  );
}
