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
// Matchingmodel v3 -- TWEE FASEN, i.p.v. één grote optelsom (zie het Cowork-
// gesprek "ik twijfel over ons filtersysteem met punten; een match kan 90
// punten krijgen die in een heel ander gebied ligt").
//
// Het probleem met v2 (één optelsom van 10 gewogen componenten): locatie was
// maar 20 van de ~108 punten, dus een woning kon op de overige negen
// onderdelen zo goed scoren dat een fout gebied (of te duur, verkeerd type,
// te klein, etc.) volledig gecompenseerd werd. Voor iets fundamenteels als
// "ligt dit in het gebied dat ik wil" hoort geen compensatie te bestaan.
//
// v3 knipt dit in tweeën:
//   FASE 1 -- voldoetAanHardeEisen(): 8 harde eisen (budget, locatie,
//   woningtype, kamers, oppervlak, buitenruimte, energielabel,
//   beschikbaarheid), ALTIJD verplicht, geen koper-instelbaar vinkje (Sjoerd
//   expliciet: "vinkje aan, stop daarmee anders vult diegene dat niet in").
//   Voldoet een kandidaat niet aan ÉÉN van de 8, dan is het sowieso geen
//   match -- geen punten, geen
//   compensatie, geen uitzondering. Alleen een BEVESTIGDE overtreding leidt
//   tot afwijzing; ontbrekende scrapegegevens zijn nooit een afwijzingsgrond
//   (zelfde discipline als altijd in dit project).
//
//   FASE 2 -- berekenMatchScore(): een score, ALLEEN bedoeld om overlevers
//   van fase 1 onderling te rangschikken, nooit om een afwijzing van fase 1
//   goed te maken (dat kan ook niet: fase 2 wordt pas berekend voor
//   kandidaten die fase 1 al gehaald hebben). Waar v2 per onderdeel scoorde
//   op "voldoet het aan het minimum", scoort v3 op "hoeveel BETER dan het
//   gevraagde minimum is dit" -- want "voldoet het" is al fase 1's taak, en
//   zou anders voor bijna elke overlever hetzelfde (het maximum) opleveren,
//   wat niets meer zou onderscheiden.
//
// BELANGRIJK, contract tussen de twee fasen: de AANROEPER (b2bStore.ts,
// matches-verversen/route.ts, cron/matches-controleren/route.ts) is
// verantwoordelijk voor het EERST aanroepen van voldoetAanHardeEisen() en
// alleen bij `voldoet: true` berekenMatchScore() aan te roepen. Dat is ook
// een bewuste efficiëntiewinst: de dure voorzieningen-opzoeking (CBS, zie
// voorzieningenMatch.ts) wordt zo nooit meer uitgevoerd voor een kandidaat
// die toch al afvalt op een harde eis.
//
// DEALBREAKERS (Vraag 11): vier van de oorspronkelijke opties overlapten nu
// volledig met een harde eis uit fase 1 ("Minder kamers dan gewenst",
// "Kleinere oppervlakte dan gewenst", "Geen tuin/balkon", "Prijs boven
// budget") -- die kunnen sinds fase 1 ALTIJD hard is (niet meer optioneel)
// nooit meer triggeren voor een kandidaat die fase 2 bereikt, dus zijn ze uit
// B2B_DEALBREAKERS verwijderd (zie types/b2b.ts). "Slecht energielabel"
// blijft wel bestaan als los dealbreaker-onderdeel met zijn eigen vaste grens
// ("lager dan C", ongeacht het bij Vraag 8 gekozen minimum) -- dat is een
// andere, striktere grens dan de harde eis van Vraag 8 zelf, dus geen
// overlap.
// -----------------------------------------------------------------------------

// Per-item uitsplitsing voor de getabde scoretoelichting in MatchesKaart.tsx
// (Cowork-gesprek "visualize deze schermen dat je bovenaan kan klikken" --
// eerst als mockup goedgekeurd, nu gebouwd). Optioneel: alleen voorzieningen/
// dealbreakers/prioriteiten vullen dit, de overige onderdelen (budget,
// locatie, etc.) hebben geen zinvolle sub-items en laten dit gewoon leeg.
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
}

export interface MatchScore {
  totaal: number; // gekapt op 100 -- puur een rangschikkingsgetal onder overlevers van fase 1, geen afwijzingsdrempel meer
  ruwTotaal: number; // ongekapt (componenten tellen op tot 108) -- transparantie
  onderdelen: MatchScoreOnderdeel[];
  dealbreakersGetriggerd: B2bDealbreaker[];
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

// =============================================================================
// FASE 1 -- harde eisen (pass/fail, geen punten, geen marge behalve waar
// expliciet toegelicht). Elke functie geeft `true` terug bij een BEVESTIGDE
// overtreding; ontbrekende data levert altijd `false` (nooit afwijzen op
// onze eigen scrapebeperking).
// =============================================================================

function faaltBudget(prijs: number | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const max = B2B_BUDGET_OPTIES.find((o) => o.waarde === voorkeuren.maxKoopprijs)?.max ?? null;
  if (max == null || prijs == null) return false; // "onzeker" budget of vraagprijs onbekend -- geen grens toe te passen
  // 10%-marge: dezelfde BUDGET_ZOEK_MARGE waarmee de Funda-zoekopdracht zelf
  // al scant (zie fundaFeed.ts) -- in Nederland wordt vaak boven de
  // vraagprijs geboden, dus een vraagprijs net boven het maximum sluit een
  // woning in de praktijk niet automatisch uit. Bewust dezelfde marge
  // aangehouden voor deze harde eis i.p.v. een strikt "nooit boven het
  // maximum", zie het gesprek hierover.
  return prijs > max * (1 + BUDGET_ZOEK_MARGE);
}

function faaltLocatie(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): boolean {
  const { resultaat } = vergelijkLocatieUitgebreid(voorkeuren.voorkeurLocaties, verificatie?.gebiedRuw ?? null, verificatie?.plaatsnaam ?? null);
  return resultaat === "geen_match";
}

// "other" (vrije tekst, Vraag 4 "Anders") is nooit tegen een gescrapete
// waarde te verifiëren -- staat "other" in de gekozen lijst, dan wordt
// woningtype hier dus nooit een afwijzingsgrond (de koper accepteerde
// expliciet "iets anders" naast eventuele specifiek gekozen types).
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

// BUGFIX (Sjoerd: "de beschikbaar-fix werkt niet, ook niet op Vercel"): de
// eerdere fix (bouwZoekUrl in fundaFeed.ts, ?availability=available) filtert
// alleen NIEUWE zoekresultaten -- een match die al was opgeslagen vóórdat de
// woning onder bod/verkocht ging, werd nooit meer herzien, want
// beschikbaarheid zat niet bij de 7 harde eisen die bij elke ververs/cron-
// cyclus opnieuw gecheckt worden (zie ruimVerouderdeMatchenOp in
// b2bStore.ts). Nu wél, als 8e harde eis -- dit is de check die bestaande
// matches daadwerkelijk laat evicten zodra hun status verandert.
//
// BEWUST een allowlist ("Beschikbaar" is de enige geldige waarde") i.p.v.
// een blocklist van bekende afwijswaarden: Funda's statuslabel is altijd
// aanwezig op de detailpagina (live geverifieerd, zowel "Beschikbaar" als
// "Onder bod"), dus een bevestigde, van "Beschikbaar" afwijkende tekst is
// hier een net zo harde overtreding als bij de andere 7 eisen -- maar we
// hoeven zo niet elke toekomstige Funda-statustekst (bv. een nieuwe
// tussenvorm) te kennen om hem alsnog correct af te wijzen. `status: null`
// (rij ontbreekt, scrape mislukt) is zoals altijd geen afwijzingsgrond.
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

// =============================================================================
// FASE 2 -- rangschikkingsscore voor kandidaten die fase 1 al gehaald hebben.
// Elk van de 7 "harde-eis"-onderdelen scoort hier NIET meer op "voldoet het"
// (dat staat al vast) maar op "hoeveel beter dan het gevraagde minimum" --
// zie de toelichting bovenaan dit bestand. Parkeren, dealbreakers en de
// prioriteitenbonus waren al zuiver rangschikkend en zijn ongewijzigd.
// =============================================================================

// --- Budget (20) ---------------------------------------------------------------
function scoreBudget(prijs: number | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const max = B2B_BUDGET_OPTIES.find((o) => o.waarde === voorkeuren.maxKoopprijs)?.max ?? null;
  const basis = { key: "budget", label: "Budget", maxPunten: 20 };
  if (max == null || prijs == null) {
    return { ...basis, punten: 14, toelichting: "Budget of vraagprijs niet met zekerheid vast te stellen." };
  }
  const ratio = prijs / max;
  if (ratio <= 0.9) return { ...basis, punten: 20, toelichting: `Ruim onder het opgegeven budget (max. ${euro(max)}).` };
  if (ratio <= 1.0) return { ...basis, punten: 16, toelichting: `Binnen het opgegeven budget (max. ${euro(max)}).` };
  if (ratio <= 1.05) return { ...basis, punten: 12, toelichting: "Tot 5% boven het opgegeven budget." };
  return { ...basis, punten: 10, toelichting: "Tot 10% boven het opgegeven budget, nog binnen de marge." };
}

// --- Locatie (20) ----------------------------------------------------------------
function scoreLocatie(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "locatie", label: "Locatie", maxPunten: 20 };
  const { resultaat, exacteIndex } = vergelijkLocatieUitgebreid(voorkeuren.voorkeurLocaties, verificatie?.gebiedRuw ?? null, verificatie?.plaatsnaam ?? null);
  if (resultaat === "exact" && exacteIndex != null) {
    if (exacteIndex === 0) return { ...basis, punten: 20, toelichting: "Ligt in de eerst gekozen voorkeurslocatie." };
    if (exacteIndex === 1) return { ...basis, punten: 16, toelichting: "Ligt in de op één na gekozen voorkeurslocatie." };
    return { ...basis, punten: 12, toelichting: "Ligt in een gekozen voorkeurslocatie." };
  }
  if (resultaat === "geen_match") {
    // Zou hier niet moeten voorkomen (fase 1 wijst dit al af) -- defensief gehouden.
    return { ...basis, punten: 4, toelichting: "Ligt buiten de gekozen voorkeurslocaties." };
  }
  return { ...basis, punten: 12, toelichting: "Ligging kon niet met zekerheid worden bevestigd." };
}

// --- Woningtype (15) ---------------------------------------------------------------
// "similar"-groepen (grondgebonden aaneengeschakeld / vrijstaand-achtig /
// gestapeld) bestonden in v2 om een compromis te geven bij een net-niet-
// matchend type -- nu fase 1 al garandeert dat het type klopt (of "other" is
// gekozen), heeft dat compromis geen functie meer: hier gaat het alleen nog
// om HOE goed het matcht (eerst gekozen type > later gekozen type).
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

function scoreType(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "type", label: "Woningtype", maxPunten: 15 };
  if (voorkeuren.woningtypes.length === 0 || voorkeuren.woningtypes.includes("other")) {
    return { ...basis, punten: 10, toelichting: "Geen specifiek woningtype als harde eis (of 'Anders' gekozen)." };
  }
  const subtype = classificeerWoningsubtype(verificatie);
  if (!subtype) {
    return { ...basis, punten: 10, toelichting: "Woningtype kon niet met zekerheid worden bepaald." };
  }
  const index = voorkeuren.woningtypes.indexOf(subtype);
  if (index === 0) return { ...basis, punten: 15, toelichting: "Komt overeen met het eerst gekozen woningtype." };
  return { ...basis, punten: 12, toelichting: "Komt overeen met een gewenst woningtype." };
}

// --- Kamers (12) -------------------------------------------------------------------
function scoreKamers(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "kamers", label: "Kamers", maxPunten: 12 };
  const minKamers = B2B_MIN_KAMERS_OPTIES.find((o) => o.waarde === voorkeuren.minKamers)?.minKamers ?? 1;
  const kamers = verificatie?.kamers ?? null;
  if (kamers == null) return { ...basis, punten: 8, toelichting: "Aantal kamers kon niet worden vastgesteld." };
  if (kamers >= minKamers + 2) return { ...basis, punten: 12, toelichting: `${kamers} kamers, ruim boven het gewenste minimum (${minKamers}).` };
  if (kamers === minKamers + 1) return { ...basis, punten: 10, toelichting: `${kamers} kamers, één boven het gewenste minimum.` };
  return { ...basis, punten: 8, toelichting: `${kamers} kamers, voldoet precies aan het gewenste minimum.` };
}

// --- Oppervlakte (10) --------------------------------------------------------------
function scoreOppervlak(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "oppervlak", label: "Oppervlakte", maxPunten: 10 };
  const minArea = B2B_MIN_OPPERVLAK_OPTIES.find((o) => o.waarde === voorkeuren.minOppervlak)?.minArea ?? 0;
  const opp = verificatie?.woonoppervlak ?? null;
  if (opp == null) return { ...basis, punten: 7, toelichting: "Woonoppervlak kon niet worden vastgesteld." };
  if (opp >= minArea + 25) return { ...basis, punten: 10, toelichting: `${opp} m², ruim boven het gewenste minimum.` };
  if (opp >= minArea + 10) return { ...basis, punten: 9, toelichting: `${opp} m², boven het gewenste minimum.` };
  return { ...basis, punten: 7, toelichting: `${opp} m², voldoet aan het gewenste minimum.` };
}

// --- Buitenruimte (8) --------------------------------------------------------------
function scoreBuitenruimte(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "buitenruimte", label: "Buitenruimte", maxPunten: 8 };
  if (voorkeuren.buitenruimte === "not_important" || voorkeuren.buitenruimte === "no_preference") {
    return { ...basis, punten: 8, toelichting: "Buitenruimte was geen vereiste." };
  }
  if (!verificatie) return { ...basis, punten: 5, toelichting: "Aanwezigheid van buitenruimte kon niet worden vastgesteld." };
  if (verificatie.heeftTuin) return { ...basis, punten: 8, toelichting: "Heeft een tuin." };
  if (verificatie.heeftDakterras) return { ...basis, punten: 7, toelichting: "Heeft een dakterras." };
  if (verificatie.heeftBalkon) return { ...basis, punten: 6, toelichting: "Heeft een balkon." };
  return { ...basis, punten: 3, toelichting: "Geen buitenruimte aanwezig." };
}

// --- Energielabel (8) --------------------------------------------------------------
function scoreEnergielabel(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "energielabel", label: "Energielabel", maxPunten: 8 };
  const minLabel = B2B_MIN_ENERGIELABEL_OPTIES.find((o) => o.waarde === voorkeuren.minEnergielabel)?.minLabel ?? null;
  if (minLabel == null) return { ...basis, punten: 8, toelichting: "Geen energielabel-voorkeur opgegeven." };
  const label = verificatie?.energielabel ?? null;
  const rang = label ? ENERGIELABEL_VOLGORDE_FUNDA.indexOf(label) : -1;
  if (rang === -1) return { ...basis, punten: 5, toelichting: "Energielabel kon niet worden vastgesteld." };
  const rangMin = ENERGIELABEL_VOLGORDE_FUNDA.indexOf(minLabel);
  if (rang <= rangMin - 2) return { ...basis, punten: 8, toelichting: `Label ${label}, ruim boven het gewenste minimum (${minLabel}).` };
  if (rang === rangMin - 1) return { ...basis, punten: 6, toelichting: `Label ${label}, boven het gewenste minimum.` };
  return { ...basis, punten: 5, toelichting: `Label ${label}, voldoet precies aan het gewenste minimum.` };
}

// --- Parkeren (5) -- ongewijzigd, was al zuiver rangschikkend -------------------------
function scoreParkeren(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "parkeren", label: "Parkeren", maxPunten: 5 };
  if (voorkeuren.parkeren === "no_car") {
    return { ...basis, punten: 5, toelichting: "Parkeren was niet relevant." };
  }
  const heeftEigen = verificatie?.heeftEigenParkeerplek ?? null;
  const omschrijving = verificatie?.parkeerOmschrijving ?? "";
  const geenParkerenTekst = /geen\s+parkeer/i.test(omschrijving);
  const heeftPubliek = omschrijving.length > 0 && !geenParkerenTekst;

  if (voorkeuren.parkeren === "private_required") {
    if (heeftEigen === true) return { ...basis, punten: 5, toelichting: "Heeft een eigen parkeerplek." };
    if (heeftEigen == null) return { ...basis, punten: 3, toelichting: "Parkeersituatie kon niet volledig worden vastgesteld." };
    if (geenParkerenTekst) return { ...basis, punten: 0, toelichting: "Geen parkeermogelijkheid." };
    return { ...basis, punten: 2, toelichting: "Alleen openbaar/betaald parkeren, geen eigen plek." };
  }
  if (voorkeuren.parkeren === "private_preferred") {
    if (heeftEigen === true) return { ...basis, punten: 5, toelichting: "Heeft een eigen parkeerplek." };
    if (geenParkerenTekst) return { ...basis, punten: 0, toelichting: "Geen parkeermogelijkheid." };
    if (heeftPubliek || heeftEigen == null) return { ...basis, punten: 3, toelichting: "Geen eigen parkeerplek, wel andere parkeermogelijkheid." };
    return { ...basis, punten: 0, toelichting: "Geen parkeermogelijkheid." };
  }
  // public_ok
  if (geenParkerenTekst && heeftEigen !== true) return { ...basis, punten: 0, toelichting: "Geen parkeermogelijkheid." };
  return { ...basis, punten: 5, toelichting: "Parkeren (eigen of openbaar) is aanwezig." };
}

// --- Voorzieningen (8) -------------------------------------------------------------
// NIEUW (Cowork-gesprek "waarom staat voorzieningen op 0"): Vraag 9 had
// voorheen alleen indirect effect, via de generieke prioriteitenbonus, en
// alleen als de koper "Nabijheid voorzieningen" óók nog los als topprioriteit
// koos (Vraag 13). Dat maakte dit voor de meeste dossiers een dode vraag.
// Nu een eigen, altijd meetellend onderdeel:
//   - Niets gekozen bij Vraag 9 (optioneel, mag): 0 punten -- geen wens, dus
//     niets om te belonen. BEWUST 0 en niet "neutraal max", zelfde principe
//     als de bestaande Prioriteiten-bonus (die ook 0 scoort bij een lege
//     lijst) -- zie het gesprek hierover, "waarom krijgt het dan alsnog 8
//     punten".
//   - Wel iets gekozen: per gekozen wens een tier op een 0-10-schaal (<1 km
//     =10, tot en met VOORZIENING_DICHTBIJ_KM=6, bevestigd verder weg=2,
//     afstand onbekend bij een WEL gekozen wens=6 -- neutraal, nooit een
//     straf voor onze eigen meetgrens), gemiddeld over alle gekozen wensen en
//     herschaald naar het max van 8 punten voor dit ene onderdeel (dus nooit
//     "aantal wensen keer 10").
//
// Defensief gefilterd tegen B2B_VOORZIENING_WENSEN: een dossier dat de
// inmiddels verwijderde waarde "workplace" nog bevat (zie types/b2b.ts) mag
// hier nooit meetellen -- zelfde discipline als de dealbreaker-bugfix.
function scoreVoorzieningen(voorkeuren: B2bKoperVoorkeuren, voorzieningen: VoorzieningenResultaat): MatchScoreOnderdeel {
  const basis = { key: "voorzieningen", label: "Voorzieningen", maxPunten: 8 };
  const gekozen = voorkeuren.belangrijkeVoorzieningen.filter((w) => B2B_VOORZIENING_WENSEN.some((o) => o.waarde === w));
  if (gekozen.length === 0) {
    return { ...basis, punten: 0, toelichting: "Geen voorzieningen als belangrijk aangegeven." };
  }
  const tiers = gekozen.map((wens) => {
    const afstand = afstandTotWens(voorzieningen.items, wens);
    if (afstand == null) return 6;
    if (afstand <= 1) return 10;
    if (afstand <= VOORZIENING_DICHTBIJ_KM) return 6;
    return 2;
  });
  const gemiddelde = tiers.reduce((a, b) => a + b, 0) / tiers.length;
  const punten = Math.max(0, Math.min(8, Math.round((gemiddelde / 10) * 8)));
  // Per-item uitsplitsing (zie MatchScoreDetailRegel hierboven) -- zelfde
  // drempels als de tiers hierboven, alleen nu ook zichtbaar gemaakt i.p.v.
  // alleen meegewogen in het gemiddelde.
  const detail: MatchScoreDetailRegel[] = gekozen.map((wens) => {
    const label = B2B_VOORZIENING_WENSEN.find((o) => o.waarde === wens)?.label ?? wens;
    const afstand = afstandTotWens(voorzieningen.items, wens);
    if (afstand == null) return { label, waarde: "onbekend", status: "onbekend" };
    if (afstand <= 1) return { label, waarde: `${afstand.toFixed(1)} km`, status: "goed" };
    if (afstand <= VOORZIENING_DICHTBIJ_KM) return { label, waarde: `${afstand.toFixed(1)} km`, status: "matig" };
    return { label, waarde: `${afstand.toFixed(1)} km`, status: "slecht" };
  });
  return {
    ...basis,
    punten,
    toelichting: `Scoort gemiddeld ${gemiddelde.toFixed(1)}/10 over de ${gekozen.length} opgegeven voorziening(en).`,
    detail,
  };
}

// --- Dealbreakers (-20 bij trigger) ---------------------------------------------------
// Vier van de oorspronkelijke opties (no_outdoor_space, price_over_budget,
// too_few_rooms, too_small_area) zijn verwijderd uit B2B_DEALBREAKERS (zie
// types/b2b.ts) -- die overlapten volledig met een fase-1-harde-eis en kunnen
// dus nooit meer triggeren voor een kandidaat die hier al staat.
function isDealbreakerGetriggerd(
  db: B2bDealbreaker,
  verificatie: B2bMatchVerificatie | null,
  voorzieningen: VoorzieningenResultaat,
  voorkeuren: B2bKoperVoorkeuren
): boolean {
  switch (db) {
    case "no_parking":
      return verificatie ? !verificatie.heeftEigenParkeerplek && /geen\s+parkeer/i.test(verificatie.parkeerOmschrijving ?? "") : false;
    case "ground_floor_no_elevator":
      return verificatie ? verificatie.woonlaag != null && verificatie.woonlaag > 0 && !verificatie.heeftLift : false;
    case "busy_road_noise":
    case "too_far_from_work":
    case "other":
      return false; // geen databron
    case "poor_energy_label": {
      // Eigen, vaste grens ("lager dan C") -- los van de harde eis uit Vraag 8,
      // die de KOPER-gekozen ondergrens gebruikt. Beide kunnen dus tegelijk
      // bestaan zonder overlap: dit dealbreaker-onderdeel triggert soms ook
      // als de harde eis van Vraag 8 al ruimer was dan C.
      const rang = verificatie?.energielabel ? ENERGIELABEL_VOLGORDE_FUNDA.indexOf(verificatie.energielabel) : -1;
      return rang !== -1 && rang > ENERGIELABEL_VOLGORDE_FUNDA.indexOf("C");
    }
    case "no_amenities": {
      if (!voorzieningen.gevonden) return false;
      const wensenMetDatabron = voorkeuren.belangrijkeVoorzieningen.filter(heeftDatabron);
      if (wensenMetDatabron.length === 0) return false;
      return wensenMetDatabron.every((w) => {
        const afstand = afstandTotWens(voorzieningen.items, w);
        return afstand == null || afstand > VOORZIENING_DICHTBIJ_KM;
      });
    }
    default:
      return false;
  }
}

// "busy_road_noise"/"too_far_from_work"/"other" hebben geen databron (zie
// isDealbreakerGetriggerd hierboven, geeft daar altijd `false`) -- voor de
// UI-uitsplitsing is dat een ander signaal dan "gecheckt en niet geraakt",
// dus apart zichtbaar gemaakt i.p.v. stilzwijgend als "goed" te tonen.
function heeftDealbreakerDatabron(db: B2bDealbreaker): boolean {
  return db !== "busy_road_noise" && db !== "too_far_from_work" && db !== "other";
}

function evalueerDealbreakers(
  verificatie: B2bMatchVerificatie | null,
  voorzieningen: VoorzieningenResultaat,
  voorkeuren: B2bKoperVoorkeuren
): { getriggerd: B2bDealbreaker[]; onderdeel: MatchScoreOnderdeel } {
  const getriggerd = voorkeuren.dealbreakers.filter((db) => isDealbreakerGetriggerd(db, verificatie, voorzieningen, voorkeuren));
  const detail: MatchScoreDetailRegel[] = voorkeuren.dealbreakers.map((db) => {
    const label = B2B_DEALBREAKERS.find((o) => o.waarde === db)?.label ?? db;
    if (getriggerd.includes(db)) return { label, waarde: "geraakt", status: "slecht" };
    if (!heeftDealbreakerDatabron(db)) return { label, waarde: "geen databron", status: "onbekend" };
    return { label, waarde: "niet geraakt", status: "goed" };
  });
  return {
    getriggerd,
    onderdeel: {
      key: "dealbreakers",
      label: "Dealbreakers",
      punten: getriggerd.length > 0 ? -20 : 0,
      maxPunten: 0,
      toelichting: getriggerd.length > 0 ? `Raakt ${getriggerd.length} opgegeven dealbreaker(s).` : "Geen dealbreakers geraakt.",
      detail,
    },
  };
}

// --- Prioriteitenbonus (10) -------------------------------------------------------------
// Gemiddelde, evenredig aan hoe ver elk gekozen prioriteitsonderdeel al
// scoorde (punten/maxPunten * 10) -- eenvoudiger dan de v2-tiers (10/5/0 o.b.v.
// max/midden/0-punten), en logischer nu fase-2-scores altijd al "hoeveel
// beter dan het minimum" uitdrukken i.p.v. "voldoet het".
function tierVoorComponent(onderdeel: MatchScoreOnderdeel): number {
  if (onderdeel.maxPunten === 0) return 5;
  return Math.round((onderdeel.punten / onderdeel.maxPunten) * 10);
}

function tierConditionYear(verificatie: B2bMatchVerificatie | null): number {
  const bouwjaar = verificatie?.bouwjaar ?? null;
  if (bouwjaar == null) return 5;
  if (bouwjaar >= 2015) return 10;
  if (bouwjaar < 1970) return 0;
  return 5;
}

// --- Afwegingen / "Inleveren" (4) --------------------------------------------------
// BUGFIX (Cowork-gesprek "waar zou je op willen inleveren -- kom met een
// voorstel"/"hou het zoals het eerste voorstel... maak koppeling direct"):
// Vraag 12 was tot nu toe PUUR informatief -- geen enkele scorecomponent
// gebruikte dit (zie de oude toelichting bij B2bAfweging, types/b2b.ts). Van
// de oorspronkelijke 8 opties bleek er 1 ("langere reistijd voor betere
// buurt") geen databron te hebben (geen werkadres uitgevraagd, geen
// routing-API) en is die geschrapt -- de overige 7 hebben allemaal een
// bestaande databron, hergebruikt uit de acht onderdelen hierboven.
//
// Mechanisme, bewust bescheiden (dit was nooit een hoofdcomponent en moet dat
// ook niet worden): per GEKOZEN afweging (max 3, zie MAX_AFWEGINGEN in
// types/b2b.ts) een vaste bonus van 2 punten, maar ALLEEN als de afweging
// voor DEZE match ook daadwerkelijk relevant is -- de "opgegeven" kant moet
// echt lager scoren dan het maximum, en waar van toepassing moet de
// "gewonnen" kant (het onderdeel waar de koper dus wél op wil scoren) goed
// scoren (ratio >= 0,75, dezelfde "goed"-drempel als elders in dit bestand,
// zie AlgemeenRegel in MatchesKaart.tsx en de prioriteitenbonus hieronder).
// Is een afweging niet van toepassing (de woning was toch al perfect op dat
// punt, of de "gewonnen" kant is ook niet goed), dan levert hij geen bonus
// op -- geen straf, gewoon neutraal. Totaalplafond van 4 punten (nooit meer
// dan 2 afwegingen tegelijk belonen): dit blijft een kleine correctie op de
// bestaande score, geen nieuwe manier om te stapelen.
//
// "Ik wil niet inleveren" is een expliciete stop: is die gekozen (eventueel
// naast andere antwoorden, defensief afgevangen), dan wordt er sowieso geen
// bonus toegepast.
function isOnderdeelGoed(onderdeel: MatchScoreOnderdeel | undefined): boolean {
  if (!onderdeel || onderdeel.maxPunten <= 0) return false;
  return onderdeel.punten / onderdeel.maxPunten >= 0.75;
}

function isOnderdeelLager(onderdeel: MatchScoreOnderdeel | undefined): boolean {
  if (!onderdeel) return false;
  return onderdeel.punten < onderdeel.maxPunten;
}

function scoreAfwegingen(
  voorkeuren: B2bKoperVoorkeuren,
  verificatie: B2bMatchVerificatie | null,
  onderdelenPerKey: Record<string, MatchScoreOnderdeel>
): MatchScoreOnderdeel {
  const basis = { key: "afwegingen", label: "Inleveren", maxPunten: 4 };
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

  // Elke check combineert "de opgegeven kant is echt lager dan ideaal" met
  // (waar zinvol) "de gewonnen kant is echt goed" -- bv. een kleinere woning
  // is alleen een bewuste afweging als de locatie er ook echt beter van
  // wordt. "less_parking"/"fewer_rooms" hebben geen aparte "gewonnen kant" in
  // het antwoord zelf (puur "ik vind dit minder belangrijk"), dus die kijken
  // alleen naar de opgegeven kant.
  const check: Record<Exclude<B2bAfweging, "no_tradeoffs">, () => boolean> = {
    smaller_for_location: () => isOnderdeelLager(onderdelenPerKey.oppervlak) && isOnderdeelGoed(onderdelenPerKey.locatie),
    older_for_space: () => tierConditionYear(verificatie) <= 5 && isOnderdeelGoed(onderdelenPerKey.oppervlak),
    less_outdoor_for_price: () => isOnderdeelLager(onderdelenPerKey.buitenruimte) && isOnderdeelGoed(onderdelenPerKey.budget),
    worse_energy_for_price: () => isOnderdeelLager(onderdelenPerKey.energielabel) && isOnderdeelGoed(onderdelenPerKey.budget),
    less_parking: () => isOnderdeelLager(onderdelenPerKey.parkeren),
    fewer_rooms: () => isOnderdeelLager(onderdelenPerKey.kamers),
  };

  let aantalGeraakt = 0;
  const detail: MatchScoreDetailRegel[] = gekozen.map((a) => {
    const label = B2B_AFWEGINGEN.find((o) => o.waarde === a)?.label ?? a;
    const test = check[a as Exclude<B2bAfweging, "no_tradeoffs">];
    const geraakt = test?.() ?? false;
    if (geraakt) {
      aantalGeraakt++;
      return { label, waarde: "van toepassing", status: "goed" };
    }
    return { label, waarde: "niet van toepassing bij deze woning", status: "onbekend" };
  });

  const punten = Math.min(4, aantalGeraakt * 2);
  return {
    ...basis,
    punten,
    toelichting:
      aantalGeraakt > 0
        ? `${aantalGeraakt} opgegeven afweging(en) van toepassing bij deze woning -- kleine bonus toegepast.`
        : "Geen van de opgegeven afwegingen is bij deze woning van toepassing.",
    detail,
  };
}

function scorePrioriteitenBonus(
  voorkeuren: B2bKoperVoorkeuren,
  verificatie: B2bMatchVerificatie | null,
  onderdelenPerKey: Record<string, MatchScoreOnderdeel>
): MatchScoreOnderdeel {
  const basis = { key: "prioriteiten", label: "Prioriteiten", maxPunten: 10 };
  // BUGFIX/opschoning (Cowork-gesprek "Rust/ligging eruit halen"):
  // "quiet_location" bestaat niet meer in B2bPrioriteitOptie (types/b2b.ts)
  // -- geen bruikbare geluids-/rustdata per adres, scoorde dus altijd exact
  // hetzelfde neutrale tier voor elke woning. Defensief gefilterd, zelfde
  // patroon als bij de eerdere "workplace"/"park"-opschoningen: een bestaand
  // dossier met "quiet_location" nog in prioriteiten mag hier nooit een
  // crash geven (koppeling[p] zou anders `undefined` zijn).
  const gekozen = voorkeuren.prioriteiten.filter((p) => B2B_PRIORITEITEN.some((o) => o.waarde === p));
  if (gekozen.length === 0) {
    return { ...basis, punten: 0, toelichting: "Geen prioriteiten opgegeven." };
  }
  // "amenities_nearby" hergebruikt sinds de nieuwe Voorzieningen-component
  // (zie scoreVoorzieningen hierboven) gewoon tierVoorComponent, net als elk
  // ander onderdeel -- de eerdere aparte tierAmenitiesNearby-functie is
  // vervallen, dat was dubbele logica voor hetzelfde signaal.
  const koppeling: Record<B2bPrioriteitOptie, () => number> = {
    location: () => tierVoorComponent(onderdelenPerKey.locatie),
    price: () => tierVoorComponent(onderdelenPerKey.budget),
    size: () => tierVoorComponent(onderdelenPerKey.oppervlak),
    rooms: () => tierVoorComponent(onderdelenPerKey.kamers),
    outdoor_space: () => tierVoorComponent(onderdelenPerKey.buitenruimte),
    energy_efficiency: () => tierVoorComponent(onderdelenPerKey.energielabel),
    parking: () => tierVoorComponent(onderdelenPerKey.parkeren),
    amenities_nearby: () => tierVoorComponent(onderdelenPerKey.voorzieningen),
    condition_year: () => tierConditionYear(verificatie),
  };
  const tiers = gekozen.map((p) => koppeling[p]());
  const gemiddelde = Math.round(tiers.reduce((a, b) => a + b, 0) / tiers.length);
  // Per-item uitsplitsing: waar mogelijk de ECHTE punten/maxPunten van het
  // onderliggende onderdeel tonen (bv. "scoort 18/20") i.p.v. de abstracte
  // 0-10-tier -- dat zegt de gebruiker (de makelaar) meer. "condition_year"
  // heeft geen los scoreonderdeel (alleen een bouwjaar-tier), die krijgt dus
  // een eigen, eerlijke weergave i.p.v. een niet-bestaande "X/Y".
  const directOnderdeelPerPrioriteit: Partial<Record<B2bPrioriteitOptie, string>> = {
    location: "locatie",
    price: "budget",
    size: "oppervlak",
    rooms: "kamers",
    outdoor_space: "buitenruimte",
    energy_efficiency: "energielabel",
    parking: "parkeren",
    amenities_nearby: "voorzieningen",
  };
  const detail: MatchScoreDetailRegel[] = gekozen.map((p) => {
    const label = B2B_PRIORITEITEN.find((o) => o.waarde === p)?.label ?? p;
    const onderdeelKey = directOnderdeelPerPrioriteit[p];
    if (onderdeelKey) {
      const onderdeel = onderdelenPerKey[onderdeelKey];
      const ratio = onderdeel.maxPunten > 0 ? onderdeel.punten / onderdeel.maxPunten : 0.5;
      const status = ratio >= 0.75 ? "goed" : ratio >= 0.5 ? "matig" : "slecht";
      return { label, waarde: `scoort ${onderdeel.punten}/${onderdeel.maxPunten}`, status };
    }
    // condition_year -- enige overgebleven optie zonder los scoreonderdeel.
    const bouwjaar = verificatie?.bouwjaar ?? null;
    if (bouwjaar == null) return { label, waarde: "onbekend", status: "onbekend" };
    const tier = tierConditionYear(verificatie);
    const status = tier >= 8 ? "goed" : tier >= 5 ? "matig" : "slecht";
    return { label, waarde: `bouwjaar ${bouwjaar}`, status };
  });
  return {
    ...basis,
    punten: gemiddelde,
    toelichting: `Scoort gemiddeld ${gemiddelde}/10 op de ${voorkeuren.prioriteiten.length} opgegeven prioriteit(en).`,
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

  // Voorzieningen (Vraag 9 -> scoreVoorzieningen / dealbreaker "no_amenities"
  // / prioriteit "amenities_nearby", die laatste twee hergebruiken nu ook
  // gewoon scoreVoorzieningen) -- alleen ophalen als er ook daadwerkelijk
  // iets mee gedaan wordt, en alleen voor kandidaten die fase 1 al gehaald
  // hebben (zie de aanroepers) -- dat is precies waar de kostenbesparing zit.
  // Heeft geen enkele gekozen wens een databron, dan scoort scoreVoorzieningen
  // toch al overal neutraal (tier 6) -- de CBS-opzoeking overslaan verandert
  // dus niets aan de uitkomst, alleen aan de kosten.
  const heeftVoorzieningenBehoefte =
    voorkeuren.belangrijkeVoorzieningen.some(heeftDatabron) ||
    voorkeuren.dealbreakers.includes("no_amenities") ||
    voorkeuren.prioriteiten.includes("amenities_nearby");
  const voorzieningen: VoorzieningenResultaat = heeftVoorzieningenBehoefte
    ? await haalVoorzieningenVoorAdres(match.titel)
    : { gevonden: false, items: [] };

  const budget = scoreBudget(match.prijs, voorkeuren);
  const locatie = scoreLocatie(verificatie, voorkeuren);
  const type = scoreType(verificatie, voorkeuren);
  const kamers = scoreKamers(verificatie, voorkeuren);
  const oppervlak = scoreOppervlak(verificatie, voorkeuren);
  const buitenruimte = scoreBuitenruimte(verificatie, voorkeuren);
  const energielabel = scoreEnergielabel(verificatie, voorkeuren);
  const parkeren = scoreParkeren(verificatie, voorkeuren);
  const voorzieningenScore = scoreVoorzieningen(voorkeuren, voorzieningen);
  const { getriggerd, onderdeel: dealbreakerOnderdeel } = evalueerDealbreakers(verificatie, voorzieningen, voorkeuren);

  const onderdelenPerKey: Record<string, MatchScoreOnderdeel> = {
    budget,
    locatie,
    type,
    kamers,
    oppervlak,
    buitenruimte,
    energielabel,
    parkeren,
    voorzieningen: voorzieningenScore,
  };
  const afwegingen = scoreAfwegingen(voorkeuren, verificatie, onderdelenPerKey);
  const prioriteiten = scorePrioriteitenBonus(voorkeuren, verificatie, onderdelenPerKey);

  const onderdelen = [
    budget,
    locatie,
    type,
    kamers,
    oppervlak,
    buitenruimte,
    energielabel,
    parkeren,
    voorzieningenScore,
    dealbreakerOnderdeel,
    afwegingen,
    prioriteiten,
  ];
  const ruwTotaal = onderdelen.reduce((som, o) => som + o.punten, 0);
  const totaal = Math.max(0, Math.min(100, ruwTotaal));

  return { totaal, ruwTotaal, onderdelen, dealbreakersGetriggerd: getriggerd };
}
