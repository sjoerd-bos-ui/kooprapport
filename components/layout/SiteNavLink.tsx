"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// -----------------------------------------------------------------------------
// Generieke rustige tekstlink voor de header (Koopgids, Werkwijze, eventuele
// toekomstige secties). Vervangt het eerdere, één-op-één KoopgidsNavLink.tsx —
// zelfde gedrag (usePathname voor de actieve staat), nu herbruikbaar met een
// href/label-prop in plaats van een los component per sectie. Bewust nog
// steeds een losse client component i.p.v. SiteHeader zelf "use client" te
// maken: logo en CTA-knop blijven server-rendered.
// -----------------------------------------------------------------------------
export default function SiteNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const actief = pathname?.startsWith(href) ?? false;

  return (
    <Link
      href={href}
      className={`relative text-[13px] font-semibold transition-colors ${actief ? "text-accent" : "text-ink/55 hover:text-ink"}`}
    >
      {label}
      {actief && <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-accent" />}
    </Link>
  );
}
