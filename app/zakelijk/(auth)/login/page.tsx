"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// -----------------------------------------------------------------------------
// Inlogpagina voor "Kooprapport Zakelijk". Bewust GEEN "wachtwoord vergeten"-
// of "account aanmaken"-link: er is geen zelfregistratie (organisaties worden
// handmatig aangemaakt, zie app/api/admin/zakelijk/organisaties/route.ts) --
// wachtwoordherstel loopt voor nu via rechtstreeks contact, net als
// onboarding zelf.
// -----------------------------------------------------------------------------
export default function ZakelijkLoginPagina() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/zakelijk/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wachtwoord }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFout(body.error ?? "Inloggen is niet gelukt.");
        setBezig(false);
        return;
      }
      router.push("/zakelijk");
      router.refresh();
    } catch {
      setFout("Er ging iets mis. Probeer het opnieuw.");
      setBezig(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-overlay">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">K</span>
          <span className="text-sm font-extrabold text-ink">
            Kooprapport <span className="text-accent">Zakelijk</span>
          </span>
        </div>
        <h1 className="font-display text-xl font-extrabold text-ink">Inloggen</h1>
        <p className="mt-1 text-[12.5px] text-ink/55">Voor makelaars en hypotheekadviseurs met een zakelijk abonnement.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
            E-mailadres
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-ink/15 px-3 py-2.5 text-[13px] font-normal text-ink focus:border-accent focus:outline-none"
              placeholder="naam@kantoor.nl"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
            Wachtwoord
            <input
              type="password"
              required
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="rounded-lg border border-ink/15 px-3 py-2.5 text-[13px] font-normal text-ink focus:border-accent focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {fout && <p className="text-[12px] font-medium text-rust">{fout}</p>}

          <button
            type="submit"
            disabled={bezig}
            className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {bezig ? "Bezig…" : "Inloggen"}
          </button>
        </form>

        <p className="mt-5 text-[11.5px] text-ink/45">
          Nog geen zakelijk account? Neem contact op via{" "}
          <a href="mailto:info@kooprapport.nl" className="font-semibold text-accent underline underline-offset-2">
            info@kooprapport.nl
          </a>
          .
        </p>
      </div>
    </main>
  );
}
