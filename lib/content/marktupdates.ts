// -----------------------------------------------------------------------------
// Marktupdates: vaste, terugkerende contentsectie (/marktupdates,
// /marktupdates/[slug]) met elk kwartaal één nieuwe update over de
// Nederlandse woningmarkt. Zelfde architectuur als de Koopgids: statische,
// door Sjoerd zelf geschreven content (geen CMS/database), opgenomen in
// app/sitemap.ts, eigen generateMetadata + canonical per pagina.
//
// BEWUST een vaste sjabloonopbouw per kwartaal (zie MarktupdateArtikel
// hieronder) zodat een nieuwe update simpelweg "de vorige structuur met
// nieuwe cijfers" is, in plaats van steeds opnieuw een opzet te verzinnen.
// Cijfers zijn altijd afkomstig van NVM/CBS/Kadaster/NHG-onderzoek, nooit
// verzonnen — zie de toelichting per update.
// -----------------------------------------------------------------------------

export interface MarktupdateStat {
  label: string;
  waarde: string;
  nadruk?: boolean; // extra uitgelicht (bv. de gemiddelde prijs)
}

export type RegioRichting = "up" | "down" | "flat";

export interface MarktupdateRegioRij {
  naam: string;
  jaarVergelijking: string; // bv. "+4,5% jaar"
  extra: string; // bv. "+3,5% verk." of "8,8% overb."
  richting: RegioRichting;
}

export interface MarktupdateArtikel {
  slug: string; // bv. "q2-2026"
  periodeLabel: string; // bv. "Q2 2026"
  titel: string;
  metaBeschrijving: string;
  samenvatting: string; // kort excerpt voor de hub-kaart
  gepubliceerd: string; // weergavedatum, bv. "18 juli 2026"
  leestijdMinuten: number;
  intro: string;

  landelijkeCijfers: {
    tekst: string[];
    stats: MarktupdateStat[];
    tekstNaStats: string;
  };

  perRegio: {
    tekst: string;
    rijen: MarktupdateRegioRij[];
    conclusie: string;
  };

  betaalbaarheid: {
    tekst: string;
    nhgGrensLabel: string; // bv. "NHG-grens 2026"
    nhgGrens: number;
    gemPrijsLabel: string; // bv. "Gem. verkoopprijs Q2"
    gemPrijs: number;
    conclusie: string;
  };

  watDitBetekent: string;

  vorigKwartaal: {
    periodeLabel: string;
    overbieden: string; // bv. "3,7% gemiddeld overboden"
    gemPrijs: string; // bv. "€485.000"
  };

  ctaTekst: string;
}

export const MARKTUPDATES: MarktupdateArtikel[] = [
  {
    slug: "q2-2026",
    periodeLabel: "Q2 2026",
    titel: "Marktupdate Q2 2026: meer aanbod en toch weer harder overboden",
    metaBeschrijving:
      "Recordaanbod, meer verkopen en toch een hoger overbiedingspercentage: de Nederlandse woningmarkt in het tweede kwartaal van 2026, landelijk en per regio.",
    samenvatting:
      "Recordveel woningen te koop, meer verkopen dan ooit en toch een hoger overbiedingspercentage. Landelijk en per regio op een rijtje.",
    gepubliceerd: "18 juli 2026",
    leestijdMinuten: 6,
    intro:
      "Meer aanbod betekent toch minder stress voor kopers? Het tweede kwartaal van 2026 bewijst dat het net iets ingewikkelder ligt. Er kwamen recordveel huizen te koop, er werd meer verkocht dan ooit, en toch werd er gemiddeld harder overboden dan een kwartaal eerder. Welkom bij de Nederlandse woningmarkt, waar logica soms even pauze neemt.",

    landelijkeCijfers: {
      tekst: [
        "Er wisselden dit kwartaal 45.200 woningen van eigenaar, 7% meer dan een jaar eerder en zelfs 29% meer dan het kwartaal ervoor. Tegelijk kwamen er 56.700 woningen nieuw te koop, het hoogste aantal sinds de metingen in 1995 begonnen en bijna 9% meer dan een jaar geleden.",
        "De gemiddelde verkoopprijs kwam uit op €506.000, een stijging van 3,4% ten opzichte van het eerste kwartaal, maar op jaarbasis is dat nog maar 2,1%, dus de prijsstijging vlakt merkbaar af. Woningen stonden dit jaar gemiddeld 28 tot 32 dagen te koop, ook dat wijst op een markt die iets meer lucht krijgt dan de afgelopen jaren.",
      ],
      stats: [
        { label: "verkocht", waarde: "45.200" },
        { label: "te koop gezet", waarde: "56.700" },
        { label: "gem. prijs", waarde: "€506k", nadruk: true },
        { label: "overboden", waarde: "4,6%" },
      ],
      tekstNaStats:
        "Meer aanbod zou u normaal gesproken meer onderhandelingsruimte moeten geven. Toch liep het overbiedpercentage juist op, van 3,7% in Q1 naar 4,6% nu, met 71% van alle woningen die boven de vraagprijs werd verkocht. Kopers gebruiken hun extra keuze dit kwartaal blijkbaar vooral om sneller door te schakelen naar het volgende huis zodra ze een bod verliezen, niet om rustiger te bieden.",
    },

    perRegio: {
      tekst:
        "Amsterdam geldt meestal als de gekste markt van het land, maar was dit kwartaal juist de rustigste van de vier grote steden: de prijzen stegen er maar 0,8% ten opzichte van vorig jaar, en er werden zelfs 2,8% minder woningen verkocht dan een jaar eerder. Den Haag deed het met +4,5% juist het best binnen de G4, met 3,5% meer verkopen, gevolgd door Rotterdam (+3,2%) en Utrecht (+2,2%).",
      rijen: [
        { naam: "Groningen", jaarVergelijking: "+9,2% jaar", extra: "8,8% overb.", richting: "up" },
        { naam: "Drenthe", jaarVergelijking: "+8,1% jaar", extra: "–", richting: "up" },
        { naam: "Den Haag", jaarVergelijking: "+4,5% jaar", extra: "+3,5% verk.", richting: "up" },
        { naam: "Rotterdam", jaarVergelijking: "+3,2% jaar", extra: "-0,4% verk.", richting: "flat" },
        { naam: "Amsterdam", jaarVergelijking: "+0,8% jaar", extra: "-2,8% verk.", richting: "down" },
      ],
      conclusie:
        "De echte uitschieter zit boven Amsterdam. Groningen noteerde de hardste prijsstijging van het hele land, met Drenthe vlak erachter. Het overbiedpercentage in Groningen liep op tot 8,8% en ging daarmee zelfs Utrecht voorbij, vooral gedreven door de regio buiten de stad zelf. Het cliché dat Amsterdam altijd de heetste markt heeft klopt dit kwartaal dus gewoon niet: het noorden, van oudsher niet de eerste plek waar u aan denkt bij een oververhitte woningmarkt, is dit kwartaal de regio om in de gaten te houden.",
    },

    betaalbaarheid: {
      tekst:
        "Sinds 1 januari 2026 ligt de NHG-grens, de prijsgrens waaronder u met Nationale Hypotheek Garantie kunt kopen, op €470.000. Die garantie is voor veel starters een belangrijk vangnet: lagere rente en meer bescherming bij financiële tegenslag. Het opvallende: de landelijke gemiddelde verkoopprijs van dit kwartaal, €506.000, ligt daar inmiddels ruim boven. Een “gemiddeld” huis valt voor de gemiddelde koper dus al buiten die garantie. Regionaal is dat verschil nog scherper: in de regio tussen Amsterdam en Utrecht en rond Eindhoven bleef minder dan 40% van de verkopen onder de NHG-grens.",
      nhgGrensLabel: "NHG-grens 2026",
      nhgGrens: 470000,
      gemPrijsLabel: "Gem. verkoopprijs Q2",
      gemPrijs: 506000,
      conclusie:
        "Zoekt u als starter een huis in die regio's, dan is de kans dus groter dan gemiddeld dat u zonder NHG-garantie moet kopen, met een hogere rente en minder bescherming tot gevolg.",
    },

    watDitBetekent:
      "Koopt u in Amsterdam, dan heeft u dit kwartaal iets meer onderhandelingsruimte dan u gewend bent, al blijft overbieden landelijk gezien de norm, dus reken niet op een koopje. Koopt of verkoopt u in Groningen of Drenthe, dan is de rustige-provincie-reputatie inmiddels achterhaald: bekijk de recente verkopen in uw eigen buurt voordat u een bod bepaalt, want een verouderd beeld van “wat een huis hier ongeveer kost” is dit kwartaal extra riskant. En zoekt u als starter onder de NHG-grens, houd er dan rekening mee dat de bandbreedte waarin u kunt kiezen dit kwartaal opnieuw iets kleiner is geworden, zeker in de drukke regio's rond Amsterdam, Utrecht en Eindhoven.",

    vorigKwartaal: {
      periodeLabel: "Q1 2026",
      overbieden: "3,7% gemiddeld overboden",
      gemPrijs: "€485.000",
    },

    ctaTekst: "Benieuwd wat deze cijfers voor uw eigen adres betekenen?",
  },
];

export function getMarktupdateBySlug(slug: string): MarktupdateArtikel | undefined {
  return MARKTUPDATES.find((m) => m.slug === slug);
}
