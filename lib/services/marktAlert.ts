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

// werkgebiedRegios: optionele lijst met exacte MarktupdateRegioRij.naam-
// waarden (zie B2bOrganisatie.werkgebiedRegios in types/b2b.ts). Leeg/
// undefined = geen filter, exact het oude gedrag (alles tonen) -- zodat een
// organisatie die nog geen werkgebied heeft ingesteld niets verliest.
export function getMarktMeldingen(werkgebiedRegios?: string[]): MarktMelding[] {
  const laatste = MARKTUPDATES[MARKTUPDATES.length - 1];
  if (!laatste) return [];
  const heeftFilter = werkgebiedRegios && werkgebiedRegios.length > 0;
  return laatste.perRegio.rijen
    .filter((rij) => rij.richting !== "flat")
    .filter((rij) => !heeftFilter || werkgebiedRegios!.includes(rij.naam))
    .map((rij) => ({
      regio: rij,
      periodeLabel: laatste.periodeLabel,
      marktupdateSlug: laatste.slug,
    }));
}

// Alle regionamen die ooit in een Marktupdate zijn gebruikt (dedup,
// alfabetisch) -- dit is bewust de enige bron voor de werkgebied-selectie in
// de instellingen, want dit zijn letterlijk de enige waarden waar
// getMarktMeldingen() ooit tegen kan matchen (zie de toelichting in
// lib/content/marktupdates.ts: elke update kiest een eigen, redactioneel
// setje regio's, geen vaste lijst).
// Monitoring op dossierniveau (#5): is er een Marktupdate gepubliceerd NA een
// gegeven datum (bv. de laatste keer dat er een rapport in een dossier werd
// opgevraagd)? Bewust dossierbreed i.p.v. regio-specifiek: de vrije,
// redactionele regionamen in elke Marktupdate (zie alleGebruikteRegioNamen
// hierboven) matchen niet betrouwbaar tegen een specifiek adres/regio, dus in
// plaats van dat te faken geeft dit gewoon een eerlijk "er is nieuwe data
// sinds toen"-signaal.
export function heeftNieuweMarktcijfersSinds(datumISO: string): boolean {
  const laatste = MARKTUPDATES[MARKTUPDATES.length - 1];
  if (!laatste) return false;
  return new Date(laatste.gepubliceerdISO).getTime() > new Date(datumISO).getTime();
}

export function laatsteMarktupdateSlug(): string | null {
  return MARKTUPDATES[MARKTUPDATES.length - 1]?.slug ?? null;
}

export function alleGebruikteRegioNamen(): string[] {
  const namen = new Set<string>();
  for (const update of MARKTUPDATES) {
    for (const rij of update.perRegio.rijen) {
      if (rij.naam !== "Landelijk") namen.add(rij.naam);
    }
  }
  return Array.from(namen).sort((a, b) => a.localeCompare(b, "nl"));
}
