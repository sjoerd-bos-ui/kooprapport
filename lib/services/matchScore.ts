import type { B2bWoningMatch, B2bKoperVoorkeuren, B2bMatchVerificatie, B2bDealbreaker, B2bPrioriteitOptie, B2bWoningtypeVoorkeur } from "@/types/b2b";
import { B2B_BUDGET_OPTIES, B2B_MIN_KAMERS_OPTIES, B2B_MIN_OPPERVLAK_OPTIES, B2B_MIN_ENERGIELABEL_OPTIES, MIN_MATCH_SCORE } from "@/types/b2b";
import { ENERGIELABEL_VOLGORDE_FUNDA, BUDGET_ZOEK_MARGE } from "@/lib/data-sources/fundaFeed";
import { vergelijkLocatie } from "@/lib/services/gebiedIndeling";
import { afstandTotWens, heeftDatabron, haalVoorzieningenVoorAdres, VOORZIENING_DICHTBIJ_KM, type VoorzieningenResultaat } from "@/lib/services/voorzieningenMatch";

// -----------------------------------------------------------------------------
// Matchingmodel v2 -- volledige herbouw op het opgegeven 100-puntensysteem
// (zie het Cowork-gesprek hierover, "DEEL 2: MATCHING SCORE SYSTEEM"). Elke
// component hieronder komt 1-op-1 overeen met de opgegeven puntenverdeling;
// waar de opgave zelf een gat liet (bv. geen tier voor "private_preferred"
// bij parkeren, of hoe om te gaan met een niet te scrapen veld) is dat
// EXPLICIET gedocumenteerd als eigen, beargumenteerde keuze bij dat
// onderdeel -- nooit stilzwijgend ingevuld.
//
// ALGEMENE REGEL voor ontbrekende scrapegegevens: als een onderliggend
// gegeven niet bepaald kon worden (bv. `kamers: null` omdat de detailpagina
// niet leesbaar was), wordt dat NOOIT als afwijzingsgrond gebruikt -- net als
// elders in dit project (zie voldoetAanKenmerken() in de oude fundaFeed.ts).
// In plaats van de laagste tier krijgt zo'n onderdeel de MIDDELSTE tier (bij
// componenten met 3 tiers) of een verhoudingsgewijs middenbedrag -- de
// makelaar mag niet de dupe worden van onze eigen scrapebeperkingen. Alleen
// bij LOCATIE (Component 2) is bewust gekozen voor de LAAGSTE tier bij
// onbekende classificatie -- zie de toelichting daar.
//
// COMPONENTSOM: de opgegeven componenten (20+20+15+12+10+8+8+5+0+10) tellen
// op tot 108, niet 100, ondanks "Maximale score: 100 punten" in de opgave.
// Het ruwe totaal wordt daarom GEKAPT op 100 (zie berekenMatchScore) -- de
// onderliggende componentscores blijven ongewijzigd/transparant zichtbaar in
// `onderdelen`, alleen het EINDCIJFER en de 60-puntendrempel gebruiken het
// gekapte totaal.
// -----------------------------------------------------------------------------

export interface MatchScoreOnderdeel {
  key: string;
  label: string;
  punten: number;
  maxPunten: number;
  toelichting: string;
}

export interface MatchScore {
  totaal: number; // gekapt op 100
  ruwTotaal: number; // ongekapt (componenten tellen op tot 108) -- transparantie
  onderdelen: MatchScoreOnderdeel[];
  dealbreakersGetriggerd: B2bDealbreaker[];
  voldoetAanMinimum: boolean; // totaal >= MIN_MATCH_SCORE (60)
}

function euro(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

// --- Component 1: budget (20) -------------------------------------------------
function scoreBudget(prijs: number | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const max = B2B_BUDGET_OPTIES.find((o) => o.waarde === voorkeuren.maxKoopprijs)?.max ?? null;
  const basis = { key: "budget", label: "Budget", maxPunten: 20 };
  if (max == null) {
    return { ...basis, punten: 20, toelichting: "Budget nog onzeker opgegeven -- geen prijsgrens toegepast." };
  }
  if (prijs == null) {
    return { ...basis, punten: 10, toelichting: "Vraagprijs kon niet worden vastgesteld." };
  }
  const ratio = prijs / max;
  if (ratio <= 1) return { ...basis, punten: 20, toelichting: `Binnen het opgegeven budget (max. ${euro(max)}).` };
  if (ratio <= 1.05) return { ...basis, punten: 15, toelichting: "Tot 5% boven het opgegeven budget." };
  if (ratio <= 1 + BUDGET_ZOEK_MARGE) return { ...basis, punten: 10, toelichting: "Tot 10% boven het opgegeven budget." };
  return { ...basis, punten: 0, toelichting: "Meer dan 10% boven het opgegeven budget." };
}

// --- Component 2: locatie (20) ------------------------------------------------
// LANDELIJK (zie gebiedIndeling.ts voor de geschiedenis: dit was een vaste
// 10-Rotterdam-regio-lijst, nu een tekstvergelijking tegen de vrij, landelijk
// gekozen B2bLocatie-voorkeuren). Omdat de Funda-zoekopdracht zelf al is
// afgebakend tot precies de gekozen plaatsen/wijken (zie afgeleideGebiedSlugs
// in fundaFeed.ts), is "geen_match" bij een NIEUW gevonden kandidaat zeldzaam
// -- vooral relevant bij het herscoren van een al opgeslagen match na een
// wijziging van de koper-voorkeuren (zie ruimVerouderdeMatchenOp in
// b2bStore.ts), waar dat wél een oprecht signaal is.
function scoreLocatie(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "locatie", label: "Locatie", maxPunten: 20 };
  const resultaat = vergelijkLocatie(voorkeuren.voorkeurLocaties, verificatie?.gebiedRuw ?? null, verificatie?.plaatsnaam ?? null);
  if (resultaat === "exact") {
    return { ...basis, punten: 20, toelichting: "Ligt in een van de gekozen voorkeurslocaties." };
  }
  if (resultaat === "onbekend") {
    return { ...basis, punten: 12, toelichting: "Ligging kon niet met zekerheid worden bevestigd." };
  }
  return { ...basis, punten: 4, toelichting: "Ligt buiten de gekozen voorkeurslocaties." };
}

// --- Component 3: woningtype (15) ---------------------------------------------
// Fijnmazige classificatie o.b.v. Funda's eigen "Soort woonhuis"/"Soort
// appartement"-tekst (live geverifieerd, zie fundaFeed.ts) -- "similar"-
// groepen zijn een EIGEN, beargumenteerde indeling (grondgebonden aaneen-
// geschakeld / grondgebonden vrijstaand-achtig / gestapeld), niet uit de
// opgave zelf (die noemt alleen "vergelijkbaar type" zonder in te vullen wat
// dat precies betekent).
const HUIS_SLEUTELWOORDEN: [B2bWoningtypeVoorkeur, RegExp][] = [
  ["terraced", /tussenwoning/i],
  ["corner", /hoekwoning/i],
  ["semi_detached", /halfvrijstaand|2[\s-]onder[\s-]1[\s-]kap|twee[\s-]onder[\s-]een[\s-]kap/i],
  ["detached", /vrijstaand/i],
];
const TYPE_GROEPEN: B2bWoningtypeVoorkeur[][] = [
  ["terraced", "corner"], // grondgebonden, aaneengeschakeld
  ["semi_detached", "detached"], // grondgebonden, (half)vrijstaand
  ["apartment", "studio"], // gestapeld
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

function zelfdeGroep(a: B2bWoningtypeVoorkeur, b: B2bWoningtypeVoorkeur): boolean {
  return TYPE_GROEPEN.some((groep) => groep.includes(a) && groep.includes(b));
}

function scoreType(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "type", label: "Woningtype", maxPunten: 15 };
  if (voorkeuren.woningtypes.length === 0) {
    return { ...basis, punten: 10, toelichting: "Geen woningtype-voorkeur opgegeven." };
  }
  const subtype = classificeerWoningsubtype(verificatie);
  if (!subtype) {
    return { ...basis, punten: 10, toelichting: "Woningtype kon niet met zekerheid worden bepaald." };
  }
  if (voorkeuren.woningtypes.includes(subtype)) {
    return { ...basis, punten: 15, toelichting: "Komt overeen met een gewenst woningtype." };
  }
  if (voorkeuren.woningtypes.some((w) => zelfdeGroep(w, subtype))) {
    return { ...basis, punten: 10, toelichting: "Vergelijkbaar type met een gewenst woningtype." };
  }
  return { ...basis, punten: 0, toelichting: "Ander woningtype dan gewenst." };
}

// --- Component 4: kamers (12) -------------------------------------------------
function scoreKamers(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "kamers", label: "Kamers", maxPunten: 12 };
  const minKamers = B2B_MIN_KAMERS_OPTIES.find((o) => o.waarde === voorkeuren.minKamers)?.minKamers ?? 1;
  const kamers = verificatie?.kamers ?? null;
  if (kamers == null) return { ...basis, punten: 8, toelichting: "Aantal kamers kon niet worden vastgesteld." };
  if (kamers >= minKamers) return { ...basis, punten: 12, toelichting: `${kamers} kamers, voldoet aan het gewenste minimum (${minKamers}).` };
  if (kamers === minKamers - 1) return { ...basis, punten: 8, toelichting: `${kamers} kamers, één minder dan gewenst.` };
  return { ...basis, punten: 0, toelichting: `${kamers} kamers, aanzienlijk minder dan gewenst (${minKamers}).` };
}

// --- Component 5: oppervlakte (10) --------------------------------------------
function scoreOppervlak(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "oppervlak", label: "Oppervlakte", maxPunten: 10 };
  const minArea = B2B_MIN_OPPERVLAK_OPTIES.find((o) => o.waarde === voorkeuren.minOppervlak)?.minArea ?? 0;
  const opp = verificatie?.woonoppervlak ?? null;
  if (opp == null) return { ...basis, punten: 7, toelichting: "Woonoppervlak kon niet worden vastgesteld." };
  if (opp >= minArea) return { ...basis, punten: 10, toelichting: `${opp} m², voldoet aan het gewenste minimum.` };
  if (opp >= minArea * 0.9) return { ...basis, punten: 7, toelichting: `${opp} m², tot 10% onder het gewenste minimum.` };
  return { ...basis, punten: 0, toelichting: `${opp} m², aanzienlijk onder het gewenste minimum.` };
}

// --- Component 6: buitenruimte (8) --------------------------------------------
// De opgave definieert expliciet alleen "not_important"/"has_outdoor" (8) en
// "garden_required" met balkon-only (4) of niets (0) -- "balcony_ok"/
// "no_preference" zonder buitenruimte staat er niet letterlijk in. Eigen,
// beargumenteerde aanvulling: die twee gevallen vallen dan terug op 0 (geen
// van de gedefinieerde tiers is van toepassing), consistent met "geen
// buitenruimte terwijl je er wel iets van wilde" elders in de tabel.
function scoreBuitenruimte(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "buitenruimte", label: "Buitenruimte", maxPunten: 8 };
  const heeftBuiten = verificatie ? verificatie.heeftTuin || verificatie.heeftBalkon || verificatie.heeftDakterras : null;
  if (voorkeuren.buitenruimte === "not_important" || voorkeuren.buitenruimte === "no_preference") {
    return { ...basis, punten: 8, toelichting: "Buitenruimte was geen vereiste." };
  }
  if (heeftBuiten == null) {
    return { ...basis, punten: 4, toelichting: "Aanwezigheid van buitenruimte kon niet worden vastgesteld." };
  }
  if (heeftBuiten) {
    return { ...basis, punten: 8, toelichting: "Heeft buitenruimte." };
  }
  if (voorkeuren.buitenruimte === "garden_required" && (verificatie?.heeftBalkon || verificatie?.heeftDakterras)) {
    return { ...basis, punten: 4, toelichting: "Heeft alleen balkon/dakterras, geen tuin." };
  }
  return { ...basis, punten: 0, toelichting: "Geen buitenruimte aanwezig." };
}

// --- Component 7: energielabel (8) --------------------------------------------
function scoreEnergielabel(verificatie: B2bMatchVerificatie | null, voorkeuren: B2bKoperVoorkeuren): MatchScoreOnderdeel {
  const basis = { key: "energielabel", label: "Energielabel", maxPunten: 8 };
  const minLabel = B2B_MIN_ENERGIELABEL_OPTIES.find((o) => o.waarde === voorkeuren.minEnergielabel)?.minLabel ?? null;
  if (minLabel == null) return { ...basis, punten: 8, toelichting: "Geen energielabel-voorkeur opgegeven." };
  const label = verificatie?.energielabel ?? null;
  const rang = label ? ENERGIELABEL_VOLGORDE_FUNDA.indexOf(label) : -1;
  const rangMin = ENERGIELABEL_VOLGORDE_FUNDA.indexOf(minLabel);
  if (rang === -1) return { ...basis, punten: 5, toelichting: "Energielabel kon niet worden vastgesteld." };
  if (rang <= rangMin) return { ...basis, punten: 8, toelichting: `Label ${label}, voldoet aan het gewenste minimum (${minLabel}).` };
  if (rang === rangMin + 1) return { ...basis, punten: 5, toelichting: `Label ${label}, één klasse lager dan gewenst.` };
  return { ...basis, punten: 0, toelichting: `Label ${label}, aanzienlijk lager dan gewenst (${minLabel}).` };
}

// --- Component 8: parkeren (5) -------------------------------------------------
// De opgave definieert expliciet alleen tiers voor "no_car" (5) en
// "private_required" (5/2/0). "private_preferred"/"public_ok" zijn een eigen,
// beargumenteerde invulling: private_preferred beloont een eigen plek vol,
// maar straft het ontbreken ervan milder dan private_required (voorkeur, geen
// eis); public_ok is al tevreden met ELKE vorm van parkeren.
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

// --- Component 9: dealbreakers (-20 bij trigger) ------------------------------
// "busy_road_noise", "too_far_from_work" en "other" (vrije tekst) hebben GEEN
// automatische detectie -- er is simpelweg geen databron voor geluid,
// werklocatie, of vrij ingevulde tekst. Ze triggeren daarom nooit
// automatisch; de makelaar ziet ze wel teruggekomen bij de koper-voorkeuren
// zelf, alleen niet als geautomatiseerde afwijzingsgrond.
//
// "ground_floor_no_elevator" ("Benedenwoning zonder lift"): letterlijk zou dit
// een begane-grond-woning ZONDER lift betekenen -- maar een begane-grond-
// woning heeft per definitie geen lift nodig. De praktisch zinvolle uitleg
// (en de aangenomen bedoeling) is een woning op een HOGERE verdieping zonder
// lift -- dat is het daadwerkelijke toegankelijkheidsprobleem. Bewust zo
// geïmplementeerd, gedocumenteerd als eigen interpretatie i.p.v. de letterlijke
// tekst blind te volgen.
function isDealbreakerGetriggerd(
  db: B2bDealbreaker,
  match: B2bWoningMatch,
  verificatie: B2bMatchVerificatie | null,
  voorkeuren: B2bKoperVoorkeuren,
  voorzieningen: VoorzieningenResultaat
): boolean {
  const minKamers = B2B_MIN_KAMERS_OPTIES.find((o) => o.waarde === voorkeuren.minKamers)?.minKamers ?? 1;
  const minArea = B2B_MIN_OPPERVLAK_OPTIES.find((o) => o.waarde === voorkeuren.minOppervlak)?.minArea ?? 0;
  const maxBudget = B2B_BUDGET_OPTIES.find((o) => o.waarde === voorkeuren.maxKoopprijs)?.max ?? null;

  switch (db) {
    case "no_outdoor_space":
      return verificatie ? !verificatie.heeftTuin && !verificatie.heeftBalkon && !verificatie.heeftDakterras : false;
    case "no_parking":
      return verificatie ? !verificatie.heeftEigenParkeerplek && /geen\s+parkeer/i.test(verificatie.parkeerOmschrijving ?? "") : false;
    case "ground_floor_no_elevator":
      return verificatie ? verificatie.woonlaag != null && verificatie.woonlaag > 0 && !verificatie.heeftLift : false;
    case "busy_road_noise":
    case "too_far_from_work":
    case "other":
      return false; // geen databron, zie toelichting hierboven
    case "poor_energy_label": {
      const rang = verificatie?.energielabel ? ENERGIELABEL_VOLGORDE_FUNDA.indexOf(verificatie.energielabel) : -1;
      const rangC = ENERGIELABEL_VOLGORDE_FUNDA.indexOf("C");
      return rang !== -1 && rang > rangC;
    }
    case "price_over_budget":
      return maxBudget != null && match.prijs != null && match.prijs > maxBudget * (1 + BUDGET_ZOEK_MARGE);
    case "too_few_rooms":
      return verificatie?.kamers != null && verificatie.kamers < minKamers - 1;
    case "too_small_area":
      return verificatie?.woonoppervlak != null && verificatie.woonoppervlak < minArea * 0.9;
    case "no_amenities": {
      if (!voorzieningen.gevonden) return false; // onbekend, geen afwijzingsgrond
      const wensenMetDatabron = voorkeuren.belangrijkeVoorzieningen.filter(heeftDatabron);
      if (wensenMetDatabron.length === 0) return false; // niets meetbaars om op af te wijzen
      return wensenMetDatabron.every((w) => {
        const afstand = afstandTotWens(voorzieningen.items, w);
        return afstand == null || afstand > VOORZIENING_DICHTBIJ_KM;
      });
    }
    default:
      return false;
  }
}

function evalueerDealbreakers(
  match: B2bWoningMatch,
  verificatie: B2bMatchVerificatie | null,
  voorkeuren: B2bKoperVoorkeuren,
  voorzieningen: VoorzieningenResultaat
): { getriggerd: B2bDealbreaker[]; onderdeel: MatchScoreOnderdeel } {
  const getriggerd = voorkeuren.dealbreakers.filter((db) => isDealbreakerGetriggerd(db, match, verificatie, voorkeuren, voorzieningen));
  return {
    getriggerd,
    onderdeel: {
      key: "dealbreakers",
      label: "Dealbreakers",
      punten: getriggerd.length > 0 ? -20 : 0,
      maxPunten: 0,
      toelichting: getriggerd.length > 0 ? `Raakt ${getriggerd.length} opgegeven dealbreaker(s).` : "Geen dealbreakers geraakt.",
    },
  };
}

// --- Component 10: prioriteitenbonus (10) -------------------------------------
// Gemiddelde van de "excellentie-tier" (10 / 5 / 0) over de tot 3 gekozen
// prioriteiten. "quiet_location" heeft geen databron (geen geluids-/rust-
// cijfers beschikbaar) en telt daarom altijd als het middelste tier (5) --
// eigen, beargumenteerde keuze, niet uit de opgave zelf. "condition_year"
// wordt benaderd via het bouwjaar (>= 2015 = uitstekend, < 1970 = matig) --
// ook een eigen, redelijke interpretatie, want de opgave zelf werkt dit niet
// verder uit.
function tierVoorComponent(onderdeel: MatchScoreOnderdeel): number {
  if (onderdeel.maxPunten === 0) return 5;
  if (onderdeel.punten >= onderdeel.maxPunten) return 10;
  if (onderdeel.punten <= 0) return 0;
  return 5;
}

function tierAmenitiesNearby(voorkeuren: B2bKoperVoorkeuren, voorzieningen: VoorzieningenResultaat): number {
  const wensenMetDatabron = voorkeuren.belangrijkeVoorzieningen.filter(heeftDatabron);
  if (!voorzieningen.gevonden || wensenMetDatabron.length === 0) return 5;
  const afstanden = wensenMetDatabron.map((w) => afstandTotWens(voorzieningen.items, w)).filter((a): a is number => a != null);
  if (afstanden.length === 0) return 5;
  const kortste = Math.min(...afstanden);
  if (kortste <= 1) return 10;
  if (kortste <= VOORZIENING_DICHTBIJ_KM) return 5;
  return 0;
}

function tierConditionYear(verificatie: B2bMatchVerificatie | null): number {
  const bouwjaar = verificatie?.bouwjaar ?? null;
  if (bouwjaar == null) return 5;
  if (bouwjaar >= 2015) return 10;
  if (bouwjaar < 1970) return 0;
  return 5;
}

function scorePrioriteitenBonus(
  voorkeuren: B2bKoperVoorkeuren,
  verificatie: B2bMatchVerificatie | null,
  voorzieningen: VoorzieningenResultaat,
  onderdelenPerKey: Record<string, MatchScoreOnderdeel>
): MatchScoreOnderdeel {
  const basis = { key: "prioriteiten", label: "Prioriteiten", maxPunten: 10 };
  if (voorkeuren.prioriteiten.length === 0) {
    return { ...basis, punten: 0, toelichting: "Geen prioriteiten opgegeven." };
  }
  const koppeling: Record<B2bPrioriteitOptie, () => number> = {
    location: () => tierVoorComponent(onderdelenPerKey.locatie),
    price: () => tierVoorComponent(onderdelenPerKey.budget),
    size: () => tierVoorComponent(onderdelenPerKey.oppervlak),
    rooms: () => tierVoorComponent(onderdelenPerKey.kamers),
    outdoor_space: () => tierVoorComponent(onderdelenPerKey.buitenruimte),
    energy_efficiency: () => tierVoorComponent(onderdelenPerKey.energielabel),
    parking: () => tierVoorComponent(onderdelenPerKey.parkeren),
    amenities_nearby: () => tierAmenitiesNearby(voorkeuren, voorzieningen),
    quiet_location: () => 5,
    condition_year: () => tierConditionYear(verificatie),
  };
  const tiers = voorkeuren.prioriteiten.map((p) => koppeling[p]());
  const gemiddelde = Math.round(tiers.reduce((a, b) => a + b, 0) / tiers.length);
  return {
    ...basis,
    punten: gemiddelde,
    toelichting: `Scoort gemiddeld ${gemiddelde}/10 op de ${voorkeuren.prioriteiten.length} opgegeven prioriteit(en).`,
  };
}

// -----------------------------------------------------------------------------
export async function berekenMatchScore(match: B2bWoningMatch, voorkeuren: B2bKoperVoorkeuren | null): Promise<MatchScore> {
  if (!voorkeuren) {
    return {
      totaal: 0,
      ruwTotaal: 0,
      onderdelen: [],
      dealbreakersGetriggerd: [],
      voldoetAanMinimum: false,
    };
  }

  const verificatie = match.verificatie;

  // Voorzieningen (Vraag 9 / dealbreaker "no_amenities" / prioriteit
  // "amenities_nearby") -- alleen ophalen als er ook daadwerkelijk iets mee
  // gedaan wordt, zie voorzieningenMatch.ts voor de kostenoverweging (gratis
  // CBS-bronnen, maar wel extra latency per kandidaat).
  // BUGFIX (dubbelcheck op verzoek van Sjoerd): dit keek voorheen alleen naar
  // `belangrijkeVoorzieningen.length > 0`, dus ook als de koper UITSLUITEND
  // "sports"/"restaurants"/"workplace" had aangevinkt (die geen CBS-databron
  // hebben, zie WENS_NAAR_CBS_KEYS in voorzieningenMatch.ts) werd de dure
  // adresresolutie + CBS-opzoeking toch uitgevoerd, terwijl het resultaat
  // sowieso nooit gebruikt kon worden (heeftDatabron() filtert die wensen
  // er bij het echte gebruik alsnog uit). `.some(heeftDatabron)` voorkomt nu
  // die zinloze extra latency per kandidaat.
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
  const { getriggerd, onderdeel: dealbreakerOnderdeel } = evalueerDealbreakers(match, verificatie, voorkeuren, voorzieningen);

  const onderdelenPerKey: Record<string, MatchScoreOnderdeel> = { budget, locatie, type, kamers, oppervlak, buitenruimte, energielabel, parkeren };
  const prioriteiten = scorePrioriteitenBonus(voorkeuren, verificatie, voorzieningen, onderdelenPerKey);

  const onderdelen = [budget, locatie, type, kamers, oppervlak, buitenruimte, energielabel, parkeren, dealbreakerOnderdeel, prioriteiten];
  const ruwTotaal = onderdelen.reduce((som, o) => som + o.punten, 0);
  const totaal = Math.max(0, Math.min(100, ruwTotaal));

  return {
    totaal,
    ruwTotaal,
    onderdelen,
    dealbreakersGetriggerd: getriggerd,
    voldoetAanMinimum: totaal >= MIN_MATCH_SCORE,
  };
}
