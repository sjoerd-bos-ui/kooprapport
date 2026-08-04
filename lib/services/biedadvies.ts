import { MARKTUPDATES } from "@/lib/content/marktupdates";

// -----------------------------------------------------------------------------
// Twee kleine, B2B-specifieke afgeleiden bovenop bestaande, al gepubliceerde
// data -- geen nieuwe databron nodig:
//
// 1) Biedadvies: combineert de modelgeschatte woningwaarde (Altum AVM, al
//    onderdeel van elk rapport) met het landelijke gemiddelde
//    overbiedpercentage uit de nieuwste Marktupdate, tot een indicatieve
//    bandbreedte om te bieden. UITDRUKKELIJK indicatief en landelijk
//    gemiddeld, geen garantie en geen advies op maat van deze ene woning of
//    regio -- dat wordt ook zo in de UI-tekst benoemd, nooit als hard getal
//    zonder die context.
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
  periodeLabel: string;
  marktupdateSlug: string;
}

// geschatteWaarde: de Altum AVM-schatting (Report.market.data.geschatteWaarde).
// Ondergrens = de schatting zelf (uitgangspunt), bovengrens = schatting plus
// het landelijk gemiddelde overbiedpercentage van de nieuwste Marktupdate.
export function berekenBiedadvies(geschatteWaarde: number | null | undefined): Biedadvies | null {
  if (!geschatteWaarde) return null;
  const update = nieuwsteMarktupdate();
  if (!update) return null;
  const overboden = update.landelijkeCijfers.stats.find((s) => s.label === "overboden");
  const percentage = parsePercentage(overboden?.waarde);
  if (percentage == null) return null;
  return {
    ondergrens: Math.round(geschatteWaarde),
    bovengrens: Math.round(geschatteWaarde * (1 + percentage / 100)),
    overbiedPercentage: percentage,
    periodeLabel: update.periodeLabel,
    marktupdateSlug: update.slug,
  };
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
