"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { B2bLocatie } from "@/types/b2b";
import { fetchLiveLocatieSuggesties, zoekLocatieFallback } from "@/lib/services/plaatsLookup";
import { MapPinIcon, CheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Locatie-invoer voor de zoekopdracht (#3): plaatsen ÉN wijken, met live
// suggesties tijdens typen -- zelfde debounce/dropdown/toetsenbord-patroon als
// AddressSearchBar.tsx, maar dan als gewoon controlled formulierveld i.p.v.
// een navigerende zoekbalk. Getypte tekst wordt NOOIT zelf opgeslagen: alleen
// een expliciet gekozen suggestie (klik of Enter-op-gemarkeerd) telt, want dat
// is precies wat B2bLocatie bruikbaar maakt als Funda-zoekslug.
// -----------------------------------------------------------------------------
export default function LocatieAutocomplete({
  waarde,
  onKiezen,
}: {
  waarde: B2bLocatie | null;
  onKiezen: (locatie: B2bLocatie | null) => void;
}) {
  const [query, setQuery] = useState(waarde?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [suggesties, setSuggesties] = useState<B2bLocatie[]>([]);
  const [status, setStatus] = useState<{ kind: "loading" | "fallback"; message: string } | null>(null);
  const requestSeq = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const seq = ++requestSeq.current;
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed === waarde?.label) {
      setSuggesties([]);
      setStatus(null);
      return;
    }
    setStatus({ kind: "loading", message: "Zoeken…" });
    debounceTimer.current = setTimeout(async () => {
      try {
        const live = await fetchLiveLocatieSuggesties(trimmed);
        if (seq !== requestSeq.current) return;
        setSuggesties(live);
        setStatus(live.length === 0 ? { kind: "fallback", message: "Geen suggesties gevonden." } : null);
      } catch {
        if (seq !== requestSeq.current) return;
        setSuggesties(zoekLocatieFallback(trimmed));
        setStatus({ kind: "fallback", message: "Live locatiezoekdienst niet bereikbaar. Beperkte resultaten." });
      }
    }, 250);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, waarde?.label]);

  function kies(locatie: B2bLocatie) {
    requestSeq.current++;
    onKiezen(locatie);
    setQuery(locatie.label);
    setOpen(false);
    setSuggesties([]);
    setStatus(null);
  }

  function wis() {
    requestSeq.current++;
    onKiezen(null);
    setQuery("");
    setOpen(false);
    setSuggesties([]);
    setStatus(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, suggesties.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && suggesties[highlightIndex]) {
        e.preventDefault();
        kies(suggesties[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  const gekozen = Boolean(waarde && query === waarde.label);

  return (
    <div className="relative">
      <div
        className={`flex items-center rounded-xl border transition-colors ${
          gekozen ? "border-accent/40 bg-[#EEF0FF]/60" : "border-ink/15 bg-white focus-within:border-accent"
        }`}
      >
        <span className={`pointer-events-none pl-3.5 ${gekozen ? "text-accent" : "text-ink/35"}`}>
          <MapPinIcon className="h-4 w-4" />
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Typ een plaats of wijk (bv. Rotterdam of Kralingen)"
          className="w-full bg-transparent py-3 pl-2.5 pr-2 text-[13px] font-medium text-ink placeholder:font-normal placeholder:text-ink/35 focus:outline-none"
        />
        {gekozen && (
          <>
            <CheckIcon className="mr-1 h-3.5 w-3.5 shrink-0 text-accent" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={wis}
              aria-label="Locatie wissen"
              className="mr-2.5 shrink-0 rounded-full px-1.5 py-0.5 text-[13px] leading-none text-ink/30 hover:bg-ink/5 hover:text-ink/60"
            >
              ✕
            </button>
          </>
        )}
      </div>
      {open && suggesties.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-ink/10 bg-white shadow-overlay">
          {suggesties.map((s, i) => (
            <li key={`${s.plaatsSlug}/${s.wijkSlug ?? ""}`}>
              <button
                type="button"
                onMouseDown={() => kies(s)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] text-ink transition-colors ${
                  i === highlightIndex ? "bg-[#EEF0FF]" : "hover:bg-[#EEF0FF]/60"
                }`}
              >
                <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-ink/30" />
                <span className="flex-1 font-medium">{s.label}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold ${
                    s.wijkSlug ? "bg-[#EEF0FF] text-accent" : "bg-ink/5 text-ink/45"
                  }`}
                >
                  {s.wijkSlug ? "Wijk" : "Plaats"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && (
        <p className={`mt-1.5 text-[10.5px] ${status.kind === "fallback" ? "text-rust" : "text-ink/40"}`}>{status.message}</p>
      )}
    </div>
  );
}
