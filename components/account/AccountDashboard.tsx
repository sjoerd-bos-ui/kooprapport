"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HomeIcon, StarIcon, BoxIcon, PlusIcon, SearchIcon } from "@/components/report/icons";

export interface AccountRapportItem {
  id: string;
  label: string;
  plaats: string;
  bekijkUrl: string;
  datumLabel: string;
  bedragLabel: string;
  favoriet: boolean;
  gearchiveerd: boolean;
}

type Tab = "recent" | "favoriet" | "gearchiveerd";

// -----------------------------------------------------------------------------
// "Mijn rapporten"-dashboard (zie het Cowork-gesprek "zelfstandig
// koperportaal" / "b2c-dashboard") -- naar het goedgekeurde visualize-ontwerp
// (Rabo "Bepaal je Bod" als referentie): adres-toevoegen bovenaan, tabbladen
// Recent/Favoriet/Gearchiveerd, kaartgrid met een "+"-kaart vooraan.
// -----------------------------------------------------------------------------
export default function AccountDashboard({ email, rapporten }: { email: string; rapporten: AccountRapportItem[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("recent");
  const [bezigId, setBezigId] = useState<string | null>(null);
  const [uitloggenBezig, setUitloggenBezig] = useState(false);

  const zichtbaar = rapporten.filter((r) => {
    if (tab === "gearchiveerd") return r.gearchiveerd;
    if (tab === "favoriet") return r.favoriet && !r.gearchiveerd;
    return !r.gearchiveerd;
  });

  const initialen = email
    .split(/[.@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((deel) => deel[0]?.toUpperCase())
    .join("");

  async function toggle(id: string, veld: "favoriet" | "gearchiveerd", waarde: boolean) {
    setBezigId(id);
    try {
      const res = await fetch(`/api/account/rapporten/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [veld]: waarde }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBezigId(null);
    }
  }

  async function uitloggen() {
    setUitloggenBezig(true);
    try {
      await fetch("/api/account/uitloggen", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setUitloggenBezig(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-[11px] font-bold text-accent">
            {initialen || "?"}
          </span>
          <span className="text-[12.5px] text-ink/60">{email}</span>
        </div>
        <button
          type="button"
          onClick={uitloggen}
          disabled={uitloggenBezig}
          className="text-[11.5px] font-semibold text-ink/50 hover:text-ink disabled:opacity-50"
        >
          {uitloggenBezig ? "Bezig…" : "Uitloggen"}
        </button>
      </div>

      <p className="mt-6 text-[12.5px] font-bold text-ink">Voeg een nieuw adres toe</p>
      <Link
        href="/"
        className="mt-2 flex items-center gap-2.5 rounded-lg bg-white px-3.5 py-2.5 text-[12.5px] text-ink/40 shadow-sm hover:bg-mist/40"
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        Typ een adres of ga naar de homepage
      </Link>

      <div className="mt-6 flex gap-4 border-b border-ink/10">
        {(
          [
            ["recent", "Recent"],
            ["favoriet", "Favoriet"],
            ["gearchiveerd", "Gearchiveerd"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`pb-2.5 text-[12.5px] font-semibold ${
              tab === id ? "border-b-2 border-accent text-accent" : "text-ink/50 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/"
          className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/20 bg-white p-4 text-center hover:bg-mist/30"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mist text-accent">
            <PlusIcon className="h-4 w-4" />
          </span>
          <span className="text-[12px] text-ink/60">Nieuw adres toevoegen</span>
        </Link>

        {zichtbaar.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="relative flex h-[82px] items-center justify-center bg-mist">
              <HomeIcon className="h-6 w-6 text-accent/40" />
              {r.favoriet && (
                <span className="absolute left-2 top-2 rounded-md bg-[#EAF3DE] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#3B6D11]">
                  Favoriet
                </span>
              )}
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => toggle(r.id, "favoriet", !r.favoriet)}
                  disabled={bezigId === r.id}
                  aria-label={r.favoriet ? "Favoriet verwijderen" : "Favoriet maken"}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-ink/40 hover:text-sun disabled:opacity-50"
                >
                  <StarIcon className="h-3.5 w-3.5" filled={r.favoriet} />
                </button>
                <button
                  type="button"
                  onClick={() => toggle(r.id, "gearchiveerd", !r.gearchiveerd)}
                  disabled={bezigId === r.id}
                  aria-label={r.gearchiveerd ? "Terugzetten" : "Archiveren"}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-ink/40 hover:text-ink disabled:opacity-50"
                >
                  <BoxIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="p-3.5">
              <p className="truncate text-[12.5px] font-bold text-ink">{r.label}</p>
              <p className="mt-0.5 truncate text-[11px] text-ink/50">{r.plaats}</p>
              <div className="mt-2.5 flex items-baseline justify-between border-t border-ink/[0.06] pt-2.5">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-ink/35">Betaald</p>
                  <p className="text-[12px] font-semibold text-ink">{r.bedragLabel}</p>
                </div>
                <span className="text-[9.5px] text-ink/40">{r.datumLabel}</span>
              </div>
              <Link
                href={r.bekijkUrl}
                className="mt-2.5 block w-full rounded-lg bg-accent px-3 py-2 text-center text-[11px] font-semibold text-white hover:bg-accent-dark"
              >
                Bekijk rapport
              </Link>
            </div>
          </div>
        ))}
      </div>

      {zichtbaar.length === 0 && (
        <p className="mt-6 text-[12px] text-ink/45">
          {tab === "gearchiveerd" ? "Nog niets gearchiveerd." : tab === "favoriet" ? "Nog geen favorieten." : "Nog geen rapporten hier."}
        </p>
      )}
    </div>
  );
}
