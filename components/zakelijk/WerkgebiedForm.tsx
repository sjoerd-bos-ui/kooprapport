"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Laat een makelaar kiezen op welke regio's de "Marktmelding" op het
// dashboard zich richt (zie lib/services/marktAlert.ts). Bewust alleen
// regionamen die ooit ECHT in een Marktupdate zijn gebruikt (meegegeven via
// alleRegioNamen, zie alleGebruikteRegioNamen() in marktAlert.ts) -- nooit
// een los tekstveld, want dan zou een makelaar een naam kunnen intypen die
// nooit ergens tegen matcht.
// -----------------------------------------------------------------------------
export default function WerkgebiedForm({ alleRegioNamen, huidig }: { alleRegioNamen: string[]; huidig: string[] }) {
  const router = useRouter();
  const [geselecteerd, setGeselecteerd] = useState<string[]>(huidig);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  function toggle(naam: string) {
    setGeselecteerd((huidige) => (huidige.includes(naam) ? huidige.filter((n) => n !== naam) : [...huidige, naam]));
  }

  async function opslaan() {
    setBezig(true);
    setMelding(null);
    const res = await fetch("/api/zakelijk/instellingen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ werkgebiedRegios: geselecteerd }),
    });
    setBezig(false);
    if (res.ok) {
      setMelding("Opgeslagen.");
      router.refresh();
    } else {
      setMelding("Opslaan is niet gelukt, probeer het opnieuw.");
    }
  }

  return (
    <div>
      <p className="mb-2.5 text-[11px] text-ink/45">
        Klik op één of meer regio&apos;s om te selecteren (nogmaals klikken om te deselecteren), klik daarna op
        &quot;Werkgebied opslaan&quot;.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {alleRegioNamen.map((naam) => {
          const actief = geselecteerd.includes(naam);
          return (
            <button
              key={naam}
              type="button"
              onClick={() => toggle(naam)}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
                actief ? "bg-accent text-white" : "bg-parchment text-ink/60 hover:bg-mist"
              }`}
            >
              {naam}
            </button>
          );
        })}
      </div>
      <div className="mt-3.5 flex items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {bezig ? "Opslaan…" : "Werkgebied opslaan"}
        </button>
        {melding && (
          <span className={`text-[11.5px] font-semibold ${melding.startsWith("Opgeslagen") ? "text-[#3B6D11]" : "text-rust"}`}>
            {melding.startsWith("Opgeslagen") ? "✓ " : ""}
            {melding} {geselecteerd.length > 0 && melding.startsWith("Opgeslagen") ? `(${geselecteerd.join(", ")})` : ""}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-[10.5px] text-ink/40">
        Niets geselecteerd? Dan ziet u marktmeldingen voor alle regio&apos;s uit de nieuwste Marktupdate, zoals nu.
        Deze lijst groeit elk kwartaal mee met de regio&apos;s die in de nieuwste Marktupdate genoemd worden.
      </p>
    </div>
  );
}
