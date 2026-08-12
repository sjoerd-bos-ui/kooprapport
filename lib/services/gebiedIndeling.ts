import type { B2bLocatie } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Matchingmodel v2, Component 2 (locatie-score) -- vergelijkt een gevonden
// Funda-woning tegen de tot 3 gekozen, landelijke B2bLocatie-voorkeuren.
//
// GESCHIEDENIS: dit bestand classificeerde eerder een woning naar één van 10
// vaste, zelfbedachte Rotterdam-regio's (ROTTERDAM_KWADRANT_WIJKEN) met een
// aangrenzendheidsgraaf tussen die 10 gebieden. Sjoerd gaf expliciet aan dat
// een koper overal in Nederland moet kunnen kiezen ("dit waren voorbeelden;
// mensen moeten alles kunnen kiezen in Nederland natuurlijk") -- de
// vragenlijst gebruikt nu dezelfde live PDOK-autocomplete als de oude
// zoekopdracht (LocatieAutocomplete.tsx) voor ALLE 3 locatieslots, niet meer
// alleen voor een "Andere"-uitzondering. Een vaste, handmatig onderhouden
// aangrenzendheidsgraaf is voor heel Nederland niet haalbaar/onderhoudbaar,
// dus die hele opzet is hier vervangen door een generieke tekstvergelijking.
//
// Omdat de Funda-zoekopdracht zelf al is afgebakend tot precies de gekozen
// plaatsen/wijken (zie afgeleideGebiedSlugs in lib/data-sources/fundaFeed.ts,
// via Funda's eigen `selected_area`), ligt een NIEUW gevonden kandidaat
// vrijwel altijd al binnen een van de gekozen locaties. Deze vergelijking is
// dus vooral belangrijk bij het HERSCOREN van een AL OPGESLAGEN match nadat
// de koper-voorkeuren zijn gewijzigd (zie ruimVerouderdeMatchenOp in
// b2bStore.ts) -- dan kan een oude match wel degelijk buiten de nieuwe
// locatiekeuze vallen, en moet dat ook echt zichtbaar worden in de score.
// -----------------------------------------------------------------------------

function normaliseer(tekst: string): string {
  return tekst
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diakritische tekens weg (bv. accenten)
    .toLowerCase()
    .trim();
}

// Een B2bLocatie.label is óf een plaatsnaam ("Rotterdam") óf "Wijk/Straat,
// Plaats" (bv. "Kralingen, Rotterdam" of "Reserveboezemstraat, Rotterdam",
// zie plaatsLookup.ts) -- dit splitst dat weer uit elkaar zodat de
// plaatsnaam en (indien aanwezig) de wijk- of straatnaam apart vergeleken
// kunnen worden tegen Funda's eigen `plaatsnaam`/`gebiedRuw`/`straatRuw`.
// STRAAT-NIVEAU (zie het Cowork-gesprek "straat-niveau locatie wordt nog
// niet ondersteund"): `locatie.straatSlug` bepaalt of het subdeel vóór de
// komma een wijk of een straat is -- het label zelf ziet er identiek uit,
// alleen de aanwezigheid van straatSlug maakt het verschil (sluit elkaar
// uit met wijkSlug, zie B2bLocatie in types/b2b.ts).
function ontleedLocatieLabel(locatie: B2bLocatie): { plaats: string; wijk: string | null; straat: string | null } {
  const delen = locatie.label.split(",").map((d) => d.trim());
  if (delen.length > 1) {
    const subNaam = normaliseer(delen[0]);
    const plaats = normaliseer(delen[delen.length - 1]);
    return locatie.straatSlug ? { plaats, wijk: null, straat: subNaam } : { plaats, wijk: subNaam, straat: null };
  }
  return { plaats: normaliseer(delen[0]), wijk: null, straat: null };
}

function komtOvereen(a: string, b: string): boolean {
  return a === b || a.includes(b) || b.includes(a);
}

export type LocatieMatchResultaat = "exact" | "onbekend" | "geen_match";

export interface LocatieVergelijkResultaat {
  resultaat: LocatieMatchResultaat;
  // Index (0-gebaseerd) in de meegegeven voorkeurLocaties-lijst van de
  // gekozen locatie waarop "exact" gescoord werd, anders `null`. Matchingmodel
  // v3 (zie matchScore.ts): gebruikt door scoreLocatie() om een match met de
  // EERST gekozen (dus hoogst geprefereerde) locatie hoger te belonen dan een
  // match met de op één of twee na gekozen locatie, en door
  // voldoetAanHardeEisen() (die alleen `resultaat` nodig heeft) om "geen_match"
  // hard af te wijzen.
  exacteIndex: number | null;
}

// Beste resultaat over alle (tot 3) gekozen locaties -- "exact" wint altijd
// van "onbekend", dat wint altijd van "geen_match". Bij meerdere exacte
// matches (zou niet moeten voorkomen bij een normale locatiekeuze, maar
// theoretisch mogelijk bij overlappende plaats/wijk-keuzes) telt de EERST
// gekozen locatie in de lijst.
//
// `straatRuw` (zie het Cowork-gesprek "straat-niveau locatie wordt nog niet
// ondersteund"): optioneel, want de meeste aanroepers/kandidaten hebben dit
// niet nodig -- alleen relevant voor een gekozen locatie met `straatSlug`.
// Zelfde bron als `gebiedRuw` (BreadcrumbList op de detailpagina, zie
// extractBreadcrumbStraat in lib/data-sources/fundaFeed.ts), en dezelfde
// substring-vergelijking (komtOvereen): "reserveboezemstraat 5" bevat
// "reserveboezemstraat", dus geen aparte parsing van het huisnummer nodig.
export function vergelijkLocatieUitgebreid(
  voorkeurLocaties: B2bLocatie[],
  gebiedRuw: string | null,
  plaatsnaam: string | null,
  straatRuw: string | null = null
): LocatieVergelijkResultaat {
  const candidaatPlaats = plaatsnaam ? normaliseer(plaatsnaam) : null;
  const candidaatWijk = gebiedRuw ? normaliseer(gebiedRuw) : null;
  const candidaatStraat = straatRuw ? normaliseer(straatRuw) : null;

  let besteResultaat: LocatieMatchResultaat = "geen_match";

  for (let i = 0; i < voorkeurLocaties.length; i++) {
    const { plaats: gekozenPlaats, wijk: gekozenWijk, straat: gekozenStraat } = ontleedLocatieLabel(voorkeurLocaties[i]);
    let resultaat: LocatieMatchResultaat;

    if (candidaatPlaats == null) {
      // Geen plaatsnaam bekend uit de scrape -- niets te vergelijken, geen
      // afwijzingsgrond (zelfde "ontbrekende scrapegegevens" discipline als
      // elders in matchScore.ts).
      resultaat = "onbekend";
    } else if (!komtOvereen(candidaatPlaats, gekozenPlaats)) {
      // Plaats komt niet overeen met deze gekozen locatie -- duidelijk geen
      // match voor DIT gekozen item (een ander gekozen item kan nog wel
      // matchen, vandaar de lus over alle locaties).
      resultaat = "geen_match";
    } else if (gekozenStraat != null) {
      // De koper koos een specifieke STRAAT -- fijnmaziger dan een wijk,
      // dus eigen tak i.p.v. hergebruik van de wijk-vergelijking hieronder.
      if (candidaatStraat == null) {
        resultaat = "onbekend";
      } else if (komtOvereen(candidaatStraat, gekozenStraat)) {
        resultaat = "exact";
      } else {
        resultaat = "geen_match";
      }
    } else if (gekozenWijk == null) {
      // De koper koos de hele plaats (geen specifieke wijk) -- plaats komt
      // overeen, dus exacte match, ongeacht de wijk van de kandidaat.
      resultaat = "exact";
    } else if (candidaatWijk == null) {
      // Plaats komt overeen, maar de koper koos een specifieke wijk binnen
      // die plaats en Funda's eigen wijk/buurtnaam kon niet worden
      // vastgesteld -- kan niet op wijkniveau bevestigd worden.
      resultaat = "onbekend";
    } else if (komtOvereen(candidaatWijk, gekozenWijk)) {
      resultaat = "exact";
    } else {
      // Plaats klopt, maar de wijk wijkt aantoonbaar af van de gekozen wijk.
      resultaat = "geen_match";
    }

    if (resultaat === "exact") return { resultaat: "exact", exacteIndex: i }; // niet beter te worden, stop meteen
    if (resultaat === "onbekend" && besteResultaat === "geen_match") besteResultaat = "onbekend";
  }

  return { resultaat: besteResultaat, exacteIndex: null };
}

// Simpele variant voor aanroepers die alleen het resultaat nodig hebben
// (bv. voldoetAanHardeEisen() in matchScore.ts), zonder de index.
export function vergelijkLocatie(
  voorkeurLocaties: B2bLocatie[],
  gebiedRuw: string | null,
  plaatsnaam: string | null,
  straatRuw: string | null = null
): LocatieMatchResultaat {
  return vergelijkLocatieUitgebreid(voorkeurLocaties, gebiedRuw, plaatsnaam, straatRuw).resultaat;
}
