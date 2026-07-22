"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { AddressMeta } from "@/types/report";
import { searchAddressSuggestions, fetchLiveAddressSuggestions } from "@/lib/services/addressLookup";
import { buildReportHref } from "@/lib/utils/slug";

// Deze zoekbalk matcht NOOIT zelf vrije tekst tegen de adresregistratie —
// getypte tekst bepaalt alleen welke suggesties getoond worden. De enige
// manier om verder te gaan is een suggestie EXPLICIET kiezen (muisklik, of
// pijltjestoetsen + Enter op een gemarkeerde suggestie): dat is de bevestigde
// adreskeuze, en die gekozen suggestie — een compleet AddressMeta uit de
// adresregistratie — is daarna letterlijk de bron voor het hele rapport. Er
// wordt niets opnieuw uit de getypte tekst geparsed of geraden.
//
// Suggesties komen live uit de PDOK Locatieserver (alle adressen in
// Nederland), gedebounced. Als die niet bereikbaar is (geen netwerk, CORS),
// valt dit terug op de kleine lokale MOCK_ADDRESSES-set via
// searchAddressSuggestions() — met een zichtbare melding, nooit stil niets.
export default function AddressSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressMeta[]>([]);
  const [status, setStatus] = useState<{ kind: "loading" | "fallback"; message: string } | null>(null);
  const requestSeq = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const seq = ++requestSeq.current;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setStatus(null);
      return;
    }
    setStatus({ kind: "loading", message: "Zoeken in de adresregistratie…" });
    debounceTimer.current = setTimeout(async () => {
      try {
        const live = await fetchLiveAddressSuggestions(trimmed);
        if (seq !== requestSeq.current) return; // verouderd antwoord, negeren
        setSuggestions(live);
        setStatus(null);
      } catch {
        if (seq !== requestSeq.current) return;
        setSuggestions(searchAddressSuggestions(trimmed));
        setStatus({ kind: "fallback", message: "Live adresregistratie niet bereikbaar. Resultaten uit lokale demoset." });
      }
    }, 250);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  function chooseSuggestion(addr: AddressMeta) {
    requestSeq.current++; // navigatie is definitief, negeer nog lopende suggestieverzoeken
    router.push(buildReportHref(addr));
  }

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    setAttemptedSubmit(false);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Alleen Enter met een gemarkeerde suggestie telt als een expliciete
      // keuze (net als een muisklik). Enter zonder markering laat het
      // formulier gewoon submitten — handleSubmit toont dan de hint om
      // eerst een suggestie te kiezen, in plaats van iets te gokken.
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        e.preventDefault();
        chooseSuggestion(suggestions[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Zonder muisklik of Enter-op-een-gemarkeerde-suggestie is er nooit een
    // bevestigde keuze — de knop/Enter kan dus nooit zelf iets matchen.
    setAttemptedSubmit(true);
    setOpen(suggestions.length > 0);
  }

  let hint: { title: string; body: string } | null = null;
  if (attemptedSubmit) {
    if (query.trim().length === 0) {
      hint = { title: "Vul eerst een adres in", body: "Typ een postcode, straat of plaats om suggesties te zien." };
    } else if (suggestions.length === 0) {
      hint = {
        title: "Geen suggesties gevonden",
        body: "Controleer de spelling, of typ een postcode (bv. 1015CJ) of plaatsnaam.",
      };
    } else {
      hint = {
        title: "Kies eerst een adres uit de suggesties",
        body: "Er wordt geen adres geraden op basis van vrije tekst. Klik een suggestie hierboven aan, of gebruik de pijltjestoetsen + Enter.",
      };
    }
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} className="relative">
        {/* BUGFIX (merkconsistentie, audit): stond hier bewust op amber
            (#D97706) i.p.v. de indigo accentkleur van de rest van de site —
            de redenering destijds was dat één indigo-tint door de hele
            pagina geen enkele knop meer als hoofdactie zou laten opvallen.
            In de praktijk zorgde dat er juist voor dat de belangrijkste knop
            op de hele site (de eerste actie die iemand neemt) merkbaar
            afweek van elke andere CTA (Button.tsx, PaywallModal) — precies
            de knop die het meest met Kooprapport geassocieerd zou moeten
            worden, oogde daardoor los van de rest. Nu dezelfde accent/
            accent-dark-tokens als overal elders. */}
        <div className="flex items-stretch overflow-hidden rounded-xl bg-white shadow-overlay">
          <span className="flex items-center pl-4 text-ink/30" aria-hidden>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Typ een postcode, straat of plaats"
            // BUGFIX (mobiel): een flex-item met alleen "flex-1" krijgt van
            // de browser standaard nog "min-width: auto" mee, wat voor een
            // <input> neerkomt op een ingebouwde minimumbreedte die niet
            // krimpt — op smalle schermen duwde dat de knop ernaast (die
            // door "whitespace-nowrap" ook niet kan krimpen) letterlijk
            // buiten het scherm. min-w-0 laat het invoerveld wél volledig
            // meekrimpen, zodat de hele balk binnen de viewport blijft.
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[15px] text-ink placeholder:text-ink/35 focus:outline-none"
          />
          <button
            type="submit"
            className="whitespace-nowrap bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Bekijk rapport
          </button>
        </div>
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-ink/10 bg-white shadow-overlay">
            {suggestions.map((addr, i) => (
              <li key={addr.slug}>
                <button
                  type="button"
                  onMouseDown={() => chooseSuggestion(addr)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`block w-full px-5 py-3 text-left text-sm text-ink transition-colors ${
                    i === highlightIndex ? "bg-[#EEF0FF]" : "hover:bg-[#EEF0FF]/60"
                  }`}
                >
                  <span className="font-medium">
                    {addr.straat} {addr.huisnummer}
                    {addr.huisletter ?? ""}
                    {addr.toevoeging ? `-${addr.toevoeging}` : ""}
                  </span>
                  <span className="text-ink/45">
                    {" "}
                    · {addr.postcode} {addr.plaats}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {status && (
        <p className={`mt-2.5 text-xs ${status.kind === "fallback" ? "text-rust" : "text-ink/40"}`}>
          {status.message}
        </p>
      )}

      {hint && (
        <div className="mt-4 rounded-xl border border-ink/10 bg-white p-5 text-sm shadow-overlay">
          <p className="font-medium text-ink">{hint.title}</p>
          <p className="mt-1 text-ink/55">{hint.body}</p>
        </div>
      )}
    </div>
  );
}
