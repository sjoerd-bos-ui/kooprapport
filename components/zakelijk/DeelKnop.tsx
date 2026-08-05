"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// "Deel met klant"-knop op de rapportdetailpagina (#4). Maakt/toont de
// beveiligde, niet-ingelogde link naar app/deelrapport/[token]. Bewust geen
// automatisch verzenden per e-mail vanuit hier -- kopiëren en zelf
// versturen (WhatsApp, mail, telefonisch) past beter bij hoe een makelaar nu
// al met een klant communiceert dan een nieuw, apart e-mailkanaal.
// -----------------------------------------------------------------------------
export default function DeelKnop({ rapportId, initieleDeelUrl }: { rapportId: string; initieleDeelUrl: string | null }) {
  const router = useRouter();
  const [deelUrl, setDeelUrl] = useState<string | null>(initieleDeelUrl);
  const [bezig, setBezig] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  async function maakLink() {
    setBezig(true);
    const res = await fetch(`/api/zakelijk/rapporten/${rapportId}/deel`, { method: "POST" });
    setBezig(false);
    if (res.ok) {
      const body = await res.json();
      setDeelUrl(body.deelUrl);
      router.refresh();
    }
  }

  async function kopieer() {
    if (!deelUrl) return;
    await navigator.clipboard.writeText(deelUrl);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  }

  async function intrekken() {
    setBezig(true);
    await fetch(`/api/zakelijk/rapporten/${rapportId}/deel`, { method: "DELETE" });
    setDeelUrl(null);
    setBezig(false);
    router.refresh();
  }

  if (deelUrl) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="max-w-[260px] truncate rounded-lg bg-mist px-3 py-2 text-[11px] text-ink/70">{deelUrl}</span>
        <button type="button" onClick={kopieer} className="rounded-lg bg-accent px-3.5 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark">
          {gekopieerd ? "Gekopieerd!" : "Kopieer link"}
        </button>
        <button type="button" onClick={intrekken} disabled={bezig} className="text-[11px] font-semibold text-ink/45 hover:text-rust">
          Link intrekken
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={maakLink}
      disabled={bezig}
      className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[11.5px] font-semibold text-ink shadow-sm hover:bg-mist disabled:opacity-60"
    >
      <LinkIcon className="h-3.5 w-3.5" />
      {bezig ? "Bezig…" : "Deel met klant"}
    </button>
  );
}
