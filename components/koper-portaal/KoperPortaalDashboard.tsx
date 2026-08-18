"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bKoperVoorkeuren, B2bWoningMatch } from "@/types/b2b";
import { B2B_WONINGTYPE_VOORKEUREN } from "@/types/b2b";
import VoorkeurenVragenlijst from "@/components/zakelijk/VoorkeurenVragenlijst";
import MatchesKaart from "@/components/zakelijk/MatchesKaart";
import { MapPinIcon, BoltIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Koperportaal-dashboard (zie het Cowork-gesprek "Koperportaal voor
// Zakelijk-klanten") -- de koper-tegenhanger van ZoekopdrachtForm.tsx
// (makelaar) en ConsumentZoekopdracht.tsx (losse rapportkoper), hergebruikt
// dezelfde VoorkeurenVragenlijst en MatchesKaart als beide. Belangrijkste
// verschil met ConsumentZoekopdracht.tsx: dit IS het echte B2bKlantdossier
// van de makelaar (basisPad="/api/koper-portaal", geen namespaced
// "consument:{email}"-sleutel) -- wat de koper hier opslaat/verandert ziet de
// makelaar meteen terug in zijn eigen dossierweergave.
// -----------------------------------------------------------------------------

function budgetLabel(maxKoopprijs: B2bKoperVoorkeuren["maxKoopprijs"]): string {
  if (typeof maxKoopprijs !== "number") return "Nog geen vast maximum";
  return `Tot ${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(maxKoopprijs)}`;
}

export default function KoperPortaalDashboard({
  klantnaam,
  voorkeuren,
  matches,
}: {
  klantnaam: string;
  voorkeuren: B2bKoperVoorkeuren | null;
  matches: B2bWoningMatch[];
}) {
  const router = useRouter();
  const [bewerken, setBewerken] = useState(!voorkeuren);
  const [bezig, setBezig] = useState(false);
  const [zoekBezig, setZoekBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);
  const [uitloggenBezig, setUitloggenBezig] = useState(false);

  async function uitloggen() {
    setUitloggenBezig(true);
    try {
      await fetch("/api/koper-portaal/uitloggen", { method: "POST" });
      router.push("/koper-portaal/inloggen");
      router.refresh();
    } finally {
      setUitloggenBezig(false);
    }
  }

  async function opslaanVoorkeuren(nieuw: B2bKoperVoorkeuren) {
    setBezig(true);
    setMelding(null);
    try {
      const res = await fetch("/api/koper-portaal/zoekopdracht", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nieuw),
      });
      const body = await res.json();
      if (!res.ok) {
        setMelding(body.error ?? "Opslaan is niet gelukt.");
        setBezig(false);
        return;
      }

      setMelding("Opgeslagen. Bezig met zoeken naar woningen op Funda…");
      setZoekBezig(true);
      try {
        const versRes = await fetch("/api/koper-portaal/matches-verversen", { method: "POST" });
        const versBody = await versRes.json();
        if (!versRes.ok) {
          setMelding("Opgeslagen.");
        } else if (versBody.zoekFout) {
          setMelding("Opgeslagen. Zoeken naar Funda is niet gelukt (netwerkprobleem) -- probeer straks opnieuw via 'Ververs' bij de matches.");
        } else {
          setMelding(`Opgeslagen -- ${versBody.nieuweMatches} nieuwe woning(en) gevonden.`);
        }
      } catch {
        setMelding("Opgeslagen.");
      } finally {
        setZoekBezig(false);
      }

      setBezig(false);
      setBewerken(false);
      router.refresh();
    } catch {
      setMelding("Opslaan is niet gelukt.");
      setBezig(false);
    }
  }

  const koptekst = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Woningportaal</p>
        <p className="mt-0.5 text-[15px] font-extrabold text-ink">Welkom, {klantnaam}</p>
      </div>
      <button type="button" onClick={uitloggen} disabled={uitloggenBezig} className="text-[11px] font-semibold text-ink/50 hover:text-ink disabled:opacity-50">
        {uitloggenBezig ? "Bezig…" : "Uitloggen"}
      </button>
    </div>
  );

  if (bewerken) {
    return (
      <div className="flex flex-col gap-4">
        {koptekst}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.06] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">
              <BoltIcon className="h-3 w-3 text-accent" /> Zoekopdracht
            </p>
            {voorkeuren && (
              <button type="button" onClick={() => setBewerken(false)} disabled={bezig} className="text-[10.5px] font-semibold text-ink/50 hover:underline">
                Annuleren
              </button>
            )}
          </div>
          <div className="p-4">
            <VoorkeurenVragenlijst bestaand={voorkeuren} onOpslaan={opslaanVoorkeuren} bezig={bezig} opslaanLabel="Opslaan en zoeken op Funda" />
          </div>
          {melding &&
            (zoekBezig ? (
              <div className="flex flex-col items-center justify-center gap-3 border-t border-ink/[0.06] px-4 py-8 text-center">
                <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" />
                <div>
                  <p className="text-[14px] font-bold text-accent">Bezig met zoeken naar woningen op Funda…</p>
                  <p className="mt-1 text-[11.5px] text-accent/70">Dit kan tot een minuut duren -- we doorzoeken meerdere pagina's voor de volledige lijst.</p>
                </div>
              </div>
            ) : (
              <p className="border-t border-ink/[0.06] px-4 py-2 text-[10.5px] font-semibold text-accent">{melding}</p>
            ))}
        </div>
      </div>
    );
  }

  const locatieChips = voorkeuren ? voorkeuren.voorkeurLocaties.map((l) => l.label) : [];
  const woningtypeChips = voorkeuren
    ? voorkeuren.woningtypes.map((w) =>
        w === "other" ? voorkeuren.woningtypeAnders ?? "Ander type" : B2B_WONINGTYPE_VOORKEUREN.find((o) => o.waarde === w)?.label ?? w
      )
    : [];

  return (
    <div className="flex flex-col gap-4">
      {koptekst}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">
            <BoltIcon className="h-3 w-3 text-accent" /> Zoekopdracht
          </p>
          <button type="button" onClick={() => setBewerken(true)} className="text-[10.5px] font-semibold text-accent hover:underline">
            Bewerken
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {locatieChips.map((label) => (
            <span key={label} className="flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-ink">
              <MapPinIcon className="h-3 w-3 shrink-0 text-ink/40" />
              {label}
            </span>
          ))}
          {voorkeuren && <span className="rounded-full bg-mist px-2.5 py-1 text-[11px] font-semibold text-ink">{budgetLabel(voorkeuren.maxKoopprijs)}</span>}
          {woningtypeChips.map((label) => (
            <span key={label} className="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[11px] font-semibold text-accent">
              {label}
            </span>
          ))}
        </div>
      </div>

      <MatchesKaart
        matches={matches}
        rapporten={[]}
        dossierId="koper-portaal"
        matchenActief={Boolean(voorkeuren)}
        zoekopdracht={{ koperVoorkeuren: voorkeuren }}
        basisPad="/api/koper-portaal"
        toonRapportActies={false}
      />
    </div>
  );
}
