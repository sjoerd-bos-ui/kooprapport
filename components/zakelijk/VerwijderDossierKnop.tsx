"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Klantdossier verwijderen (#3) -- twee klikken i.p.v. een browser-confirm()
// (past niet bij de rest van de zakelijke UI, zie ook de toelichting bij
// verwijderKlantdossier in b2bStore.ts: rapportdata zelf blijft altijd
// bewaard, alleen het dossier verdwijnt).
// -----------------------------------------------------------------------------
export default function VerwijderDossierKnop({ dossierId }: { dossierId: string }) {
  const router = useRouter();
  const [bevestigen, setBevestigen] = useState(false);
  const [bezig, setBezig] = useState(false);

  async function verwijderen() {
    setBezig(true);
    await fetch(`/api/zakelijk/klanten/${dossierId}`, { method: "DELETE" });
    router.push("/zakelijk/klanten");
    router.refresh();
  }

  if (!bevestigen) {
    return (
      <button
        type="button"
        onClick={() => setBevestigen(true)}
        className="rounded-lg px-3.5 py-2 text-[11.5px] font-semibold text-ink/40 hover:bg-[#FBEAE0] hover:text-rust"
      >
        Verwijderen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10.5px] font-semibold text-ink/50">Zeker weten?</span>
      <button
        type="button"
        onClick={verwijderen}
        disabled={bezig}
        className="rounded-lg bg-rust px-3 py-2 text-[11px] font-semibold text-white hover:bg-rust/90 disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Ja, verwijderen"}
      </button>
      <button
        type="button"
        onClick={() => setBevestigen(false)}
        disabled={bezig}
        className="rounded-lg bg-ink/5 px-3 py-2 text-[11px] font-semibold text-ink/60 hover:bg-ink/10"
      >
        Annuleren
      </button>
    </div>
  );
}
