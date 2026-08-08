import type { B2bVoorkeurLocatie } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Matchingmodel v2, Component 2 (locatie-score) -- classificeert een gevonden
// Funda-woning naar één van de 10 vaste B2bVoorkeurLocatie-gebieden (plus
// "other"), en levert de aangrenzendheid tussen die gebieden voor de
// 15-puntentussenstap ("aangrenzende locatie").
//
// BELANGRIJK, LEES DIT VOOR JE HIER IETS AAN WIJZIGT: "Rotterdam Centrum/
// Noord/Zuid/Oost/West" bestaan NIET als officieel, doorzoekbaar Funda- of
// CBS-gebied (in tegenstelling tot bv. "Kralingen-Crooswijk", dat wél zo'n
// live-geverifieerd, exact gebied is, zie plaatsLookup.ts). Dit is een
// BEARGUMENTEERDE EIGEN INDELING op basis van de 21 officiële CBS-wijken van
// Rotterdam (live opgehaald via de PDOK Locatieserver, `fq=type:wijk AND
// gemeentenaam:Rotterdam` -- niet gegokt welke wijken Rotterdam heeft, wel
// een eigen keuze in welk kwadrant elke wijk valt): de Maas scheidt Noord/
// Zuid, en Centrum/Oost/West zijn de resterende, geografisch voor de hand
// liggende clusters. Overleg met Sjoerd als een klant een scherpere indeling
// nodig heeft -- dit is bewust een grove, praktische aanpak, geen officiële
// bron.
export const ROTTERDAM_KWADRANT_WIJKEN: Record<"rotterdam_centrum" | "rotterdam_noord" | "rotterdam_zuid" | "rotterdam_oost" | "rotterdam_west", string[]> = {
  rotterdam_centrum: ["Rotterdam Centrum"],
  // Noord van de Maas, rond/boven het centrum.
  rotterdam_noord: ["Noord", "Hillegersberg-Schiebroek", "Overschie", "Rotterdam-Noord-West"],
  // Zuid van de Maas.
  rotterdam_zuid: ["Charlois", "Feijenoord", "Hoogvliet", "IJsselmonde", "Pernis", "Waalhaven-Eemhaven"],
  // Oostelijke woon-/kantoorwijken.
  rotterdam_oost: ["Kralingen-Crooswijk", "Prins Alexander", "Rivium"],
  // Westelijke/haven- en kustwijken.
  rotterdam_west: ["Delfshaven", "Hoek van Holland", "Nieuw Mathenesse", "Rozenburg", "Spaanse Polder", "Vondelingenplaat", "Botlek-Europoort-Maasvlakte"],
};

// Symmetrische aangrenzendheid tussen de 10 vaste gebieden -- ook een eigen,
// beargumenteerde inschatting (geen officiële bron), gebaseerd op
// daadwerkelijke ligging: Centrum grenst aan alle 4 Rotterdamse kwadranten,
// Capelle ligt naast Kralingen/Prins Alexander (Oost), Schiedam/Vlaardingen
// grenzen aan elkaar en aan West, Barendrecht/Hendrik-Ido-Ambacht liggen aan
// de zuidkant van de Maas tegenover Zuid/Oost. "other" heeft bewust geen
// aangrenzende gebieden (onbekende, vrij ingevulde locatie).
const AANGRENZEND: Record<B2bVoorkeurLocatie, B2bVoorkeurLocatie[]> = {
  rotterdam_centrum: ["rotterdam_noord", "rotterdam_zuid", "rotterdam_oost", "rotterdam_west"],
  rotterdam_noord: ["rotterdam_centrum"],
  rotterdam_zuid: ["rotterdam_centrum", "barendrecht", "hendrik_ido_ambacht"],
  rotterdam_oost: ["rotterdam_centrum", "capelle"],
  rotterdam_west: ["rotterdam_centrum", "schiedam", "vlaardingen"],
  schiedam: ["rotterdam_west", "vlaardingen"],
  vlaardingen: ["schiedam", "rotterdam_west"],
  capelle: ["rotterdam_oost"],
  barendrecht: ["rotterdam_zuid"],
  hendrik_ido_ambacht: ["rotterdam_zuid"],
  other: [],
};

export function zijnAangrenzend(a: B2bVoorkeurLocatie, b: B2bVoorkeurLocatie): boolean {
  return AANGRENZEND[a]?.includes(b) ?? false;
}

// Losse gemeenten die 1-op-1 overeenkomen met een B2bVoorkeurLocatie-optie --
// live geverifieerd via PDOK (type: woonplaats) dat dit de officiële
// plaatsnamen zijn, en via Funda's eigen zoek-URL dat de bijbehorende slug
// werkt (selected_area=schiedam,vlaardingen,barendrecht,hendrik-ido-ambacht
// gaf 1.308 resultaten, zie VOORTGANG.md).
const GEMEENTE_NAAR_LOCATIE: Partial<Record<string, B2bVoorkeurLocatie>> = {
  schiedam: "schiedam",
  vlaardingen: "vlaardingen",
  "capelle aan den ijssel": "capelle",
  barendrecht: "barendrecht",
  "hendrik-ido-ambacht": "hendrik_ido_ambacht",
};

// Classificeert een gevonden woning naar één van de 10 vaste gebieden, o.b.v.
// `gebiedRuw` (Funda's eigen wijk/buurtnaam uit het BreadcrumbList-blok, zie
// B2bMatchVerificatie.gebiedRuw) en `plaatsnaam` (addressLocality uit de
// JSON-LD). `null` = niet te classificeren (bv. een plaats buiten de 10 vaste
// opties) -- dat is geen fout, gewoon "other" voor de score, zie matchScore.ts.
export function classificeerGebied(gebiedRuw: string | null, plaatsnaam: string | null): B2bVoorkeurLocatie | null {
  const plaats = plaatsnaam?.trim().toLowerCase() ?? "";
  if (plaats && plaats !== "rotterdam") {
    return GEMEENTE_NAAR_LOCATIE[plaats] ?? null;
  }
  // Rotterdam (of plaats onbekend, dan aannemen dat het om Rotterdam-zoeken
  // ging): classificeer via gebiedRuw tegen de kwadrant-wijkenlijst. Funda's
  // eigen breadcrumb-naam is soms een BUURT (bv. "Nieuw Crooswijk") i.p.v. de
  // volledige wijknaam ("Kralingen-Crooswijk") -- daarom substring-match
  // i.p.v. exacte match, in beide richtingen.
  const gebied = gebiedRuw?.trim().toLowerCase() ?? "";
  if (!gebied) return null;
  for (const [kwadrant, wijken] of Object.entries(ROTTERDAM_KWADRANT_WIJKEN)) {
    for (const wijk of wijken) {
      const w = wijk.toLowerCase();
      if (gebied.includes(w) || w.includes(gebied)) return kwadrant as B2bVoorkeurLocatie;
    }
  }
  return null;
}
