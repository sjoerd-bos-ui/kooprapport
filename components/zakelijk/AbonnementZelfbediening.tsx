"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { B2bAbonnementTier, B2bAbonnementTierInfo, B2bTierWijzigingsverzoek } from "@/types/b2b";

const MAAND_LABELS: Record<string, string> = {};
function maandLabel(jaarMaand: string): string {
  if (MAAND_LABELS[jaarMaand]) return MAAND_LABELS[jaarMaand];
  const [jaar, maand] = jaarMaand.split("-").map(Number);
  const label = new Date(Date.UTC(jaar, maand - 1, 1)).toLocaleDateString("nl-NL", { month: "short" });
  MAAND_LABELS[jaarMaand] = label;
  return label;
}

// -----------------------------------------------------------------------------
// Vervangt de vorige "mail ons om te wisselen"-tekst: een tier kiezen en
// direct aanvragen, plus een overzicht van het verbruik per maand
// ("factuuroverzicht"). BEWUST geen automatische incasso hier -- er is geen
// Mollie-abonnementenkoppeling in dit project (alleen eenmalige betalingen,
// zie lib/config/payment.ts), dus dit registreert alleen het verzoek en
// e-mailt Sjoerd om het daadwerkelijk te verwerken. Zie
// app/api/zakelijk/abonnement/wijzigen/route.ts.
// -----------------------------------------------------------------------------
export default function AbonnementZelfbediening({
  huidigeTier,
  tiers,
  maandelijksVerbruik,
  openstaandVerzoek,
}: {
  huidigeTier: B2bAbonnementTier;
  tiers: B2bAbonnementTierInfo[];
  maandelijksVerbruik: { jaarMaand: string; aantal: number }[];
  openstaandVerzoek: B2bTierWijzigingsverzoek | null;
}) {
  const router = useRouter();
  const [gekozenTier, setGekozenTier] = useState<B2bAbonnementTier>(huidigeTier);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  const maxVerbruik = Math.max(1, ...maandelijksVerbruik.map((m) => m.aantal));
  const omgekeerd = [...maandelijksVerbruik].reverse();

  async function aanvragen() {
    setBezig(true);
    setMelding(null);
    const res = await fetch("/api/zakelijk/abonnement/wijzigen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gewensteTier: gekozenTier }),
    });
    setBezig(false);
    if (res.ok) {
      setMelding("Wijziging aangevraagd -- we nemen contact op om dit te bevestigen.");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setMelding(body?.error ?? "Aanvragen is niet gelukt.");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-[12px] font-bold text-ink">Verbruik per maand</p>
      <div className="mt-3 flex items-end gap-2.5">
        {omgekeerd.map((m) => (
          <div key={m.jaarMaand} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[9.5px] font-semibold text-ink/50">{m.aantal}</span>
            <div className="flex h-16 w-full items-end overflow-hidden rounded-md bg-parchment">
              <div className="w-full rounded-md bg-accent" style={{ height: `${Math.max(4, (m.aantal / maxVerbruik) * 100)}%` }} />
            </div>
            <span className="text-[9px] text-ink/40">{maandLabel(m.jaarMaand)}</span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-bold text-ink">Abonnement wijzigen</p>
      {openstaandVerzoek ? (
        <p className="mt-2 rounded-lg bg-[#FDEFE3] px-3.5 py-2.5 text-[11.5px] text-[#B4562E]">
          Wijziging naar {tiers.find((t) => t.tier === openstaandVerzoek.gewensteTier)?.label ?? openstaandVerzoek.gewensteTier} is
          aangevraagd op {new Date(openstaandVerzoek.aangemaaktOp).toLocaleDateString("nl-NL")} en wordt nog verwerkt.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <select
            value={gekozenTier}
            onChange={(e) => setGekozenTier(e.target.value as B2bAbonnementTier)}
            className="rounded-lg border border-ink/10 bg-parchment px-3 py-2 text-[12px] text-ink outline-none focus:border-accent"
          >
            {tiers.map((t) => (
              <option key={t.tier} value={t.tier}>
                {t.label} · {t.quotumPerMaand} rapporten/mnd
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={aanvragen}
            disabled={bezig || gekozenTier === huidigeTier}
            className="rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {bezig ? "Bezig…" : "Wijziging aanvragen"}
          </button>
          {melding && <span className="text-[11.5px] text-ink/50">{melding}</span>}
        </div>
      )}
      <p className="mt-2.5 text-[10.5px] text-ink/40">
        Nog geen automatische facturatie in dit dashboard -- een aanvraag wordt persoonlijk bevestigd, geen directe
        incasso.
      </p>
    </div>
  );
}
