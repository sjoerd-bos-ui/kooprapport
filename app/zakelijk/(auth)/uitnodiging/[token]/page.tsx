"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

// -----------------------------------------------------------------------------
// Acceptatiepagina voor een teamuitnodiging (#7) -- zelfde route group
// "(auth)" als de inlogpagina, dus buiten de dashboard-auth-gate (iemand die
// dit opent is per definitie nog niet ingelogd). Het token in de URL zelf is
// de autorisatie, zie app/api/zakelijk/team/uitnodiging/[token]/route.ts.
// -----------------------------------------------------------------------------
export default function UitnodigingAccepterenPagina() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [status, setStatus] = useState<"laden" | "geldig" | "ongeldig">("laden");
  const [orgNaam, setOrgNaam] = useState("");
  const [email, setEmail] = useState("");
  const [naam, setNaam] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/zakelijk/team/uitnodiging/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus("ongeldig");
          return;
        }
        const body = await res.json();
        setOrgNaam(body.orgNaam);
        setEmail(body.email);
        setStatus("geldig");
      })
      .catch(() => setStatus("ongeldig"));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/zakelijk/team/uitnodiging/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, wachtwoord }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFout(body.error ?? "Activeren is niet gelukt.");
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

        {status === "laden" && <p className="text-[13px] text-ink/50">Uitnodiging controleren…</p>}

        {status === "ongeldig" && (
          <>
            <h1 className="font-display text-xl font-extrabold text-ink">Uitnodiging ongeldig</h1>
            <p className="mt-2 text-[12.5px] text-ink/55">
              Deze link is niet (meer) geldig -- mogelijk al gebruikt of verlopen. Vraag degene die u uitnodigde om een
              nieuwe link.
            </p>
          </>
        )}

        {status === "geldig" && (
          <>
            <h1 className="font-display text-xl font-extrabold text-ink">Account activeren</h1>
            <p className="mt-1 text-[12.5px] text-ink/55">
              Voor {orgNaam} · {email}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
                Uw naam
                <input
                  type="text"
                  required
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  className="rounded-lg border border-ink/15 px-3 py-2.5 text-[13px] font-normal text-ink focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
                Wachtwoord
                <input
                  type="password"
                  required
                  minLength={8}
                  value={wachtwoord}
                  onChange={(e) => setWachtwoord(e.target.value)}
                  className="rounded-lg border border-ink/15 px-3 py-2.5 text-[13px] font-normal text-ink focus:border-accent focus:outline-none"
                  placeholder="minstens 8 tekens"
                />
              </label>

              {fout && <p className="text-[12px] font-medium text-rust">{fout}</p>}

              <button
                type="submit"
                disabled={bezig}
                className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
              >
                {bezig ? "Bezig…" : "Account activeren"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
