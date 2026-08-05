import { REGIO_OVERBIEDEN, regioSlug, type RegioOverbiedCijfer } from "@/lib/content/regioOverbieden";
import { STEDEN, type Stad } from "@/lib/content/steden";

// -----------------------------------------------------------------------------
// Regiopagina's (/woningmarkt/regio/[regio]) -- programmatic-SEO-uitbreiding
// bovenop de bestaande stadspagina's (lib/content/steden.ts). We hebben echte,
// gesourcte NVM-cijfers voor alle 40 COROP-regio's (lib/content/
// regioOverbieden.ts), maar starten bewust met een kleinere batch i.p.v. in
// één keer alle 40 live te zetten:
//
// 1. Regionamen zelf zijn geen zoekterm ("woningmarkt Noord-Drenthe" wordt
//    door bijna niemand getypt) -- de waarde zit 'm in de gemeenten die
//    eronder vallen. Beginnen met de regio's rond de grootste/bekendste
//    steden geeft de meeste kans op relevante zoekverkeer, en laat ons in
//    Search Console zien hoe dit type pagina het doet vóórdat we naar alle 40
//    uitbreiden.
// 2. Veertig bijna identieke sjabloonpagina's in één keer live zetten is
//    precies het patroon waar Google's "scaled content abuse"-beleid op let.
//    Een kleinere, zorgvuldiger opgezette batch (elke pagina met een eigen,
//    uit de cijfers zelf afgeleide duidingszin, zie regioContextZin
//    hieronder) is veiliger.
//
// Uitbreiden naar de resterende regio's: voeg de regionaam toe aan
// LAUNCH_REGIO_NAMEN hieronder, geen andere code hoeft aangepast te worden.
// -----------------------------------------------------------------------------

const LAUNCH_REGIO_NAMEN = [
  "Groot-Amsterdam",
  "Groot-Rijnmond",
  "Agglomeratie Den Haag",
  "Utrecht",
  "Arnhem/Nijmegen",
  "Zuidoost-Noord-Brabant",
  "Midden-Noord-Brabant",
  "West-Noord-Brabant",
  "Zuid-Limburg",
  "Twente",
  "Noord-Overijssel",
  "Agglomeratie Haarlem",
  "Agglomeratie Leiden en Bollenstreek",
  "Overig Groningen",
  "Het Gooi en Vechtstreek",
];

// Alfabetisch, niet op grootte -- we hebben geen inwonertalcijfer per regio
// in deze databron en willen geen "grootste eerst"-volgorde suggereren die we
// niet met een echt cijfer kunnen onderbouwen.
export const LAUNCH_REGIOS: RegioOverbiedCijfer[] = REGIO_OVERBIEDEN.filter((r) =>
  LAUNCH_REGIO_NAMEN.includes(r.regio)
).sort((a, b) => a.regio.localeCompare(b.regio, "nl"));

export { regioSlug, getRegioBySlug } from "@/lib/content/regioOverbieden";
export type { RegioOverbiedCijfer };

// Is dit een regio die tijdens deze eerste batch al live staat? (i.e. heeft
// een eigen, statisch gegenereerde pagina). Gebruikt om ergens WEL naar te
// linken vs. een regio alleen te tonen zonder link.
export function isLaunchRegio(regioNaam: string): boolean {
  return LAUNCH_REGIO_NAMEN.includes(regioNaam);
}

// Koppelt een regio aan de bestaande stadspagina (lib/content/steden.ts) van
// de hoofdstad in die regio, voor zover die stad daar al een eigen pagina
// heeft met kwartaaltrend-data. Bewust een kleine, met de hand onderhouden
// mapping (geen fuzzy matching) -- alleen ondubbelzinnige gevallen.
const REGIO_NAAR_STAD_SLUG: Record<string, string> = {
  "Groot-Amsterdam": "amsterdam",
  "Groot-Rijnmond": "rotterdam",
  "Agglomeratie Den Haag": "den-haag",
  "Overig Groningen": "groningen",
};

export function getStadVoorRegio(regioNaam: string): Stad | undefined {
  const slug = REGIO_NAAR_STAD_SLUG[regioNaam];
  if (!slug) return undefined;
  return STEDEN.find((s) => s.slug === slug);
}

// Omgekeerde richting: vanaf een stadspagina (bv. /woningmarkt/amsterdam) naar
// de bijbehorende regiopagina linken, als die regio in deze eerste batch zit.
export function getRegioVoorStadSlug(stadSlug: string): RegioOverbiedCijfer | undefined {
  const regioNaam = Object.entries(REGIO_NAAR_STAD_SLUG).find(([, slug]) => slug === stadSlug)?.[0];
  if (!regioNaam) return undefined;
  return LAUNCH_REGIOS.find((r) => r.regio === regioNaam);
}

// Eén feitelijke, uit de cijfers zelf afgeleide duidingszin per regio --
// vergelijkt het gemiddelde overbod in deze regio met het landelijk
// gemiddelde uit de nieuwste Marktupdate. Geen interpretatie of mening, puur
// een rekensom over al gepubliceerde cijfers, maar wel genoeg om elke
// regiopagina een eigen, niet-inwisselbare zin te geven i.p.v. alleen een
// sjabloon met andere getallen erin.
export function regioContextZin(regio: RegioOverbiedCijfer, landelijkGemiddelde: number | null): string {
  if (landelijkGemiddelde == null) {
    return `Gemiddeld werd hier ${regio.gemiddeldOverbod.toFixed(1).replace(".", ",")}% boven de vraagprijs betaald in ${regio.periodeLabel}.`;
  }
  const verschil = regio.gemiddeldOverbod - landelijkGemiddelde;
  const landelijkLabel = landelijkGemiddelde.toFixed(1).replace(".", ",");
  if (Math.abs(verschil) < 0.3) {
    return `Met gemiddeld ${regio.gemiddeldOverbod.toFixed(1).replace(".", ",")}% overbieden ligt deze regio vrijwel gelijk met het landelijk gemiddelde van ${landelijkLabel}%.`;
  }
  if (verschil > 0) {
    return `Hier wordt gemiddeld harder overboden dan landelijk: ${regio.gemiddeldOverbod.toFixed(1).replace(".", ",")}% tegenover ${landelijkLabel}% landelijk.`;
  }
  return `Hier ligt het gemiddelde overbod met ${regio.gemiddeldOverbod.toFixed(1).replace(".", ",")}% onder het landelijk gemiddelde van ${landelijkLabel}%.`;
}
