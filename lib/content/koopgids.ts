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
    titel: "Bouwjaar, oppervlakte en gebruiksdoel: wat betekent dit voor u?",
    metaBeschrijving:
      "Wat de BAG precies registreert, welke elf gebruiksfuncties er officieel bestaan en waarom het bouwjaar meer zegt dan alleen een jaartal.",
    categorie: "Objectgegevens",
    samenvatting: "Wat de officiële BAG-registratie precies vastlegt, en waarom bouwjaar en oppervlakte meer zeggen dan op het eerste gezicht lijkt.",
    kleur: "indigo",
    icoon: BuildingIcon,
    leestijdMinuten: 4,
    ctaTekst: "Bekijk de objectgegevens van een specifiek adres",
    secties: [
      {
        kop: "De BAG: de officiële basis onder elk adres",
        paragrafen: [
          "De Basisregistratie Adressen en Gebouwen, kortweg BAG, is de officiële, publieke registratie waarin elk gebouw en elk adres in Nederland is vastgelegd. Gemeenten zijn verplicht deze registratie bij te houden, en het Kadaster ontsluit de gegevens publiek. Bouwjaar, oppervlakte en gebruiksdoel die in een woningrapport staan, komen rechtstreeks uit deze bron, niet uit een schatting.",
        ],
      },
      {
        kop: "De elf officiële gebruiksfuncties",
        paragrafen: [
          "Het Bouwbesluit 2012 kent elf officiële gebruiksfuncties: woonfunctie, bijeenkomstfunctie, celfunctie, gezondheidszorgfunctie, industriefunctie, kantoorfunctie, logiesfunctie, onderwijsfunctie, sportfunctie, winkelfunctie en overige gebruiksfunctie. Bij een adres met woonfunctie staat vast dat het vergunde gebruik wonen is, wat relevant is bij bijvoorbeeld een pand dat ooit een winkel of kantoor was en later is omgebouwd: de BAG toont wat er nu officieel vergund is, niet noodzakelijk wat het gebouw ooit was.",
        ],
      },
      {
        kop: "Waarom bouwjaar meer zegt dan een jaartal",
        paragrafen: [
          "Het bouwjaar is niet alleen een historisch feitje. Bouwmethoden en normen veranderden met de tijd: het type fundering (zie het artikel over funderingsrisico), de gebruikelijke isolatienormen en de bouwvoorschriften hangen allemaal samen met de periode waarin een woning gebouwd is. Twee huizen met exact dezelfde oppervlakte kunnen daardoor in de praktijk heel verschillend presteren op bijvoorbeeld energieverbruik.",
        ],
      },
      {
        kop: "Oppervlakte: waarom advertenties soms verschillen",
        paragrafen: [
          "De officiële gebruiksoppervlakte wordt gemeten volgens de NEN 2580-norm, een vaste meetinstructie die precies voorschrijft wat wel en niet meetelt. Een advertentie op een woningsite hanteert niet altijd dezelfde norm, waardoor twee bronnen voor dezelfde woning een licht afwijkend oppervlak kunnen tonen. Bij twijfel is de BAG-registratie de betrouwbaarste, want die volgt een vaste, controleerbare meetmethode.",
        ],
      },
    ],
  },
  {
    slug: "energielabel-uitgelegd",
    titel: "Energielabel uitgelegd: wat de letters betekenen",
    metaBeschrijving:
      "Hoe het energielabel via de officiële NTA 8800-methode wordt berekend, wat de schaal van A tot G betekent en waarom het label bij kopen ertoe doet.",
    categorie: "Energieprestatie en label",
    samenvatting: "Hoe het energielabel officieel wordt berekend, wat de schaal precies betekent en waarom het label meeweegt bij financiering.",
    kleur: "indigo",
    icoon: BoltIcon,
    leestijdMinuten: 5,
    ctaTekst: "Wilt u het energielabel van een specifiek adres bekijken?",
    secties: [
      {
        kop: "NTA 8800: de officiële rekenmethode",
        paragrafen: [
          "Sinds januari 2021 is NTA 8800 de officiële, in Nederlandse regelgeving aangewezen methode om de energieprestatie van een gebouw te berekenen. De uitkomst daarvan is het energielabel dat via RVO wordt geregistreerd. Het label is dus geen losse inschatting, maar het resultaat van een vaste, landelijk voorgeschreven rekenmethode die rekening houdt met isolatie, installaties, ventilatie en de vorm van het gebouw.",
        ],
      },
      {
        kop: "De schaal van A tot en met G",
        paragrafen: [
          "Het energielabel loopt van A, het meest energiezuinig, tot G, het minst zuinig. Voor de meest zuinige woningen bestaan tot 2030 extra plusklassen boven de A, om onderscheid te maken tussen bijvoorbeeld een goed geïsoleerde woning en een woning die vrijwel energieneutraal is. Vanaf 2030 vereenvoudigt de Europese EPBD IV-richtlijn dit stelsel geleidelijk naar een schaal van A tot G zonder plusklassen, aangevuld met concreet verduurzamingsadvies per woning.",
        ],
      },
      {
        kop: "Wat het label beïnvloedt",
        paragrafen: [
          "Vier zaken bepalen het grootste deel van het label: de isolatie van gevel, vloer en dak, het type beglazing, het soort verwarmingsinstallatie (een cv-ketel scoort structureel lager dan een warmtepomp) en de ventilatie. Zonnepanelen tellen ook mee, maar lossen een slecht geïsoleerde schil niet op: isolatie is meestal de eerste stap met de meeste impact.",
        ],
      },
      {
        kop: "Waarom het label meeweegt bij kopen",
        paragrafen: [
          "Het energielabel is niet alleen informatief. Sommige hypotheekverstrekkers geven een gunstigere leencapaciteit bij een energiezuinige woning, en een laag label betekent vaak dat er op afzienbare termijn geïnvesteerd moet worden in verduurzaming, zeker met de aangescherpte Europese eisen die eraan komen. Bij het vergelijken van twee vergelijkbare woningen kan het label dus een reëel verschil in de totale woonlasten betekenen, niet alleen een sticker op een advertentie.",
        ],
      },
    ],
  },
  {
    slug: "funderingsrisico-herkennen",
    titel: "Funderingsrisico herkennen: waar moet u op letten?",
    metaBeschrijving:
      "Waarom 1970 de scheidslijn is bij funderingsrisico, hoe de officiële KCAF/RVO-bodemkaart werkt en welke zichtbare signalen wijzen op funderingsproblemen.",
    categorie: "Funderingsrisico",
    samenvatting: "Waarom bouwjaar en bodemgesteldheid samen het risico bepalen, en welke zichtbare signalen op funderingsproblemen kunnen wijzen.",
    kleur: "rust",
    icoon: AlertTriangleIcon,
    leestijdMinuten: 6,
    ctaTekst: "Wilt u het funderingsrisico van een specifiek adres inzien?",
    secties: [
      {
        kop: "Waarom 1970 de scheidslijn is",
        paragrafen: [
          "Tot ongeveer 1970 werden woningen in Nederland vaak op houten palen gefundeerd, vooral in gebieden met een slappe, minder draagkrachtige bodem zoals veen of rivierklei. Vanaf ongeveer 1970 werd funderen op betonpalen de standaard, wat het bekende risico op houtrot in de fundering sterk verkleint. Het bouwjaar is dus het eerste, grofste signaal: bij een woning van na 1970 is het risico doorgaans laag, ongeacht de bodem.",
        ],
      },
      {
        kop: "Wat paalrot precies is",
        paragrafen: [
          "Houten funderingspalen blijven gezond zolang ze permanent onder het grondwater staan: hout rot namelijk niet in een zuurstofarme, verzadigde omgeving. Het probleem ontstaat wanneer de grondwaterstand daalt, bijvoorbeeld door langdurige droogte of drainage in de omgeving. Zodra de paalkoppen boven het grondwater komen te staan, kunnen ze binnen enkele jaren ernstig aangetast raken door schimmels en bacteriën. Dat maakt paalrot een risico dat sterk verschilt per buurt en per periode, niet alleen per bouwjaar.",
        ],
      },
      {
        kop: "De officiële bodemkaart van KCAF en RVO",
        paragrafen: [
          "Naast het bouwjaar bestaat er een officiële, publieke dataset: de indicatieve aandachtsgebieden funderingsproblematiek van KCAF en RVO, gepubliceerd via PDOK. Die kaart classificeert elk postcodegebied als kwetsbaar gebied (een minder draagkrachtige bodem zoals veen of rivierklei), niet kwetsbaar gebied (bijvoorbeeld hogere zandgronden), of stedelijk gebied, waarbij de bodem door dichte bebouwing niet goed in te delen is. Dat laatste betekent nadrukkelijk onbekend, niet automatisch veilig.",
          "Deze kaart doet zelf ook geen uitspraak over de daadwerkelijke staat van de fundering van een specifiek pand: het blijft een indicatie op basis van de omgeving, geen bouwtechnische inspectie.",
        ],
      },
      {
        kop: "Zichtbare signalen om op te letten",
        paragrafen: [
          "Een aantal signalen kan wijzen op funderingsproblemen: scheuren in muren of plafonds breder dan ongeveer twee millimeter, vooral als ze diagonaal lopen, deuren of ramen die opeens klemmen, en een merkbaar hellende vloer of gevel. Voor woningen gebouwd tussen 1900 en 1930 geldt bovendien dat het risico op funderingsgebreken statistisch aanzienlijk hoger ligt dan bij modernere bouw.",
        ],
      },
      {
        kop: "Wat u concreet kunt doen",
        paragrafen: [
          "Bij twijfel is een funderingsonderzoek door een erkend bureau de enige manier om echt zekerheid te krijgen: geen enkele publieke kaart of dit artikel kan dat vervangen. Een aantal gemeenten met bekende funderingsproblematiek, waaronder Gouda, Schiedam, Zaanstad en Dordrecht, heeft bovendien een eigen funderingsloket met lokale kaarten en advies.",
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
