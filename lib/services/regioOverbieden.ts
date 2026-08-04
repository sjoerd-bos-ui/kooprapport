import { REGIO_OVERBIEDEN, type RegioOverbiedCijfer } from "@/lib/content/regioOverbieden";

// -----------------------------------------------------------------------------
// Koppelt een gemeentenaam of woonplaats aan het bijbehorende NVM COROP-
// regiocijfer uit lib/content/regioOverbieden.ts (zie dat bestand voor de
// bron-verantwoording per regio).
//
// Belangrijk: dit matcht op GEMEENTENAAM, niet op elke individuele woonplaats
// (dorpskern). Voor de meeste adressen is de PDOK-woonplaats gelijk aan of
// vrijwel gelijk aan de gemeentenaam (bv. "Utrecht", "Amsterdam", "Zwolle").
// Bij fusiegemeenten (bv. "Land van Cuijk", "Altena", "Maashorst") kan de
// PDOK-woonplaats nog de oude dorpsnaam zijn (bv. "Cuijk", "Uden") -- die
// staan hieronder als bekende aliassen erbij. Wordt een plaats toch niet
// herkend, dan geeft de lookup expliciet null terug (nooit een gok) zodat de
// aanroeper terug kan vallen op het landelijk gemiddelde uit MARKTUPDATES.
// -----------------------------------------------------------------------------

function normaliseer(naam: string): string {
  return naam
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // diakritische tekens weg (ú -> u)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // "Bergen (NH.)" -> "Bergen "
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Bekende dorpskernen/oude gemeentenamen die niet letterlijk voorkomen in de
// NVM-gemeentelijst, maar wel als PDOK-woonplaats kunnen opduiken binnen een
// fusiegemeente. Alleen ondubbelzinnige gevallen -- bij twijfel niet toevoegen.
const PLAATS_ALIAS: Record<string, string> = {
  "den haag": "'s-Gravenhage",
  "s gravenhage": "'s-Gravenhage",
  cuijk: "Land van Cuijk",
  boxmeer: "Land van Cuijk",
  grave: "Land van Cuijk",
  uden: "Maashorst",
  landerd: "Maashorst",
  werkendam: "Altena",
  woudrichem: "Altena",
  "sint michielsgestel": "Sint-Michielsgestel",
};

// Namen die zonder verdere context ambigu zijn tussen twee regio's (twee
// gemeenten heten "Bergen"). Hier bewust NIET gokken.
const AMBIGUE_NAMEN = new Set(["bergen"]);

interface GemeenteIndexEntry {
  regio: RegioOverbiedCijfer;
}

let gemeenteIndex: Map<string, GemeenteIndexEntry> | null = null;

function bouwIndex(): Map<string, GemeenteIndexEntry> {
  const index = new Map<string, GemeenteIndexEntry>();
  for (const regio of REGIO_OVERBIEDEN) {
    for (const gemeente of regio.gemeenten) {
      const key = normaliseer(gemeente);
      // Bij een naamconflict tussen twee regio's (zou hier niet moeten
      // voorkomen behalve de expliciet bewaakte AMBIGUE_NAMEN) wint de eerste
      // -- maar we loggen dat niet stilzwijgend weg voor de bewaakte namen.
      if (!index.has(key)) {
        index.set(key, { regio });
      }
    }
    // De regionaam zelf is vaak ook een geldige plaatsnaam (bv. "Utrecht",
    // "Flevoland" niet, maar "Twente" evenmin -- dus dit raakt vooral de
    // regio's die naar hun hoofdgemeente zijn vernoemd).
    const regioKey = normaliseer(regio.regio);
    if (!index.has(regioKey)) {
      index.set(regioKey, { regio });
    }
  }
  return index;
}

export interface RegioOverbiedResultaat extends RegioOverbiedCijfer {
  gevondenViaAlias: boolean;
}

// Zoekt het NVM-regiocijfer voor een gemeente- of plaatsnaam. Geeft null
// terug (nooit een gok) als de naam ambigu is of niet voorkomt.
export function getRegioOverbiedVoorPlaats(plaatsOfGemeente: string | null | undefined): RegioOverbiedResultaat | null {
  if (!plaatsOfGemeente) return null;
  const key = normaliseer(plaatsOfGemeente);
  if (!key) return null;
  if (AMBIGUE_NAMEN.has(key)) return null;

  if (!gemeenteIndex) gemeenteIndex = bouwIndex();

  const directTreffer = gemeenteIndex.get(key);
  if (directTreffer) {
    return { ...directTreffer.regio, gevondenViaAlias: false };
  }

  const alias = PLAATS_ALIAS[key];
  if (alias) {
    const aliasTreffer = gemeenteIndex.get(normaliseer(alias));
    if (aliasTreffer) {
      return { ...aliasTreffer.regio, gevondenViaAlias: true };
    }
  }

  return null;
}
