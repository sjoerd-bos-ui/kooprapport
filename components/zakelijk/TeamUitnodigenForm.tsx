"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function TeamUitnodigenForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<"lid" | "eigenaar">("lid");
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ tekst: string; fout: boolean } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    setMelding(null);
    const res = await fetch("/api/zakelijk/team/uitnodigen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, rol }),
    });
    const body = await res.json().catch(() => null);
    setBezig(false);
    if (res.ok) {
      setMelding({ tekst: `Uitnodiging verstuurd naar ${email}.`, fout: false });
      setEmail("");
      router.refresh();
    } else {
      setMelding({ tekst: body?.error ?? "Uitnodigen is niet gelukt.", fout: true });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2.5">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="naam@kantoor.nl"
        className="w-56 rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
      />
      <select
        value={rol}
        onChange={(e) => setRol(e.target.value as "lid" | "eigenaar")}
        className="rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent"
      >
        <option value="lid">Lid</option>
        <option value="eigenaar">Eigenaar</option>
      </select>
      <button
        type="submit"
        disabled={bezig}
        className="rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {bezig ? "Versturen…" : "Teamlid uitnodigen"}
      </button>
      {melding && <span className={`text-[11.5px] ${melding.fout ? "text-rust" : "text-ink/50"}`}>{melding.tekst}</span>}
    </form>
  );
}
