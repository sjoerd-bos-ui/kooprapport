"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bMatchInstelling } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Instelling voor de matchfunctie (#2) op een klantdossier: aan/uit + de
// plaatsnaam waarop de Funda-feed bevraagd wordt (zie lib/data-sources/
// fundaFeed.ts). BEWUST een eigen, expliciet veld i.p.v. locatieVoorkeur uit
// de zoekopdracht hergebruiken (dat is vrije tekst, zie ZoekopdrachtForm.tsx)
// -- de feed heeft een exacte plaatsnaam nodig, geen "Rotterdam-Zuid, max 20
// min. naar centrum".
// -----------------------------------------------------------------------------
export default function MatchInstellingForm({ dossierId, huidig }: { dossierId: string; huidig: B2bMatchInstelling | undefined }) {
  const router = useRouter();
  const [actief, setActief] = useState(huidig?.actief ?? false);
  const [plaats, setPlaats] = useState(huidig?.plaats ?? "");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function opslaan(nieuweActief: boolean) {
    setBezig(true);
    setMelding(null);
    const res = await fetch(`/api/zakelijk/klanten/${dossierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchInstelling: { actief: nieuweActief, plaats } }),
    });
    const body = await res.json();
    setBezig(false);
    if (res.ok) {
      setActief(nieuweActief);
      setMelding("Opgeslagen.");
      router.refresh();
    } else {
      setMelding(body.error ?? "Opslaan is niet gelukt.");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Nieuwe matches</p>
        <button
          type="button"
          onClick={() => opslaan(!actief)}
          disabled={bezig || (!actief && !plaats.trim())}
          className={`rounded-full px-3 py-1 text-[10.5px] font-semibold transition-colors disabled:opacity-50 ${
            actief ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-ink/5 text-ink/50"
          }`}
        >
          {actief ? "Aan" : "Uit"}
        </button>
      </div>
      <p className="mt-2 text-[11.5px] text-ink/50">
        Automatisch meldingen bij nieuwe woningen op Funda die matchen met deze zoekopdracht.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={plaats}
          onChange={(e) => setPlaats(e.target.value)}
          placeholder="Plaatsnaam (bv. rotterdam)"
          className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-[12px] text-ink focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => opslaan(actief)}
          disabled={bezig || !plaats.trim()}
          className="rounded-lg bg-accent px-3.5 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {bezig ? "…" : "Opslaan"}
        </button>
      </div>
      {melding && (
        <p className={`mt-2 text-[10.5px] font-semibold ${melding === "Opgeslagen." ? "text-[#3B6D11]" : "text-rust"}`}>{melding}</p>
      )}
    </div>
  );
}
