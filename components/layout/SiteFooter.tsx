import Link from "next/link";
import Container from "@/components/ui/Container";
import { isVolledigLive } from "@/lib/config/launchStatus";

// Exact dezelfde lichte footer als op de homepage — geen donker bookend-paneel
// meer, zelfde feitelijke disclaimer, alleen in het lichte palet. "Privacy",
// "Voorwaarden" en "Contact" linken nu naar de echte pagina's (waren platte,
// dode tekst zolang die pagina's niet bestonden) — alleen KvK-nummer blijft
// bewust platte tekst (staat al wel op /contact en /privacy).
//
// De mockdata-disclaimer wordt nu bepaald door isVolledigLive() i.p.v.
// hardcoded tekst — zie lib/config/launchStatus.ts: die tekst mag na
// livegang niet blijven staan, want dan zou hij zelf een onjuiste bewering
// worden.
export default function SiteFooter() {
  const volledigLive = isVolledigLive();
  return (
    <footer className="mt-20 border-t border-ink/10 bg-white py-10">
      <Container className="flex flex-col justify-between gap-3 text-xs sm:flex-row sm:items-center">
        <span className="font-display font-semibold text-ink">© {new Date().getFullYear()} Kooprapport</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="text-ink/55 underline underline-offset-2 hover:text-ink">
            Privacy
          </Link>
          <Link href="/voorwaarden" className="text-ink/55 underline underline-offset-2 hover:text-ink">
            Voorwaarden
          </Link>
          <Link href="/contact" className="text-ink/55 underline underline-offset-2 hover:text-ink">
            Contact
          </Link>
        </div>
        {!volledigLive && (
          <span className="text-ink/40">Mockdata ter illustratie. Nog geen live databronnen gekoppeld.</span>
        )}
      </Container>
    </footer>
  );
}
