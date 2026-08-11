// -----------------------------------------------------------------------------
// Verkoperspresentatie -- Fase 1 ("content-laag", zie het Cowork-gesprek
// "Verkoper-presentatie generator"). Een gepersonaliseerde presentatie die een
// makelaar meeneemt naar een waardebepalingsgesprek bij een POTENTIËLE
// verkoper, om de verkoopopdracht te winnen. Dit is bewust een ACQUISITIETOOL
// (vóór het mandaat), losstaand van de bestaande koper-matchingflow.
//
// Fase 1 bouwt alleen de content (dit type + lib/services/verkoperspresentatie.ts)
// op basis van een al bestaand rapport in een "verkoop"-dossier (B2bKlantdossier).
// De vormgeving (Adobe Express-sjabloon) is bewust Fase 2 en hangt af van een
// Adobe-autorisatie die Sjoerd zelf moet regelen -- dit type is dus de
// structuur die straks in zo'n sjabloon gevuld wordt, geen eigen
// PDF/slide-renderer.
// -----------------------------------------------------------------------------

export type PresentatieToon = "persoonlijk" | "zakelijk";

export const PRESENTATIE_TOON_OPTIES: { waarde: PresentatieToon; label: string }[] = [
  { waarde: "persoonlijk", label: "Persoonlijk warm" },
  { waarde: "zakelijk", label: "Zakelijk feitelijk" },
];

// Vaste volgorde/set van vijf dia's -- zelfde vijf als besproken/gevisualiseerd
// met Sjoerd: titel, marktanalyse, vraagprijsadvies, vergelijkbare woningen,
// aanpak. Een `key` per dia (i.p.v. alleen een array-positie) zodat de UI en
// een latere Adobe Express-mapping (Fase 2) een dia altijd betrouwbaar kunnen
// herkennen, ook als de volgorde ooit wijzigt.
export type VerkoperspresentatieDiaKey = "titel" | "marktanalyse" | "vraagprijsadvies" | "vergelijkbare_woningen" | "aanpak";

export interface VerkoperspresentatieDia {
  key: VerkoperspresentatieDiaKey;
  titel: string;
  tekst: string;
  // Eén optioneel kerncijfer voor dia's waar dat past (bv. de vraagprijsadvies-
  // bandbreedte) -- puur weergave, geen aparte databron. Null bij dia's zonder
  // los uit te lichten getal (titel, aanpak).
  kerncijfer: string | null;
}

export interface Verkoperspresentatie {
  adres: string;
  verkoperNaam: string;
  toon: PresentatieToon;
  organisatieNaam: string | null; // B2bBranding.weergaveNaam, valt terug op B2bOrganisatie.naam
  dias: VerkoperspresentatieDia[];
  gegenereerdOp: string; // ISO
  // Zelfde onderscheid als VraagAntwoord.bron (vraagAssistent.ts): "ai" als de
  // live Anthropic-aanroep is gebruikt, "rapportgegevens" bij de kosteloze
  // mock-samenstelling (ook dan een inhoudelijk kloppende tekst, alleen zonder
  // vrije-vorm taalgebruik).
  bron: "ai" | "rapportgegevens";
}

export interface VerkoperspresentatieInvoer {
  rapportId: string;
  toon: PresentatieToon;
  verkoperNaam: string;
}
