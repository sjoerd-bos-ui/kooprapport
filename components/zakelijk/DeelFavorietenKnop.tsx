"use client";

import { useState } from "react";
import { LinkIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// "Deel deze vergelijking"-knop boven de favorieten-vergelijktabel -- zelfde
// patroon als DeelKnop.tsx (rapporten): maakt/toont de beveiligde,
// niet-ingelogde link naar app/deelfavorieten/[token]. Geen router.refresh()
// nodig zoals bij DeelKnop.tsx, want deze knop staat niet naast andere
// server-gerenderde deelstatus-UI die zou kunnen verouderen.
// -----------------------------------------------------------------------------
export default function DeelFavorietenKnop({ dossierId, initieleDeelUrl }: { dossierId: string; initieleDeelUrl: string | null }) {
  const [deelUrl, setDeelUrl] = useState<string | null>(initieleDeelUrl);
  const [bezig, setBezig] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  async function delen() {
    setBezig(true);
    try {
      let url = deelUrl;
      if (!url) {
        const res = await fetch(`/api/zakelijk/klanten/${dossierId}/favorieten-deel`, { method: "POST" });
        if (!res.ok) throw new Error("mislukt");
        const body = await res.json();
        url = body.deelUrl;
        setDeelUrl(url);
      }
      if (url) {
        await navigator.clipboard.writeText(url);
        setGekopieerd(true);
        setTimeout(() => setGekopieerd(false), 2000);
      }
    } catch {
      alert("De deel-link kon nu niet worden aangemaakt. Probeer het straks opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <button
      type="button"
      onClick={delen}
      disabled={bezig}
      className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[11.5px] font-semibold text-ink shadow-sm hover:bg-mist disabled:opacity-60"
    >
      <LinkIcon className="h-3.5 w-3.5" />
      {bezig ? "Bezig…" : gekopieerd ? "Link gekopieerd!" : "Deel deze vergelijking"}
    </button>
  );
}
