"use client";

import { useState } from "react";
import type { FunderingsRisicoNiveau } from "@/types/report";
import { CalendarIcon, MapPinIcon, AlertTriangleIcon, ChevronDownIcon, InfoIcon } from "./icons";
import { TOON_HEX } from "./StatusChip";

// Kleur per funderingsniveau — afgeleid van dezelfde drie toon-kleuren die
// StatusChip en ReportHero (FUNDERING_STIJL) al gebruiken, i.p.v. een derde,
// eigen kopie van dezelfde hex-waarden.
const NIVEAU_STIJL: Record<FunderingsRisicoNiveau, { kleur: string; tekst: string }> = {
  laag: { kleur: TOON_HEX.gunstig.tekst, tekst: "Laag" },
  midden: { kleur: TOON_HEX.aandacht.tekst, tekst: "Midden" },
  hoog: { kleur: TOON_HEX.risico.tekst, tekst: "Hoog" },
};

// Korte node-tekst voor de tijdlijn, afgeleid van de altijd-betekenisvolle
// bodemclassificatie-string (zie fundering.ts#buildBodemclassificatieLabel)
// — geen nieuwe logica, alleen een kortere weergave voor in de tijdlijn.
function bodemNodeTekst(bodemclassificatie: string | null): string {
  if (!bodemclassificatie) return "Onbekend";
  if (bodemclassificatie.startsWith("Niet kwetsbaar")) return "Niet kwetsbaar";
  if (bodemclassificatie.startsWith("Kwetsbaar")) return "Kwetsbaar";
  if (bodemclassificatie.startsWith("Stedelijk")) return "Stedelijk";
  return "Onbekend";
}

// Tijdlijn (bouwjaar -> bodemdata -> risiconiveau) + een uitklapbaar "waarom"-
// paneel — vervangt de eerdere drie doorlopende tekstblokken. Alle inhoud is
// hetzelfde, alleen visueel herverdeeld: kort en scanbaar dicht, volledige
// toelichting pas na een klik.
export default function FunderingRedenering({
  niveau,
  bouwjaarGebruikt,
  bodemclassificatie,
  bodemclassificatieUitleg,
  percentageVoor1970Postcode,
  duidingCaveat,
  duidingAdvies,
  toelichting,
}: {
  niveau: FunderingsRisicoNiveau | null;
  bouwjaarGebruikt: number | null;
  bodemclassificatie: string | null;
  bodemclassificatieUitleg: string | null;
  percentageVoor1970Postcode: number | null;
  duidingCaveat: string | null;
  duidingAdvies: string | null;
  // Zegt expliciet waar het niveau ("Laag"/"Midden"/"Hoog") op steunt —
  // uitsluitend bouwjaar, of bouwjaar + officiële bodemclassificatie. Deze
  // conclusie ontbrak eerder in de UI (wél al berekend in fundering.ts),
  // waardoor niet duidelijk was of de indicatie op één of twee bronnen rust.
  toelichting: string | null;
}) {
  const [open, setOpen] = useState(false);
  const stijl = niveau ? NIVEAU_STIJL[niveau] : { kleur: "#8A8A99", tekst: "Onbekend" };

  return (
    <div>
      <div className="relative flex items-start px-1.5">
        <div
          className="absolute left-[15%] right-[15%] top-[17px] h-0.5"
          style={{ background: `linear-gradient(90deg, #E4E4EC 0%, #E4E4EC 50%, ${stijl.kleur} 50%, ${stijl.kleur} 100%)` }}
        />
        <div className="relative flex-1 text-center">
          <span className="relative z-10 inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-ink/15 bg-paper">
            <CalendarIcon className="h-4 w-4 text-ink/50" />
          </span>
          <p className="mt-2 text-[13px] font-semibold text-ink">{bouwjaarGebruikt ?? "Onbekend"}</p>
          <p className="text-[10px] text-ink/40">bouwjaar</p>
        </div>
        <div className="relative flex-1 text-center">
          <span className="relative z-10 inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-ink/15 bg-paper">
            <MapPinIcon className="h-4 w-4 text-ink/50" />
          </span>
          <p className="mt-2 text-[13px] font-semibold text-ink">{bodemNodeTekst(bodemclassificatie)}</p>
          <p className="text-[10px] text-ink/40">bodemdata</p>
        </div>
        <div className="relative flex-1 text-center">
          <span
            className="relative z-10 inline-flex h-[34px] w-[34px] items-center justify-center rounded-full"
            style={{ backgroundColor: stijl.kleur }}
          >
            <AlertTriangleIcon className="h-4 w-4 text-white" />
          </span>
          <p className="mt-2 text-[13px] font-semibold" style={{ color: stijl.kleur }}>
            {stijl.tekst}
          </p>
          <p className="text-[10px] text-ink/40">risiconiveau</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 border-t border-ink/10 pt-4 text-[12.5px] font-medium text-accent"
      >
        <span>{open ? "Inklappen" : `Waarom "${stijl.tekst}"?`}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-4">
          {percentageVoor1970Postcode != null && (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-ink/15">
                <InfoIcon className="h-3 w-3 text-ink/40" />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold text-ink">
                  {percentageVoor1970Postcode}% van de panden in de buurt is van vóór 1970
                </p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/55">
                  Vóór 1970 werd vaak gebouwd op houten palen. Die palen gaan rotten als het grondwater zakt. Dit is
                  een cijfer voor de hele buurt, geen uitspraak over dit ene pand.
                </p>
              </div>
            </div>
          )}

          {/* Alleen tonen bij een bekende classificatie — bij "onbekend" zegt
              de titel ("Geen bodemclassificatie bekend") al wat er te weten
              valt; de Conclusie-rij hieronder legt dan al uit dat de
              indicatie in dat geval uitsluitend op het bouwjaar steunt, dus
              geen dubbele vermelding nodig. */}
          {bodemclassificatie && bodemclassificatieUitleg && (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-ink/15">
                <MapPinIcon className="h-3 w-3 text-ink/40" />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold text-ink">Bodem: {bodemclassificatie}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/55">{bodemclassificatieUitleg}</p>
              </div>
            </div>
          )}

          {duidingCaveat && (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-ink/15">
                <AlertTriangleIcon className="h-3 w-3 text-ink/40" />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold text-ink">Wat we niet weten</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/55">{duidingCaveat}</p>
              </div>
            </div>
          )}

          {/* Conclusie: zegt met zoveel woorden waar het niveau op steunt —
              uitsluitend bouwjaar, of bouwjaar + officiële bodemclassificatie
              — zodat dat nooit impliciet blijft na de rijen hierboven. */}
          {toelichting && (
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: stijl.kleur }}
              >
                <AlertTriangleIcon className="h-3 w-3 text-white" />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold text-ink">Conclusie</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/55">{toelichting}</p>
              </div>
            </div>
          )}

          {duidingAdvies && (
            <div className="mt-1 flex items-start gap-2.5 rounded-xl bg-[#EEF0FF] p-3">
              <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <div>
                <p className="text-[12.5px] font-semibold text-accent">Advies bij twijfel</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-accent">{duidingAdvies}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
