import type { B2bWoningMatch, B2bKoperVoorkeuren, B2bMatchVerificatie, B2bWoningtypeVoorkeur } from "@/types/b2b";
import { B2B_MIN_KAMERS_OPTIES, B2B_MIN_OPPERVLAK_OPTIES, B2B_MIN_ENERGIELABEL_OPTIES } from "@/types/b2b";
import { ENERGIELABEL_VOLGORDE_FUNDA, BUDGET_ZOEK_MARGE } from "@/lib/data-sources/fundaFeed";
import { vergelijkLocatieUitgebreid } from "@/lib/services/gebiedIndeling";

// -----------------------------------------------------------------------------
// Matchingmodel -- VEREENVOUDIGD (Sjoerd, na de visuele herontwerp-sessie van
// het zoekfilterproces: "vragenlijst echt inkorten tot alleen harde eisen" /
// "score helemaal weg, alleen voldoet/voldoet niet"). Dit bestand bevatte tot
// nu toe een 4-fasen-model (v4, Sjoerds specificatie "Nieuw Scoreproces --
// Overzicht"): Fase 0 (must-haves), Fase 1 (dealbreakers, -15), Fase 2
// (gewogen 0-100-score op basis van de gekozen prioriteiten) en Fase 3
// (trade-off-bonus op basis van de gekozen afwegingen). Sjoerd gaf expliciet
// aan dat er geen matchingsscore/ranking meer moet zijn -- een woning wordt
// simpelweg getoond zodra hij aan alle harde eisen voldoet, punt. Fase 1-3
// (en de vragen die ze voedden: dealbreakers, afwegingen, prioriteiten,
// voorzieningenwensen, parkeren -- zie types/b2b.ts) zijn daarom volledig
// verwijderd. Wat overblijft is precies Fase 0, ONGEWIJZIGD qua eisen: de 7
// harde eisen uit de opgave (budget/locatie/woningtype/kamers/oppervlak/
// buitenruimte/energielabel), PLUS "beschikbaarheid" als achtste, niet in
// Sjoerds tabel genoemde eis -- die blijft bewust bestaan, want dat is geen
// koper-voorkeur maar een advertentiestatus-check (zie de bugfix hieronder
// bij faaltBeschikbaarheid) en zonder die eis zouden verkochte/onder-bod-
// woningen weer als match terugkomen, precies de eerder opgeloste bug uit
// "Filter: alleen woningen met status beschikbaar tonen". Alles-of-niets,
// geen punten: valt een woning hier af, dan wordt hij nooit getoond.
//
// Was hier eerder ook al zo (v3 en eerder): de dure voorzieningen-opzoeking
// (CBS, zie voorzieningenMatch.ts) en de gewogen scoreberekening bestaan
// sinds deze vereenvoudiging helemaal niet meer -- voorzieningenMatch.ts
// blijft als bestand staan (nog steeds bruikbaar mocht er ooit weer een
// scorecomponent nodig zijn), maar wordt nergens meer aangeroepen.
// -----------------------------------------------------------------------------

// Welke van de 8 harde eisen niet gehaald zijn -- leeg als de kandidaat aan
// alles voldoet. `afgewezenOp` is puur voor transparantie/logging (zie de
// aanroepers), niet iets dat verder in de UI hoeft te verschijnen.
export interface HardeEisenResultaat {
  voldoet: boolean;
  afgewezenOp: string[];
}

// =============================================================================
// Harde eisen (pass/fail, geen punten, geen marge behalve waar expliciet
// toegelicht). Elke functie geeft `true` terug bij een BEVESTIGDE overtreding;
// ontbrekende data levert altijd `false` (nooit afwijzen op onze eigen
// scrapebeperking).
// =============================================================================

// NIEUW (continu budget i.p.v. buckets, zie types/b2b.ts): `maxKoopprijs` is
// nu een getal of `null` ("nog geen vast maximum"). Defensief tegen oudere
// dossiers die hier nog een bucket-string (bv. "350k_450k") hebben staan --
// `typeof === "number"` filtert die er stilzwijgend uit, zelfde behandeling
// als `null` (geen grens toegepast), i.p.v. een crash of NaN-vergelijking.
function geldigMaxKoopprijs(voorkeuren: B2bKoperVoorkeuren): number | null {
  return typeof voorkeuren.maxKoopprijs === "number" ? voorkeuren.maxKoopprijs : null;
}

function faaltBudget(prijs: number | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const max = geldigMaxKoopprijs(voorkeuren);
  if (max == null || prijs == null) return false; // "onzeker" budget of vraagprijs onbekend -- geen grens toe te passen
  // 10%-marge: dezelfde BUDGET_ZOEK_MARGE waarmee de Funda-zoekopdracht zelf
  // al scant (zie fundaFeed.ts) -- in Nederland wordt vaak boven de
  // vraagprijs geboden, dus een vraagprijs net boven het maximum sluit een
  // woning in de praktijk niet automatisch uit.
  return prijs > max * (1 + BUDGET_ZOEK_MARGE);
}

function faaltLocatie(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const { resultaat } = vergelijkLocatieUitgebreid(voorkeuren.voorkeurLocaties, verificatie?.gebiedRuw ?? null, verificatie?.plaatsnaam ?? null);
  return resultaat === "geen_match";
}

// "other" (vrije tekst, Vraag 4 "Anders") is nooit tegen een gescrapete
// waarde te verifiëren -- staat "other" in de gekozen lijst, dan wordt
// woningtype hier dus nooit een afwijzingsgrond.
function faaltWoningtype(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  if (voorkeuren.woningtypes.length === 0 || voorkeuren.woningtypes.includes("other")) return false;
  const subtype = classificeerWoningsubtype(verificatie);
  if (!subtype) return false; // niet met zekerheid te bepalen -- geen afwijzingsgrond
  return !voorkeuren.woningtypes.includes(subtype);
}

function faaltKamers(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const minKamers = B2B_MIN_KAMERS_OPTIES.find((o) => o.waarde === voorkeuren.minKamers)?.minKamers ?? 1;
  const kamers = verificatie?.kamers ?? null;
  if (kamers == null) return false;
  return kamers < minKamers;
}

function faaltOppervlak(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const minArea = B2B_MIN_OPPERVLAK_OPTIES.find((o) => o.waarde === voorkeuren.minOppervlak)?.minArea ?? 0;
  const opp = verificatie?.woonoppervlak ?? null;
  if (opp == null) return false;
  return opp < minArea;
}

function faaltBuitenruimte(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  if (voorkeuren.buitenruimte === "not_important" || voorkeuren.buitenruimte === "no_preference") return false;
  if (!verificatie) return false; // onbekend -- niet af te wijzen
  if (voorkeuren.buitenruimte === "garden_required") return !verificatie.heeftTuin;
  // balcony_ok: balkon, dakterras of tuin is voldoende -- alleen afwijzen als er ZEKER geen van de drie is.
  return !verificatie.heeftTuin && !verificatie.heeftBalkon && !verificatie.heeftDakterras;
}

function faaltEnergielabel(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const minLabel = B2B_MIN_ENERGIELABEL_OPTIES.find((o) => o.waarde === voorkeuren.minEnergielabel)?.minLabel ?? null;
  if (minLabel == null) return false; // "geen voorkeur"
  const label = verificatie?.energielabel ?? null;
  if (!label) return false;
  const rang = ENERGIELABEL_VOLGORDE_FUNDA.indexOf(label);
  if (rang === -1) return false;
  return rang > ENERGIELABEL_VOLGORDE_FUNDA.indexOf(minLabel);
}

// BEWUST een allowlist ("Beschikbaar" is de enige geldige waarde") i.p.v.
// een blocklist van bekende afwijswaarden -- zie de uitgebreide toelichting
// hierover in de git-geschiedenis van dit bestand (bugfix-sessie
// "beschikbaar-fix werkt niet"). `status: null` (rij ontbreekt, scrape
// mislukt) is zoals altijd geen afwijzingsgrond.
function faaltBeschikbaarheid(verificatie: B2bMatchVerificatie | null): boolean {
  const status = verificatie?.status ?? null;
  if (!status) return false;
  return status.trim().toLowerCase() !== "beschikbaar";
}

export function voldoetAanHardeEisen(match: B2bWoningMatch, voorkeuren: B2bKoperVoorkeuren): HardeEisenResultaat {
  const verificatie = match.verificatie;
  const checks: [string, boolean][] = [
    ["budget", faaltBudget(match.prijs, voorkeuren)],
    ["locatie", faaltLocatie(verificatie, voorkeuren)],
    ["woningtype", faaltWoningtype(verificatie, voorkeuren)],
    ["kamers", faaltKamers(verificatie, voorkeuren)],
    ["oppervlak", faaltOppervlak(verificatie, voorkeuren)],
    ["buitenruimte", faaltBuitenruimte(verificatie, voorkeuren)],
    ["energielabel", faaltEnergielabel(verificatie, voorkeuren)],
    ["beschikbaarheid", faaltBeschikbaarheid(verificatie)],
  ];
  const afgewezenOp = checks.filter(([, faalt]) => faalt).map(([key]) => key);
  return { voldoet: afgewezenOp.length === 0, afgewezenOp };
}

const HUIS_SLEUTELWOORDEN: [B2bWoningtypeVoorkeur, RegExp][] = [
  ["terraced", /tussenwoning/i],
  ["corner", /hoekwoning/i],
  ["semi_detached", /halfvrijstaand|2[\s-]onder[\s-]1[\s-]kap|twee[\s-]onder[\s-]een[\s-]kap/i],
  ["detached", /vrijstaand/i],
];

export function classificeerWoningsubtype(v: B2bMatchVerificatie | null): B2bWoningtypeVoorkeur | null {
  if (!v) return null;
  if (v.woningtypeFamilie === "huis") {
    const tekst = v.woningsubtypeRuw ?? "";
    for (const [type, regex] of HUIS_SLEUTELWOORDEN) {
      if (regex.test(tekst)) return type;
    }
    return null; // huis, maar subtype niet met zekerheid te bepalen uit de tekst
  }
  if (v.woningtypeFamilie === "appartement") {
    return /studio/i.test(v.woningsubtypeRuw ?? "") ? "studio" : "apartment";
  }
  return null;
}
