"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bDossierType } from "@/types/b2b";

export default function NieuwKlantForm() {
  const router = useRouter();
  const [klantnaam, setKlantnaam] = useState("");
  const [type, setType] = useState<B2bDossierType>("aankoop");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleSubmit() {
    if (!klantnaam.trim()) {
      setFout("Klantnaam is verplicht.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/zakelijk/klanten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ klantnaam: klantnaam.trim(), type }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFout(body.error ?? "Aanmaken is niet gelukt.");
        setBezig(false);
        return;
      }
      setKlantnaam("");
      setBezig(false);
      router.refresh();
    } catch {
      setFout("Er ging iets mis.");
      setBezig(false);
    }
  }

  return (
    <div className="h-fit rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-[12px] font-bold text-ink">Nieuw klantdossier</p>
      <input
        value={klantnaam}
        onChange={(e) => setKlantnaam(e.target.value)}
        placeholder="Naam klant"
        className="mt-3 w-full rounded-lg border border-ink/15 px-3 py-2.5 text-[12.5px] text-ink focus:border-accent focus:outline-none"
      />
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => setType("aankoop")}
          className={`flex-1 rounded-lg px-3 py-2 text-[11.5px] font-semibold ${
            type === "aankoop" ? "bg-accent text-white" : "bg-ink/5 text-ink/60"
          }`}
        >
          Aankoop
        </button>
        <button
          type="button"
          onClick={() => setType("verkoop")}
          className={`flex-1 rounded-lg px-3 py-2 text-[11.5px] font-semibold ${
            type === "verkoop" ? "bg-accent text-white" : "bg-ink/5 text-ink/60"
          }`}
        >
          Verkoop
        </button>
      </div>
      {fout && <p className="mt-2 text-[11px] font-medium text-rust">{fout}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={bezig}
        className="mt-3 w-full rounded-lg bg-ink px-3 py-2.5 text-[11.5px] font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Dossier aanmaken"}
      </button>
    </div>
  );
}
