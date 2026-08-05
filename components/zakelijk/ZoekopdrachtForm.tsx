"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bZoekopdracht } from "@/types/b2b";

function euro(bedrag: number | null): string {
  if (bedrag == null) return "";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

// -----------------------------------------------------------------------------
// Essentiële zoekopdracht-info op een klantdossier (#3) -- budget, gewenste
// locatie en "moet-hebben"-eisen. Bewust een compact, direct-bewerkbaar blok
// i.p.v. een apart modaal scherm: dit is precies het soort info dat een
// makelaar tijdens een telefoongesprek met de klant meteen wil kunnen
// bijwerken.
// -----------------------------------------------------------------------------
export default function ZoekopdrachtForm({ dossierId, huidig }: { dossierId: string; huidig: B2bZoekopdracht | undefined }) {
  const router = useRouter();
  const [bewerken, setBewerken] = useState(false);
  const [budgetMin, setBudgetMin] = useState(huidig?.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(huidig?.budgetMax?.toString() ?? "");
  const [locatieVoorkeur, setLocatieVoorkeur] = useState(huidig?.locatieVoorkeur ?? "");
  const [moetHebben, setMoetHebben] = useState(huidig?.moetHebben ?? "");
  const [bezig, setBezig] = useState(false);

  const heeftData = huidig && (huidig.budgetMin || huidig.budgetMax || huidig.locatieVoorkeur || huidig.moetHebben);

  async function opslaan() {
    setBezig(true);
    await fetch(`/api/zakelijk/klanten/${dossierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zoekopdracht: {
          budgetMin: budgetMin ? Number(budgetMin) : null,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          locatieVoorkeur: locatieVoorkeur || null,
          moetHebben: moetHebben || null,
        },
      }),
    });
    setBezig(false);
    setBewerken(false);
    router.refresh();
  }

  if (!bewerken) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Zoekopdracht</p>
          <button type="button" onClick={() => setBewerken(true)} className="text-[10.5px] font-semibold text-accent hover:underline">
            {heeftData ? "Bewerken" : "+ Toevoegen"}
          </button>
        </div>
        {heeftData ? (
          <div className="mt-2.5 flex flex-col gap-1.5">
            {(huidig?.budgetMin || huidig?.budgetMax) && (
              <p className="text-[11.5px] text-ink/70">
                <span className="font-semibold text-ink">Budget:</span>{" "}
                {huidig?.budgetMin ? euro(huidig.budgetMin) : "€0"} – {huidig?.budgetMax ? euro(huidig.budgetMax) : "onbekend"}
              </p>
            )}
            {huidig?.locatieVoorkeur && (
              <p className="text-[11.5px] text-ink/70">
                <span className="font-semibold text-ink">Locatie:</span> {huidig.locatieVoorkeur}
              </p>
            )}
            {huidig?.moetHebben && (
              <p className="text-[11.5px] text-ink/70">
                <span className="font-semibold text-ink">Moet hebben:</span> {huidig.moetHebben}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[11.5px] text-ink/40">Nog geen zoekopdracht vastgelegd voor dit dossier.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Zoekopdracht bewerken</p>
      <div className="mt-2.5 flex gap-2">
        <input
          value={budgetMin}
          onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ""))}
          placeholder="Budget min. (€)"
          inputMode="numeric"
          className="w-1/2 rounded-lg border border-ink/15 px-2.5 py-2 text-[12px] text-ink focus:border-accent focus:outline-none"
        />
        <input
          value={budgetMax}
          onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ""))}
          placeholder="Budget max. (€)"
          inputMode="numeric"
          className="w-1/2 rounded-lg border border-ink/15 px-2.5 py-2 text-[12px] text-ink focus:border-accent focus:outline-none"
        />
      </div>
      <input
        value={locatieVoorkeur}
        onChange={(e) => setLocatieVoorkeur(e.target.value)}
        placeholder="Gewenste locatie (bv. Rotterdam-Zuid, max. 20 min. naar centrum)"
        className="mt-2 w-full rounded-lg border border-ink/15 px-2.5 py-2 text-[12px] text-ink focus:border-accent focus:outline-none"
      />
      <textarea
        value={moetHebben}
        onChange={(e) => setMoetHebben(e.target.value)}
        placeholder="Moet-hebben eisen (bv. min. 4 kamers, tuin op het zuiden)"
        rows={2}
        className="mt-2 w-full resize-none rounded-lg border border-ink/15 px-2.5 py-2 text-[12px] text-ink focus:border-accent focus:outline-none"
      />
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className="rounded-lg bg-accent px-3.5 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {bezig ? "Opslaan…" : "Opslaan"}
        </button>
        <button
          type="button"
          onClick={() => setBewerken(false)}
          disabled={bezig}
          className="rounded-lg bg-ink/5 px-3.5 py-2 text-[11.5px] font-semibold text-ink/60 hover:bg-ink/10"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
