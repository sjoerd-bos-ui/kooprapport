"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// -----------------------------------------------------------------------------
// Rustige tekstlink naar /koopgids in SiteHeader.tsx — bewust een losse
// client component i.p.v. SiteHeader zelf "use client" te maken: de rest van
// de header (logo, CTA-knop) heeft geen interactiviteit nodig, dus blijft
// server-rendered. Alleen dit stukje heeft usePathname nodig om de actieve
// staat (het streepje onder de tekst) te tonen op koopgids-pagina's zelf.
export default function KoopgidsNavLink() {
  const pathname = usePathname();
  const actief = pathname?.startsWith("/koopgids") ?? false;

  return (
    <Link
      href="/koopgids"
      className={`relative text-[13px] font-semibold transition-colors ${actief ? "text-accent" : "text-ink/55 hover:text-ink"}`}
    >
      Koopgids
      {actief && <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-accent" />}
    </Link>
  );
}
