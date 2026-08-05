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
  LayersIcon,
  MapPinIcon,
} from "@/components/report/icons";

interface NavItem {
  href: string;
  label: string;
  icoon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/zakelijk", label: "Dashboard", icoon: HomeIcon, exact: true },
  { href: "/zakelijk/rapporten", label: "Rapporten", icoon: FileCheckIcon },
  { href: "/zakelijk/klanten", label: "Klanten", icoon: UsersIcon },
  { href: "/zakelijk/werkgebied", label: "Werkgebied", icoon: MapPinIcon },
  { href: "/zakelijk/vergelijken", label: "Vergelijken", icoon: TrendingUpIcon },
  { href: "/zakelijk/team", label: "Team", icoon: UsersIcon },
  { href: "/zakelijk/instellingen", label: "Instellingen", icoon: CompassIcon },
];

export default function B2bSidebar({ orgNaam, tierLabel }: { orgNaam: string; tierLabel: string }) {
  const pathname = usePathname();

  return (
    <aside className="relative flex w-[228px] shrink-0 flex-col overflow-hidden border-r border-ink/10 bg-white px-3.5 py-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full"
        style={{ background: "radial-gradient(circle, #4F46E51A 0%, rgba(79,70,229,0) 70%)" }}
      />

      <Link href="/zakelijk" className="relative z-10 mb-7 flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark shadow-sm">
          <LayersIcon className="h-4 w-4 text-white" />
        </span>
        <span className="font-display text-[13px] font-extrabold leading-tight text-ink">
          Kooprapport
          <br />
          <span className="text-accent">Zakelijk</span>
        </span>
      </Link>

      <nav className="relative z-10 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const actief = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icoon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                actief ? "bg-[#EEF0FF] text-accent shadow-sm" : "text-ink/70 hover:bg-mist hover:text-ink"
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${actief ? "bg-accent text-white" : "bg-ink/5 text-ink/50"}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 mt-auto rounded-2xl bg-gradient-to-br from-[#F8F8FF] to-[#EEF0FF] px-3.5 py-3 shadow-sm">
        <p className="truncate text-[9.5px] font-bold text-ink/50">{orgNaam}</p>
        <p className="mt-0.5 text-[11.5px] font-extrabold text-accent">{tierLabel}</p>
      </div>
    </aside>
  );
}
