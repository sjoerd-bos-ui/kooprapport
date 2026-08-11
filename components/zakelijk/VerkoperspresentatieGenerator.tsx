"use client";

import { useState } from "react";
import type { B2bRapportAanvraag } from "@/types/b2b";
import type { PresentatieToon, Verkoperspresentatie, OptioneleDiaKey } from "@/types/verkoperspresentatie";
import { PRESENTATIE_TOON_OPTIES, OPTIONELE_DIA_OPTIES } from "@/types/verkoperspresentatie";
import { SparklesIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Fase 1 ("content-laag") van de verkoperspresentatie-generator, zie het
// Cowork-gesprek "Verkoper-presentatie generator". Dit scherm genereert en
// toont de dia's (vijf vaste + eventueel aangevinkte extra dia's) als tekst
// -- nog GEEN Adobe Express-vormgeving (Fase 2,
// hangt af van een Adobe-autorisatie die Sjoerd zelf moet regelen). Bewust
// zo'n eenvoudige preview i.p.v. iets dat al op een "echte presentatie" lijkt,
// om niet te suggereren dat dit al de uiteindelijke vormgeving is.
// -----------------------------------------------------------------------------

export default function VerkoperspresentatieGenerator({
  dossierId,
  klantnaam,
  rapporten,
}: {
  dossierId: string;
  klantnaam: string;
  rapporten: B2bRapportAanvraag[];
}) {
  const [rapportId, setRapportId] = useState(rapporten[0]?.id ?? "");
  const [verkoperNaam, setVerkoperNaam] = useState(klantnaam);
  const [toon, setToon] = useState<PresentatieToon>("persoonlijk");
  // Standaard allemaal uit -- de makelaar vinkt zelf aan welke extra dia's hij
  // per generatie wil meenemen (zie het Cowork-gesprek "dan kunnen ze zelf
  // kiezen welke ze aan kunnen vinken").
  const [optioneleDias, setOptioneleDias] = useState<OptioneleDiaKey[]>([]);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [presentatie, setPresentatie] = useState<Verkoperspresentatie | null>(null);

  if (rapporten.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
        <p className="text-[12.5px] text-ink/50">Voeg eerst een rapport toe aan dit dossier om een verkoperspresentatie te kunnen genereren.</p>
      </div>
    );
  }

  function toggleOptioneleDia(sleutel: OptioneleDiaKey) {
    setOptioneleDias((huidig) => (huidig.includes(sleutel) ? huidig.filter((k) => k !== sleutel) : [...huidig, sleutel]));
  }

  async function genereer() {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/zakelijk/klanten/${dossierId}/verkoperspresentatie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rapportId, toon, verkoperNaam, optioneleDias }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFout(body.error ?? "Genereren is niet gelukt.");
        return;
      }
      setPresentatie(body.presentatie as Verkoperspresentatie);
    } catch {
      setFout("Genereren is niet gelukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-[12.5px] font-semibold text-ink">Verkoperspresentatie genereren</p>
        <p className="mt-1 text-[11px] text-ink/45">Een gepersonaliseerde presentatie om mee te nemen naar het waardebepalingsgesprek.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {rapporten.length > 1 ? (
            <div>
              <label className="text-[10.5px] font-semibold text-ink/50">Adres</label>
              <select
                value={rapportId}
                onChange={(e) => setRapportId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-[12.5px] font-medium text-ink focus:border-accent focus:outline-none"
              >
                {rapporten.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.adres.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10.5px] font-semibold text-ink/50">Adres</label>
              <p className="mt-1 rounded-lg bg-mist px-3 py-2 text-[12.5px] font-medium text-ink/70">{rapporten[0].adres.label}</p>
            </div>
          )}
          <div>
            <label className="text-[10.5px] font-semibold text-ink/50">Verkoper</label>
            <input
              value={verkoperNaam}
              onChange={(e) => setVerkoperNaam(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-[12.5px] font-medium text-ink focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-[10.5px] font-semibold text-ink/50">Toon</label>
          <div className="mt-1.5 flex gap-2">
            {PRESENTATIE_TOON_OPTIES.map((optie) => (
              <button
                key={optie.waarde}
                type="button"
                onClick={() => setToon(optie.waarde)}
                className={`rounded-lg px-3 py-2 text-[11.5px] font-semibold transition-colors ${
                  toon === optie.waarde ? "bg-[#EEF0FF] text-accent" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                }`}
              >
                {optie.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="text-[10.5px] font-semibold text-ink/50">Extra dia&apos;s (optioneel)</label>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {OPTIONELE_DIA_OPTIES.map((optie) => (
              <label
                key={optie.waarde}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-ink/10 px-3 py-2 hover:bg-mist"
              >
                <input
                  type="checkbox"
                  checked={optioneleDias.includes(optie.waarde)}
                  onChange={() => toggleOptioneleDia(optie.waarde)}
                  className="mt-0.5 accent-accent"
                />
                <span>
                  <span className="block text-[11.5px] font-semibold text-ink">{optie.label}</span>
                  <span className="block text-[10px] text-ink/45">{optie.omschrijving}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {fout && <p className="mt-3 text-[11px] font-semibold text-red-600">{fout}</p>}

        <button
          type="button"
          onClick={genereer}
          disabled={bezig || !rapportId || !verkoperNaam.trim()}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          {bezig ? "Bezig met genereren…" : "Genereer presentatie met AI"}
        </button>
      </div>

      {presentatie && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-[12.5px] font-semibold text-ink">Voorbeeld — {presentatie.dias.length} dia&apos;s</p>
          <p className="mt-1 text-[10.5px] text-ink/40">
            {presentatie.bron === "ai" ? "Gepersonaliseerd door AI" : "Samengesteld uit rapportgegevens"} · nog zonder vormgeving
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {presentatie.dias.map((dia) => (
              <div key={dia.key} className="rounded-xl bg-mist p-4">
                <p className="text-[11.5px] font-semibold text-ink">{dia.titel}</p>
                {dia.kerncijfer && <p className="mt-1 font-display text-base font-extrabold text-accent">{dia.kerncijfer}</p>}
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink/60">{dia.tekst}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
