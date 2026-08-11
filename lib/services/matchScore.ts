import type { B2bWoningMatch, B2bKoperVoorkeuren, B2bMatchVerificatie, B2bDealbreaker, B2bPrioriteitOptie, B2bWoningtypeVoorkeur, B2bAfweging } from "@/types/b2b";
import {
  B2B_BUDGET_OPTIES,
  B2B_MIN_KAMERS_OPTIES,
  B2B_MIN_OPPERVLAK_OPTIES,
  B2B_MIN_ENERGIELABEL_OPTIES,
  B2B_VOORZIENING_WENSEN,
  B2B_DEALBREAKERS,
  B2B_AFWEGINGEN,
  B2B_PRIORITEITEN,
} from "@/types/b2b";
import { ENERGIELABEL_VOLGORDE_FUNDA, BUDGET_ZOEK_MARGE } from "@/lib/data-sources/fundaFeed";
import { vergelijkLocatieUitgebreid } from "@/lib/services/gebiedIndeling";
import { afstandTotWens, heeftDatabron, haalVoorzieningenVoorAdres, VOORZIENING_DICHTBIJ_KM, type VoorzieningenResultaat } from "@/lib/services/voorzieningenMatch";

// -----------------------------------------------------------------------------
// Matchingmodel v4 -- volledig herbouwd op Sjoerds eigen specificatie ("Nieuw
// Scoreproces -- Overzicht"), VIER fasen i.p.v. de vorige twee (v3, budget/
// locatie/etc. als losse optelpunten):
//
//   FASE 0 -- Must-haves (voldoetAanHardeEisen): ONGEWIJZIGD qua eisen (nog
//   steeds de 7 harde eisen uit de opgave, budget/locatie/woningtype/kamers/
//   oppervlak/buitenruimte/energielabel, PLUS "beschikbaarheid" als achtste,
//   niet in Sjoerds tabel genoemde eis -- die blijft bewust bestaan, want dat
//   is geen koper-voorkeur maar een advertentiestatus-check (zie de bugfix
//   hieronder bij faaltBeschikbaarheid) en zonder die eis zouden verkochte/
//   onder-bod-woningen weer als match terugkomen, precies de eerder opgeloste
//   bug uit "Filter: alleen woningen met status beschikbaar tonen"). Alles-
//   of-niets, geen punten: valt een woning hier af, dan wordt hij nooit
//   getoond en ook nooit gescoord.
//
//   FASE 1 -- Dealbreakers (evalueerDealbreakers): vlakke straf van -15 punten
//   als een woning een dealbreaker raakt, en er telt maximaal 1 dealbreaker
//   per woning mee (niet stapelend). NIEUW t.o.v. v3: "Geen parkeermogelijkheid"
//   en "Geen voorzieningen in buurt" zijn geen losse checkboxes bij Vraag 11
//   meer -- Sjoerds tabel koppelt die expliciet aan Vraag 10 resp. Vraag 9 als
//   bron, dus die worden nu AUTOMATISCH getoetst uit de daar al gegeven
//   antwoorden (zie de toelichting bij B2bDealbreaker, types/b2b.ts). De 3
//   overgebleven Vraag-11-opties (lift, energielabel, anders) blijven opt-in.
//
//   FASE 2 -- Weighted scoring (0-100): 6 criteria (locatie, prijs,
//   woninggrootte, buitenruimte, energielabel, parkeren & voorzieningen),
//   elk apart gescoord op een 0-100-schaal, en gewogen opgeteld tot één
//   score. De gewichten komen uit de bij Vraag 13 gekozen prioriteiten (max
//   3) -- zie berekenGewichten() voor het volledige mechanisme, inclusief de
//   normalisatie die nodig is om ongeacht de keuze altijd op 100% uit te
//   komen (Sjoerds tabel geeft vaste gewichten per gekozen categorie plus een
//   "restgewicht" van 5% voor de rest, en die twee tellen NIET vanzelf op tot
//   100% voor elke mogelijke combinatie van 3 -- alleen na normalisatie doet
//   dat dat wel, zie de toelichting daar).
//
//   FASE 3 -- Trade-off bonus (scoreAfwegingen): een kleine bonus (max +10)
//   op basis van de bij Vraag 12 gekozen afwegingen, ditmaal berekend op de
//   RUWE (ongewogen) Fase-2-criteriumscores van diezelfde woning.
//
//   Eindscore = Fase 2 (gewogen 0-100) - Fase 1 (0 of 15) + Fase 3 (0-10),
//   geklemd op 0-100.
//
// BELANGRIJK, contract tussen de fasen: de AANROEPER (b2bStore.ts,
// matches-verversen/route.ts, cron/matches-controleren/route.ts) is
// verantwoordelijk voor het EERST aanroepen van voldoetAanHardeEisen() en
// alleen bij `voldoet: true` berekenMatchScore() aan te roepen -- ongewijzigd
// t.o.v. v3, dat contract verandert niet. Dat is ook een bewuste
// efficiëntiewinst: de dure voorzieningen-opzoeking (CBS, zie
// voorzieningenMatch.ts) wordt zo nooit meer uitgevoerd voor een kandidaat
// die toch al afvalt op een harde eis.
// -----------------------------------------------------------------------------

// Per-item uitsplitsing voor de getabde scoretoelichting in MatchesKaart.tsx.
// Optioneel: alleen onderdelen met zinvolle sub-items vullen dit.
// `status` is puur voor kleurcodering in de UI, geen nieuw scoreconcept.
export interface MatchScoreDetailRegel {
  label: string;
  waarde: string;
  status: "goed" | "matig" | "slecht" | "onbekend";
}

export interface MatchScoreOnderdeel {
  key: string;
  label: string;
  punten: number;
  maxPunten: number;
  toelichting: string;
  detail?: MatchScoreDetailRegel[];
  // NIEUW (v4): het percentage waarmee dit onderdeel meeweegt in de
  // eindscore -- alleen gevuld bij de 6 Fase-2-criteria (zie
  // berekenGewichten()). De overige onderdelen (dealbreakers, afwegingen,
  // de weging-samenvatting) hebben geen eigen gewicht, dat blijft
  // `undefined`.
  gewicht?: number;
}

export interface MatchScore {
  totaal: number; // gekapt op 0-100 -- Fase 2 (gewogen) - Fase 1 (dealbreaker) + Fase 3 (bonus)
  ruwTotaal: number; // ongekapt (kan door de bonus tot 10 boven 100, of door de dealbreaker tot 15 onder 0 uitkomen) -- transparantie
  onderdelen: MatchScoreOnderdeel[];
  // Labels van de geraakte dealbreaker(s) -- vrije strings i.p.v. B2bDealbreaker,
  // want "Geen parkeermogelijkheid"/"Geen voorzieningen in buurt" zijn sinds
  // v4 geen keuzewaarden meer (zie types/b2b.ts) maar worden hier los als tekst
  // gerapporteerd.
  dealbreakersGetriggerd: string[];
}

// Welke van de 8 harde eisen niet gehaald zijn -- leeg als de kandidaat aan
// alles voldoet. `afgewezenOp` is puur voor transparantie/logging (zie de
// aanroepers), niet iets dat verder in de UI hoeft te verschijnen.
export interface HardeEisenResultaat {
  voldoet: boolean;
  afgewezenOp: string[];
}

function euro(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function clamp(waarde: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, waarde));
}

// =============================================================================
// FASE 0 -- must-haves (pass/fail, geen punten, geen marge behalve waar
// expliciet toegelicht). Elke functie geeft `true` terug bij een BEVESTIGDE
// overtreding; ontbrekende data levert altijd `false` (nooit afwijzen op
// onze eigen scrapebeperking). Ongewijzigd t.o.v. v3 -- zie de toelichting
// bovenaan dit bestand voor waarom "beschikbaarheid" hier als 8e eis bij
// blijft staan, ook al noemt Sjoerds nieuwe tabel alleen de eerste 7.
// =============================================================================

function faaltBudget(prijs: number | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const max = B2B_BUDGET_OPTIES.find((o) => o.waarde === voorkeuren.maxKoopprijs)?.max ?? null;
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

// =============================================================================
// FASE 1 -- dealbreakers. Vlakke straf van -15 als er minimaal 1 geraakt
// wordt (nooit stapelend, zie Sjoerds regel "maximaal 1 dealbreaker per
// woning telt"). Twee automatische checks (geen opt-in nodig, bron is Vraag
// 10 resp. Vraag 9) plus de 3 opt-in-checkboxes uit Vraag 11.
// =============================================================================

// Gedeeld met scoreParkerenVoorzieningenCriterium (Fase 2) -- "geen enkele
// parkeermogelijkheid" is dezelfde feitelijke toestand, ongeacht of het hier
// als dealbreaker of daar als scorecomponent gebruikt wordt.
function heeftGeenParkeermogelijkheid(verificatie: B2bMatchVerificatie | null): boolean {
  if (!verificatie) return false;
  return !verificatie.heeftEigenParkeerplek && /geen\s+parkeer/i.test(verificatie.parkeerOmschrijving ?? "");
}

// Gedeeld met scoreParkerenVoorzieningenCriterium (Fase 2) -- "geen van de
// gekozen voorzieningen binnen fietsafstand" is ook daar het signaal voor een
// slechte voorzieningenscore, hier voor de dealbreaker.
function heeftGeenEnkeleVoorzieningInBuurt(voorkeuren: B2bKoperVoorkeuren, voorzieningen: VoorzieningenResultaat): boolean {
  if (!voorzieningen.gevonden) return false;
  const wensenMetDatabron = voorkeuren.belangrijkeVoorzieningen.filter(heeftDatabron);
  if (wensenMetDatabron.length === 0) return false;
  return wensenMetDatabron.every((w) => {
    const afstand = afstandTotWens(voorzieningen.items, w);
    return afstand == null || afstand > VOORZIENING_DICHTBIJ_KM;
  });
}

function isOptInDealbreakerGetriggerd(db: Exclude<B2bDealbreaker, "other">, verificatie: B2bMatchVerificatie | null): boolean {
  switch (db) {
    case "ground_floor_no_elevator":
      return verificatie ? verificatie.woonlaag != null && verificatie.woonlaag > 0 && !verificatie.heeftLift : false;
    case "poor_energy_label": {
      // Eigen, vaste grens ("lager dan C") -- los van de harde eis uit Vraag 8,
      // die de KOPER-gekozen ondergrens gebruikt.
      const rang = verificatie?.energielabel ? ENERGIELABEL_VOLGORDE_FUNDA.indexOf(verificatie.energielabel) : -1;
      return rang !== -1 && rang > ENERGIELABEL_VOLGORDE_FUNDA.indexOf("C");
    }
    default:
      return false;
  }
}

// Defensief tegen bestaande dossiers met een inmiddels verwijderde waarde
// ("no_parking"/"no_amenities", nu automatisch i.p.v. opt-in, of oudere
// waarden als "too_far_from_work"/"busy_road_noise") nog in `dealbreakers` --
// zelfde patroon als eerder bij "workplace"/"park"/"quiet_location": zo'n
// stale waarde mag hier nooit meer meetellen of crashen.
function evalueerDealbreakers(
  verificatie: B2bMatchVerificatie | null,
  voorzieningen: VoorzieningenResultaat,
  voorkeuren: B2bKoperVoorkeuren
): { getriggerd: string[]; onderdeel: MatchScoreOnderdeel } {
  const detail: MatchScoreDetailRegel[] = [];
  const getriggerd: string[] = [];

  // Automatisch #1: "Geen parkeermogelijkheid" -- bron Vraag 10, alleen
  // relevant als de koper daar "eigen plek verplicht" koos (zie Sjoerds
  // tabel: "Geen parkeermogelijkheid (bij 'eigen plek verplicht')").
  if (voorkeuren.parkeren === "private_required") {
    const geraakt = heeftGeenParkeermogelijkheid(verificatie);
    if (geraakt) getriggerd.push("Geen parkeermogelijkheid");
    detail.push({ label: "Geen parkeermogelijkheid", waarde: geraakt ? "geraakt" : "niet geraakt", status: geraakt ? "slecht" : "goed" });
  }

  // Automatisch #2: "Geen voorzieningen in buurt" -- bron Vraag 9, alleen
  // relevant als daar iets met een echte databron gekozen is.
  const wensenMetDatabron = voorkeuren.belangrijkeVoorzieningen.filter(heeftDatabron);
  if (wensenMetDatabron.length > 0) {
    const geraakt = heeftGeenEnkeleVoorzieningInBuurt(voorkeuren, voorzieningen);
    if (geraakt) getriggerd.push("Geen voorzieningen in buurt");
    detail.push({ label: "Geen voorzieningen in buurt", waarde: geraakt ? "geraakt" : "niet geraakt", status: geraakt ? "slecht" : "goed" });
  }

  // Opt-in: Vraag 11 (lift, energielabel, anders).
  const optIn = voorkeuren.dealbreakers.filter((db) => B2B_DEALBREAKERS.some((o) => o.waarde === db));
  for (const db of optIn) {
    const label = B2B_DEALBREAKERS.find((o) => o.waarde === db)?.label ?? db;
    if (db === "other") {
      detail.push({ label, waarde: "handmatig te beoordelen", status: "onbekend" });
      continue;
    }
    const geraakt = isOptInDealbreakerGetriggerd(db as Exclude<B2bDealbreaker, "other">, verificatie);
    if (geraakt) getriggerd.push(label);
    detail.push({ label, waarde: geraakt ? "geraakt" : "niet geraakt", status: geraakt ? "slecht" : "goed" });
  }

  // "Maximaal 1 dealbreaker per woning telt" -- vlakke straf, geen stapeling.
  const punten = getriggerd.length > 0 ? -15 : 0;
  return {
    getriggerd,
    onderdeel: {
      key: "dealbreakers",
      label: "Dealbreakers",
      punten,
      maxPunten: 0,
      toelichting:
        getriggerd.length > 0
          ? `Raakt ${getriggerd.length > 1 ? `${getriggerd.length} dealbreakers` : "een dealbreaker"} (${getriggerd.join(", ")}) -- telt als één straf van 15 punten.`
          : "Geen dealbreakers geraakt.",
      detail,
    },
  };
}

// =============================================================================
// FASE 2 -- gewogen score (0-100). Elk criterium levert zelf al een 0-100-
// score op; berekenGewichten() bepaalt daarna hoe zwaar elk criterium
// meeweegt in de eindscore, op basis van de bij Vraag 13 gekozen
// prioriteiten (max 3).
// =============================================================================

// Vaste gewichten uit Sjoerds tabel (Stap 2A) -- categorieën die NIET als
// prioriteit gekozen zijn, krijgen in plaats daarvan het vaste restgewicht.
// Bewust een losse RUWE-gewichten-stap gevolgd door normalisatie: de 6
// tabelgewichten (25+20+20+15+10+10) tellen zelf al op tot 100%, maar zodra
// je (zoals de opgave voorschrijft) maar 3 daarvan gebruikt en de overige 3
// vervangt door "elk 5%", tellen die twee groepen NIET meer vanzelf op tot
// 100% -- welke 3 gekozen zijn bepaalt de ruwe som (bv. bij Locatie+Prijs+
// Woninggrootte: 25+20+20 + 3x5 = 80%, niet 100%). Normaliseren (elk
// aandeel delen door de totale ruwe som) is de enige manier om, ongeacht
// welke 3 gekozen zijn, altijd exact op 100% uit te komen -- zoals de opgave
// expliciet vermeldt ("Totaal = 100%").
const PRIORITEIT_TABELGEWICHT: Record<B2bPrioriteitOptie, number> = {
  location: 25,
  price: 20,
  size: 20,
  outdoor_space: 15,
  energy_efficiency: 10,
  parking_amenities: 10,
};
const RESTGEWICHT = 5;

function berekenGewichten(gekozenPrioriteiten: B2bPrioriteitOptie[]): Record<B2bPrioriteitOptie, number> {
  const alleCategorieen = B2B_PRIORITEITEN.map((o) => o.waarde);
  const ruw: Partial<Record<B2bPrioriteitOptie, number>> = {};
  for (const cat of alleCategorieen) {
    ruw[cat] = gekozenPrioriteiten.includes(cat) ? PRIORITEIT_TABELGEWICHT[cat] : RESTGEWICHT;
  }
  const som = alleCategorieen.reduce((s, c) => s + (ruw[c] ?? RESTGEWICHT), 0);
  const genormaliseerd: Partial<Record<B2bPrioriteitOptie, number>> = {};
  for (const cat of alleCategorieen) {
    genormaliseerd[cat] = som > 0 ? ((ruw[cat] ?? RESTGEWICHT) / som) * 100 : 100 / alleCategorieen.length;
  }
  return genormaliseerd as Record<B2bPrioriteitOptie, number>;
}

// --- Locatie ---------------------------------------------------------------
// Zelfde tiers als v3 (1e/2e/3e gekozen locatie), nu uitgedrukt op een
// 0-100-schaal i.p.v. punten van 20.
function scoreLocatieCriterium(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): { score: number; toelichting: string } {
  const { resultaat, exacteIndex } = vergelijkLocatieUitgebreid(voorkeuren.voorkeurLocaties, verificatie?.gebiedRuw ?? null, verificatie?.plaatsnaam ?? null);
  if (resultaat === "exact" && exacteIndex != null) {
    if (exacteIndex === 0) return { score: 100, toelichting: "Ligt in de eerst gekozen voorkeurslocatie." };
    if (exacteIndex === 1) return { score: 75, toelichting: "Ligt in de op één na gekozen voorkeurslocatie." };
    return { score: 50, toelichting: "Ligt in een gekozen voorkeurslocatie." };
  }
  if (resultaat === "geen_match") {
    // Zou hier niet moeten voorkomen (fase 0 wijst dit al af) -- defensief gehouden.
    return { score: 0, toelichting: "Ligt buiten de gekozen voorkeurslocaties." };
  }
  return { score: 60, toelichting: "Ligging kon niet met zekerheid worden bevestigd." };
}

// --- Prijs -------------------------------------------------------------------
// Letterlijk Sjoerds formule: 100 x (1 - prijs/max_budget), goedkoper = hoger,
// geklemd op 0-100 (een prijs op of net boven het budget scoort dus 0, nooit
// negatief).
function scorePrijsCriterium(prijs: number | null, voorkeuren: B2bKoperVoorkeuren): { score: number; toelichting: string } {
  const max = B2B_BUDGET_OPTIES.find((o) => o.waarde === voorkeuren.maxKoopprijs)?.max ?? null;
  if (max == null || prijs == null) {
    return { score: 65, toelichting: "Budget of vraagprijs niet met zekerheid vast te stellen." };
  }
  const score = clamp(Math.round((1 - prijs / max) * 100), 0, 100);
  return { score, toelichting: `${euro(prijs)} t.o.v. het opgegeven budget van max. ${euro(max)}.` };
}

// --- Woninggrootte (kamers + oppervlak, gemiddeld) ----------------------------
// "Lineair geschaald" (Sjoerds tabel): bij precies het gevraagde minimum 50
// punten (net voldoende, fase 0 garandeert dat het nooit lager is), en
// daarna lineair oplopend tot 100 -- elke kamer boven het minimum +25 punten
// (dus 2 kamers extra is al de volle 100), elke m² boven het minimum +2
// punten (dus 25 m² extra is al de volle 100, zelfde ijkpunt als de oude
// v3-tiers voor oppervlak). "Geen minimum" (Vraag 6) heeft geen zinvol
// ijkpunt om vanaf te schalen, dus valt terug op vaste, absolute
// groottetiers.
function scoreKamersSub(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): number {
  const minKamers = B2B_MIN_KAMERS_OPTIES.find((o) => o.waarde === voorkeuren.minKamers)?.minKamers ?? 1;
  const kamers = verificatie?.kamers ?? null;
  if (kamers == null) return 65;
  return clamp(50 + (kamers - minKamers) * 25, 0, 100);
}

function scoreOppervlakSub(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): number {
  const minArea = B2B_MIN_OPPERVLAK_OPTIES.find((o) => o.waarde === voorkeuren.minOppervlak)?.minArea ?? 0;
  const opp = verificatie?.woonoppervlak ?? null;
  if (opp == null) return 65;
  if (minArea === 0) {
    if (opp < 50) return 30;
    if (opp < 80) return 50;
    if (opp < 120) return 75;
    return 100;
  }
  return clamp(50 + (opp - minArea) * 2, 0, 100);
}

function scoreWoninggrootteCriterium(
  verificatie: B2bMatchVerificatie | null,
  voorkeuren: B2bKoperVoorkeuren
): { score: number; toelichting: string; detail: MatchScoreDetailRegel[] } {
  const kamersScore = scoreKamersSub(verificatie, voorkeuren);
  const oppervlakScore = scoreOppervlakSub(verificatie, voorkeuren);
  const score = Math.round((kamersScore + oppervlakScore) / 2);
  const kamers = verificatie?.kamers ?? null;
  const opp = verificatie?.woonoppervlak ?? null;
  const detail: MatchScoreDetailRegel[] = [
    { label: "Kamers", waarde: kamers != null ? `${kamers} kamers (${kamersScore}/100)` : "onbekend", status: kamersScore >= 75 ? "goed" : kamersScore >= 50 ? "matig" : "onbekend" },
    { label: "Oppervlak", waarde: opp != null ? `${opp} m² (${oppervlakScore}/100)` : "onbekend", status: oppervlakScore >= 75 ? "goed" : oppervlakScore >= 50 ? "matig" : "onbekend" },
  ];
  return { score, toelichting: `Gemiddelde van kamers- en oppervlaktescore (${kamersScore}/100 en ${oppervlakScore}/100).`, detail };
}

// --- Buitenruimte --------------------------------------------------------------
// Sjoerds tabel: 100 (tuin), 75 (balkon/dakterras), 50 ("geen voorkeur maar
// wel iets"), 0 (niets). De 50-rij is alleen zinvol te lezen als "niets
// aanwezig, maar de koper vond dit toch al niet belangrijk" -- anders zou hij
// nooit bereikt worden (tuin/balkon/dakterras worden al door de eerste twee
// rijen afgevangen). Bij "niets aanwezig" én de koper had wél een voorkeur
// (balcony_ok, zonder dat fase 0 dat al garandeert) is 0 de eerlijke score.
function scoreBuitenruimteCriterium(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): { score: number; toelichting: string } {
  if (!verificatie) return { score: 60, toelichting: "Aanwezigheid van buitenruimte kon niet worden vastgesteld." };
  if (verificatie.heeftTuin) return { score: 100, toelichting: "Heeft een tuin." };
  if (verificatie.heeftBalkon || verificatie.heeftDakterras) return { score: 75, toelichting: "Heeft een balkon of dakterras." };
  if (voorkeuren.buitenruimte === "no_preference" || voorkeuren.buitenruimte === "not_important") {
    return { score: 50, toelichting: "Geen buitenruimte aanwezig, maar dat was voor deze koper niet belangrijk." };
  }
  return { score: 0, toelichting: "Geen buitenruimte aanwezig." };
}

// --- Energielabel ----------------------------------------------------------------
// Sjoerds tabel: 100 (A/A+), 85 (B), 70 (C), 50 (D), 25 (E/F) -- "G" staat er
// niet apart bij, hier bewust in dezelfde onderste tier als E/F gehouden
// (geen aparte, nog lagere waarde bedacht die niet in de opgave staat).
function scoreEnergielabelCriterium(verificatie: B2bMatchVerificatie | null): { score: number; toelichting: string } {
  const label = verificatie?.energielabel ?? null;
  if (!label) return { score: 65, toelichting: "Energielabel kon niet worden vastgesteld." };
  const rang = ENERGIELABEL_VOLGORDE_FUNDA.indexOf(label);
  if (rang === -1) return { score: 65, toelichting: "Energielabel kon niet worden vastgesteld." };
  if (rang <= ENERGIELABEL_VOLGORDE_FUNDA.indexOf("A")) return { score: 100, toelichting: `Label ${label}.` };
  if (rang === ENERGIELABEL_VOLGORDE_FUNDA.indexOf("B")) return { score: 85, toelichting: `Label ${label}.` };
  if (rang === ENERGIELABEL_VOLGORDE_FUNDA.indexOf("C")) return { score: 70, toelichting: `Label ${label}.` };
  if (rang === ENERGIELABEL_VOLGORDE_FUNDA.indexOf("D")) return { score: 50, toelichting: `Label ${label}.` };
  return { score: 25, toelichting: `Label ${label}.` };
}

// --- Parkeren & voorzieningen (gemiddeld) ---------------------------------------
// Twee losse sub-scores, elk al bestaand uit v3 (parkeren-logica ongewijzigd,
// alleen herschaald van 0-5 naar 0-100; voorzieningen-logica ongewijzigd,
// herschaald van 0-8 naar 0-100), nu samengevoegd tot één Fase-2-criterium
// omdat Sjoerds gewichtstabel ze als één categorie behandelt ("Parkeren/
// voorzieningen").
function scoreParkerenSub(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): number {
  if (voorkeuren.parkeren === "no_car") return 100;
  const heeftEigen = verificatie?.heeftEigenParkeerplek ?? null;
  const omschrijving = verificatie?.parkeerOmschrijving ?? "";
  const geenParkerenTekst = /geen\s+parkeer/i.test(omschrijving);
  const heeftPubliek = omschrijving.length > 0 && !geenParkerenTekst;

  if (voorkeuren.parkeren === "private_required") {
    if (heeftEigen === true) return 100;
    if (heeftEigen == null) return 60;
    if (geenParkerenTekst) return 0;
    return 40;
  }
  if (voorkeuren.parkeren === "private_preferred") {
    if (heeftEigen === true) return 100;
    if (geenParkerenTekst) return 0;
    if (heeftPubliek || heeftEigen == null) return 60;
    return 0;
  }
  // public_ok
  if (geenParkerenTekst && heeftEigen !== true) return 0;
  return 100;
}

function scoreVoorzieningenSub(
  voorkeuren: B2bKoperVoorkeuren,
  voorzieningen: VoorzieningenResultaat
): { score: number; toelichting: string; detail: MatchScoreDetailRegel[] } {
  const gekozen = voorkeuren.belangrijkeVoorzieningen.filter((w) => B2B_VOORZIENING_WENSEN.some((o) => o.waarde === w));
  if (gekozen.length === 0) {
    // BEWUST neutraal (niet 0): dit criterium is sinds v4 een gemiddelde met
    // Parkeren, en "geen voorzieningenwens opgegeven" mag die combinatie niet
    // onterecht omlaag trekken voor een koper die daar simpelweg niets over
    // heeft ingevuld.
    return { score: 60, toelichting: "Geen voorzieningen als belangrijk aangegeven -- neutraal meegewogen.", detail: [] };
  }
  const tiers = gekozen.map((wens) => {
    const afstand = afstandTotWens(voorzieningen.items, wens);
    if (afstand == null) return 6;
    if (afstand <= 1) return 10;
    if (afstand <= VOORZIENING_DICHTBIJ_KM) return 6;
    return 2;
  });
  const gemiddelde = tiers.reduce((a, b) => a + b, 0) / tiers.length;
  const score = clamp(Math.round((gemiddelde / 10) * 100), 0, 100);
  const detail: MatchScoreDetailRegel[] = gekozen.map((wens) => {
    const label = B2B_VOORZIENING_WENSEN.find((o) => o.waarde === wens)?.label ?? wens;
    const afstand = afstandTotWens(voorzieningen.items, wens);
    if (afstand == null) return { label, waarde: "onbekend", status: "onbekend" };
    if (afstand <= 1) return { label, waarde: `${afstand.toFixed(1)} km`, status: "goed" };
    if (afstand <= VOORZIENING_DICHTBIJ_KM) return { label, waarde: `${afstand.toFixed(1)} km`, status: "matig" };
    return { label, waarde: `${afstand.toFixed(1)} km`, status: "slecht" };
  });
  return { score, toelichting: `Scoort gemiddeld ${gemiddelde.toFixed(1)}/10 over de ${gekozen.length} opgegeven voorziening(en).`, detail };
}

function scoreParkerenVoorzieningenCriterium(
  verificatie: B2bMatchVerificatie | null,
  voorkeuren: B2bKoperVoorkeuren,
  voorzieningen: VoorzieningenResultaat
): { score: number; toelichting: string; detail: MatchScoreDetailRegel[] } {
  const parkerenScore = scoreParkerenSub(verificatie, voorkeuren);
  const voorz = scoreVoorzieningenSub(voorkeuren, voorzieningen);
  const score = Math.round((parkerenScore + voorz.score) / 2);
  const detail: MatchScoreDetailRegel[] = [
    { label: "Parkeren", waarde: `${parkerenScore}/100`, status: parkerenScore >= 75 ? "goed" : parkerenScore >= 40 ? "matig" : "slecht" },
    ...voorz.detail,
  ];
  return { score, toelichting: `Gemiddelde van parkeren- en voorzieningenscore (${parkerenScore}/100 en ${voorz.score}/100). ${voorz.toelichting}`, detail };
}

// =============================================================================
// FASE 3 -- trade-off bonus (max +10). Elke conditie gebruikt de RUWE
// (ongewogen) Fase-2-criteriumscores van dezelfde woning -- niet de
// gewichten, die spelen hier geen rol.
// =============================================================================

function isOudeWoning(verificatie: B2bMatchVerificatie | null): boolean {
  const bouwjaar = verificatie?.bouwjaar ?? null;
  return bouwjaar != null && bouwjaar < 1970;
}

interface Fase2RuweScores {
  locatie: number;
  prijs: number;
  woninggrootte: number;
  buitenruimte: number;
  energielabel: number;
}

function scoreAfwegingen(voorkeuren: B2bKoperVoorkeuren, verificatie: B2bMatchVerificatie | null, scores: Fase2RuweScores): MatchScoreOnderdeel {
  const basis = { key: "afwegingen", label: "Inleveren", maxPunten: 10 };
  const gekozen = voorkeuren.afwegingen.filter((a) => B2B_AFWEGINGEN.some((o) => o.waarde === a));
  if (gekozen.length === 0) {
    return { ...basis, punten: 0, toelichting: "Geen afwegingen opgegeven." };
  }
  if (gekozen.includes("no_tradeoffs")) {
    return {
      ...basis,
      punten: 0,
      toelichting: "Wil nergens op inleveren -- geen bonus toegepast.",
      detail: [{ label: "Ik wil niet inleveren", waarde: "geselecteerd", status: "onbekend" }],
    };
  }

  const check: Record<Exclude<B2bAfweging, "no_tradeoffs">, () => boolean> = {
    smaller_for_location: () => scores.locatie >= 75 && scores.woninggrootte <= 50,
    older_for_space: () => isOudeWoning(verificatie) && scores.woninggrootte >= 75,
    less_outdoor_for_price: () => scores.prijs >= 80 && scores.buitenruimte <= 50,
    worse_energy_for_price: () => scores.prijs >= 80 && scores.energielabel <= 60,
  };

  let aantalGeraakt = 0;
  const detail: MatchScoreDetailRegel[] = gekozen.map((a) => {
    const label = B2B_AFWEGINGEN.find((o) => o.waarde === a)?.label ?? a;
    const test = check[a as Exclude<B2bAfweging, "no_tradeoffs">];
    const geraakt = test?.() ?? false;
    if (geraakt) {
      aantalGeraakt++;
      return { label, waarde: "van toepassing (+5)", status: "goed" };
    }
    return { label, waarde: "niet van toepassing bij deze woning", status: "onbekend" };
  });

  const punten = Math.min(10, aantalGeraakt * 5);
  return {
    ...basis,
    punten,
    toelichting:
      aantalGeraakt > 0
        ? `${aantalGeraakt} opgegeven afweging(en) van toepassing bij deze woning (+${punten} punten).`
        : "Geen van de opgegeven afwegingen is bij deze woning van toepassing.",
    detail,
  };
}

// Puur informatieve samenvatting van de weging (Fase 2) -- telt zelf niet mee
// in ruwTotaal/totaal (die worden hierboven al expliciet berekend uit de 6
// criteriumscores), maar maakt in de UI zichtbaar hoe de gekozen prioriteiten
// zich vertalen naar het daadwerkelijke gewicht per categorie.
function bouwWegingOnderdeel(gekozenPrioriteiten: B2bPrioriteitOptie[], gewichten: Record<B2bPrioriteitOptie, number>): MatchScoreOnderdeel {
  const detail: MatchScoreDetailRegel[] = B2B_PRIORITEITEN.map((o) => {
    const gekozen = gekozenPrioriteiten.includes(o.waarde);
    const gewicht = gewichten[o.waarde] ?? 0;
    return { label: o.label, waarde: `${gewicht.toFixed(0)}% weging`, status: gekozen ? "goed" : "onbekend" };
  });
  return {
    key: "weging",
    label: "Weging",
    punten: gekozenPrioriteiten.length,
    maxPunten: 3,
    toelichting:
      gekozenPrioriteiten.length > 0
        ? `${gekozenPrioriteiten.length} prioriteit(en) gekozen -- die wegen zwaarder mee in de eindscore, de rest krijgt een vast restgewicht van ${RESTGEWICHT}%.`
        : "Geen prioriteiten opgegeven -- alle onderdelen wegen even zwaar mee.",
    detail,
  };
}

// -----------------------------------------------------------------------------
// Alleen aanroepen voor kandidaten die voldoetAanHardeEisen() al gehaald
// hebben (zie de toelichting bovenaan dit bestand) -- deze functie gaat daar
// zelf niet meer op controleren.
export async function berekenMatchScore(match: B2bWoningMatch, voorkeuren: B2bKoperVoorkeuren | null): Promise<MatchScore> {
  if (!voorkeuren) {
    return { totaal: 0, ruwTotaal: 0, onderdelen: [], dealbreakersGetriggerd: [] };
  }

  const verificatie = match.verificatie;

  // Voorzieningen -- alleen ophalen als er ook daadwerkelijk iets mee gedaan
  // wordt (Vraag 9 heeft een wens met databron), en alleen voor kandidaten
  // die fase 0 al gehaald hebben (zie de aanroepers). Dat is precies waar de
  // kostenbesparing zit -- ongewijzigd t.o.v. v3.
  const heeftVoorzieningenBehoefte = voorkeuren.belangrijkeVoorzieningen.some(heeftDatabron);
  const voorzieningen: VoorzieningenResultaat = heeftVoorzieningenBehoefte
    ? await haalVoorzieningenVoorAdres(match.titel)
    : { gevonden: false, items: [] };

  const gekozenPrioriteiten = voorkeuren.prioriteiten.filter((p) => B2B_PRIORITEITEN.some((o) => o.waarde === p));
  const gewichten = berekenGewichten(gekozenPrioriteiten);

  const locatieRuw = scoreLocatieCriterium(verificatie, voorkeuren);
  const prijsRuw = scorePrijsCriterium(match.prijs, voorkeuren);
  const woninggrootteRuw = scoreWoninggrootteCriterium(verificatie, voorkeuren);
  const buitenruimteRuw = scoreBuitenruimteCriterium(verificatie, voorkeuren);
  const energielabelRuw = scoreEnergielabelCriterium(verificatie);
  const parkerenVoorzieningenRuw = scoreParkerenVoorzieningenCriterium(verificatie, voorkeuren, voorzieningen);

  function fase2Onderdeel(key: string, label: string, ruw: { score: number; toelichting: string; detail?: MatchScoreDetailRegel[] }, gewichtKey: B2bPrioriteitOptie): MatchScoreOnderdeel {
    return {
      key,
      label,
      punten: ruw.score,
      maxPunten: 100,
      gewicht: Math.round(gewichten[gewichtKey] * 10) / 10,
      toelichting: ruw.toelichting,
      detail: ruw.detail,
    };
  }

  const locatie = fase2Onderdeel("locatie", "Locatie", locatieRuw, "location");
  const prijs = fase2Onderdeel("prijs", "Prijs", prijsRuw, "price");
  const woninggrootte = fase2Onderdeel("woninggrootte", "Woninggrootte", woninggrootteRuw, "size");
  const buitenruimte = fase2Onderdeel("buitenruimte", "Buitenruimte", buitenruimteRuw, "outdoor_space");
  const energielabel = fase2Onderdeel("energielabel", "Energielabel", energielabelRuw, "energy_efficiency");
  const parkerenVoorzieningen = fase2Onderdeel("parkeren_voorzieningen", "Parkeren & voorzieningen", parkerenVoorzieningenRuw, "parking_amenities");

  const fase2Criteria = [locatie, prijs, woninggrootte, buitenruimte, energielabel, parkerenVoorzieningen];
  const fase2Score = fase2Criteria.reduce((som, o) => som + (o.punten * (o.gewicht ?? 0)) / 100, 0);

  const { getriggerd, onderdeel: dealbreakerOnderdeel } = evalueerDealbreakers(verificatie, voorzieningen, voorkeuren);
  const dealbreakerStraf = dealbreakerOnderdeel.punten < 0 ? Math.abs(dealbreakerOnderdeel.punten) : 0;

  const afwegingen = scoreAfwegingen(voorkeuren, verificatie, {
    locatie: locatieRuw.score,
    prijs: prijsRuw.score,
    woninggrootte: woninggrootteRuw.score,
    buitenruimte: buitenruimteRuw.score,
    energielabel: energielabelRuw.score,
  });

  const weging = bouwWegingOnderdeel(gekozenPrioriteiten, gewichten);

  const ruwTotaal = fase2Score - dealbreakerStraf + afwegingen.punten;
  const totaal = clamp(Math.round(ruwTotaal), 0, 100);

  const onderdelen = [locatie, prijs, woninggrootte, buitenruimte, energielabel, parkerenVoorzieningen, dealbreakerOnderdeel, afwegingen, weging];

  return { totaal, ruwTotaal: Math.round(ruwTotaal * 10) / 10, onderdelen, dealbreakersGetriggerd: getriggerd };
}
