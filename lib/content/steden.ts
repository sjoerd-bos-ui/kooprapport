import { MARKTUPDATES, type RegioRichting } from "@/lib/content/marktupdates";

// -----------------------------------------------------------------------------
// Stadspagina's (/woningmarkt/[stad]): programmatic-SEO kans uit de audit --
// "huizenprijzen [stad]"/"woningmarkt [stad]" zijn zoektermen met serieus
// volume die deze site nog niet target.
//
// BEWUST GEEN losse, los ingetypte cijfers per stad: de enige per-stad
// cijfers die op dit moment ergens in de app daadwerkelijk geverifieerd en
// gepubliceerd zijn, staan al in de Marktupdates (perRegio.rijen, zie
// marktupdates.ts) -- deze pagina's LEZEN die array uit i.p.v. een tweede,
// los te onderhouden databron met eigen (en dus makkelijk verouderde of
// verzonnen) stadscijfers aan te maken.
//
// Beperking, eerlijk: er zijn tot nu toe pas twee kwartaalupdates
// (Q1/Q2 2026) en die noemen niet elk kwartaal dezelfde steden met naam.
// Deze pagina's tonen daarom soms maar 1 kwartaal aan data voor een stad --
// dat is geen bug, dat is gewoon wat er tot nu toe daadwerkelijk over die
// stad gepubliceerd is. Naarmate er meer kwartalen bijkomen (en steden vaker
// terugkomen in de rijen), groeit de tabel vanzelf mee, zonder dat deze
// pagina's zelf aangepast hoeven te worden.
//
// Steden-lijst bewust beperkt tot de vier plekken die al minstens één keer
// met naam (niet als regio/provincie) in een Marktupdate voorkwamen --
// Amsterdam, Rotterdam, Den Haag, Groningen. Uitbreiden naar meer steden
// vraagt eerst om meer/rijkere brondata, niet om verzonnen cijfers hier.
export interface Stad {
  slug: string;
  naam: string;
}

export const STEDEN: Stad[] = [
  { slug: "amsterdam", naam: "Amsterdam" },
  { slug: "rotterdam", naam: "Rotterdam" },
  { slug: "den-haag", naam: "Den Haag" },
  { slug: "groningen", naam: "Groningen" },
];

export function getStadBySlug(slug: string): Stad | undefined {
  return STEDEN.find((s) => s.slug === slug);
}

export interface StadCijferRij {
  periodeLabel: string;
  gepubliceerd: string;
  jaarVergelijking: string;
  extra: string;
  richting: RegioRichting;
  marktupdateSlug: string;
}

// Zoekt, per kwartaal, of deze stad met naam voorkomt in perRegio.rijen --
// exacte naam-match (geen fuzzy/losse matching), zodat "Groningen" (de stad)
// nooit per ongeluk de rij voor "Overig Groningen" (de regio) meepakt.
export function getStadCijfers(stadNaam: string): StadCijferRij[] {
  const rijen: StadCijferRij[] = [];
  for (const update of MARKTUPDATES) {
    const rij = update.perRegio.rijen.find((r) => r.naam === stadNaam);
    if (rij) {
      rijen.push({
        periodeLabel: update.periodeLabel,
        gepubliceerd: update.gepubliceerd,
        jaarVergelijking: rij.jaarVergelijking,
        extra: rij.extra,
        richting: rij.richting,
        marktupdateSlug: update.slug,
      });
    }
  }
  // Nieuwste kwartaal eerst, zelfde volgorde als de rest van de site.
  return rijen.reverse();
}
