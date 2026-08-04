import { MARKTUPDATES, type MarktupdateRegioRij } from "@/lib/content/marktupdates";

// -----------------------------------------------------------------------------
// Marktmeldingen voor het B2B-dashboard: welke regio's uit de nieuwste
// Marktupdate opvallend bewegen. BEWUST geen zelf berekend verschil tussen
// twee kwartalen: elke Marktupdate bevat een eigen, door Sjoerd samengesteld
// setje regio's (Q1 2026 had Landelijk/Haaglanden/Overig Groningen, Q2 2026
// heeft Groningen/Drenthe/Den Haag/Rotterdam/Amsterdam) -- die twee sets zijn
// niet 1-op-1 vergelijkbaar, dus een eigen delta-berekening zou stilzwijgend
// appels met peren vergelijken. In plaats daarvan hergebruikt dit het
// `richting`-veld dat al per regio in de content staat: dat is de redactionele
// duiding die er toch al is ("up"/"down" betekent iets vermeldenswaardigs),
// "flat" wordt hier niet als melding getoond.
// -----------------------------------------------------------------------------

export interface MarktMelding {
  regio: MarktupdateRegioRij;
  periodeLabel: string;
  marktupdateSlug: string;
}

export function getMarktMeldingen(): MarktMelding[] {
  const laatste = MARKTUPDATES[MARKTUPDATES.length - 1];
  if (!laatste) return [];
  return laatste.perRegio.rijen
    .filter((rij) => rij.richting !== "flat")
    .map((rij) => ({
      regio: rij,
      periodeLabel: laatste.periodeLabel,
      marktupdateSlug: laatste.slug,
    }));
}
