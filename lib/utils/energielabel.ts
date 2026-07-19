import type { ChipToon } from "@/components/report/StatusChip";

// Vaste volgorde van de officiële energielabel-schaal, beste naar slechtste
// klasse — gebruikt om (a) de ladder in de UI te tekenen en (b) te bepalen
// waar een specifiek label t.o.v. de rest van de schaal valt. Bewust hier
// (i.p.v. lib/data-sources/energielabel.ts) omdat dit puur presentatie is,
// geen brongegeven — de brondata is en blijft alleen de letter zelf.
export const ENERGIELABEL_SCHAAL = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G"] as const;

// Kleur per positie op de schaal (index 0 = A+++, index 9 = G) — een vloeiend
// verloop van teal (het "gunstig"-merkkleur) naar rood ("risico"), zodat de
// ladder ook zonder de lettertekst al leesbaar is.
export const ENERGIELABEL_KLEUREN = [
  "#0F766E",
  "#189183",
  "#22A599",
  "#5FBBA0",
  "#9BCB86",
  "#E8D25C",
  "#EFA94E",
  "#E67E4E",
  "#D9564B",
  "#B7302B",
];

export interface EnergielabelDuiding {
  index: number; // 0 = A+++ (zuinigst), 9 = G (onzuinigst)
  kleur: string;
  toon: ChipToon;
  kwartTekst: string; // waar dit label op de schaal valt
  stookkostenTekst: string; // wat dit voor stookkosten/verbruik betekent
}

// Vertaalt een geregistreerde energieklasse naar een korte, feitelijke duiding
// t.o.v. de rest van de A+++–G schaal. Bewust alleen relatieve taal ("wijst
// doorgaans op", "t.o.v. het gemiddelde") — er is geen brongegeven over het
// werkelijke energieverbruik van dít pand, dus daar wordt nooit een concreet
// getal (bv. "€X per jaar") bij verzonnen.
export function duidEnergielabel(klasse: string): EnergielabelDuiding | null {
  const index = ENERGIELABEL_SCHAAL.indexOf(klasse as (typeof ENERGIELABEL_SCHAAL)[number]);
  if (index === -1) return null;

  const kleur = ENERGIELABEL_KLEUREN[index];

  if (index <= 2) {
    // A+++, A++, A+
    return {
      index,
      kleur,
      toon: "gunstig",
      kwartTekst: "top van de energielabel-schaal",
      stookkostenTekst:
        "dat betekent meestal een heel laag energieverbruik, met goede isolatie en moderne installaties vergeleken met de gemiddelde Nederlandse woning.",
    };
  }
  if (index <= 4) {
    // A, B
    return {
      index,
      kleur,
      toon: "gunstig",
      kwartTekst: "bovenste helft van de energielabel-schaal",
      stookkostenTekst: "dat betekent meestal lagere energiekosten dan de gemiddelde Nederlandse woning.",
    };
  }
  if (index <= 6) {
    // C, D
    return {
      index,
      kleur,
      toon: "aandacht",
      kwartTekst: "middenmoot van de energielabel-schaal",
      stookkostenTekst: "dat is een gemiddeld energieverbruik: niet extra zuinig, maar ook niet slechter dan gemiddeld.",
    };
  }
  // E, F, G
  return {
    index,
    kleur,
    toon: "risico",
    // "laag" i.p.v. "deel" — grammaticaal correct in de bestaande zin "zit in
    // de {kwartTekst}" op zowel de webpagina als in de PDF (components/report/
    // ReportView.tsx en lib/pdf/ReportDocument.tsx).
    kwartTekst: "onderste laag van de energielabel-schaal",
    stookkostenTekst:
      "dat betekent meestal hogere energiekosten dan gemiddeld, vaak door minder isolatie of oudere installaties.",
  };
}
