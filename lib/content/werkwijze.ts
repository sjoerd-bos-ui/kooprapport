import type { ComponentType } from "react";
import {
  TrendingUpIcon,
  HistoryIcon,
  BuildingIcon,
  BoltIcon,
  AlertTriangleIcon,
  LeafIcon,
  MapPinIcon,
} from "@/components/report/icons";
import type { KoopgidsKleur } from "./koopgids";

// -----------------------------------------------------------------------------
// /werkwijze: één overzichtspagina die in luchtige, korte taal uitlegt waar
// elk onderdeel van het rapport vandaan komt — bewust weinig letterlijke
// bronnennamen (geen opsomming van Kadaster/RVO/KCAF/PDOK/Altum AI per
// onderdeel), dat staat al uitgebreider in de FAQ op de homepage en in de
// losse Koopgids-artikelen. Deze pagina is het korte, prettig leesbare
// antwoord op "hoe werkt dit allemaal", met per onderdeel een link naar het
// bijbehorende Koopgids-artikel voor wie de volledige diepgang wil.
//
// Zelfde kleur-/icoonsysteem als KLEUR_STIJL in koopgids.ts, hier hergebruikt
// i.p.v. een tweede stijlsysteem te verzinnen.
// -----------------------------------------------------------------------------

export interface WerkwijzeOnderdeel {
  titel: string;
  tekst: string;
  bijgewerkt: string;
  icoon: ComponentType<{ className?: string }>;
  kleur: KoopgidsKleur;
  koopgidsSlug: string;
}

export const WERKWIJZE_ONDERDELEN: WerkwijzeOnderdeel[] = [
  {
    titel: "Waarde-indicatie",
    tekst:
      "Denk aan een slimme buurman die alle recente verkopen in de straat kent, maar nooit bij u binnen is geweest. Ons rekenmodel doet precies dat: het legt de kenmerken van uw huis naast wat vergelijkbare woningen om de hoek recent hebben opgebracht en trekt daar een eerlijke bandbreedte uit. Geen los, stellig bedrag alsof we uit een glazen bol lezen, maar een boven- en ondergrens die precies zo scherp is als het vergelijkingsmateriaal toelaat. Inclusief biedadvies: drie scenario's die deze bandbreedte vertalen naar een concreet bod, van veilig tot scherp.",
    bijgewerkt: "Bijgewerkt: doorlopend, bij elke opvraging",
    icoon: TrendingUpIcon,
    kleur: "indigo",
    koopgidsSlug: "woningwaarde-bepalen",
  },
  {
    titel: "Verkopen in de buurt",
    tekst:
      "We turven niet zomaar wat er in de wijk is verkocht. Een verkoop telt pas mee als de woning ook echt op uw huis lijkt, qua grootte binnen zo'n 22%, anders vergelijkt u appels met een strandhuis. Weinig verkopen in een rustige straat? Dan kijken we gewoon een stukje verder terug in de tijd tot er wel genoeg eerlijk vergelijkingsmateriaal is.",
    bijgewerkt: "Bijgewerkt: doorlopend, laatste 12 maanden",
    icoon: HistoryIcon,
    kleur: "indigo",
    koopgidsSlug: "verkopen-in-de-buurt",
  },
  {
    titel: "Objectgegevens",
    tekst:
      "Bouwjaar, oppervlakte en waarvoor een pand officieel bedoeld is komen uit het Kadaster, hetzelfde overheidsregister waar ook de gemeente en de bank naar kijken. Geen slag om de arm, gewoon een vastgelegd feit, tot en met de regel dat een balkon niet meetelt als woonoppervlak.",
    bijgewerkt: "Bijgewerkt: door de gemeente, bij wijziging",
    icoon: BuildingIcon,
    kleur: "indigo",
    koopgidsSlug: "bouwjaar-en-gebruiksdoel",
  },
  {
    titel: "Energielabel",
    tekst:
      "Precies het label dat straks ook op de deur van uw nieuwe huis hangt, berekend volgens dezelfde landelijke rekenmethode als elke erkende energieadviseur gebruikt. Alleen het definitieve label telt mee, nooit het automatische schattinkje dat elk huis toch al standaard krijgt.",
    bijgewerkt: "Bijgewerkt: bij elke nieuwe labelregistratie",
    icoon: BoltIcon,
    kleur: "indigo",
    koopgidsSlug: "energielabel-uitgelegd",
  },
  {
    titel: "Funderingsrisico",
    tekst:
      "We kijken naar twee dingen: hoe oud het huis is (vanaf 1970 is beton de norm en dat scheelt nogal wat) en of de bodem eronder van zichzelf al een beetje risico met zich meebrengt. Twee simpele vragen, knap gecombineerd tot één helder beeld. Geen bouwkundige langs de deur, geen boormonster, wel twee stevige, publieke bronnen.",
    bijgewerkt: "Bijgewerkt: bij elke opvraging, bron periodiek ververst",
    icoon: AlertTriangleIcon,
    kleur: "rust",
    koopgidsSlug: "funderingsrisico-herkennen",
  },
  {
    titel: "Verduurzamingsadvies",
    tekst:
      "Zelfde rekensom als bij het energielabel, maar dan achterstevoren: in plaats van het huidige label te meten, rekenen we uit wat er nodig is om een beter label te halen. Per maatregel, isolatie, een nieuwe cv-installatie, zonnepanelen, ziet u ongeveer wat het kost, wanneer het zich terugverdient en wat het uw woning extra waard oplevert.",
    bijgewerkt: "Bijgewerkt: doorlopend, bij elke opvraging",
    icoon: LeafIcon,
    kleur: "green",
    koopgidsSlug: "verduurzamen-wat-loont",
  },
  {
    titel: "Buurtprofiel",
    tekst:
      "We meten niet hemelsbreed maar over de echte stoep: hoe ver is het écht lopen naar de apotheek, de trein of het dichtstbijzijnde stukje groen. Per adres, niet per gemeente, want een gemeente kan er prima bijliggen terwijl uw eigen straat toch aan de rand van alles ligt.",
    bijgewerkt: "Bijgewerkt: jaarlijks",
    icoon: MapPinIcon,
    kleur: "indigo",
    koopgidsSlug: "buurt-en-voorzieningen",
  },
];
