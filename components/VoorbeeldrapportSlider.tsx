"use client";

import { useEffect, useState } from "react";
import { voorbeeldRapport } from "@/lib/pdf/voorbeeldRapport";
import { buildSamenvatting } from "@/lib/services/samenvatting";
import { berekenVeiligheidsscore, bepaalVeiligheidsBand, VEILIGHEID_BAND } from "@/lib/utils/veiligheidsscore";
import { duidEnergielabel, ENERGIELABEL_SCHAAL } from "@/lib/utils/energielabel";
import { formatCurrency } from "@/lib/utils/format";
import { ArrowRightIcon, FileCheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Doorklikbare voorbeeldrapport-slider — de website-tegenhanger van de knop
// "Bekijk het echte voorbeeldrapport" (was voorheen alleen een directe link
// naar /api/rapport/voorbeeld-pdf, zie app/page.tsx). Bewust GEEN pixel-
// perfecte kopie van elke kaart uit lib/pdf/ReportDocument.tsx — dat zou een
// tweede, parallel te onderhouden opmaak worden. In plaats daarvan: dezelfde
// 10 paginasecties, dezelfde brongegevens (voorbeeldRapport, Prinsengracht
// 88 — identiek aan de echte voorbeeld-PDF, geen tweede set verzonnen
// cijfers) en dezelfde merkstijl (indigo/amber, Bricolage Grotesque), maar
// per pagina een compacte samenvatting i.p.v. elke kaart.
//
// De echte PDF blijft één klik verderop beschikbaar (link onderin de modal)
// voor wie de volledige, downloadbare versie wil.
// -----------------------------------------------------------------------------

const SECTIES = ["Overzicht", "Waarde", "Verkopen", "Object", "Verduurzaming", "Fundering", "Buurt", "Samenvatting"];

const { core, building, energy, market, nearbySales, verduurzaming, fundering, buurtprofiel } = voorbeeldRapport;
const adres = core.address;
const samenvatting = buildSamenvatting(voorbeeldRapport);
const energieDuiding = energy.data?.klasse ? duidEnergielabel(energy.data.klasse) : null;
const veiligheidScore = buurtprofiel.data?.veiligheid.misdrijvenPer1000 != null ? berekenVeiligheidsscore(buurtprofiel.data.veiligheid.misdrijvenPer1000) : null;
const veiligheidBand = veiligheidScore != null ? bepaalVeiligheidsBand(veiligheidScore) : null;
const dezeWoningPerM2 =
  market.data?.geschatteWaarde != null && building.data?.oppervlakteM2 ? Math.round(market.data.geschatteWaarde / building.data.oppervlakteM2) : null;

function Kicker({ children }: { children: string }) {
  return <p className="text-[9px] font-bold uppercase tracking-wider text-accent">{children}</p>;
}

function Titel({ children }: { children: string }) {
  return <h3 className="mt-1 font-display text-[15px] font-extrabold leading-tight text-ink">{children}</h3>;
}

function AmberRule() {
  return <div className="mt-2.5 mb-3 h-[3px] w-6 rounded-full bg-sun" />;
}

// Eén stat-tegeltje, hergebruikt op meerdere pagina's (Waarde, Verduurzaming, Object).
function Stat({ label, waarde, kleur = "text-ink" }: { label: string; waarde: string; kleur?: string }) {
  return (
    <div className="rounded-lg bg-white p-2.5">
      <p className="text-[7px] uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-1 font-display text-[13px] font-extrabold ${kleur}`}>{waarde}</p>
    </div>
  );
}

const SLIDES: { actief: number; render: () => React.ReactNode }[] = [
  {
    actief: 0,
    render: () => (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-accent-dark">
          <span className="font-display text-lg font-extrabold text-white">K</span>
        </div>
        <p className="font-display text-[10px] font-extrabold tracking-wide text-accent-dark">KOOPRAPPORT</p>
        <p className="mt-4 text-[8px] font-semibold uppercase tracking-widest text-ink/40">Premium woningrapport</p>
        <h2 className="mt-2 font-display text-xl font-extrabold text-ink">
          {adres.straat} {adres.huisnummer}
        </h2>
        <p className="mt-1 text-[11px] text-ink/45">
          {adres.postcode} {adres.plaats}
        </p>
        <div className="mt-3 h-[3px] w-7 rounded-full bg-sun" />
        <p className="mt-3 max-w-[220px] text-[10px] leading-relaxed text-ink/50">
          Alles wat je moet weten over dit adres, feitelijk en verifieerbaar op één rij.
        </p>
      </div>
    ),
  },
  {
    actief: 0,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>Een persoonlijk woord</Kicker>
        <Titel>Welkom bij Kooprapport</Titel>
        <AmberRule />
        <p className="text-[10.5px] leading-relaxed text-ink/70">
          Een huis kopen is voor veel mensen een van de grootste beslissingen in hun leven. Dat merkte ik zelf ook toen ik op
          zoek ging naar een woning in Rotterdam. Al snel kwam ik erachter hoe versnipperd de informatie was: de ene site liet
          iets zien over de buurt, de andere over de woningwaarde, weer een andere over vergelijkbare verkopen.
        </p>
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink/70">
          Daarom bouwde ik Kooprapport: één plek waar de belangrijkste feiten over een adres samenkomen, met bronvermelding.
        </p>
        <p className="mt-3 text-[9.5px] italic text-ink/40">Lees de volledige brief in het PDF-rapport.</p>
        <div className="mt-auto flex items-end gap-2.5 pt-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-[9px] font-bold text-accent-dark">
            SB
          </div>
          <div>
            <p className="font-display text-lg italic text-accent-dark">Sjoerd</p>
            <p className="text-[8px] text-ink/40">Oprichter, Kooprapport</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    actief: 1,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>03 &middot; waarde</Kicker>
        <Titel>Waarde-indicatie</Titel>
        <AmberRule />
        <div className="flex overflow-hidden rounded-lg">
          <div className="flex-1 bg-accent p-2.5">
            <p className="text-[6.5px] font-bold uppercase text-white/70">Deze woning</p>
            <p className="mt-1 font-display text-[13px] font-extrabold text-white">
              {market.data ? formatCurrency(market.data.geschatteWaarde) : "Onbekend"}
            </p>
          </div>
          <div className="flex-1 bg-white p-2.5">
            <p className="text-[6.5px] font-bold uppercase text-ink/40">Buurtgem. /m&sup2;</p>
            <p className="mt-1 font-display text-[13px] font-extrabold text-ink">
              {nearbySales.data?.gemiddeldePrijsPerM2 != null ? formatCurrency(nearbySales.data.gemiddeldePrijsPerM2) : "Onbekend"}
            </p>
          </div>
        </div>
        {market.data?.bandbreedteMin != null && market.data.bandbreedteMax != null && (
          <div className="mt-3 rounded-lg bg-white p-2.5">
            <div className="h-1.5 rounded-full bg-mist" />
            <p className="mt-1.5 text-center text-[7.5px] font-semibold text-ink/60">
              {formatCurrency(market.data.bandbreedteMin)} &ndash; {formatCurrency(market.data.bandbreedteMax)}
            </p>
          </div>
        )}
        <p className="mt-3 text-[9px] leading-relaxed text-ink/45">Modelschatting, geen taxatie of WOZ-waarde.</p>
      </div>
    ),
  },
  {
    actief: 2,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>04 &middot; verkopen</Kicker>
        <Titel>Verkopen in de buurt</Titel>
        <AmberRule />
        <div className="flex justify-between rounded-lg bg-accent p-2.5">
          <div>
            <p className="text-[6.5px] text-white/70">Verkopen</p>
            <p className="font-display text-[13px] font-extrabold text-white">{nearbySales.data?.aantalLaatste12Maanden ?? "-"}</p>
          </div>
          <div>
            <p className="text-[6.5px] text-white/70">Gem. /m&sup2;</p>
            <p className="font-display text-[13px] font-extrabold text-white">
              {nearbySales.data?.gemiddeldePrijsPerM2 != null ? formatCurrency(nearbySales.data.gemiddeldePrijsPerM2) : "-"}
            </p>
          </div>
          <div>
            <p className="text-[6.5px] text-white/70">Deze woning</p>
            <p className="font-display text-[13px] font-extrabold text-white">{dezeWoningPerM2 != null ? formatCurrency(dezeWoningPerM2) : "-"}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-white p-2.5">
          {nearbySales.data?.verkopen.slice(0, 3).map((v) => (
            <div key={v.adres} className="flex items-center justify-between text-[9px]">
              <span className="text-ink/70">{v.adres}</span>
              <span className="font-semibold text-ink">{formatCurrency(v.verkoopprijs)}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    actief: 3,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>05 &middot; object</Kicker>
        <Titel>Objectgegevens &amp; energie</Titel>
        <AmberRule />
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Bouwjaar" waarde={String(building.data?.bouwjaar ?? "-")} />
          <Stat label="Oppervlakte" waarde={building.data?.oppervlakteM2 != null ? `${building.data.oppervlakteM2} m²` : "-"} />
          <Stat label="Type" waarde="Grachtenpand" />
        </div>
        {energy.data?.klasse && energieDuiding && (
          <div className="mt-3 rounded-lg bg-[#0F766E] p-3">
            <p className="text-[7px] text-white/70">Energielabel</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-xl font-extrabold text-white">{energy.data.klasse}</span>
              <span className="text-[8px] text-white/70">{energieDuiding.kwartTekst}</span>
            </div>
          </div>
        )}
      </div>
    ),
  },
  {
    actief: 4,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>06 &middot; verduurzaming</Kicker>
        <Titel>Verduurzamingsadvies</Titel>
        <AmberRule />
        <div className="flex items-center gap-1 rounded-lg bg-white p-2">
          {ENERGIELABEL_SCHAAL.map((klasse) => {
            const isHuidig = klasse === verduurzaming.data?.huidigLabel;
            const isHaalbaar = klasse === verduurzaming.data?.haalbaarLabel;
            return (
              <div
                key={klasse}
                className={`flex h-4 flex-1 items-center justify-center rounded text-[7px] font-bold text-white ${
                  isHuidig ? "bg-[#0F766E]" : isHaalbaar ? "bg-[#2F8A3A] ring-1 ring-white" : "bg-ink/10 text-ink/20"
                }`}
              >
                {(isHuidig || isHaalbaar) && klasse}
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Investering" waarde={verduurzaming.data?.investering != null ? formatCurrency(verduurzaming.data.investering) : "-"} />
          <Stat
            label="Besparing/jr"
            waarde={verduurzaming.data?.besparingPerJaar != null ? formatCurrency(verduurzaming.data.besparingPerJaar) : "-"}
            kleur="text-[#0F766E]"
          />
        </div>
      </div>
    ),
  },
  {
    actief: 5,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>07 &middot; fundering</Kicker>
        <Titel>Funderingsrisico</Titel>
        <AmberRule />
        <div className="rounded-lg bg-white p-3">
          <span className="inline-block rounded-full bg-[#E6FBF7] px-3 py-1 text-[9px] font-bold text-[#0F766E]">
            {fundering.data?.niveau ? fundering.data.niveau.charAt(0).toUpperCase() + fundering.data.niveau.slice(1) : "Onbekend"}
          </span>
          <p className="mt-2 text-[9px] leading-relaxed text-ink/55">{fundering.data?.duidingKern}</p>
        </div>
        <p className="mt-3 text-[8.5px] text-ink/40">Indicatie, geen funderingsonderzoek.</p>
      </div>
    ),
  },
  {
    actief: 6,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>08 &middot; buurt</Kicker>
        <Titel>Buurtprofiel</Titel>
        <AmberRule />
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Veiligheid" waarde={veiligheidScore != null ? String(veiligheidScore).replace(".", ",") : "-"} />
          <Stat label="Band" waarde={veiligheidBand ? VEILIGHEID_BAND[veiligheidBand].tekst : "-"} />
          <Stat label="Inwoners" waarde={buurtprofiel.data?.sociaal.inwoners != null ? buurtprofiel.data.sociaal.inwoners.toLocaleString("nl-NL") : "-"} />
          <Stat
            label="Eenpersoons"
            waarde={buurtprofiel.data?.sociaal.percentageEenpersoons != null ? `${buurtprofiel.data.sociaal.percentageEenpersoons}%` : "-"}
          />
        </div>
        <p className="mt-3 text-[9px] leading-relaxed text-ink/45">{buurtprofiel.data?.buurtnaam}, {buurtprofiel.data?.gemeentenaam}</p>
      </div>
    ),
  },
  {
    actief: 7,
    render: () => (
      <div className="flex h-full flex-col px-5 py-6">
        <Kicker>09 &middot; samenvatting</Kicker>
        <Titel>Samenvatting</Titel>
        <AmberRule />
        <div className="rounded-lg bg-accent-dark p-3">
          <p className="font-display text-[11px] font-extrabold leading-snug text-white">{samenvatting.titel}</p>
          {market.data && (
            <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[8px] font-bold text-white">
              Geschatte waarde: {formatCurrency(market.data.geschatteWaarde)}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {samenvatting.pluspunten.slice(0, 2).map((tekst, i) => (
            <p key={i} className="text-[8.5px] leading-snug text-ink/65">
              &#10003; {tekst}
            </p>
          ))}
        </div>
      </div>
    ),
  },
  {
    actief: -1,
    render: () => (
      <div className="flex h-full flex-col items-center justify-center bg-accent-dark px-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">
          <span className="font-display text-lg font-extrabold text-accent-dark">K</span>
        </div>
        <p className="mt-4 max-w-[220px] font-display text-[13px] font-extrabold leading-snug text-white">
          &ldquo;Een goed onderbouwde keuze begint niet met een gevoel, maar met de juiste feiten op een rij.&rdquo;
        </p>
        <div className="mt-3 h-[3px] w-7 rounded-full bg-sun" />
        <p className="mt-3 max-w-[210px] text-[9px] leading-relaxed text-white/60">
          Bedankt dat je Kooprapport bekeek voor {adres.straat} {adres.huisnummer}.
        </p>
        <p className="mt-6 text-[8px] font-semibold tracking-wide text-white/40">KOOPRAPPORT.NL</p>
      </div>
    ),
  },
];

export default function VoorbeeldrapportSlider() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(0);
          setOpen(true);
        }}
        className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-ink hover:text-accent"
      >
        <FileCheckIcon className="h-3.5 w-3.5 text-accent" />
        Bekijk het echte voorbeeldrapport
        <ArrowRightIcon className="h-3 w-3 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/85 px-4 py-8"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            &#10005;
          </button>

          <p className="text-[11px] uppercase tracking-wide text-white/50">
            Voorbeeldrapport &middot; {adres.straat} {adres.huisnummer}, {adres.plaats}
          </p>

          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Vorige pagina"
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"
            >
              &#8249;
            </button>

            <div className="flex aspect-[210/297] w-[240px] overflow-hidden rounded-xl bg-parchment shadow-2xl sm:w-[260px]">
              <div className="flex w-4 shrink-0 flex-col items-center gap-2.5 bg-accent-dark py-3">
                {SECTIES.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === SLIDES[index].actief ? "bg-sun" : "bg-white/30"}`} />
                ))}
              </div>
              <div className="flex-1">{SLIDES[index].render()}</div>
            </div>

            <button
              type="button"
              aria-label="Volgende pagina"
              onClick={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))}
              disabled={index === SLIDES.length - 1}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"
            >
              &#8250;
            </button>
          </div>

          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ga naar pagina ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>

          <a
            href="/api/rapport/voorbeeld-pdf"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10.5px] font-semibold text-white/60 underline underline-offset-2 hover:text-white"
          >
            Download het volledige rapport als PDF
          </a>
        </div>
      )}
    </>
  );
}
