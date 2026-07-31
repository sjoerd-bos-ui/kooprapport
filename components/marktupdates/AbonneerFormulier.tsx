"use client";

import { useState, type FormEvent } from "react";

// -----------------------------------------------------------------------------
// Aanmeldformulier voor de Marktupdates-nieuwsbrief. Zelfde component, twee
// varianten via de variant-prop: "compact" bovenaan de hub-pagina, "groot"
// onderaan een losse update — zie de visualize-afstemming hierover. Roept
// /api/marktupdates/abonneren aan, dat zelf een dubbele-opt-in-
// bevestigingsmail verstuurt (zie lib/services/marktupdateAbonnees.ts).
// -----------------------------------------------------------------------------

type Status = "idle" | "bezig" | "gelukt" | "fout";

export default function AbonneerFormulier({ variant = "groot" }: { variant?: "compact" | "groot" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setStatus("bezig");
    setFoutmelding(null);
    try {
      const res = await fetch("/api/marktupdates/abonneren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFoutmelding(data.error ?? "Aanmelden is niet gelukt. Probeer het later opnieuw.");
        setStatus("fout");
        return;
      }
      setStatus("gelukt");
    } catch {
      setFoutmelding("Aanmelden is niet gelukt. Probeer het later opnieuw.");
      setStatus("fout");
    }
  }

  if (status === "gelukt") {
    return (
      <p className={variant === "compact" ? "text-xs font-semibold text-accent" : "text-sm font-semibold text-accent"}>
        Bijna klaar: check uw inbox en bevestig uw aanmelding via de link in de e-mail.
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <div>
        <form onSubmit={versturen} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="naam@voorbeeld.nl"
            className="h-9 w-40 rounded-[10px] border border-ink/10 bg-white px-3 text-xs text-ink placeholder:text-ink/35 focus:border-accent focus:outline-none sm:w-52"
          />
          <button
            type="submit"
            disabled={status === "bezig"}
            className="h-9 shrink-0 rounded-[10px] bg-accent px-3.5 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {status === "bezig" ? "Bezig..." : "Aanmelden"}
          </button>
        </form>
        {foutmelding && <p className="mt-1.5 text-xs text-[#B7302B]">{foutmelding}</p>}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={versturen} className="mt-4 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@voorbeeld.nl"
          className="h-10 flex-1 rounded-[10px] border border-ink/10 bg-white px-3.5 text-sm text-ink placeholder:text-ink/35 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "bezig"}
          className="h-10 shrink-0 rounded-[10px] bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          {status === "bezig" ? "Bezig..." : "Aanmelden"}
        </button>
      </form>
      {foutmelding && <p className="mt-2 text-xs text-[#B7302B]">{foutmelding}</p>}
      <p className="mt-2 text-[10.5px] text-ink/40">
        Door u aan te melden gaat u akkoord met onze{" "}
        <a href="/privacy" className="underline underline-offset-2">
          privacyverklaring
        </a>
        . Geen spam, u kunt zich altijd afmelden.
      </p>
    </div>
  );
}
