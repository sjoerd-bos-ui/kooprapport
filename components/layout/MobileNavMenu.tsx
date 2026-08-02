"use client";

import { useState } from "react";
import Link from "next/link";
import { CompassIcon, FileCheckIcon, TrendingUpIcon } from "@/components/report/icons";

const LINKS = [
  { href: "/koopgids", label: "Koopgids", icoon: FileCheckIcon },
  { href: "/werkwijze", label: "Werkwijze", icoon: CompassIcon },
  { href: "/marktupdates", label: "Marktupdates", icoon: TrendingUpIcon },
];

// Mobiel hamburgermenu.
//
// BUGFIX: de drie nav-links (Koopgids/Werkwijze/Marktupdates) waren onder de
// sm-breakpoint volledig verborgen (hidden sm:flex) om overlap met de
// CTA-knop op smalle schermen te voorkomen (zie de eerdere "pagina's vallen
// over elkaar heen"-fix). Maar de footer linkte destijds ook niet naar deze
// pagina's -- die drie secties waren op mobiel dus nergens vandaan
// bereikbaar, ook niet door te scrollen. Dit hamburgermenu (alleen
// zichtbaar onder sm, via sm:hidden hieronder) lost dat definitief op.
// Vanaf sm blijft de bestaande tekstlinkenrij (SiteNavLink) gewoon
// zichtbaar, dit component rendert daar dan niets.
//
// Losse client component i.p.v. SiteHeader/page.tsx zelf "use client" te
// maken -- zelfde reden als bij SiteNavLink.tsx: logo en CTA-knop blijven
// server-rendered, alleen dit stukje interactiviteit wordt geïsoleerd.
export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        aria-label={open ? "Menu sluiten" : "Menu openen"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-mist"
      >
        <span className="flex flex-col gap-[3px]">
          <span className="h-[1.5px] w-4 rounded-full bg-ink" />
          <span className="h-[1.5px] w-4 rounded-full bg-ink" />
          <span className="h-[1.5px] w-4 rounded-full bg-ink" />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 rounded-xl border border-line bg-white p-1.5 shadow-overlay">
          {LINKS.map((item) => {
            const Icon = item.icoon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-ink hover:bg-mist"
              >
                <Icon className="h-4 w-4 text-accent" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
