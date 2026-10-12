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
  // SEO-audit: optioneel apart veld voor <title>/OG-title, los van de H1
  // (titel). De H1 mag narratief blijven ("...meer aanbod en toch weer
  // harder overboden" leest lekker op de pagina zelf), maar niemand zoekt
  // letterlijk op die zin -- reële zoekintentie is "huizenprijzen [kwartaal]"
  // met de kernstats erin. Valt terug op titel als niet gezet.
  metaTitel?: string;
  metaBeschrijving: string;
  samenvatting: string; // kort excerpt voor de hub-kaart
  gepubliceerd: string; // weergavedatum, bv. "18 juli 2026"
  // Zelfde datum als gepubliceerd, maar als ISO-string -- nodig omdat
  // "18 juli 2026" geen betrouwbaar door new Date() te parsen formaat is
  // (Dutch-locale maandnamen). Gebruikt door app/sitemap.ts voor een ECHTE
  // lastModified i.p.v. new Date() op het moment van sitemap-genereren (zie
  // de SEO-audit: dat liet elke pagina bij elke build "net gewijzigd" lijken,
  // ook pagina's die al maanden niet meer zijn aangepast).
  gepubliceerdISO: string; // bv. "2026-07-18"
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
    metaTitel: "Huizenprijzen Q1 2026: prijs en overbieden",
    metaBeschrijving:
      "Meer aanbod, minder overbieden en een gemiddelde prijs die weer onder de €500.000 duikt: de woningmarkt in het eerste kwartaal van 2026.",
    samenvatting:
      "Meer aanbod, iets minder overbieden en een gemiddelde prijs die weer onder de €500.000 duikt. De cijfers van het eerste kwartaal op een rijtje.",
    gepubliceerd: "16 april 2026",
    gepubliceerdISO: "2026-04-16",
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
    metaTitel: "Huizenprijzen Q2 2026: 4,6% overboden",
    metaBeschrijving:
      "Recordaanbod, meer verkopen en toch een hoger overbiedingspercentage: de Nederlandse woningmarkt in het tweede kwartaal van 2026, landelijk en per regio.",
    samenvatting:
      "Recordveel woningen te koop, meer verkopen dan ooit en toch een hoger overbiedingspercentage. Landelijk en per regio op een rijtje.",
    gepubliceerd: "18 juli 2026",
    gepubliceerdISO: "2026-07-18",
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
  {
    slug: "q3-2026",
    periodeLabel: "Q3 2026",
    titel: "Marktupdate Q3 2026: kopers krijgen meer keuze en hoeven minder te overbieden",
    metaTitel: "Huizenprijzen Q3 2026: €503.000, 3,3% overboden",
    metaBeschrijving:
      "Bijna 39.000 huizen te koop, minder bieders per woning en minder overbieden: de woningmarkt in het derde kwartaal van 2026, landelijk en per regio.",
    samenvatting:
      "Bijna 39.000 huizen te koop, minder bezichtigingen en biedingen per woning en een overbod dat zakt naar 3,3%. De cijfers van het derde kwartaal, in gewoon Nederlands.",
    gepubliceerd: "12 oktober 2026",
    gepubliceerdISO: "2026-10-12",
    leestijdMinuten: 5,
    intro:
      "Goed nieuws voor wie al maanden elke avond Funda leegtrekt: de markt wordt iets rustiger. Er staan bijna 39.000 huizen te koop, er komen minder mensen kijken en er wordt minder hoog geboden. Is het nu een kopersmarkt? Nee, dat gaat te ver. Maar u hoeft niet meer bij elk huis te bieden alsof het de laatste woning van Nederland is.",

    landelijkeCijfers: {
      tekst: [
        "Er werden dit kwartaal 41.700 huizen verkocht, ongeveer evenveel als een jaar geleden. Ten opzichte van het kwartaal ervoor is dat 8% minder, maar dat is vooral de zomervakantie: ook makelaars gaan weleens naar de camping. Er kwamen 48.500 huizen nieuw te koop, 5% meer dan vorig jaar. Daardoor staan er nu zo'n 39.000 woningen te koop, een kwart meer dan een jaar geleden. Zo veel keuze was er voor het laatst in 2019.",
        "Een gemiddeld huis werd verkocht voor €503.000, 1,8% meer dan een jaar geleden. Dat is minder dan de inflatie, dus uw huis wordt in feite iets goedkoper ten opzichte van uw boodschappen. Is het gemiddelde ten opzichte van vorig kwartaal gezakt (-1,3%)? Ja, maar schrik niet: in de zomer worden vaker kleinere huizen verkocht, en dat drukt het gemiddelde. Het is dus geen prijsdaling, de huizen zijn alleen kleiner.",
      ],
      stats: [
        { label: "verkocht", waarde: "41.700" },
        { label: "te koop (+24% jaar)", waarde: "39.000" },
        { label: "gem. prijs", waarde: "€503k", nadruk: true },
        { label: "overboden", waarde: "3,3%" },
      ],
      tekstNaStats:
        "Dan het overbieden. Gemiddeld werd er 3,3% meer betaald dan de vraagprijs. Een jaar geleden was dat nog 5,0%. Bij 66% van de huizen werd nog steeds boven de vraagprijs verkocht (vorig jaar 71%), dus helemaal verdwenen is het niet. Per huis komen er gemiddeld 6,8 mensen kijken en worden er 2,6 biedingen gedaan. Een huis staat gemiddeld 31 dagen te koop, twee dagen langer dan vorig jaar. Kortom: u heeft weer een weekend om na te denken.",
    },

    perRegio: {
      tekst:
        "Waar stijgen de prijzen nog hard? Vooral buiten de Randstad. In Zuidwest-Drenthe zijn de prijzen dit jaar 8,3% gestegen, en dat gaat daar al tien kwartalen zo door. In Noord-Limburg is het 6,7%: huizen gaan er snel weg, voor alle soorten woningen. Aan de kust is het juist rustiger. In Zeeland dalen de prijzen een beetje, en ook in de omgeving van Haarlem en Leiden. Van de grote steden stijgt Den Haag het hardst (+3,6%) en Amsterdam het zachtst (+0,6%). Utrecht en Rotterdam zitten er net onder het landelijk gemiddelde. En overbieden? Dat hangt van de regio af. In Overig Groningen en Flevoland ging 80% van de huizen boven de vraagprijs weg, in Utrecht 76%. In Zeeuws-Vlaanderen was dat maar 26%: daar kunt u gewoon onderhandelen. Het hoogste gemiddelde overbod zit in Overig Groningen (7,9%), daarna volgen kleine Delfzijl (6,3%) en Utrecht (6,1%).",
      rijen: [
        { naam: "Landelijk", jaarVergelijking: "+1,8% jaar", extra: "66% overb.", richting: "flat" },
        { naam: "Zuidwest-Drenthe", jaarVergelijking: "+8,3% jaar", extra: "41% overb.", richting: "up" },
        { naam: "Noord-Limburg", jaarVergelijking: "+6,7% jaar", extra: "71% overb.", richting: "up" },
        { naam: "Den Haag", jaarVergelijking: "+3,6% jaar", extra: "64% overb.", richting: "up" },
        { naam: "Amsterdam", jaarVergelijking: "+0,6% jaar", extra: "73% overb.", richting: "down" },
        { naam: "Zeeuws-Vlaanderen", jaarVergelijking: "licht lager", extra: "26% overb.", richting: "down" },
      ],
      conclusie:
        "De les: wie in de Randstad zoekt, merkt dat de rek er langzaam uit gaat. Wie buiten de Randstad zoekt, betaalt al snel meer dan verwacht. Ook binnen een regio zit veel verschil: een huis in een dorp vlak bij een stad kost gemiddeld €560.000, in een dorp verder weg €444.000. Dat is 26% minder, voor ongeveer dezelfde koe in de wei.",
    },

    betaalbaarheid: {
      tekst:
        "De NHG-grens (de prijs waaronder u de Nationale Hypotheek Garantie krijgt) ligt in 2026 op €470.000. Het gemiddelde huis kost nu €503.000, dus ligt er net boven. Gelukkig is niet elk huis gemiddeld. Een appartement kost gemiddeld €404.000 en een tussenwoning €468.000: die zitten allebei onder de grens. Een twee-onder-een-kapwoning (€561.000) en een vrijstaand huis (€758.000) zitten er ruim boven.",
      nhgGrensLabel: "NHG-grens 2026",
      nhgGrens: 470000,
      gemPrijsLabel: "Gem. verkoopprijs Q3",
      gemPrijs: 503000,
      conclusie:
        "Zoekt u als starter? Dan zijn een appartement of een tussenwoning in een dorp wat verder van de stad de beste kans op NHG.",
    },

    watDitBetekent:
      "Bent u koper? Dan hoeft u minder vaak extreem te overbieden. Bij vrijstaande huizen werd nog maar bij 44% boven de vraagprijs verkocht, bij tussenwoningen bij 74%. Huizen die al langer te koop staan, gaan zelfs vaker onder de vraagprijs weg. Let wel op de staat van het huis: een mooi afgewerkt huis is sneller weg (28 dagen) en haalt meer boven de vraagprijs (3,6%) dan een huis waar nog een verbouwing of verduurzaming nodig is (36 dagen en 1,8%). Een klushuis moet dus echt een koopje zijn om op te vallen.\n\nBent u verkoper? Dan is de tijd van een schot hagel dat altijd raak is voorbij. Bij 9,5% van de huizen moest de vraagprijs omlaag. Van de huizen die dit kwartaal nieuw te koop kwamen, was aan het eind 43% verkocht. Bij huizen die al langer te koop stonden was dat 56%. Een vraagprijs die gebaseerd is op wat de buren vorig jaar kregen, werkt dus niet meer altijd. Kijk liever naar wat er nu verkocht wordt.\n\nEn nieuwbouw? Daar wordt het stiller: circa 6.000 verkopen, het vierde kwartaal op rij minder dan een jaar eerder, terwijl er 21.500 nieuwbouwhuizen te koop staan, het meeste sinds 2015. Vooral appartementen concurreren met elkaar.",

    vorigKwartaal: {
      periodeLabel: "Q2 2026",
      overbieden: "4,6% gemiddeld overboden",
      gemPrijs: "€506.000",
    },

    ctaTekst: "Benieuwd wat deze cijfers voor uw eigen adres betekenen?",
  },
];

export function getMarktupdateBySlug(slug: string): MarktupdateArtikel | undefined {
  return MARKTUPDATES.find((m) => m.slug === slug);
}
