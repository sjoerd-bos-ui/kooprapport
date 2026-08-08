"use client";

import { useState } from "react";
import type { B2bKoperVoorkeuren } from "@/types/b2b";
import VoorkeurenVragenlijst from "@/components/zakelijk/VoorkeurenVragenlijst";
import { CheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Publieke koper-voorkeuren-vragenlijst (matching-model v2, zie het Cowork-
// gesprek "matchingsproces onder de loep"): dezelfde volledige 13-vragen/
// 7-stappen-wizard als in het dashboard (VoorkeurenVragenlijst.tsx,
// hergebruikt door ZoekopdrachtForm.tsx) -- deze wrapper regelt alleen de
// publieke pagina-styling en het versturen naar de token-route.
// -----------------------------------------------------------------------------

export default function KoperVoorkeurenForm({
  token,
  klantnaam,
  bestaand,
}: {
  token: string;
  klantnaam: string;
  bestaand: B2bKoperVoorkeuren | null;
}) {
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function versturen(waarde: B2bKoperVoorkeuren) {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/koper-voorkeuren/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(waarde),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFout(body.error ?? "Opslaan is niet gelukt.");
        setBezig(false);
        return;
      }
      setOpgeslagen(true);
    } catch {
      setFout("Opslaan is niet gelukt. Controleer je internetverbinding en probeer het nogmaals.");
    } finally {
      setBezig(false);
    }
  }

  if (opgeslagen) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
          <CheckIcon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-[14px] font-semibold text-ink">Bedankt, je voorkeuren zijn opgeslagen.</p>
        <p className="mt-1.5 text-[12.5px] text-ink/50">We gebruiken dit meteen om woningen voor je te zoeken en te rangschikken.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Voor {klantnaam}</p>
      <p className="mt-1 text-[16px] font-bold text-ink">Jouw zoekvoorkeuren</p>
      <p className="mt-1 text-[12.5px] text-ink/50">Zo vinden we woningen die echt bij je passen. Een paar minuten werk.</p>

      <div className="mt-5">
        <VoorkeurenVragenlijst bestaand={bestaand} onOpslaan={versturen} bezig={bezig} opslaanLabel="Voorkeuren opslaan" />
      </div>

      {fout && <p className="mt-4 text-[12px] font-semibold text-red-600">{fout}</p>}
    </div>
  );
}
