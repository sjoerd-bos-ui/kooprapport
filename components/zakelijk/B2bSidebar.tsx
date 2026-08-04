"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  HomeIcon,
  FileCheckIcon,
  UsersIcon,
  TrendingUpIcon,
  CompassIcon,
} from "@/components/report/icons";

interface NavItem {
  href: string;
  label: string;
  icoon: ComponentType<{ className?: string }>;
  // Exacte match nodig voor "/zakelijk" zelf (anders staat elke subpagina
  // ook als "actief" gemarkeerd op het dashboard-item).
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/zakelijk", label: "Dashboard", icoon: HomeIcon, exact: true },
  { href: "/zakelijk/rapporten", label: "Rapporten", icoon: FileCheckIcon },
  { href: "/zakelijk/klanten", label: "Klanten", icoon: UsersIcon },
  { href: "/zakelijk/vergelijken", label: "Vergelijken", icoon: TrendingUpIcon },
  { href: "/zakelijk/team", label: "Team", icoon: UsersIcon },
  { href: "/zakelijk/instellingen", label: "Instellingen", icoon: CompassIcon },
];

export default function B2bSidebar({ orgNaam, tierLabel }: { orgNaam: string; tierLabel: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-ink/10 bg-white px-3.5 py-5">
      <Link href="/zakelijk" className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
          <HomeIcon className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="text-[13px] font-extrabold text-ink">
          Kooprapport <span className="text-accent">Zakelijk</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const actief = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icoon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-colors ${
                actief ? "bg-[#EEF0FF] text-accent" : "text-ink hover:bg-mist"
              }`}
            >
              <Icon className="h-[15px] w-[15px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-ink/10 bg-[#F8F8FF] px-2.5 py-2.5">
        <p className="text-[9.5px] font-bold text-ink/50">{orgNaam}</p>
        <p className="mt-0.5 text-[11px] font-extrabold text-ink">{tierLabel}</p>
      </div>
    </aside>
  );
}
