"use client";

import { useEffect, useState } from "react";

// -----------------------------------------------------------------------------
// "Bewaar dit rapport in uw mail" onder de ontgrendel-knop in PreviewSummary.
//
// Bewuste keuze (zie gesprek in Cowork over deze feature): dit mag NOOIT
// visueel concurreren met de ontgrendel-knop hierboven. Daarom start dit
// element altijd rustig/grijs, en wordt het pas na TWIJFEL_DELAY_MS zonder
// klik/scroll/toetsaanslag iets nadrukkelijker (mist-achtergrond, accent-
// gekleurde tekst) — het idee is dat het dan alleen concurreert op het
// moment dat de koop toch al niet ging gebeuren, niet vanaf de eerste
// seconde naast de knop.
//
// "twijfelt" wordt bewust nooit teruggezet zodra hij eenmaal true is —
// anders flikkert de styling weer terug naar rustig op het moment dat
// iemand er juist op klikt.
// -----------------------------------------------------------------------------

const TWIJFEL_DELAY_MS = 30_000;

export default function EmailBewaarOptie({ adresLabel }: { adresLabel: string }) {
  const [twijfelt, setTwijfelt] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "versturen" | "verstuurd" | "fout">("idle");

  // BUGFIX: de eerdere versie gebruikte setTimeout(..., 30000) dat bij elke
  // klik/scroll opnieuw werd gestart. Browsers vertragen (throttlen)
  // timers in tabbladen die niet actief in beeld zijn -- en iemand die
  // twijfelt over een aankoop wisselt juist vaak even naar een ander
  // tabblad. Daardoor kwam de 30 seconden in de praktijk nooit (op tijd)
  // binnen. Fix: bijhouden WANNEER het laatste teken van leven was
  // (Date.now()) en elke seconde het werkelijke verstreken verschil
  // checken -- ook als die check zelf vertraagd wordt uitgevoerd, is de
  // Date.now()-berekening zodra hij wél draait alsnog correct.
  useEffect(() => {
    const laatsteActiviteit = { current: Date.now() };
    const markeerActiviteit = () => {
      if (twijfelt) return;
      laatsteActiviteit.current = Date.now();
    };
    window.addEventListener("scroll", markeerActiviteit, { passive: true });
    window.addEventListener("click", markeerActiviteit);
    window.addEventListener("keydown", markeerActiviteit);
    const interval = setInterval(() => {
      if (Date.now() - laatsteActiviteit.current >= TWIJFEL_DELAY_MS) {
        setTwijfelt(true);
      }
    }, 1000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", markeerActiviteit);
      window.removeEventListener("click", markeerActiviteit);
      window.removeEventListener("keydown", markeerActiviteit);
    };
  }, [twijfelt]);

  async function handleVerstuur() {
    if (!email || status === "versturen") return;
    setStatus("versturen");
    try {
      const res = await fetch("/api/rapport/preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adresLabel,
          previewPath: window.location.pathname + window.location.search,
          email,
        }),
      });
      if (!res.ok) throw new Error("verzenden mislukt");
      setStatus("verstuurd");
    } catch {
      setStatus("fout");
    }
  }

  if (status === "verstuurd") {
    return (
      <p className="mt-2 text-center text-[11.5px] font-semibold text-accent-dark">
        Verstuurd — check uw mail voor {adresLabel}.
      </p>
    );
  }

  return (
    <div
      className="mt-2 rounded-lg p-2 text-center transition-colors duration-500"
      style={{ backgroundColor: twijfelt ? "#EEF0FF" : "transparent" }}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`text-[11.5px] transition-colors duration-500 ${
            twijfelt ? "font-semibold text-accent-dark" : "font-normal text-ink/40"
          }`}
        >
          {twijfelt ? "Bewaar dit rapport in uw mail" : "Liever eerst bewaren? Stuur naar mijn e-mail"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="naam@voorbeeld.nl"
            className="min-w-[190px] rounded-md border border-ink/15 px-2.5 py-1.5 text-[12.5px] text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleVerstuur}
            disabled={status === "versturen"}
            className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {status === "versturen" ? "Versturen…" : "Versturen"}
          </button>
        </div>
      )}
      {status === "fout" && (
        <p className="mt-1.5 text-[11px] text-red-600">Dat ging niet goed. Probeer het nog eens.</p>
      )}
    </div>
  );
}
