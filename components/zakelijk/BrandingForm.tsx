"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bBranding } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Eigen huisstijl voor alles wat een EINDKLANT te zien krijgt via een
// gedeelde rapportlink (app/deelrapport/[token]) -- zie types/b2b.ts
// (B2bBranding) voor waarom dit alleen daar wordt toegepast en niet overal
// in het interne dashboard. Geen file-upload: logo is een geplakte,
// bestaande URL (zelfde aanpak als het widget-/badge-onderdeel hieronder op
// deze pagina).
// -----------------------------------------------------------------------------
export default function BrandingForm({ huidig }: { huidig: B2bBranding | undefined }) {
  const router = useRouter();
  const [weergaveNaam, setWeergaveNaam] = useState(huidig?.weergaveNaam ?? "");
  const [logoUrl, setLogoUrl] = useState(huidig?.logoUrl ?? "");
  const [accentKleur, setAccentKleur] = useState(huidig?.accentKleur ?? "#4F46E5");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function opslaan() {
    setBezig(true);
    setMelding(null);
    const res = await fetch("/api/zakelijk/instellingen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branding: { weergaveNaam, logoUrl, accentKleur } }),
    });
    setBezig(false);
    if (res.ok) {
      setMelding("Opgeslagen.");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setMelding(body?.error ?? "Opslaan is niet gelukt.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-ink/35">Naam op gedeeld rapport</label>
        <input
          type="text"
          value={weergaveNaam}
          onChange={(e) => setWeergaveNaam(e.target.value)}
          placeholder="bv. Jansen Makelaars"
          className="mt-1.5 w-full rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wide text-ink/35">Logo-URL</label>
        <input
          type="text"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…/logo.png"
          className="mt-1.5 w-full rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-[10px] font-bold uppercase tracking-wide text-ink/35">Accentkleur</label>
        <div className="mt-1.5 flex items-center gap-2.5">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(accentKleur) ? accentKleur : "#4F46E5"}
            onChange={(e) => setAccentKleur(e.target.value)}
            className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-ink/10 bg-transparent"
          />
          <input
            type="text"
            value={accentKleur}
            onChange={(e) => setAccentKleur(e.target.value)}
            className="w-32 rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {bezig ? "Opslaan…" : "Huisstijl opslaan"}
        </button>
        {melding && <span className="text-[11.5px] text-ink/50">{melding}</span>}
      </div>
      <p className="text-[10.5px] text-ink/40 sm:col-span-2">
        Wordt alleen gebruikt op de rapportlink die u met uw klant deelt (zie "Delen" bij een rapport) -- uw eigen
        dashboard blijft altijd Kooprapport-gebrand.
      </p>
    </div>
  );
}
