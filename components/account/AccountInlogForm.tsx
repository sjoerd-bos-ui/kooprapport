"use client";

import { useState, type FormEvent } from "react";

// -----------------------------------------------------------------------------
// Wachtwoordloos inlogformulier voor "Mijn rapporten" (zie het Cowork-gesprek
// "zelfstandig koperportaal" / "b2c-dashboard", lib/services/consumentAuth.ts).
// Bewust altijd hetzelfde succesbericht ongeacht of dit adres al bestellingen
// heeft — zie de toelichting in app/api/account/inlog-link/route.ts.
// -----------------------------------------------------------------------------

export default function AccountInlogForm() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/account/inlog-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? "Versturen is niet gelukt. Probeer het opnieuw.");
        return;
      }
      setVerstuurd(true);
    } catch {
      setFout("Versturen is niet gelukt. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  if (verstuurd) {
    return (
      <div className="rounded-2xl bg-mist px-5 py-6 text-center">
        <p className="text-[14px] font-bold text-ink">Check je mail</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/60">
          Als {email.trim()} bestellingen heeft, ontvang je binnen een paar minuten een inloglink.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="jouw@e-mailadres.nl"
        className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-[13px] text-ink focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Stuur me een inloglink"}
      </button>
      {fout && <p className="text-[12px] font-semibold text-rust">{fout}</p>}
    </form>
  );
}
