"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { voorbeeldRapport } from "@/lib/pdf/voorbeeldRapport";
import { buildSamenvatting } from "@/lib/services/samenvatting";
import { berekenVeiligheidsscore, bepaalVeiligheidsBand, VEILIGHEID_BAND } from "@/lib/utils/veiligheidsscore";
import { duidEnergielabel, ENERGIELABEL_SCHAAL } from "@/lib/utils/energielabel";
import { formatCurrency } from "@/lib/utils/format";
import { ArrowRightIcon, FileCheckIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Doorklikbare voorbeeldrapport-slider — de website-tegenhanger van de knop
// "Bekijk het echte voorbeeldrapport" (was voorheen alleen een directe link
// naar /api/rapport/voorbeeld-pdf, zie app/page.tsx).
//
// v3: elke pagina is nu volledig gevuld met alle échte inhoud van de
// bijbehorende PDF-pagina (lib/pdf/ReportDocument.tsx) — geen samengevatte
// kaartjes en geen witruimte onderaan meer, elk cijfer/tekstblok komt
// rechtstreeks uit voorbeeldRapport / buildSamenvatting(), niets verzonnen.
// Twee volledige paginas naast elkaar, net als bij het echte rapport.
//
// De echte PDF blijft één klik verderop beschikbaar (downloadlink onderin
// de modal) voor wie de volledige, af te drukken versie wil.
// -----------------------------------------------------------------------------

const { core, building, energy, market, nearbySales, verduurzaming, fundering, buurtprofiel } = voorbeeldRapport;
const adres = core.address;
const samenvatting = buildSamenvatting(voorbeeldRapport);
const energieDuiding = energy.data?.klasse ? duidEnergielabel(energy.data.klasse) : null;
const veiligheidScore = buurtprofiel.data?.veiligheid.misdrijvenPer1000 != null ? berekenVeiligheidsscore(buurtprofiel.data.veiligheid.misdrijvenPer1000) : null;
const veiligheidBand = veiligheidScore != null ? bepaalVeiligheidsBand(veiligheidScore) : null;
const dezeWoningPerM2 =
  market.data?.geschatteWaarde != null && building.data?.oppervlakteM2 ? Math.round(market.data.geschatteWaarde / building.data.oppervlakteM2) : null;
const verduurzamingTerugverdientijd = (() => {
  const maanden = verduurzaming.data?.terugverdientijdMaanden;
  if (maanden == null) return "Onbekend";
  const jaren = Math.floor(maanden / 12);
  const rest = maanden % 12;
  if (jaren <= 0) return `${maanden} mnd`;
  return rest > 0 ? `${jaren} jr ${rest} mnd` : `${jaren} jr`;
})();

// ---- Kleine, herbruikbare bouwstenen (allemaal op deze compacte schaal) ----

function Kop({ kicker, titel, groot = false }: { kicker: string; titel: string; groot?: boolean }) {
  return (
    <div className="mb-2">
      <p className="text-[5.6px] font-bold uppercase tracking-wider text-accent">{kicker}</p>
      <h3 className={`font-display font-extrabold text-ink ${groot ? "mt-1 text-[15px] leading-tight" : "text-[11px]"}`}>{titel}</h3>
      <div className={`mt-1.5 h-[2px] rounded-full bg-sun ${groot ? "w-8" : "w-3.5"}`} />
    </div>
  );
}

function Stat({ label, waarde, sub, kleur = "text-ink" }: { label: string; waarde: string; sub?: string; kleur?: string }) {
  return (
    <div className="rounded-md bg-white p-1.5">
      <p className="text-[3.6px] font-semibold uppercase tracking-wide text-ink/40">{label}</p>
      <p className={`mt-0.5 font-display text-[7.6px] font-extrabold leading-none ${kleur}`}>{waarde}</p>
      {sub && <p className="mt-0.5 text-[3.4px] leading-[1.4] text-ink/40">{sub}</p>}
    </div>
  );
}

function Duiding({ titel, tekst }: { titel: string; tekst: string }) {
  return (
    <div className="rounded-md border-l-2 border-accent bg-mist p-1.5">
      <p className="text-[4.2px] font-bold text-accent-dark">{titel}</p>
      <p className="mt-0.5 text-[4px] leading-[1.5] text-ink">{tekst}</p>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md bg-white p-1.5 ${className}`}>{children}</div>;
}

// Vaste "pagina-huls": indigo sectie-balkje links + witte inhoud, exact
// dezelfde 8 secties/volgorde als de sidebar in de echte PDF, plus een
// echte paginavoet (net als op elke PDF-pagina) zodat er geen kale
// witruimte onderaan overblijft.
const SECTIES = ["Overzicht", "Waarde", "Verkopen", "Object", "Verduurzaming", "Fundering", "Buurt", "Samenvatting"];

function Pagina({
  actief,
  paginaNummer,
  kleur = "#F5F5FA",
  children,
}: {
  actief: number;
  paginaNummer?: number;
  kleur?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex aspect-[210/297] w-[250px] overflow-hidden rounded-lg shadow-2xl sm:w-[270px]" style={{ backgroundColor: kleur }}>
      <div className="flex w-3.5 shrink-0 flex-col items-center gap-2 bg-accent-dark py-2.5">
        {SECTIES.map((_, i) => (
          <span key={i} className={`h-1 w-1 rounded-full ${i === actief ? "bg-sun" : "bg-white/30"}`} />
        ))}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden px-2.5 py-3">
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">{children}</div>
        {paginaNummer != null && (
          <div className="mt-1.5 flex shrink-0 items-center justify-between border-t border-ink/10 pt-1">
            <span className="text-[3.2px] font-semibold tracking-wide text-ink/30">KOOPRAPPORT.NL</span>
            <span className="text-[3.2px] text-ink/30">Pagina {paginaNummer} van 10</span>
          </div>
        )}
      </div>
    </div>
  );
}

const SLIDES: { actief: number; paginaNummer?: number; render: () => ReactNode }[] = [
  {
    actief: 0,
    render: () => (
      <div className="flex h-full flex-col items-center justify-between">
        <div />
        <div className="flex flex-col items-center text-center">
          <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-accent-dark">
            <span className="font-display text-[10px] font-extrabold text-white">K</span>
          </div>
          <p className="font-display text-[6.5px] font-extrabold tracking-wide text-accent-dark">KOOPRAPPORT</p>
          <p className="mt-3 text-[4.4px] font-semibold uppercase tracking-widest text-ink/40">Premium woningrapport</p>
          <h2 className="mt-1.5 font-display text-[15px] font-extrabold leading-tight text-ink">
            {adres.straat} {adres.huisnummer}
          </h2>
          <p className="mt-0.5 text-[6px] text-ink/45">
            {adres.postcode} {adres.plaats}
          </p>
          <div className="mt-2 h-[2px] w-6 rounded-full bg-sun" />
          <p className="mt-2 max-w-[150px] text-[5px] leading-relaxed text-ink/50">
            Alles wat je moet weten over dit adres, feitelijk en verifieerbaar op één rij.
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-[4.4px] font-bold text-white">
            Bekijk dit rapport online &rarr;
          </span>
          <div className="mt-3 grid grid-cols-4 gap-1 text-[3.6px] text-ink/40">
            <span className="rounded-full bg-parchment px-1.5 py-0.5">Waarde</span>
            <span className="rounded-full bg-parchment px-1.5 py-0.5">Energie</span>
            <span className="rounded-full bg-parchment px-1.5 py-0.5">Fundering</span>
            <span className="rounded-full bg-parchment px-1.5 py-0.5">Buurt</span>
          </div>
        </div>
        <p className="text-[4px] font-semibold tracking-wide text-ink/30">KOOPRAPPORT.NL &middot; Pagina 1 van 10</p>
      </div>
    ),
  },
  {
    actief: 0,
    paginaNummer: 2,
    render: () => (
      <div className="flex h-full flex-col">
        <p className="text-[6px] font-bold uppercase tracking-wider text-accent">Een persoonlijk woord</p>
        <h2 className="mt-1.5 font-display text-[18px] font-extrabold leading-[1.05] text-ink">Welkom bij Kooprapport</h2>
        <div className="mt-2 h-[2.5px] w-10 rounded-full bg-sun" />
        <div className="mt-2.5 flex flex-1 flex-col gap-1.5 overflow-hidden text-[4.4px] leading-[1.55] text-ink/75">
          <p>
            Een huis kopen is voor veel mensen een van de grootste beslissingen in hun leven. Dat merkte ik zelf ook toen ik op
            zoek ging naar een woning in Rotterdam. Je denkt eerst dat je vooral moet kijken naar prijs en uitstraling, maar al
            snel kom je erachter dat er veel meer bij komt kijken: bronnen om te raadplegen, gegevens om te vergelijken, details
            die je pas later goed begint te begrijpen.
          </p>
          <p>
            Tijdens mijn zoektocht liep ik er steeds vaker tegenaan dat informatie versnipperd was. De ene site liet iets zien
            over de buurt, de andere over de woningwaarde, weer een andere over vergelijkbare huizen of eerdere verkopen. Als je
            nog niet precies weet waar je op moet letten, voelt dat al snel als een enorme puzzel.
          </p>
          <p>
            Dat was het moment waarop het idee voor Kooprapport ontstond: een plek waar woninginformatie samenkomt in één
            helder rapport, zodat je niet zelf alles hoeft uit te zoeken. Niet meer eindeloos zoeken naar losse bronnen, maar
            direct inzicht in de belangrijkste gegevens die je nodig hebt.
          </p>
          <p>
            Met Kooprapport wil ik dat proces overzichtelijker, slimmer en toegankelijker maken. Zodat je niet alleen sneller
            tot informatie komt, maar vooral beter begrijpt wat die informatie betekent.
          </p>
        </div>
        <div className="mt-2 flex shrink-0 items-end gap-1.5 border-t border-ink/10 pt-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mist text-[4.4px] font-bold text-accent-dark">SB</div>
          <div>
            <p className="text-[4px] text-ink/40">Met vriendelijke groet,</p>
            <p className="font-display text-[13px] italic leading-none text-accent-dark">Sjoerd</p>
            <p className="mt-0.5 text-[3.6px] text-ink/40">Oprichter, Kooprapport</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    actief: 1,
    paginaNummer: 3,
    render: () => (
      <>
        <Kop kicker="03 · waarde" titel="Waarde-indicatie" />
        <div className="flex overflow-hidden rounded-md">
          <div className="flex-1 bg-accent p-1.5">
            <p className="text-[3.6px] font-bold uppercase text-white/70">Deze woning</p>
            <p className="font-display text-[8px] font-extrabold text-white">{market.data ? formatCurrency(market.data.geschatteWaarde) : "-"}</p>
            {dezeWoningPerM2 != null && <p className="text-[3.4px] text-white/60">{formatCurrency(dezeWoningPerM2)} /m²</p>}
          </div>
          <div className="flex-1 bg-white p-1.5">
            <p className="text-[3.6px] font-bold uppercase text-ink/40">Buurtgem. /m²</p>
            <p className="font-display text-[8px] font-extrabold text-ink">
              {nearbySales.data?.gemiddeldePrijsPerM2 != null ? formatCurrency(nearbySales.data.gemiddeldePrijsPerM2) : "-"}
            </p>
            <p className="text-[3.4px] text-ink/40">{nearbySales.data?.aantalLaatste12Maanden ?? "-"} verkopen, 12 mnd</p>
          </div>
        </div>
        <Card>
          <div className="flex items-center gap-1 text-center">
            <div className="flex-1">
              <p className="text-[4.2px] font-bold text-ink">{building.data?.oppervlakteM2}m²</p>
              <p className="text-[3px] text-ink/40">opp.</p>
            </div>
            <div className="flex-1">
              <p className="text-[4.2px] font-bold text-ink">{building.data?.bouwjaar}</p>
              <p className="text-[3px] text-ink/40">bouwjaar</p>
            </div>
            <div className="flex-1">
              <p className="text-[4.2px] font-bold text-ink">{market.data?.rooms ?? "-"}</p>
              <p className="text-[3px] text-ink/40">kamers</p>
            </div>
            <div className="flex-1 rounded bg-mist py-0.5">
              <p className="font-display text-[4.4px] font-extrabold text-accent">{market.data ? formatCurrency(market.data.geschatteWaarde) : "-"}</p>
              <p className="text-[3px] text-accent">uitkomst</p>
            </div>
          </div>
          {market.data?.bandbreedteMin != null && market.data.bandbreedteMax != null && (
            <>
              <div className="mt-1.5 h-[3px] rounded-full bg-mist" />
              <div className="mt-1 flex justify-between text-[3.2px] text-ink/40">
                <span>{formatCurrency(market.data.bandbreedteMin)}</span>
                <span className="font-semibold text-ink">90% zeker</span>
                <span>{formatCurrency(market.data.bandbreedteMax)}</span>
              </div>
            </>
          )}
          {market.data?.betrouwbaarheidstekst && <p className="mt-1 text-[3.2px] italic text-ink/35">Bron: {market.data.betrouwbaarheidstekst}</p>}
        </Card>
        <Duiding titel="6% boven buurtgemiddelde" tekst="Model kijkt naar bouwjaar, oppervlakte en 150+ kenmerken, niet alleen m²-prijs." />
        <Card>
          <p className="text-[4px] font-bold text-ink">Wat is een modelschatting?</p>
          <p className="mt-0.5 text-[3.8px] leading-[1.5] text-ink/50">
            Automatische schatting (AVM, Altum AI). Geen taxatie, geen WOZ-waarde, geen bevestigde verkoopprijs — een
            verifieerbaar model met een expliciete bandbreedte.
          </p>
        </Card>
        <Duiding titel="Waar kun je dit voor gebruiken?" tekst="Onderhandelingsbasis, oriëntatie bij hypotheek, of gewoon om te weten waar een woning ongeveer staat." />
      </>
    ),
  },
  {
    actief: 2,
    paginaNummer: 4,
    render: () => (
      <>
        <Kop kicker="04 · verkopen" titel="Verkopen in de buurt" />
        <div className="flex justify-between rounded-md bg-accent p-1.5">
          <Stat label="Verkopen" waarde={String(nearbySales.data?.aantalLaatste12Maanden ?? "-")} kleur="text-white" />
          <Stat label="Gem/m²" waarde={nearbySales.data?.gemiddeldePrijsPerM2 != null ? formatCurrency(nearbySales.data.gemiddeldePrijsPerM2) : "-"} kleur="text-white" />
          <Stat label="Deze woning" waarde={dezeWoningPerM2 != null ? formatCurrency(dezeWoningPerM2) : "-"} kleur="text-white" />
        </div>
        <Card className="flex flex-col gap-1">
          <p className="text-[3.6px] font-bold tracking-wide text-accent">VERGELIJKBAAR MET DEZE WONING</p>
          {nearbySales.data?.verkopen.slice(0, 4).map((v) => (
            <div key={v.adres} className="flex items-center justify-between">
              <div>
                <p className="text-[4px] text-ink">{v.adres}</p>
                <p className="text-[3.2px] text-ink/40">
                  {v.oppervlakteM2}m² &middot; {v.verkoopdatum}
                  {v.vergelijkbaar ? "" : " · minder vergelijkbaar"}
                </p>
              </div>
              <p className="text-[4px] font-bold text-ink">{formatCurrency(v.verkoopprijs)}</p>
            </div>
          ))}
        </Card>
        <p className="text-[3.4px] text-ink/35">
          Gezocht in de laatste {nearbySales.data?.zoekvensterMaanden ?? 12} maanden{nearbySales.data?.verruimd ? ", automatisch verruimd (te weinig vergelijkbare verkopen binnen 12 maanden)" : ""}.
        </p>
        <div className="flex gap-1">
          <Duiding titel='Wat is "vergelijkbaar"?' tekst="Oppervlakte binnen circa 22% van deze woning." />
          <Duiding titel="Waarom een prijsklasse?" tekst="Beschermt de privacy van verkopers, geen exacte transactieprijs." />
        </div>
      </>
    ),
  },
  {
    actief: 3,
    paginaNummer: 5,
    render: () => (
      <>
        <Kop kicker="05 · object" titel="Object & energie" />
        <Card>
          <p className="text-[4.4px] font-bold text-ink">{building.data?.woningtype ?? "Woning"}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-full bg-parchment px-1.5 py-0.5 text-[3.6px] text-ink/60">{building.data?.oppervlakteM2}m² opp.</span>
            <span className="rounded-full bg-parchment px-1.5 py-0.5 text-[3.6px] text-ink/60">Bouwjaar {building.data?.bouwjaar}</span>
            <span className="rounded-full bg-parchment px-1.5 py-0.5 text-[3.6px] text-ink/60">{market.data?.rooms} kamers</span>
            {building.data?.inhoudM3 != null && (
              <span className="rounded-full bg-parchment px-1.5 py-0.5 text-[3.6px] text-ink/60">{building.data.inhoudM3}m³ inhoud</span>
            )}
          </div>
        </Card>
        {energy.data?.klasse && energieDuiding && (
          <Card className="bg-[#0F766E]">
            <p className="text-[3.6px] text-white/70">Energielabel</p>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-display text-[12px] font-extrabold text-white">{energy.data.klasse}</span>
              <span className="text-[3.8px] text-white/70">{energieDuiding.kwartTekst}</span>
            </div>
            <div className="mt-1 flex gap-[1px]">
              {ENERGIELABEL_SCHAAL.map((k) => (
                <span key={k} className={`h-1 flex-1 rounded-sm ${k === energy.data?.klasse ? "bg-white" : "bg-white/25"}`} />
              ))}
            </div>
          </Card>
        )}
        {energy.data?.isolatie && (
          <Card>
            <p className="text-[3.6px] font-bold text-ink">Isolatie</p>
            <div className="mt-1 grid grid-cols-4 gap-1 text-center">
              <div>
                <p className="text-[3.6px] font-semibold text-ink">{energy.data.isolatie.dak}</p>
                <p className="text-[3px] text-ink/40">dak</p>
              </div>
              <div>
                <p className="text-[3.6px] font-semibold text-ink">{energy.data.isolatie.gevel}</p>
                <p className="text-[3px] text-ink/40">gevel</p>
              </div>
              <div>
                <p className="text-[3.6px] font-semibold text-ink">{energy.data.isolatie.vloer}</p>
                <p className="text-[3px] text-ink/40">vloer</p>
              </div>
              <div>
                <p className="text-[3.6px] font-semibold text-ink">{energy.data.isolatie.beglazing}</p>
                <p className="text-[3px] text-ink/40">beglazing</p>
              </div>
            </div>
          </Card>
        )}
        <Card>
          <p className="text-[4px] font-bold text-ink">Wat betekent dit voor de stookkosten?</p>
          <p className="mt-0.5 text-[3.8px] leading-[1.5] text-ink/50">{energieDuiding?.stookkostenTekst}</p>
        </Card>
        <Duiding titel="Uitgebreid verduurzamingsadvies" tekst="Concrete maatregelen, investering en terugverdientijd — volgende pagina." />
      </>
    ),
  },
  {
    actief: 4,
    paginaNummer: 6,
    render: () => (
      <>
        <Kop kicker="06 · verduurzaming" titel="Verduurzamingsadvies" />
        <Card>
          <div className="flex items-center gap-[2px]">
            {ENERGIELABEL_SCHAAL.map((klasse) => {
              const isHuidig = klasse === verduurzaming.data?.huidigLabel;
              const isHaalbaar = klasse === verduurzaming.data?.haalbaarLabel;
              return (
                <div
                  key={klasse}
                  className={`flex h-3 flex-1 items-center justify-center rounded-sm text-[3.6px] font-bold text-white ${
                    isHuidig ? "bg-[#0F766E]" : isHaalbaar ? "bg-[#2F8A3A] ring-1 ring-white" : "bg-ink/10 text-ink/20"
                  }`}
                >
                  {(isHuidig || isHaalbaar) && klasse}
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[3.4px] font-semibold text-ink/50">
            <span>Huidig {verduurzaming.data?.huidigLabel}</span>
            <span className="text-[#0F766E]">Haalbaar {verduurzaming.data?.haalbaarLabel}</span>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-1">
          <Stat label="Investering" waarde={verduurzaming.data?.investering != null ? formatCurrency(verduurzaming.data.investering) : "-"} />
          <Stat label="Besparing/jr" waarde={verduurzaming.data?.besparingPerJaar != null ? formatCurrency(verduurzaming.data.besparingPerJaar) : "-"} kleur="text-[#0F766E]" />
          <Stat label="Terugverdientijd" waarde={verduurzamingTerugverdientijd} />
          <Stat label="Waardestijging" waarde={verduurzaming.data?.waardestijging != null ? formatCurrency(verduurzaming.data.waardestijging) : "-"} />
        </div>
        <Card className="flex flex-col gap-1">
          <p className="text-[3.6px] font-bold text-ink">Concrete maatregelen</p>
          {verduurzaming.data?.maatregelen.map((m) => (
            <div key={m.key} className="flex items-center justify-between">
              <div>
                <p className="text-[3.8px] text-ink">{m.label}</p>
                <p className="text-[3px] text-ink/40">
                  {m.van} &rarr; {m.naar}
                </p>
              </div>
              <p className="text-[3.8px] font-semibold text-ink">{formatCurrency(m.investering)}</p>
            </div>
          ))}
        </Card>
        {verduurzaming.data?.energierekeningHuidigPerJaar != null && verduurzaming.data.energierekeningNaPerJaar != null && (
          <Duiding
            titel="Energierekening"
            tekst={`Van circa ${formatCurrency(verduurzaming.data.energierekeningHuidigPerJaar)} naar ${formatCurrency(
              verduurzaming.data.energierekeningNaPerJaar,
            )} per jaar, plus ${verduurzaming.data.co2ReductieKg ?? "-"} kg minder CO₂-uitstoot. Subsidie (ISDE) kan een deel van de investering dekken.`}
          />
        )}
      </>
    ),
  },
  {
    actief: 5,
    paginaNummer: 7,
    render: () => (
      <>
        <Kop kicker="07 · fundering" titel="Funderingsrisico" />
        <Card>
          <div className="flex text-center">
            <div className="flex-1">
              <p className="text-[4.4px] font-bold text-ink">{fundering.data?.bouwjaarGebruikt}</p>
              <p className="text-[3px] text-ink/40">bouwjaar</p>
            </div>
            <div className="flex-1">
              <span className="rounded-full bg-[#E6FBF7] px-1.5 py-0.5 text-[3.8px] font-bold text-[#0F766E]">
                {fundering.data?.niveau ? fundering.data.niveau.charAt(0).toUpperCase() + fundering.data.niveau.slice(1) : "-"}
              </span>
              <p className="mt-0.5 text-[3px] text-ink/40">risiconiveau</p>
            </div>
            <div className="flex-1">
              <p className="text-[3.6px] font-semibold text-ink">{fundering.data?.bodemclassificatie ?? "-"}</p>
              <p className="text-[3px] text-ink/40">bodemclassificatie</p>
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-[4px] font-bold text-ink">Conclusie</p>
          <p className="mt-0.5 text-[3.8px] leading-[1.5] text-ink/60">{fundering.data?.duidingKern}</p>
          {fundering.data?.bodemclassificatieUitleg && (
            <p className="mt-1 text-[3.6px] leading-[1.5] text-ink/45">{fundering.data.bodemclassificatieUitleg}</p>
          )}
        </Card>
        {fundering.data?.percentageVoor1970Postcode != null && (
          <Card>
            <p className="text-[3.6px] text-ink/50">Panden vóór 1970 in dit postcodegebied</p>
            <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-parchment">
              <div className="h-[4px] bg-[#0F766E]" style={{ width: `${fundering.data.percentageVoor1970Postcode}%` }} />
            </div>
            <p className="mt-0.5 text-[4px] font-bold text-ink">{fundering.data.percentageVoor1970Postcode}%</p>
          </Card>
        )}
        {fundering.data?.duidingCaveat && <Duiding titel="Wat dit niet vaststelt" tekst={fundering.data.duidingCaveat} />}
        {fundering.data?.duidingAdvies && <Duiding titel="Advies bij twijfel" tekst={fundering.data.duidingAdvies} />}
      </>
    ),
  },
  {
    actief: 6,
    paginaNummer: 8,
    render: () => (
      <>
        <Kop kicker="08 · buurt" titel="Buurtprofiel" />
        <div className="grid grid-cols-2 gap-1">
          <Stat label="Veiligheid" waarde={veiligheidScore != null ? String(veiligheidScore).replace(".", ",") : "-"} sub={veiligheidBand ? VEILIGHEID_BAND[veiligheidBand].tekst : undefined} />
          <Stat
            label="Bebouwing"
            waarde={buurtprofiel.data?.fysiek.bevolkingsdichtheid != null ? `${Math.round(buurtprofiel.data.fysiek.bevolkingsdichtheid / 1000)}k/km²` : "-"}
          />
          <Stat label="Inwoners" waarde={buurtprofiel.data?.sociaal.inwoners != null ? buurtprofiel.data.sociaal.inwoners.toLocaleString("nl-NL") : "-"} />
          <Stat label="Eenpersoons" waarde={buurtprofiel.data?.sociaal.percentageEenpersoons != null ? `${buurtprofiel.data.sociaal.percentageEenpersoons}%` : "-"} />
          <Stat label="Met kinderen" waarde={buurtprofiel.data?.sociaal.percentageMetKinderen != null ? `${buurtprofiel.data.sociaal.percentageMetKinderen}%` : "-"} />
          <Stat
            label="Eengezinswoning"
            waarde={buurtprofiel.data?.fysiek.percentageEengezinswoning != null ? `${buurtprofiel.data.fysiek.percentageEengezinswoning}%` : "-"}
          />
        </div>
        <Card>
          <p className="text-[3.6px] font-bold text-ink">Voorzieningen in de buurt</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {buurtprofiel.data?.voorzieningen.items.slice(0, 8).map((item) => (
              <span key={item.key} className="rounded bg-parchment px-1 py-0.5 text-[3.4px] text-ink/60">
                {item.label} {item.afstandKm}km
              </span>
            ))}
          </div>
        </Card>
        <Duiding titel="Wat dit betekent voor deze buurt" tekst={buurtprofiel.data?.duiding ?? buurtprofiel.data?.samenvatting ?? ""} />
      </>
    ),
  },
  {
    actief: 7,
    paginaNummer: 9,
    render: () => (
      <>
        <Kop kicker="09 · samenvatting" titel="Samenvatting" />
        <Card className="bg-accent-dark">
          <p className="font-display text-[6px] font-extrabold leading-snug text-white">{samenvatting.titel}</p>
          <p className="mt-1 text-[3.8px] leading-[1.5] text-white/70">{samenvatting.totaalbeeld}</p>
          {market.data && (
            <span className="mt-1 inline-block rounded-full bg-white/20 px-1.5 py-0.5 text-[3.6px] font-bold text-white">
              Waarde: {formatCurrency(market.data.geschatteWaarde)}
            </span>
          )}
        </Card>
        <div className="grid grid-cols-2 gap-1">
          {samenvatting.kernstats.slice(0, 4).map((k) => (
            <Stat key={k.key} label={k.label} waarde={k.waarde} sub={k.toelichting} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Card className="flex flex-col gap-0.5">
            <p className="text-[3.4px] font-bold text-ink">Pluspunten</p>
            {samenvatting.pluspunten.slice(0, 3).map((t, i) => (
              <p key={i} className="text-[3.4px] leading-[1.4] text-ink/60">
                ✓ {t}
              </p>
            ))}
          </Card>
          <Card className="flex flex-col gap-0.5">
            <p className="text-[3.4px] font-bold text-ink">Aandachtspunten</p>
            {samenvatting.aandachtspunten.slice(0, 3).map((t, i) => (
              <p key={i} className="text-[3.4px] leading-[1.4] text-ink/60">
                ! {t}
              </p>
            ))}
          </Card>
        </div>
        <Card>
          <p className="text-[3.4px] font-bold text-ink">Wat kun je hiermee?</p>
          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
            {samenvatting.gebruiksblok.map((t, i) => (
              <p key={i} className="text-[3.4px] leading-[1.4] text-ink/55">
                &middot; {t}
              </p>
            ))}
          </div>
        </Card>
        <Duiding titel="Eindconclusie" tekst={samenvatting.eindconclusie} />
      </>
    ),
  },
  {
    actief: -1,
    render: () => (
      <div className="flex h-full flex-col items-center justify-center bg-accent-dark px-3 text-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
          <span className="font-display text-[10px] font-extrabold text-accent-dark">K</span>
        </div>
        <p className="mt-2.5 max-w-[160px] font-display text-[8px] font-extrabold leading-snug text-white">
          &ldquo;Een goed onderbouwde keuze begint niet met een gevoel, maar met de juiste feiten op een rij.&rdquo;
        </p>
        <div className="mt-2 h-[2px] w-6 rounded-full bg-sun" />
        <p className="mt-2 max-w-[150px] text-[4.6px] leading-relaxed text-white/60">
          Bedankt dat je Kooprapport bekeek voor {adres.straat} {adres.huisnummer}.
        </p>
        <div className="mt-3 flex flex-col gap-1">
          <span className="rounded-full bg-white/15 px-2 py-1 text-[4px] font-semibold text-white/80">Nog vragen? info@kooprapport.nl</span>
          <span className="rounded-full bg-white/15 px-2 py-1 text-[4px] font-semibold text-white/80">Nieuw adres opzoeken? kooprapport.nl</span>
        </div>
        <p className="mt-4 text-[4px] font-semibold tracking-wide text-white/40">KOOPRAPPORT.NL &middot; Pagina 10 van 10</p>
      </div>
    ),
  },
];

export default function VoorbeeldrapportSlider() {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0);
  const laatsteLeft = SLIDES.length - 2;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setLeft((i) => Math.min(i + 1, laatsteLeft));
      if (e.key === "ArrowLeft") setLeft((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, laatsteLeft]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLeft(0);
          setOpen(true);
        }}
        className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-ink hover:text-accent"
      >
        <FileCheckIcon className="h-3.5 w-3.5 text-accent" />
        Bekijk het echte voorbeeldrapport
        <ArrowRightIcon className="h-3 w-3 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/90 px-3 py-6" onClick={() => setOpen(false)}>
          <button
            type="button"
            aria-label="Sluiten"
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            &#10005;
          </button>

          <p className="text-[11px] uppercase tracking-wide text-white/50">
            Voorbeeldrapport &middot; {adres.straat} {adres.huisnummer}, {adres.plaats} &middot; pagina {left + 1}&ndash;{left + 2} van {SLIDES.length}
          </p>

          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Vorige paginas"
              onClick={() => setLeft((i) => Math.max(i - 1, 0))}
              disabled={left === 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:opacity-30"
            >
              &#8249;
            </button>

            <div className="flex gap-3">
              <Pagina actief={SLIDES[left].actief} paginaNummer={SLIDES[left].paginaNummer} kleur={left === SLIDES.length - 1 ? "#4338CA" : "#F5F5FA"}>
                {SLIDES[left].render()}
              </Pagina>
              <Pagina
                actief={SLIDES[left + 1].actief}
                paginaNummer={SLIDES[left + 1].paginaNummer}
                kleur={left + 1 === SLIDES.length - 1 ? "#4338CA" : "#F5F5FA"}
              >
                {SLIDES[left + 1].render()}
              </Pagina>
            </div>

            <button
              type="button"
              aria-label="Volgende paginas"
              onClick={() => setLeft((i) => Math.min(i + 1, laatsteLeft))}
              disabled={left === laatsteLeft}
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
                onClick={() => setLeft(Math.min(i, laatsteLeft))}
                className={`h-1.5 w-1.5 rounded-full ${i === left || i === left + 1 ? "bg-white" : "bg-white/30"}`}
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
