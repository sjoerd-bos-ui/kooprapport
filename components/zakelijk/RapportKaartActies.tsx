"use client";

import { useState } from "react";
import type { Report } from "@/types/report";
import { DownloadIcon, LinkIcon, CheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Compacte icoonknoppen op de rapportkaart in de Rapporten-tab van het
// klantdossier (zie het Cowork-gesprek "Vergelijkings tool veel mooier maken
// en beter" / de daaropvolgende terugkoppeling op de rapportkaart-mockup):
// download en delen bestonden allebei al elders in de app (ReportView.tsx
// resp. DeelKnop.tsx) -- dit component hergebruikt exact dezelfde routes,
// alleen in een kleinere, icoon-only vorm die naast "Bekijk rapport" past.
// Bewust GEEN <a>/<Link> rondom de hele kaart meer op deze plek (zie
// page.tsx): een <button> mag niet genest zitten in een <Link>, dus deze
// acties moeten als aparte, niet-navigerende elementen naast de kaart-link
// staan.
// -----------------------------------------------------------------------------
export default function RapportKaartActies({
  rapportId,
  report,
  slug,
  initieleDeelUrl,
}: {
  rapportId: string;
  report: Report;
  slug: string;
  initieleDeelUrl: string | null;
}) {
  const [downloadBezig, setDownloadBezig] = useState(false);
  const [deelUrl, setDeelUrl] = useState<string | null>(initieleDeelUrl);
  const [deelBezig, setDeelBezig] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  // Zelfde patroon als handleDownloadPdf in ReportView.tsx: het al opgehaalde
  // Report-object gaat rechtstreeks mee in de body -- geen nieuwe Altum-
  // aanroep, geen risico op andere cijfers dan wat op de rapportpagina zelf
  // te zien is.
  async function downloaden(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDownloadBezig(true);
    try {
      const res = await fetch("/api/rapport/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!res.ok) throw new Error("mislukt");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kooprapport-${slug}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("De PDF kon nu niet worden gemaakt. Probeer het straks opnieuw.");
    } finally {
      setDownloadBezig(false);
    }
  }

  // Zelfde route als DeelKnop.tsx (POST maakt 'm aan, of geeft de al
  // bestaande deelUrl terug als er al een token is -- zie
  // app/api/zakelijk/rapporten/[id]/deel/route.ts) -- hier direct gevolgd
  // door kopiëren naar het klembord, i.p.v. eerst de link te tonen: in deze
  // compacte kaartcontext is "in één klik klaar om te plakken" nuttiger dan
  // de uitgebreide kopieer/intrekken-UI die op de rapportpagina zelf wel
  // ruimte heeft.
  async function delen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeelBezig(true);
    try {
      let url = deelUrl;
      if (!url) {
        const res = await fetch(`/api/zakelijk/rapporten/${rapportId}/deel`, { method: "POST" });
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
      setDeelBezig(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={downloaden}
        disabled={downloadBezig}
        aria-label="Download PDF"
        title="Download PDF"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/40 hover:bg-mist hover:text-ink/60 disabled:opacity-50"
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={delen}
        disabled={deelBezig}
        aria-label={gekopieerd ? "Link gekopieerd" : "Kopieer deel-link"}
        title={gekopieerd ? "Link gekopieerd!" : "Kopieer deel-link"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/40 hover:bg-mist hover:text-ink/60 disabled:opacity-50"
      >
        {gekopieerd ? <CheckIcon className="h-4 w-4 text-[#3B6D11]" /> : <LinkIcon className="h-4 w-4" />}
      </button>
    </>
  );
}
