import { MARKTUPDATES } from "@/lib/content/marktupdates";
import { getRegioOverbiedVoorPlaats } from "@/lib/services/regioOverbieden";

// -----------------------------------------------------------------------------
// Twee kleine, B2B-specifieke afgeleiden bovenop bestaande, al gepubliceerde
// data -- geen nieuwe databron nodig:
//
// 1) Biedadvies: combineert de modelgeschatte woningwaarde (Altum AVM, al
//    onderdeel van elk rapport) met een overbiedpercentage tot een
//    indicatieve bandbreedte om te bieden. Wordt een plaats/gemeente
//    meegegeven én herkend in REGIO_OVERBIEDEN (lib/content/regioOverbieden.ts,
//    echte NVM COROP-cijfers per kwartaal), dan gebruikt dit het regiocijfer.
//    Anders valt het terug op het landelijke gemiddelde uit de nieuwste
//    Marktupdate. Het resultaat vermeldt altijd expliciet welk niveau is
//    gebruikt ("regio" of "landelijk") zodat de UI dit nooit als hardere
//    garantie kan presenteren dan het is -- indicatief, geen advies op maat.
//
// 2) NHG-check: of de geschatte waarde onder de actuele NHG-grens valt
//    (zelfde nhgGrens-veld dat al in de Marktupdate-content staat).
// -----------------------------------------------------------------------------

function nieuwsteMarktupdate() {
  return MARKTUPDATES[MARKTUPDATES.length - 1] ?? null;
}

// "4,6%" -> 4.6. Geeft null terug als het stat-veld ontbreekt of onherkenbaar is
// -- nooit een gegokt percentage.
function parsePercentage(waarde: string | undefined): number | null {
  if (!waarde) return null;
  const match = waarde.replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export interface Biedadvies {
  ondergrens: number;
  bovengrens: number;
  overbiedPercentage: number;
  percentageBovenVraagprijs: number | null;
  periodeLabel: string;
  marktupdateSlug: string | null;
  niveau: "regio" | "landelijk";
  regioNaam: string | null;
  bron: string;
}

// Eén gedeelde regio/landelijk-fallback-resolutie, gebruikt door zowel
// berekenBiedadvies() (B2B, één bandbreedte) als berekenBiedscenarios()
// (consumenten-tool, drie scenario's) -- zodat beide altijd exact hetzelfde
// overbiedpercentage/regiocijfer gebruiken voor hetzelfde adres, nooit twee
// losse implementaties die uiteen kunnen lopen.
interface OverbiedBasis {
  overbiedPercentage: number;
  percentageBovenVraagprijs: number | null;
  periodeLabel: string;
  marktupdateSlug: string | null;
  niveau: "regio" | "landelijk";
  regioNaam: string | null;
  bron: string;
}

function resolveOverbiedBasis(plaatsOfGemeente?: string | null): OverbiedBasis | null {
  const regio = getRegioOverbiedVoorPlaats(plaatsOfGemeente);
  if (regio) {
    return {
      overbiedPercentage: regio.gemiddeldOverbod,
      percentageBovenVraagprijs: regio.percentageBovenVraagprijs,
      periodeLabel: regio.periodeLabel,
      marktupdateSlug: null,
      niveau: "regio",
      regioNaam: regio.regio,
      bron: regio.bron,
    };
  }

  const update = nieuwsteMarktupdate();
  if (!update) return null;
  const overboden = update.landelijkeCijfers.stats.find((s) => s.label === "overboden");
  const percentage = parsePercentage(overboden?.waarde);
  if (percentage == null) return null;
  return {
    overbiedPercentage: percentage,
    percentageBovenVraagprijs: null,
    periodeLabel: update.periodeLabel,
    marktupdateSlug: update.slug,
    niveau: "landelijk",
    regioNaam: null,
    bron: `Kooprapport Marktupdate ${update.periodeLabel}`,
  };
}

// geschatteWaarde: de Altum AVM-schatting (Report.market.data.geschatteWaarde).
// plaatsOfGemeente: optioneel -- wordt gebruikt om een regiocijfer op te
// zoeken (zie regioOverbieden.ts); zonder match of zonder opgave valt dit
// terug op het landelijk gemiddelde uit de nieuwste Marktupdate.
// Ondergrens = de schatting zelf (uitgangspunt), bovengrens = schatting plus
// het gebruikte overbiedpercentage.
export function berekenBiedadvies(
  geschatteWaarde: number | null | undefined,
  plaatsOfGemeente?: string | null
): Biedadvies | null {
  if (!geschatteWaarde) return null;
  const basis = resolveOverbiedBasis(plaatsOfGemeente);
  if (!basis) return null;
  return {
    ondergrens: Math.round(geschatteWaarde),
    bovengrens: Math.round(geschatteWaarde * (1 + basis.overbiedPercentage / 100)),
    overbiedPercentage: basis.overbiedPercentage,
    percentageBovenVraagprijs: basis.percentageBovenVraagprijs,
    periodeLabel: basis.periodeLabel,
    marktupdateSlug: basis.marktupdateSlug,
    niveau: basis.niveau,
    regioNaam: basis.regioNaam,
    bron: basis.bron,
  };
}

// -----------------------------------------------------------------------------
// Consumenten-tool (/biedadvies): drie biedscenario's rond hetzelfde
// overbiedpercentage, i.p.v. één bandbreedte. "waarde" komt hier NOOIT van
// Altum (die kost credits per aanroep en wordt daarom, net als in het
// betaalde rapport zelf, nooit bij een gewone paginaweergave opgehaald) --
// de bezoeker vult 'm zelf in (vraagprijs of eigen inschatting). SCENARIO_
// MARGE is een eigen, indicatieve spreiding rond het echte NVM-gemiddelde,
// GEEN apart gepubliceerd cijfer per scenario -- vandaar altijd expliciet
// samen met een "indicatief"-toelichting getoond in de UI.
// -----------------------------------------------------------------------------
const SCENARIO_MARGE = 3;

export interface BiedScenario {
  key: "laag" | "gemiddeld" | "hoog";
  titel: string;
  toelichting: string;
  overbiedPercentage: number;
  bod: number;
}

export interface Biedscenarios {
  waarde: number;
  niveau: "regio" | "landelijk";
  regioNaam: string | null;
  percentageBovenVraagprijs: number | null;
  periodeLabel: string;
  bron: string;
  scenarios: BiedScenario[];
}

export function berekenBiedscenarios(
  geschatteWaarde: number | null | undefined,
  plaatsOfGemeente?: string | null
): Biedscenarios | null {
  if (!geschatteWaarde) return null;
  const basis = resolveOverbiedBasis(plaatsOfGemeente);
  if (!basis) return null;

  const maakScenario = (
    key: BiedScenario["key"],
    titel: string,
    toelichting: string,
    delta: number
  ): BiedScenario => {
    const overbiedPercentage = basis.overbiedPercentage + delta;
    return {
      key,
      titel,
      toelichting,
      overbiedPercentage,
      bod: Math.round(geschatteWaarde * (1 + overbiedPercentage / 100)),
    };
  };

  return {
    waarde: Math.round(geschatteWaarde),
    niveau: basis.niveau,
    regioNaam: basis.regioNaam,
    percentageBovenVraagprijs: basis.percentageBovenVraagprijs,
    periodeLabel: basis.periodeLabel,
    bron: basis.bron,
    scenarios: [
      maakScenario("laag", "Laag risico", "Grote kans dat je de woning krijgt", SCENARIO_MARGE),
      maakScenario("gemiddeld", "Gemiddeld risico", "In lijn met de meeste biedingen hier", 0),
      maakScenario("hoog", "Hoog risico", "Scherp bod, kans dat je 'm misloopt", -SCENARIO_MARGE),
    ],
  };
}

// Gedeelde weergave van een overbiedpercentage ("+8,1%", "-1,0%") -- gebruikt
// door de publieke tool (BiedadviesTool.tsx), het premium waarde-tabblad
// (ReportView.tsx) en de PDF (ReportDocument.tsx), zodat een percentage
// overal exact hetzelfde wordt geschreven.
export function formatOverbiedPercentage(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1).replace(".", ",") + "%";
}

export interface NhgCheck {
  onderGrens: boolean;
  grens: number;
  grensLabel: string;
  periodeLabel: string;
}

export function checkNhg(geschatteWaarde: number | null | undefined): NhgCheck | null {
  if (!geschatteWaarde) return null;
  const update = nieuwsteMarktupdate();
  if (!update) return null;
  return {
    onderGrens: geschatteWaarde <= update.betaalbaarheid.nhgGrens,
    grens: update.betaalbaarheid.nhgGrens,
    grensLabel: update.betaalbaarheid.nhgGrensLabel,
    periodeLabel: update.periodeLabel,
  };
}
