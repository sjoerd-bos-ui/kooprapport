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
    slug: "q1-2026",
    periodeLabel: "Q1 2026",
    titel: "Marktupdate Q1 2026: de markt haalt even adem",
    metaBeschrijving:
      "Meer aanbod, minder overbieden en voor het eerst in lange tijd een gemiddelde prijs onder de €500.000: de Nederlandse woningmarkt in het eerste kwartaal van 2026.",
    samenvatting:
      "Meer aanbod, iets minder overbieden en een gemiddelde prijs die weer onder de €500.000 duikt. De cijfers van het eerste kwartaal op een rijtje.",
    gepubliceerd: "16 april 2026",
    leestijdMinuten: 6,
    intro:
      "Na een laatste kwartaal van 2025 waarin de gemiddelde verkoopprijs voor het eerst boven een half miljoen euro uitkwam, deed de woningmarkt in het eerste kwartaal van 2026 iets ongebruikelijks: ze temperde zichzelf. Meer aanbod, iets minder overbieden en voor het eerst in lange tijd een gemiddelde prijs die weer onder de €500.000 dook. Geen ineenstorting, eerder een verkeerslicht dat van knalrood naar oranje sprong, al verschilt dat nogal per regio.",

    landelijkeCijfers: {
      tekst: [
        "Er wisselden dit kwartaal ongeveer 34.600 bestaande woningen van eigenaar, 27% minder dan het laatste kwartaal van 2025. Een deel daarvan is een normaal winterdipje (minder bezichtigingen door sneeuw en ijzel), maar de terugval was dit keer groter dan gebruikelijk.",
        "De gemiddelde verkoopprijs kwam uit op €485.000, een daling van 2,7% ten opzichte van het kwartaal ervoor. Op jaarbasis staat de prijs nog altijd zo'n €10.000 hoger, maar die stijging vlakt duidelijk af.",
      ],
      stats: [
        { label: "verkocht", waarde: "34.600" },
        { label: "in aanbod (+20% jaar)", waarde: "30.000" },
        { label: "gem. prijs", waarde: "€485k", nadruk: true },
        { label: "overboden", waarde: "3,7%" },
      ],
      tekstNaStats:
        "Ook het overbieden koelt merkbaar af: gemiddeld werd 3,7% boven de vraagprijs betaald (was 4,7% in het laatste kwartaal van 2025), en 67% van de woningen ging boven de vraagprijs weg in plaats van 72%. Het woningaanbod groeide intussen naar bijna 30.000 woningen, 20% meer dan een jaar eerder, waardoor de NVM-krapte-indicator opliep van 1,9 naar 2,6: kopers konden voor het eerst in een tijd uit iets meer dan twee woningen kiezen in plaats van uit maar twee.",
    },

    perRegio: {
      tekst:
        "Die afkoeling voelt niet overal hetzelfde. Landelijk verkochten NVM-makelaars in ongeveer de helft van de regio's minder woningen dan een jaar eerder, vooral in het westen en noorden van het land. In delen van het oosten en zuiden was juist sprake van groei, vaak in regio's waar het aanbod het sterkst was toegenomen. In de regio Haaglanden (Den Haag e.o.) daalde de gemiddelde prijs licht met 0,2% naar €499.000, al steeg die op jaarbasis nog wel met 2,9%, en werden er 3% meer woningen verkocht dan een jaar eerder.",
      rijen: [
        { naam: "Landelijk", jaarVergelijking: "+2,0% jaar", extra: "67% overb.", richting: "flat" },
        { naam: "Haaglanden", jaarVergelijking: "+2,9% jaar", extra: "-0,2% kwart.", richting: "flat" },
        { naam: "Overig Groningen", jaarVergelijking: "+3,9% jaar", extra: "76% overb.", richting: "up" },
      ],
      conclusie:
        "Niet elke regio in het noorden volgde trouwens hetzelfde patroon: de regio rond de stad Groningen zag het aantal verkopen juist met 3,7% stijgen. Het landelijke gemiddelde vertelt dus lang niet het hele verhaal, de verschillen tussen (en binnen) regio's blijven groot.",
    },

    betaalbaarheid: {
      tekst:
        "Sinds 1 januari 2026 ligt de NHG-grens op €470.000. De landelijke gemiddelde prijs van €485.000 ligt daar, ondanks de afkoeling, nog altijd boven: een \"gemiddeld\" huis valt voor de gemiddelde koper nog steeds net buiten de garantie. In de regio Groningen ligt dat anders: met een gemiddelde prijs van €374.000 blijft dat ruim onder de grens, wat de garantie daar voor starters beduidend bereikbaarder maakt.",
      nhgGrensLabel: "NHG-grens 2026",
      nhgGrens: 470000,
      gemPrijsLabel: "Gem. verkoopprijs Q1 (landelijk)",
      gemPrijs: 485000,
      conclusie:
        "Waar u zoekt, bepaalt dus behoorlijk of de NHG-garantie binnen bereik ligt of net erbuiten valt.",
    },

    watDitBetekent:
      "Zoekt u in de Randstad, dan heeft u dit kwartaal voor het eerst in een tijd iets meer keuze en iets minder haast nodig, al blijft overbieden met 67% nog altijd de norm, geen uitzondering. Bent u starter en afhankelijk van de NHG-grens, dan loont het de moeite om ook regio's buiten de Randstad mee te nemen in uw zoektocht: daar ligt de gemiddelde prijs vaker onder die grens dan erboven.",

    vorigKwartaal: {
      periodeLabel: "Q4 2025",
      overbieden: "4,7% gemiddeld overboden",
      gemPrijs: "€502.000",
    },

    ctaTekst: "Benieuwd wat deze cijfers voor uw eigen adres betekenen?",
  },
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
