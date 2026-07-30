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
  secties: KoopgidsSectie[];
  ctaTekst: string;
}

export const ARTIKELEN: KoopgidsArtikel[] = [
  {
    slug: "woningwaarde-bepalen",
    titel: "Hoe bepaalt u de waarde van een woning?",
    metaBeschrijving:
      "Waarom er geen gratis officiële woningwaarde bestaat, hoe een modelmatige schatting (AVM) werkt en waarom een bandbreedte betrouwbaarder is dan één los getal.",
    categorie: "Waarde-indicatie",
    samenvatting: "Waarom een bandbreedte betrouwbaarder is dan één los getal, en wat een modelschatting wel en niet is.",
    kleur: "indigo",
    icoon: TrendingUpIcon,
    leestijdMinuten: 5,
    ctaTekst: "Benieuwd naar de waarde-indicatie van uw eigen adres?",
    secties: [
      {
        kop: "Waarom er geen gratis officiële woningwaarde bestaat",
        paragrafen: [
          "Veel mensen gaan ervan uit dat er ergens een officiële, actuele woningwaarde te vinden is. In de praktijk bestaat die niet. Het WOZ-waardeloket toont wel de WOZ-waarde per adres, maar verbiedt geautomatiseerde bevraging, en die waarde is bovendien vooral bedoeld voor belastingdoeleinden en loopt achter op de actuele markt. Het Kadaster heeft daarnaast een WOZ-bevragingsdienst, maar die is wettelijk beperkt tot specifieke doeleinden zoals de Huisvestingswet of verhuurderschap, niet voor consumenten die gewoon willen weten wat hun huis waard is.",
          "De werkelijke verkoopprijzen staan wel bij het Kadaster, in het Koopsommenregister, maar dat is een betaald product dat je per adres apart moet opvragen. Er is dus geen bron die gratis, actueel en direct toegankelijk is. Daarom werkt elk platform dat een woningwaarde toont, inclusief Kooprapport, met een modelmatige schatting in plaats van een officieel cijfer.",
        ],
      },
      {
        kop: "Wat een modelschatting (AVM) precies doet",
        paragrafen: [
          "Een Automated Valuation Model, afgekort AVM, schat de waarde van een woning op basis van kenmerken zoals oppervlakte, bouwjaar, woningtype en locatie, vergeleken met recente verkopen van vergelijkbare woningen in de buurt. Het is dezelfde soort methode die banken en taxateurs als hulpmiddel gebruiken, maar dan geautomatiseerd en direct beschikbaar.",
          "Het belangrijkste verschil met een taxatie: een taxateur bezoekt de woning fysiek en beoordeelt de staat van onderhoud, verbouwingen en bijzonderheden die een model niet kan zien. Een AVM werkt uitsluitend met geregistreerde kenmerken en marktdata. Dat maakt het sneller en gratis, maar ook minder precies dan een taxatie ter plekke.",
        ],
      },
      {
        kop: "Waarom een bandbreedte belangrijker is dan één getal",
        paragrafen: [
          "Een enkel getal wekt een precisie die een model nooit kan waarmaken. Daarom toont een goede waarde-indicatie altijd een bandbreedte in plaats van één bedrag: die geeft eerlijk weer hoe zeker het model van zijn eigen schatting is. Bij een standaard rijtjeswoning met veel vergelijkbare recente verkopen in de buurt is die bandbreedte vaak smal. Bij een afwijkende woning, bijvoorbeeld met een ongebruikelijke plattegrond, een grote kavel of weinig vergelijkbare verkopen in de buurt, wordt de bandbreedte vanzelf breder.",
          "Belangrijk om te onthouden: een waarde-indicatie is geen taxatie, geen WOZ-waarde en geen garantie voor de uiteindelijke verkoopprijs. Het is een goed onderbouwd startpunt om een gevoel te krijgen bij het prijsniveau, niet het laatste woord.",
        ],
      },
    ],
  },
  {
    slug: "verkopen-in-de-buurt",
    titel: "Wat verkopen in uw buurt zeggen over de prijs",
    metaBeschrijving:
      "Waarom recente verkoopprijzen een betere leidraad zijn dan vraagprijzen, en waarom de prijs per vierkante meter alleen iets zegt binnen dezelfde soort woningen.",
    categorie: "Verkopen in de buurt",
    samenvatting: "Waarom verkoopprijzen een betere leidraad zijn dan vraagprijzen, en waar de prijs per m² wel en niet voor gebruikt kan worden.",
    kleur: "indigo",
    icoon: HistoryIcon,
    leestijdMinuten: 4,
    ctaTekst: "Wilt u zien wat er recent verkocht is bij uw adres?",
    secties: [
      {
        kop: "Vraagprijs versus verkoopprijs",
        paragrafen: [
          "Een vraagprijs is een openingsbod, geen feit. De verkoper en de makelaar bepalen die op basis van een inschatting van de markt, maar de uiteindelijke verkoopprijs kan daar flink van afwijken, in beide richtingen. Wie alleen naar vraagprijzen op woningsites kijkt, krijgt dus een vertekend beeld van wat een buurt daadwerkelijk waard is.",
          "De verkoopprijzen die het Kadaster registreert, zijn het enige harde gegeven: dat is het bedrag dat daadwerkelijk betaald is bij de notariële overdracht. Daarom is dat de basis waarop een betrouwbare marktinschatting hoort te steunen, niet de vraagprijs.",
        ],
      },
      {
        kop: "Waarom de laatste twaalf maanden",
        paragrafen: [
          "Een woningmarkt kan binnen een paar jaar flink veranderen door rente, aanbod en vraag. Verkopen van vijf jaar geleden zeggen weinig over de huidige prijs. Daarom kijkt Kooprapport specifiek naar de verkopen van de laatste twaalf maanden: recent genoeg om representatief te zijn voor de huidige markt, maar breed genoeg om voldoende vergelijkingsmateriaal te hebben, ook in rustigere buurten.",
        ],
      },
      {
        kop: "De valkuil van de prijs per vierkante meter",
        paragrafen: [
          "De gemiddelde prijs per vierkante meter is een handig kengetal, maar alleen binnen hetzelfde soort woningen. Een compact appartement heeft doorgaans een hogere prijs per m² dan een ruime eengezinswoning, simpelweg omdat kleinere woningen relatief duurder geprijsd worden per vierkante meter. Vergelijk daarom vooral binnen hetzelfde woningtype en dezelfde buurt, niet los tussen verschillende typen woningen.",
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
