"use client";

import { useState } from "react";
import type { B2bKoperVoorkeuren, B2bPrioriteit, B2bBouwstijlVoorkeur } from "@/types/b2b";
import { CheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Publieke koper-voorkeuren-vragenlijst (matching-model, zie het Cowork-
// gesprek hierover en de mockups die daar zijn goedgekeurd) -- 4 korte,
// knop-gebaseerde vragen, geen open tekstvelden. De antwoorden sturen de
// gewichten in het scoremodel (lib/services/matchScore.ts) en bepalen of
// budget/kenmerken een harde grens blijven of een zachte.
// -----------------------------------------------------------------------------

function Keuze({
  actief,
  label,
  onClick,
}: {
  actief: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
        actief ? "border-accent bg-[#EEF0FF] text-accent" : "border-ink/10 bg-mist/50 text-ink/60 hover:bg-mist"
      }`}
    >
      {label}
    </button>
  );
}

export default function KoperVoorkeurenForm({
  token,
  klantnaam,
  bestaand,
}: {
  token: string;
  klantnaam: string;
  bestaand: B2bKoperVoorkeuren | null;
}) {
  const [prioriteit, setPrioriteit] = useState<B2bPrioriteit>(bestaand?.prioriteit ?? "gelijk");
  const [bouwstijl, setBouwstijl] = useState<B2bBouwstijlVoorkeur>(bestaand?.bouwstijl ?? "geen_voorkeur");
  const [budgetFlexibel, setBudgetFlexibel] = useState<boolean>(bestaand?.budgetFlexibel ?? false);
  const [kenmerkenFlexibel, setKenmerkenFlexibel] = useState<boolean>(bestaand?.kenmerkenFlexibel ?? false);
  const [bezig, setBezig] = useState(false);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function versturen() {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/koper-voorkeuren/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prioriteit, bouwstijl, budgetFlexibel, kenmerkenFlexibel }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFout(body.error ?? "Opslaan is niet gelukt.");
        setBezig(false);
        return;
      }
      setOpgeslagen(true);
    } catch {
      setFout("Opslaan is niet gelukt. Controleer je internetverbinding en probeer het nogmaals.");
    } finally {
      setBezig(false);
    }
  }

  if (opgeslagen) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
          <CheckIcon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-[14px] font-semibold text-ink">Bedankt, je voorkeuren zijn opgeslagen.</p>
        <p className="mt-1.5 text-[12.5px] text-ink/50">We gebruiken dit meteen om de woningen voor je te rangschikken.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Voor {klantnaam}</p>
      <p className="mt-1 text-[16px] font-bold text-ink">Nog 4 korte vragen</p>
      <p className="mt-1 text-[12.5px] text-ink/50">Zo vinden we woningen die echt bij je passen. Kost je een halve minuut.</p>

      <div className="mt-5">
        <p className="text-[12.5px] font-semibold text-ink">Wat weegt het zwaarst als we moeten kiezen?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Keuze actief={prioriteit === "prijs"} label="Scherpe prijs" onClick={() => setPrioriteit("prijs")} />
          <Keuze actief={prioriteit === "kenmerken"} label="Ruimte en kenmerken" onClick={() => setPrioriteit("kenmerken")} />
          <Keuze actief={prioriteit === "gelijk"} label="Beide even belangrijk" onClick={() => setPrioriteit("gelijk")} />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12.5px] font-semibold text-ink">Nieuwbouw, modern, of juist karakter?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Keuze actief={bouwstijl === "nieuw"} label="Nieuwbouw of modern" onClick={() => setBouwstijl("nieuw")} />
          <Keuze actief={bouwstijl === "karakter"} label="Karakter, ook als het ouder is" onClick={() => setBouwstijl("karakter")} />
          <Keuze actief={bouwstijl === "geen_voorkeur"} label="Maakt me niet uit" onClick={() => setBouwstijl("geen_voorkeur")} />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12.5px] font-semibold text-ink">
          Is je maximale budget een harde grens, of zou een woning er net iets boven nog interessant kunnen zijn bij een verder perfecte match?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Keuze actief={!budgetFlexibel} label="Hard maximum, niet overheen" onClick={() => setBudgetFlexibel(false)} />
          <Keuze actief={budgetFlexibel} label="Tot een paar procent erboven bespreekbaar" onClick={() => setBudgetFlexibel(true)} />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[12.5px] font-semibold text-ink">Een woning voldoet aan bijna alles wat je zocht, maar mist net één ding.</p>
        <p className="mt-0.5 text-[11.5px] text-ink/45">Bijvoorbeeld: alles klopt, alleen heeft hij geen balkon (dat je wel had aangevinkt). Interessant?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Keuze actief={kenmerkenFlexibel} label="Ja, toon 'm alsnog" onClick={() => setKenmerkenFlexibel(true)} />
          <Keuze actief={!kenmerkenFlexibel} label="Nee, alleen complete matches" onClick={() => setKenmerkenFlexibel(false)} />
        </div>
      </div>

      {fout && <p className="mt-4 text-[12px] font-semibold text-red-600">{fout}</p>}

      <button
        type="button"
        onClick={versturen}
        disabled={bezig}
        className="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-[13px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {bezig ? "Opslaan…" : "Voorkeuren opslaan"}
      </button>
    </div>
  );
}
