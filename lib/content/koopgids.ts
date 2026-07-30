import type { ComponentType } from "react";
import {
  TrendingUpIcon,
  HistoryIcon,
  BuildingIcon,
  BoltIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  LeafIcon,
} from "@/components/report/icons";
import {
  DriePrijzenIllustratie,
  OverbiedenStaafjesIllustratie,
  BandbreedteIllustratie,
  GebruiksscenariosIllustratie,
  MarktcijfersIllustratie,
  KrimpflatieIllustratie,
  OppervlakteTolerantieIllustratie,
  TipsGridIllustratie,
  GebruiksfunctiesIllustratie,
  DrieLabelsIllustratie,
  IsolatieTijdlijnIllustratie,
  OppervlakteWelNietIllustratie,
  EnergielabelSchaalIllustratie,
  DeadlineTijdlijnIllustratie,
  VoorNa1970Illustratie,
  FunderingsScoreSchaalIllustratie,
  KoopprocesTijdlijnIllustratie,
} from "@/components/koopgids/Illustraties";

// -----------------------------------------------------------------------------
// Koopgids: SEO-contentsectie (/koopgids, /koopgids/[slug]), zie het gesprek
// in Cowork hierover. Eén artikel per onderdeel van het echte rapport (zelfde
// volgorde/naamgeving als ONDERDELEN in PaywallModal.tsx), zodat iemand die op
// een zoekterm binnenkomt ("energielabel uitgelegd", "fundering herkennen")
// direct het onderdeel herkent dat ook in een gekocht rapport zit.
//
// BEWUST GEEN losse CMS/database: dit zijn statische, door Sjoerd zelf
// gecontroleerde artikelen (net als /privacy, /voorwaarden, /contact), geen
// gebruikersinvoer. Nieuw artikel toevoegen = nieuw object in ARTIKELEN
// hieronder, plus de bijbehorende URL in app/sitemap.ts.
//
// Elk artikel is feitelijk gegrond in de daadwerkelijke, al bestaande
// adapters van dit rapport (lib/data-sources/*.ts) — niet losstaand verzonnen
// content, maar een uitleg van wat het rapport zelf al doet en waarom. Zie de
// toelichting per artikel hieronder voor de bron.
// -----------------------------------------------------------------------------

export type KoopgidsKleur = "indigo" | "rust" | "green";

export interface KoopgidsSectie {
  kop: string;
  paragrafen: string[];
  // Optioneel: een kleine, feitelijke datavisualisatie tussen de tekst van
  // deze sectie, zie components/koopgids/Illustraties.tsx. Bewust geen
  // stockfoto's/AI-plaatjes — alleen bij "woningwaarde-bepalen" gebruikt
  // vooralsnog, andere artikelen kunnen dit patroon later hergebruiken.
  illustratie?: ComponentType;
}

export interface KoopgidsArtikel {
  slug: string;
  titel: string;
  metaBeschrijving: string;
  categorie: string; // exact dezelfde naam als het rapportonderdeel, bv. "Funderingsrisico"
  samenvatting: string; // kort excerpt voor de hub-kaart
  kleur: KoopgidsKleur;
  icoon: ComponentType<{ className?: string }>;
  leestijdMinuten: number;
  // Korte, koploze openingsalinea direct onder de H1 (de "haak") — apart van
  // secties gehouden zodat die altijd zonder eigen kop verschijnt.
  intro?: string;
  secties: KoopgidsSectie[];
  ctaTekst: string;
}

export const ARTIKELEN: KoopgidsArtikel[] = [
  {
    slug: "woningwaarde-bepalen",
    titel: "Hoe bepaalt u de waarde van een woning?",
    metaBeschrijving:
      "Hoe een vraagprijs tot stand komt, waarom overbieden de norm is, welke factoren de waarde van een huis echt bepalen, en hoe een modelmatige schatting (AVM) dat samenbrengt in een bandbreedte.",
    categorie: "Waarde-indicatie",
    samenvatting: "Hoe een vraagprijs tot stand komt, waarom er vaak overboden wordt, en hoe een modelmatige schatting dat samenbrengt in een bandbreedte.",
    kleur: "indigo",
    icoon: TrendingUpIcon,
    leestijdMinuten: 6,
    intro:
      "Het is half elf 's avonds, u scrolt door Funda, en u vraagt zich af: wat zou ons eigen huis nu eigenlijk waard zijn? Herkenbaar. Het antwoord zit 'm niet in één simpel getal, maar het is ook geen mysterie. Er zit een vrij logische opbouw achter, en die leggen we hieronder stap voor stap uit.",
    ctaTekst: "Wilt u dit voor uw eigen adres bekijken?",
    secties: [
      {
        kop: "Hoe een vraagprijs eigenlijk tot stand komt",
        paragrafen: [
          "Een vraagprijs valt niet zomaar uit de lucht. Een makelaar begint met referentiewoningen: recent verkochte huizen in dezelfde buurt met vergelijkbare kenmerken zoals bouwjaar, grootte en staat van onderhoud. Daarnaast speelt de actuele marktsituatie mee, en tijdens de bezichtiging wordt gekeken naar dingen die op papier lastig te vangen zijn: lichtinval, indeling, en wat er recent verbouwd is.",
          "Een vraagprijs is daarnaast ook een strategische keuze, niet alleen een objectieve uitkomst. Een woning bewust scherp in de markt zetten trekt meer bezichtigingen en kan tot een biedingsstrijd leiden, terwijl een hogere vraagprijs meer ademruimte geeft om te onderhandelen. Twee vergelijkbare huizen kunnen dus met een andere vraagprijs de markt op gaan, puur door een andere verkoopstrategie.",
        ],
        illustratie: DriePrijzenIllustratie,
      },
      {
        kop: "Waarom de vraagprijs zelden het eindbedrag is",
        paragrafen: [
          "Dat merkt u meteen als u naar de actuele cijfers kijkt. In het tweede kwartaal van 2026 werd er landelijk gemiddeld 4,6% boven de vraagprijs geboden, tegenover 3,7% in het kwartaal ervoor. De verschillen per regio zijn groot: in Amsterdam ging 78% van de woningen boven de vraagprijs weg, en in Groningen lag het gemiddelde overbiedingspercentage zelfs op 8,8%. Ook het woningtype maakt uit: bij tussenwoningen werd meer dan 80% boven de vraagprijs verkocht, bij vrijstaande woningen minder dan de helft.",
          "Kortom, een vraagprijs is een uitgangspunt voor de onderhandeling, niet de uiteindelijke waarde. Dat is precies waarom een goede waarde-inschatting zich baseert op wat er daadwerkelijk betaald is, niet op wat er gevraagd werd.",
        ],
        illustratie: OverbiedenStaafjesIllustratie,
      },
      {
        kop: "De factoren die de waarde van een huis echt bepalen",
        paragrafen: [
          "Onder de streep komt de waarde van een woning neer op vijf dingen: de locatie, de staat van onderhoud, de kenmerken van de woning zelf (oppervlakte, kaveloppervlak, bouwjaar), de actuele marktomstandigheden, en vergelijkbare verkopen in de buurt.",
          "Locatie weegt doorgaans het zwaarst, gevolgd door onderhoudsstaat en grootte. Het energielabel speelt daarbij een steeds grotere rol: onderzoek van taxatiedata-specialist Calcasa laat zien dat woningen met een beter energielabel gemiddeld zo'n 4,1% meer opbrengen dan vergelijkbare woningen met een slechter label. Een nieuwe cv-ketel verkoopt dus niet alleen lekkerder warm water, maar telt ook mee bij de uiteindelijke prijs.",
        ],
      },
      {
        kop: "Dus hoe vertaalt zich dat naar één schatting?",
        paragrafen: [
          "Hier komt het model om de hoek kijken. Een Automated Valuation Model, met de nogal stoere afkorting AVM, legt de kenmerken van uw woning naast recente verkopen van vergelijkbare woningen in de buurt en trekt daar een schatting uit. Zie het als een buurman die verstand heeft van huizenprijzen en alle recente verkopen in de straat kent, maar nooit bij u binnen is geweest.",
          "In het rapport van Kooprapport heet dit onderdeel Waarde-indicatie, en dat werkt precies zo: een modelmatige schatting op basis van uw eigen adres en de verkopen in de buurt.",
          "Zo'n model geeft trouwens bewust geen los getal, maar een boven- en ondergrens. Eén stellig bedrag klinkt lekker duidelijk, maar een huis is geen blikje cola met een prijssticker erop. Bij een standaard rijtjeswoning met veel vergelijkbare verkopen in de buurt is die bandbreedte vaak smal. Bij een afwijkende woning, met een ongebruikelijke plattegrond of weinig vergelijkingsmateriaal in de buurt, wordt de bandbreedte eerlijk gezegd wat breder. Dat is geen fout in het model, dat is precies hoe zeker het model daadwerkelijk is.",
        ],
        illustratie: BandbreedteIllustratie,
      },
      {
        kop: "Wat u met deze schatting kunt, en wat niet",
        paragrafen: [
          "Voor de duidelijkheid: een waarde-indicatie is geen taxatie (daar komt een mens fysiek voor langs), geen WOZ-waarde, en geen garantie voor de uiteindelijke verkoopprijs. Het is een stevig onderbouwd startpunt, dat u het beste combineert met de daadwerkelijke verkopen in uw buurt van de afgelopen twaalf maanden.",
          "Concreet kunt u deze schatting op een paar manieren gebruiken. Staat u op het punt te bieden op een woning, dan geeft de bandbreedte u een steviger onderbouwd verhaal om mee te onderhandelen, of weet u in elk geval waar u qua bod ongeveer aan toe bent. Overweegt u zelf te verkopen, dan is de indicatie een handig ijkpunt voordat u met een makelaar om tafel gaat. En bij het aanvragen van een hypotheek geeft een reële inschatting alvast een idee van de verhouding tussen de vraagprijs en wat de bank waarschijnlijk als onderpandwaarde zal hanteren.",
        ],
        illustratie: GebruiksscenariosIllustratie,
      },
    ],
  },
  {
    slug: "verkopen-in-de-buurt",
    titel: "Wat verkopen in uw buurt zeggen over de prijs",
    metaBeschrijving:
      "Actuele NVM-cijfers over verkochte woningen, gemiddelde prijzen en doorlooptijd, wanneer een verkoop echt vergelijkbaar is en waar u verder op moet letten.",
    categorie: "Verkopen in de buurt",
    samenvatting: "Actuele marktcijfers, wanneer een verkoop echt vergelijkbaar is en een aantal dingen om extra op te letten.",
    kleur: "indigo",
    icoon: HistoryIcon,
    leestijdMinuten: 6,
    intro:
      "Er hangt een bordje \"VERKOCHT\" bij de buren en binnen een dag weet de hele straat ongeveer wat ervoor betaald is. Dat instinct klopt: kijk naar wat er echt verkocht is in plaats van naar wat er ergens gevraagd wordt. Hieronder leest u hoe dat systematisch werkt, wat de cijfers nu laten zien en wanneer een verkoop in de buurt daadwerkelijk iets over uw eigen woning zegt.",
    ctaTekst: "Wilt u zien welke verkopen bij uw adres meetellen?",
    secties: [
      {
        kop: "De markt in cijfers",
        paragrafen: [
          "In het tweede kwartaal van 2026 wisselden ruim 45.200 woningen via NVM-makelaars van eigenaar, tegenover een recordaantal van bijna 56.700 nieuw te koop gezette woningen. Dat groeiende aanbod geeft kopers voor het eerst in jaren weer wat meer keuze en onderhandelingsruimte. De gemiddelde verkoopprijs kwam uit op €506.000, een stijging van 3,4% ten opzichte van het kwartaal ervoor, met opvallende verschillen per woningtype: vrijstaande woningen stegen dit jaar het hardst in prijs terwijl appartementen de kleinste stijging lieten zien.",
          "Ook de snelheid waarmee huizen verkopen zegt iets over de markt. Woningen stonden in 2026 gemiddeld 28 tot 32 dagen te koop voordat ze verkocht waren, met vrijstaande woningen die er doorgaans wat langer over deden (rond de 35 dagen) dan appartementen. De gemiddelde vraagprijs per vierkante meter lag in juli 2026 op €4.510 met grote regionale verschillen: van rond de €3.700 in Ede tot €7.290 in Amsterdam.",
        ],
        illustratie: MarktcijfersIllustratie,
      },
      {
        kop: "De valkuil van prijs per vierkante meter",
        paragrafen: [
          "Twee cijfers klinken vergelijkbaar maar zijn dat lang niet altijd. De prijs per vierkante meter blijft namelijk stijgen deels omdat woningen gemiddeld kleiner worden: een effect dat in de markt weleens \"krimpflatie\" wordt genoemd. De totale prijs oogt daardoor behapbaarder terwijl u er in werkelijkheid minder vierkante meters voor terugkrijgt. Vergelijk daarom altijd binnen hetzelfde woningtype in dezelfde buurt en nooit los tussen een appartement en een eengezinswoning: die twee bewegen qua prijs per vierkante meter structureel anders.",
        ],
        illustratie: KrimpflatieIllustratie,
      },
      {
        kop: "Wanneer een verkoop echt vergelijkbaar is",
        paragrafen: [
          "Niet elke verkoop in de buurt zegt evenveel over uw eigen woning. Een verkoop telt in het rapport van Kooprapport pas als daadwerkelijk vergelijkbaar zodra de oppervlakte binnen ongeveer 22% van uw eigen woonoppervlak valt, want een verkoop van een woning die twee keer zo groot is vertekent het beeld meer dan dat het helpt. Van elke vergelijkbare verkoop wordt bovendien het verschil in prijs per vierkante meter ten opzichte van uw eigen woning berekend zodat u meteen ziet of een verkoop erboven, eronder of ongeveer gelijk zat.",
          "Een rustige straat met weinig verkopen is daarbij geen probleem. Kooprapport kijkt standaard naar de laatste twaalf maanden maar verruimt dat zoekvenster automatisch naar een langere periode zodra er te weinig vergelijkbare verkopen binnen die twaalf maanden te vinden zijn. Zo blijft de vergelijking altijd gebaseerd op daadwerkelijke vergelijkbare verkopen in plaats van op een handvol toevallige transacties die niet representatief zijn.",
        ],
        illustratie: OppervlakteTolerantieIllustratie,
      },
      {
        kop: "Een paar dingen om extra op te letten",
        paragrafen: [
          "Kijk niet alleen naar het gemiddelde maar ook naar de spreiding tussen de verkopen. Eén dure uitschieter, bijvoorbeeld een net gerenoveerde woning of een riant hoekhuis, kan het gemiddelde in een verder bescheiden straat flink omhoog trekken. Een individuele verkoop zegt daarom meer in combinatie met de andere vergelijkbare verkopen dan op zichzelf.",
          "Let ook op wat er aan een vergelijkbare woning is veranderd vlak vóór de verkoop. Een woning die net een nieuwe keuken, badkamer of volledige verduurzaming kreeg verkoopt vaak boven het niveau van vergelijkbare niet-gerenoveerde huizen in dezelfde straat. Dat zegt dan meer over die renovatie dan over de buurt zelf.",
          "Houd daarnaast rekening met het seizoen. Het voorjaar en de zomer kennen doorgaans het meeste aanbod en de snelste verkopen terwijl de wintermaanden vaak wat rustiger verlopen. Een lage doorlooptijd in juni zegt dus niet automatisch hetzelfde als een lage doorlooptijd in december.",
          "Vergeet ten slotte niet dat de kale verkoopprijs niet het volledige kostenplaatje is. Overdrachtsbelasting, notariskosten en eventuele makelaarscourtage komen daar voor een koper nog bovenop en spelen dus mee bij wat een woning uiteindelijk werkelijk kost.",
        ],
        illustratie: TipsGridIllustratie,
      },
      {
        kop: "Hoe u dit praktisch gebruikt",
        paragrafen: [
          "Let bij het bepalen van uw eigen bod of vraagprijs altijd op de prijs per vierkante meter binnen hetzelfde woningtype en let ook op de transactiedatum: een verkoop van anderhalf jaar geleden zegt minder over de huidige markt dan een verkoop van vorige maand, zeker in een markt die per kwartaal merkbaar beweegt zoals nu. Combineer dit vervolgens met de waarde-indicatie van uw eigen woning: de buurtverkopen laten zien wat de markt doet terwijl de waarde-indicatie dat vertaalt naar uw specifieke adres.",
        ],
      },
    ],
  },
  {
    slug: "bouwjaar-en-gebruiksdoel",
    titel: "Wat bouwjaar, oppervlakte en gebruiksdoel u eigenlijk vertellen",
    metaBeschrijving:
      "Wat de BAG precies registreert, waarom gebruiksdoel niet hetzelfde is als het feitelijke gebruik, en hoe bouwjaar en oppervlakte de kwaliteit en grootte van een huis bepalen.",
    categorie: "Objectgegevens",
    samenvatting: "Waarom gebruiksdoel niet hetzelfde is als wat er echt gebeurt, en hoe bouwjaar en oppervlakte meer zeggen dan op het eerste gezicht lijkt.",
    kleur: "indigo",
    icoon: BuildingIcon,
    leestijdMinuten: 6,
    intro:
      "U opent een Funda-advertentie. Bouwjaar 1932. 140 m². Woonfunctie. Drie feitjes die weinig zeggen, tenzij u weet wat erachter zit. Dat leggen we hieronder uit, met een paar dingen die de meeste mensen niet weten totdat het misgaat.",
    ctaTekst: "Wilt u dit voor uw eigen adres bekijken?",
    secties: [
      {
        kop: "Waar deze gegevens vandaan komen",
        paragrafen: [
          "Bouwjaar, oppervlakte en gebruiksdoel komen uit de BAG, de officiële registratie van elk gebouw in Nederland. Gemeenten houden deze bij en het Kadaster maakt de gegevens gratis openbaar. Geen schatting dus, maar een vastgelegd feit.",
          "Gebruiksdoel is het officiële label voor waar een pand voor bedoeld is. Er bestaan elf officiële typen. De bekendste zijn woonfunctie, kantoorfunctie en winkelfunctie. Daarnaast bestaan er acht minder bekende typen zoals bijeenkomstfunctie voor bijvoorbeeld een buurthuis of gezondheidszorgfunctie voor een huisartsenpraktijk.",
        ],
        illustratie: GebruiksfunctiesIllustratie,
      },
      {
        kop: "Let op: gebruiksdoel is niet hetzelfde als wat er echt gebeurt",
        paragrafen: [
          "Dit is het belangrijkste om te onthouden. De BAG registreert waarvoor een pand officieel een vergunning heeft, niet wat er in de praktijk gebeurt. Woont iemand al jaren in een oud pakhuis of voormalig kantoor? Dan kan er in de BAG nog gewoon \"kantoorfunctie\" staan. Dat blijft zo staan totdat er een nieuwe vergunning wordt aangevraagd. Niemand past dit automatisch aan.",
          "Gebruiksdoel is trouwens ook iets anders dan het bestemmingsplan. Het bestemmingsplan van de gemeente bepaalt wat er op een locatie mag. Het gebruiksdoel in de BAG is een apart, los label. Twee verschillende systemen die makkelijk door elkaar gehaald worden.",
          "Dit klinkt onschuldig maar kan grote gevolgen hebben. Een bank kijkt bij een hypotheek naar de officiële registratie. Staat er geen woonfunctie? Dan kan de financiering lastiger worden of zelfs misgaan. Koopt u een bijzonder pand, zoals een verbouwd pakhuis, een boerderij of een oud kantoor? Check dan altijd eerst het gebruiksdoel voordat u een bod uitbrengt.",
        ],
        illustratie: DrieLabelsIllustratie,
      },
      {
        kop: "Bouwjaar zegt iets over isolatie en fundering",
        paragrafen: [
          "Hoe ouder het huis, hoe groter de kans op weinig isolatie. Voor 1925 zat er meestal geen enkele isolatie in de muren. Tussen 1925 en 1975 kregen huizen wel een spouwmuur, maar zonder isolatiemateriaal erin. Goed nieuws: die spouw is achteraf vaak alsnog te vullen.",
          "Extra opvallend zijn woningen uit 1965 tot 1975. De vloeren uit die tijd hadden een isolatiewaarde van slechts 0,17 (hoe hoger dit getal, hoe beter de isolatie). Vergelijk dat met een moderne vloer, die al snel twintig keer beter isoleert. Kort door de bocht: in een huis uit die periode staat u vaak letterlijk met koude voeten.",
          "Vanaf 1985 werden de regels strenger. Vanaf 1992 moest een huis verplicht een stuk beter isoleren (het Bouwbesluit eiste toen een isolatiewaarde van minimaal 2,5 voor de hele buitenkant van het huis). Sinds 2000 is de isolatie meestal echt goed.",
          "Het bouwjaar zegt trouwens niet alleen iets over isolatie. Huizen van vóór 1970 zijn vaak gebouwd op houten palen, met een verhoogd risico op funderingsproblemen. Zie het artikel over funderingsrisico voor de volledige uitleg.",
        ],
        illustratie: IsolatieTijdlijnIllustratie,
      },
      {
        kop: "Oppervlakte: waarom twee huizen anders tellen",
        paragrafen: [
          "Oppervlakte klinkt simpel, maar de meetregels zijn preciezer dan u denkt. Een woonkamer, keuken en slaapkamer tellen altijd volledig mee. Een zolder telt alleen mee als u er minimaal 1,5 meter rechtop kunt staan. De ruimte onder een trap telt gewoon mee, zolang die niet groter is dan 4 vierkante meter.",
          "Sommige ruimtes tellen juist niet mee. Een inpandige garage niet. Een balkon of terras ook niet, want dat is buitenruimte. Een groot trapgat of open vide van meer dan 4 vierkante meter wordt er zelfs vanaf getrokken. Daarom kunnen twee bijna identieke huizen toch een ander vierkantemeteraantal hebben. Vaak zit het verschil in een garage, een grote zolder of een schuin dak dat net niet hoog genoeg is.",
        ],
        illustratie: OppervlakteWelNietIllustratie,
      },
      {
        kop: "Wat u hier praktisch mee kunt",
        paragrafen: [
          "Vergelijk huizen altijd op basis van deze officiële oppervlakte, niet op een los genoemd getal in een advertentie. Koopt u een bijzonder pand? Check dan eerst het gebruiksdoel voordat u een hypotheek aanvraagt. En gebruik het bouwjaar als eerste seintje: bij een huis van vóór 1975 zijn zowel het energielabel als het funderingsrisico al snel de moeite van het bekijken waard.",
        ],
      },
    ],
  },
  {
    slug: "energielabel-uitgelegd",
    titel: "Energielabel uitgelegd: wat de letters betekenen",
    metaBeschrijving:
      "Hoe het energielabel wordt berekend, hoeveel Nederlandse woningen welk label hebben, waarom huurwoningen al harde deadlines kennen en wat een goed label voor uw hypotheek betekent.",
    categorie: "Energieprestatie en label",
    samenvatting: "Hoe het label werkt, actuele cijfers over de Nederlandse woningvoorraad en waarom dit label de komende jaren alleen maar belangrijker wordt.",
    kleur: "indigo",
    icoon: BoltIcon,
    leestijdMinuten: 7,
    intro:
      "Bij het bezichtigen van een huis let iedereen op de keuken en de tuin. Het energielabel op de deur krijgt vaak een half oog. Dat is jammer, want dat labeltje zegt steeds meer over uw portemonnee. Hieronder leggen we uit hoe het werkt, waarom het nu al meetelt bij uw hypotheek en waarom dat de komende jaren alleen maar belangrijker wordt.",
    ctaTekst: "Wilt u het energielabel van uw eigen adres bekijken?",
    secties: [
      {
        kop: "Hoe het label werkt",
        paragrafen: [
          "Sinds 2021 wordt elk energielabel berekend met dezelfde officiële methode, NTA 8800, die rekening houdt met isolatie, installaties, ventilatie en de vorm van het gebouw, en RVO registreert de uitkomst. Het label loopt van A tot en met G, met A het meest zuinig en G het minst; voor de allerbeste woningen bestaan tot 2030 nog extra plusklassen boven de A, maar die verdwijnen daarna geleidelijk richting een simpele schaal van A tot G.",
          "Vier dingen bepalen het label het zwaarst: isolatie van gevel, vloer en dak (meestal de grootste factor), het type beglazing (enkel glas scoort flink slechter dan HR++ of triple glas), de verwarmingsinstallatie (een cv-ketel scoort structureel lager dan een warmtepomp) en de ventilatie. Zonnepanelen helpen ook, maar lossen een matig geïsoleerde woning niet op: isolatie blijft meestal de eerste stap met het meeste effect. Let hierop tijdens een bezichtiging door simpelweg te vragen naar het bouwjaar van de cv-ketel en of er dubbel glas zit, dat vertelt vaak al veel.",
        ],
        illustratie: EnergielabelSchaalIllustratie,
      },
      {
        kop: "Het label in cijfers",
        paragrafen: [
          "Eind 2024 had ruim 5,1 miljoen woningen een geldig energielabel, ongeveer 61% van alle 8,3 miljoen woningen in Nederland, met zo'n 35% label A of hoger, 16% label B, 25% label C en minder dan 14% nog label E, F of G. Die verhouding is flink verbeterd: in 2010 had nog maar 16% van de gelabelde woningen label A of B, nu is dat ruim 51%. Let wel op een belangrijk detail: 3,2 miljoen woningen hebben helemaal geen geldig label, dus staat u op het punt een huis te bezichtigen zonder recent label, vraag er dan actief naar.",
          "Belangrijk om te weten: elke woning kreeg automatisch een gratis voorlopig label, een schatting op basis van bouwjaar, woningtype en oppervlakte, maar dat is niet geldig bij verkoop of verhuur. Voor een definitief label komt een erkende energieadviseur langs, meestal een uur of twee, en checkt isolatie, installatie en het gebruik van hernieuwbare energie, voor doorgaans €190 tot €300. Ziet u een woning te koop staan, dan hoort daar een definitief label bij, geen voorlopige schatting.",
        ],
      },
      {
        kop: "Waarom dit steeds belangrijker wordt",
        paragrafen: [
          "Dit is niet zomaar een sticker meer. Voor huurwoningen gelden inmiddels harde deadlines: sinds 1 januari 2026 mag een woning met energielabel E niet meer nieuw verhuurd worden, en vanaf 2029 moet elke huurwoning met label E, F of G minimaal naar label D verbeterd zijn. Voor de hele Nederlandse woningvoorraad geldt bovendien een landelijk doel: het gemiddelde energiegebruik moet in 2030 met 16% omlaag ten opzichte van 2020 en in 2035 met 20 tot 22%. Geen verplichting per los huis, maar de richting is duidelijk en de druk wordt de komende jaren alleen maar groter, ook voor kopers.",
          "Ook uw hypotheek voelt dit nu al. Sinds 2024 telt het energielabel mee bij hoeveel u maximaal kunt lenen: bij label A kunt u vanaf 2026 tot €40.000 extra lenen, en het Energiebespaarbudget van de NHG geeft daarbovenop tot 6% extra leenruimte. Grote banken zoals Rabobank en ABN AMRO geven bovendien een rentekorting van 0,1 tot 0,15% bij label A of hoger, meestal voor de hele rentevaste periode, en sommige geldverstrekkers passen het rentetarief zelfs direct aan op basis van het label. Een slecht label is dan niet alleen duur aan de meterkast, maar ook duurder aan de hypotheek.",
        ],
        illustratie: DeadlineTijdlijnIllustratie,
      },
      {
        kop: "Verduurzamen en wat u kunt doen",
        paragrafen: [
          "Een laag label is dus geen reden om een huis links te laten liggen, wel een reden om te weten wat het kost om te verbeteren. In ons artikel over verduurzamen leggen we uit welke maatregelen het meeste opleveren en in welke volgorde: isoleren komt eerst, want een warmtepomp werkt pas echt efficiënt in een goed geïsoleerde woning, en pas daarna volgen een nieuwe installatie en zonnepanelen.",
          "Vraag bij een bezichtiging dus altijd naar het actuele definitieve energielabel en niet alleen naar het bouwjaar, want twee vergelijkbare huizen kunnen daarin flink verschillen. Reken bij een laag label niet alleen de energierekening mee, maar ook het effect op uw leenruimte en rente, en bekijk voordat u een bod uitbrengt wat er nodig is om naar een beter label te komen.",
        ],
      },
    ],
  },
  {
    slug: "funderingsrisico-herkennen",
    titel: "Funderingsrisico herkennen: waar moet u op letten?",
    metaBeschrijving:
      "Wat funderingsrisico precies is, waarom taxatierapporten sinds 1 april 2026 verplicht een A-E funderingsscore bevatten, en wat u er zelf al vóór het bieden aan kunt zien.",
    categorie: "Funderingsrisico",
    samenvatting: "Waarom hypotheekverstrekkers sinds kort verplicht een funderingsscore laten opnemen, en wat u er zelf al vóór het bieden aan kunt herkennen.",
    kleur: "rust",
    icoon: AlertTriangleIcon,
    leestijdMinuten: 7,
    intro:
      "Een scheur in de muur kan gewoon zetting zijn of het eerste teken van een probleem dat tienduizenden euro's kan gaan kosten. Het verschil zit 'm in de fundering, letterlijk het fundament onder de waarde van een huis en het enige onderdeel waar niemand ooit een mooie foto van maakt voor de advertentie. Hieronder leggen we uit wat dit precies is, waarom hypotheekverstrekkers hier sinds kort veel scherper op letten en wat u er zelf aan kunt zien.",
    ctaTekst: "Wilt u het funderingsrisico van uw eigen adres bekijken?",
    secties: [
      {
        kop: "Wat funderingsrisico precies is",
        paragrafen: [
          "Tot ongeveer 1970 werden huizen in Nederland vaak op houten palen gefundeerd, vooral in gebieden met een slappe bodem zoals veen of rivierklei. Zolang die palen permanent onder het grondwater staan blijven ze gezond: hout rot simpelweg niet in een zuurstofarme verzadigde omgeving. Het probleem ontstaat als de grondwaterstand daalt, bijvoorbeeld door langdurige droogte, waardoor de paalkoppen droog komen te staan en binnen enkele jaren kunnen wegrotten. Een beetje alsof u een houten steiger jarenlang droog laat staan in plaats van in het water: vroeg of laat gaat dat knagen.",
          "Vanaf ongeveer 1970 werd funderen op betonpalen de standaard, wat dit specifieke risico grotendeels wegneemt. Funderingsrisico is dus vooral een zaak van oudere woningen gecombineerd met de bodemgesteldheid van de buurt.",
        ],
        illustratie: VoorNa1970Illustratie,
      },
      {
        kop: "Waarom dit zoveel geld kost",
        paragrafen: [
          "Dit is geen klein ongemak. Funderingsherstel kost gemiddeld tussen de €60.000 en €120.000 voor een rijtjeswoning, ofwel grofweg €800 tot €1.500 per strekkende meter gevel. Naar schatting kampen bijna een half miljoen Nederlandse woningen met een verhoogd funderingsrisico. Dat is precies waarom dit geen detail is om te negeren bij het kopen van een oudere woning: het kan de grootste onvoorziene kostenpost van de hele aankoop worden.",
          "Gelukkig bestaat er inmiddels ook steun. Sinds juli 2025 is het landelijke Fonds Duurzaam Funderingsherstel in heel Nederland beschikbaar, met NHG-gegarandeerde leningen voor urgent funderingsherstel, een looptijd tot 30 jaar en de eerste drie jaar geen aflossingsverplichting. Diverse gemeenten met bekende problematiek geven daarnaast eigen subsidies: Zaanstad tot 25% van de herstelkosten met een maximum van €30.000, Schiedam vergoedt 100% van de adviseurskosten plus een revolverende lening tot €120.000, en Dordrecht geeft 20% subsidie plus een gratis funderingsonderzoek voor inkomens onder modaal.",
        ],
      },
      {
        kop: "Waarom hypotheekverstrekkers dit steeds belangrijker vinden",
        paragrafen: [
          "Dit is misschien wel het meest actuele punt van dit hele artikel. Sinds 1 april 2026 bevat het taxatierapport dat nodig is voor een hypotheekaanvraag verplicht een funderingsbeoordeling: de taxateur moet het risico scoren met een letter van A tot en met E. Voorheen was dit veel losser geregeld, nu is het een vast verplicht onderdeel van elke taxatie.",
          "Blijkt uit die beoordeling een verhoogd risico, dan kan de geldverstrekker daar consequenties aan verbinden: een lager maximale hypotheekbedrag, andere financieringsvoorwaarden of een verplicht bouwdepot dat wordt gereserveerd voor toekomstig funderingsherstel. Bij woningen van vóór 1940 hanteren banken vaak sowieso standaard een bouwkundige keuring, omdat funderingsproblemen, verouderde elektra en loden leidingen in deze oudere woningen statistisch een stuk vaker voorkomen. Blijkt uit de taxatie dat direct noodzakelijk herstel meer dan 10% van de getaxeerde marktwaarde kost, dan wordt een bouwkundige keuring sowieso verplicht.",
        ],
        illustratie: FunderingsScoreSchaalIllustratie,
      },
      {
        kop: "Waarom dit vaak te laat komt",
        paragrafen: [
          "Hier zit meteen de adder onder het gras. Deze verplichte taxatie met funderingsscore gebeurt doorgaans pas ná het tekenen van de koopovereenkomst, als onderdeel van uw hypotheekaanvraag. Komt er dan een slechte score uit? Dan bent u al juridisch aan de koop gebonden en resten er alleen nog ontbindende voorwaarden om onderuit te komen, als u die tenminste goed heeft afgesproken. Precies daarom is het zo waardevol om dit zelf al vóór het bieden te checken, in plaats van pas te horen dat er een probleem is op het moment dat u er al middenin zit.",
        ],
        illustratie: KoopprocesTijdlijnIllustratie,
      },
      {
        kop: "Wat ons rapport hierin doet",
        paragrafen: [
          "Simpel gezegd kijken we naar twee dingen en tellen die bij elkaar op. Eerst het bouwjaar: vanaf 1970 is beton de standaard, wat het risico flink verlaagt. Daarna de officiële bodemkaart van KCAF en RVO, die per postcodegebied laat zien of de grond kwetsbaar is voor dit soort problemen, bijvoorbeeld veen of rivierklei, of juist niet.",
          "Is het huis ouder dan 1970 en de bodem kwetsbaar? Dan komt er een hoger risico uit. Is de bodem juist stevig? Dan blijft het risico laag, ook bij een ouder huis. Weten we niets over de bodem in dat gebied? Dan kijken we voorzichtig alleen naar het bouwjaar, met extra aandacht bij een huis van vóór 1945.",
          "Let op: dit is een indicatie op basis van openbare bronnen, geen bouwkundige inspectie. Geen kruipruimte-bezoek, geen boormonster, gewoon twee goede officiële databronnen slim gecombineerd.",
        ],
      },
      {
        kop: "Wat u zelf kunt herkennen",
        paragrafen: [
          "Een paar zichtbare signalen zijn de moeite waard om tijdens een bezichtiging op te letten. Scheuren in muren of plafonds breder dan ongeveer twee millimeter, vooral wanneer ze diagonaal lopen, kunnen wijzen op verzakking. Hetzelfde geldt voor deuren of ramen die opeens klemmen of een merkbaar hellende vloer of gevel. Loop gerust met een knikker door de woonkamer, rolt die spontaan naar één hoek, dan weet u genoeg. Voor woningen gebouwd tussen 1900 en 1930 geldt bovendien dat het risico op funderingsgebreken statistisch een stuk hoger ligt dan bij modernere bouw.",
          "Woont u in of overweegt u een woning in een gemeente met bekende funderingsproblematiek, zoals Gouda, Schiedam, Zaanstad of Dordrecht? Deze gemeenten hebben allemaal een eigen funderingsloket met lokale kaarten, advies en soms subsidie. Bij twijfel is een funderingsonderzoek door een erkend bureau nog altijd de enige manier om echt zekerheid te krijgen, geen enkele kaart of dit artikel kan dat vervangen.",
        ],
      },
    ],
  },
  {
    slug: "buurt-en-voorzieningen",
    titel: "Buurt en voorzieningen: wat zit er echt om de hoek?",
    metaBeschrijving:
      "Waarom de afstand tot voorzieningen als school, station en huisarts vaak belangrijker is dan gemeentelijke gemiddelden, en wat een buurtprofiel concreet laat zien.",
    categorie: "Buurtprofiel",
    samenvatting: "Waarom de afstand tot voorzieningen vaak belangrijker is dan een gemeentelijk gemiddelde, en wat een buurtprofiel concreet toevoegt.",
    kleur: "indigo",
    icoon: ShieldCheckIcon,
    leestijdMinuten: 4,
    ctaTekst: "Bekijk het buurtprofiel van een specifiek adres",
    secties: [
      {
        kop: "Meer dan de woning alleen",
        paragrafen: [
          "Een woning koopt u niet los van de omgeving. Dezelfde plattegrond kan totaal anders aanvoelen afhankelijk van wat er binnen loop- of fietsafstand ligt: een school voor de kinderen, een treinstation voor het woon-werkverkeer, een huisarts of apotheek, of juist rust en groen. Een buurtprofiel brengt die praktische kant van een adres in beeld, naast de harde cijfers over de woning zelf.",
        ],
      },
      {
        kop: "Waarom afstand meer zegt dan een gemeentelijk gemiddelde",
        paragrafen: [
          "Statistieken op gemeenteniveau, bijvoorbeeld het gemiddeld aantal voorzieningen per gemeente, zeggen weinig over één specifiek adres. Een gemeente kan gemiddeld genomen goed voorzien zijn, terwijl een adres aan de rand daarvan alsnog ver van alles af ligt. Daarom is de daadwerkelijke afstand vanaf het adres zelf tot concrete voorzieningen, zoals de dichtstbijzijnde apotheek, kinderdagverblijf, treinstation of park, veel betekenisvoller dan een gemeentelijk gemiddelde.",
        ],
      },
      {
        kop: "Wat een buurtprofiel typisch laat zien",
        paragrafen: [
          "Een volledig buurtprofiel toont doorgaans de nabijheid van dagelijkse voorzieningen zoals een apotheek en kinderopvang, bereikbaarheid via het treinstation en de oprit of parkeersituatie, en groen in de vorm van een park of ander openbaar groen in de buurt. Samen met de recente verkopen in de buurt (zie dat artikel) geeft dit een vollediger beeld van wat een adres in de praktijk betekent, niet alleen wat het kost.",
        ],
      },
    ],
  },
  {
    slug: "verduurzamen-wat-loont",
    titel: "Verduurzamen: welke maatregelen leveren het meeste op?",
    metaBeschrijving:
      "Welke verduurzamingsmaatregelen het meeste opleveren, waarom de volgorde ertoe doet en hoe terugverdientijd zich verhoudt tot waardestijging.",
    categorie: "Verduurzamingsadvies",
    samenvatting: "Waarom de volgorde van maatregelen ertoe doet, en hoe terugverdientijd zich verhoudt tot de waardestijging van een woning.",
    kleur: "green",
    icoon: LeafIcon,
    leestijdMinuten: 5,
    ctaTekst: "Wilt u zien welke maatregelen bij een specifiek adres lonen?",
    secties: [
      {
        kop: "Van huidig naar haalbaar label",
        paragrafen: [
          "Een verduurzamingsadvies begint bij het huidige energielabel van een woning (zie het artikel over het energielabel) en berekent, volgens dezelfde officiële NTA 8800-methode, welk label haalbaar is met concrete maatregelen. Dat maakt het verschil tussen abstract advies en een concreet stappenplan: niet alleen wat het huidige label is, maar ook wat er nodig is om een beter label te bereiken.",
        ],
      },
      {
        kop: "De maatregelen, en waarom de volgorde ertoe doet",
        paragrafen: [
          "De meest voorkomende maatregelen zijn, ruwweg in volgorde van wat meestal als eerst zinvol is: gevel-, vloer- en dakisolatie, beter glas in woonkamer en slaapkamers, ventilatie, een andere verwarmingsinstallatie zoals een warmtepomp, zonnepanelen, en soms douche-warmteterugwinning.",
          "Die volgorde is geen toeval. Isoleren komt doorgaans eerst, omdat een warmtepomp pas echt efficiënt werkt in een goed geïsoleerde woning: in een slecht geïsoleerd huis moet een warmtepomp voortdurend hard werken om warmteverlies te compenseren, wat het rendement en de besparing flink drukt. Eerst isoleren en dan pas de verwarmingsinstallatie vervangen, levert doorgaans het beste resultaat op.",
        ],
      },
      {
        kop: "Terugverdientijd versus waardestijging",
        paragrafen: [
          "Rendement op verduurzaming kan op twee manieren bekeken worden. De terugverdientijd zet de investering af tegen de jaarlijkse besparing op de energierekening: hoeveel jaar duurt het voordat de investering zichzelf heeft terugbetaald. De waardestijging, ook wel Ecowaarde genoemd, is een aparte inschatting van hoeveel een woning meer waard wordt door de verbeterde energieprestatie, los van de besparing op de energierekening. Beide zijn relevant: de terugverdientijd is vooral interessant voor wie lang blijft wonen, de waardestijging telt ook mee bij een eventuele verkoop op kortere termijn.",
        ],
      },
    ],
  },
];

export function getArtikelBySlug(slug: string): KoopgidsArtikel | undefined {
  return ARTIKELEN.find((a) => a.slug === slug);
}

export const KLEUR_STIJL: Record<KoopgidsKleur, { bg: string; tekst: string }> = {
  indigo: { bg: "bg-[#EEF0FF]", tekst: "text-accent" },
  rust: { bg: "bg-[#FBEAEA]", tekst: "text-rust" },
  green: { bg: "bg-[#EAF3DE]", tekst: "text-[#3B6D11]" },
};
