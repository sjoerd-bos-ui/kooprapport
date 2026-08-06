// -----------------------------------------------------------------------------
// Overbied-cijfers per NVM COROP-regio, 2e kwartaal 2026.
//
// Herkomst: dit zijn GEEN geschatte of afgeleide cijfers. Elk regel is
// overgenomen uit het officiële, per-regio "Marktoverzicht"-document dat NVM
// zelf publiceert op nvm.nl/wonen/marktinformatie-wonen/ (rubriek
// "Marktoverzichten en regionale analyses per COROP-regio"). Voor elke regio
// is het exacte document opgehaald en zijn de twee onderstaande velden
// letterlijk overgenomen uit de tabel "Marktindicatoren":
//
// - percentageBovenVraagprijs: rij "% Boven vraagprijs verkocht", kolom
//   "Totaal", huidig kwartaal (2026-2).
// - gemiddeldOverbod: rij "Vraag-verkoopprijsverschil", kolom "Totaal",
//   huidig kwartaal (2026-2). Positief = gemiddeld boven vraagprijs verkocht.
//
// De landelijke NVM-persrapportage (Bijlage 1, "Analyse woningmarkt 2e
// kwartaal 2026") noemt zelf expliciet: "Regio's waar overbieden het meest
// voorkomt zijn Utrecht, Oost-Zuid-Holland, Overig Groningen en Flevoland...
// meer dan 80%... Veel minder vaak is dit nodig in Zeeuws-Vlaanderen, minder
// dan één op de drie gevallen." Dat komt exact overeen met de cijfers
// hieronder (Overig Groningen 84%, Flevoland 84%, Utrecht 80%, Oost-Zuid-
// Holland 80%, Zeeuws-Vlaanderen 29%) — een directe verificatie dat deze
// per-regio cijfers kloppen met NVM's eigen samenvatting, niet een losse
// aggregator-schatting.
//
// gemeenten: de gemeentenamen zoals ze op het voorblad van het betreffende
// regio-document staan (dus de actuele indeling, inclusief recente fusies
// zoals "Land van Cuijk" en "Maashorst" — niet de oudere COROP-indeling van
// vóór 2022).
//
// Elk kwartaal publiceert NVM nieuwe documenten op dezelfde plek; dit bestand
// moet dan opnieuw gevuld worden met de nieuwe cijfers (zelfde bron, nieuw
// kwartaal) om actueel te blijven.
// -----------------------------------------------------------------------------

export interface RegioOverbiedCijfer {
  regio: string;
  provincie: string;
  gemeenten: string[];
  percentageBovenVraagprijs: number;
  gemiddeldOverbod: number;
  periodeLabel: string;
  bron: string;
  bronUrl: string;
}

// URL-slug voor een regionaam -- één functie i.p.v. 40x een los, met de hand
// getypt slug-veld (voorkomt typefouten en drift als een regionaam ooit
// wijzigt). "Arnhem/Nijmegen" -> "arnhem-nijmegen", "'s-Gravenhage" ->
// "s-gravenhage", diakrieten (Fryslân e.d.) worden genormaliseerd.
export function regioSlug(regioNaam: string): string {
  return regioNaam
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[/\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function getRegioBySlug(slug: string): RegioOverbiedCijfer | undefined {
  return REGIO_OVERBIEDEN.find((r) => regioSlug(r.regio) === slug);
}

// -----------------------------------------------------------------------------
// Vertaaltabel voor het "Werkgebied"-blok in Kooprapport Zakelijk
// (app/zakelijk/(dashboard)/werkgebied/page.tsx). Een organisatie kiest haar
// werkgebied via de redactionele Marktupdate-regionamen (zie
// B2bOrganisatie.werkgebiedRegios / alleGebruikteRegioNamen() in
// lib/services/marktAlert.ts) -- BEWUST niet nog een tweede, losse
// COROP-regioselectie, dat zou een makelaar die net "Rotterdam" heeft
// aangevinkt nodeloos een tweede keer hetzelfde laten instellen.
//
// Deze tabel is dus GEEN runtime fuzzy-match (die is elders expliciet
// afgewezen, zie het commentaar bij werkgebiedRegios in types/b2b.ts) maar een
// kleine, met de hand geverifieerde 1-op-1 (of 1-op-meerdere) koppeling tussen
// de handjevol redactionele namen die ooit in een Marktupdate zijn gebruikt en
// de officiële NVM COROP-regio's hierboven, puur om bij een al gekozen
// werkgebied de bijbehorende officiële kwartaalcijfers te kunnen tonen.
// Nieuwe redactionele regionamen die hier nog niet in staan worden gewoon
// overgeslagen (zie overbiedenVoorWerkgebied), nooit geraden.
const MARKTUPDATE_NAAM_NAAR_COROP: Record<string, string[]> = {
  Amsterdam: ["Groot-Amsterdam"],
  Rotterdam: ["Groot-Rijnmond"],
  "Den Haag": ["Agglomeratie Den Haag"],
  Haaglanden: ["Agglomeratie Den Haag", "Delft en Westland"],
  Drenthe: ["Noord-Drenthe", "Zuidoost-Drenthe", "Zuidwest-Drenthe"],
  Groningen: ["Overig Groningen"],
  "Overig Groningen": ["Overig Groningen"],
};

// Omgekeerde richting van MARKTUPDATE_NAAM_NAAR_COROP hierboven -- gegeven
// een officiële COROP-regionaam, welke redactionele Marktupdate-naam(en)
// verwijzen ernaar? Gebruikt door de Werkgebied-pagina om de jaarvergelijking
// (MarktupdateRegioRij.jaarVergelijking/richting, alleen beschikbaar voor een
// handjevol regio's per kwartaal) aan de juiste COROP-regiokaart te koppelen.
export function editorialeNamenVoorRegio(coropNaam: string): string[] {
  return Object.entries(MARKTUPDATE_NAAM_NAAR_COROP)
    .filter(([, coropLijst]) => coropLijst.includes(coropNaam))
    .map(([naam]) => naam);
}

export function overbiedenVoorWerkgebied(werkgebiedRegios: string[] | undefined): RegioOverbiedCijfer[] {
  if (!werkgebiedRegios || werkgebiedRegios.length === 0) return [];
  const gezien = new Set<string>();
  const resultaat: RegioOverbiedCijfer[] = [];
  for (const naam of werkgebiedRegios) {
    for (const coropNaam of MARKTUPDATE_NAAM_NAAR_COROP[naam] ?? []) {
      const regio = REGIO_OVERBIEDEN.find((r) => r.regio === coropNaam);
      if (regio && !gezien.has(regio.regio)) {
        gezien.add(regio.regio);
        resultaat.push(regio);
      }
    }
  }
  return resultaat;
}

const PERIODE = "Q2 2026";
const BRON_PREFIX = "NVM Marktoverzicht";

export const REGIO_OVERBIEDEN: RegioOverbiedCijfer[] = [
  {
    regio: "Noord-Drenthe",
    provincie: "Drenthe",
    gemeenten: ["Aa en Hunze", "Assen", "Midden-Drenthe", "Noordenveld", "Tynaarlo"],
    percentageBovenVraagprijs: 75,
    gemiddeldOverbod: 5.8,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Drenthe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/nwrjqjgo/marktoverzicht_regio_noord-drenthe_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Zuidoost-Drenthe",
    provincie: "Drenthe",
    gemeenten: ["Borger-Odoorn", "Coevorden", "Emmen"],
    percentageBovenVraagprijs: 76,
    gemiddeldOverbod: 5.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Drenthe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/bpylwlcp/marktoverzicht_regio_zuidoost-drenthe_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Zuidwest-Drenthe",
    provincie: "Drenthe",
    gemeenten: ["De Wolden", "Hoogeveen", "Meppel", "Westerveld"],
    percentageBovenVraagprijs: 52,
    gemiddeldOverbod: 1.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Drenthe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/wicnmtjm/marktoverzicht_regio_zuidwest-drenthe_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Flevoland",
    provincie: "Flevoland",
    gemeenten: ["Almere", "Dronten", "Lelystad", "Noordoostpolder", "Urk", "Zeewolde"],
    percentageBovenVraagprijs: 84,
    gemiddeldOverbod: 6.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Flevoland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/tgqbu3w5/marktoverzicht_regio_flevoland_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Noord-Friesland",
    provincie: "Friesland",
    gemeenten: [
      "Waadhoeke",
      "Achtkarspelen",
      "Ameland",
      "Dantumadiel",
      "Harlingen",
      "Leeuwarden",
      "Noardeast-Fryslân",
      "Schiermonnikoog",
      "Terschelling",
      "Tytsjerksteradiel",
      "Vlieland",
    ],
    percentageBovenVraagprijs: 67,
    gemiddeldOverbod: 3.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Friesland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/taunbumy/marktoverzicht_regio_noord-friesland_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Zuidoost-Friesland",
    provincie: "Friesland",
    gemeenten: ["Heerenveen", "Ooststellingwerf", "Opsterland", "Smallingerland", "Weststellingwerf"],
    percentageBovenVraagprijs: 65,
    gemiddeldOverbod: 3.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Friesland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/cmqlasvn/marktoverzicht_regio_zuidoost-friesland_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Zuidwest-Friesland",
    provincie: "Friesland",
    gemeenten: ["De Fryske Marren", "Súdwest-Fryslân"],
    percentageBovenVraagprijs: 58,
    gemiddeldOverbod: 1.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Friesland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/th2k1ake/marktoverzicht_regio_zuidwest-friesland_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Achterhoek",
    provincie: "Gelderland",
    gemeenten: [
      "Zutphen",
      "Aalten",
      "Berkelland",
      "Bronckhorst",
      "Brummen",
      "Doetinchem",
      "Lochem",
      "Montferland",
      "Oost Gelre",
      "Oude IJsselstreek",
      "Winterswijk",
    ],
    percentageBovenVraagprijs: 75,
    gemiddeldOverbod: 5.6,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Achterhoek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/a5sf0dke/marktoverzicht_regio_achterhoek_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Arnhem/Nijmegen",
    provincie: "Gelderland",
    gemeenten: [
      "Renkum",
      "Rheden",
      "Rozendaal",
      "Westervoort",
      "Wijchen",
      "Arnhem",
      "Berg en Dal",
      "Beuningen",
      "Doesburg",
      "Druten",
      "Zevenaar",
      "Duiven",
      "Heumen",
      "Lingewaard",
      "Nijmegen",
      "Overbetuwe",
    ],
    percentageBovenVraagprijs: 77,
    gemiddeldOverbod: 6.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Arnhem Nijmegen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/a2dlipum/marktoverzicht_regio_arnhem_nijmegen_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Veluwe",
    provincie: "Gelderland",
    gemeenten: [
      "Nunspeet",
      "Oldebroek",
      "Putten",
      "Scherpenzeel",
      "Voorst",
      "Apeldoorn",
      "Barneveld",
      "Ede",
      "Elburg",
      "Epe",
      "Wageningen",
      "Ermelo",
      "Harderwijk",
      "Hattem",
      "Heerde",
      "Nijkerk",
    ],
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 3.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Veluwe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/c5apqq4i/marktoverzicht_regio_veluwe_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Zuidwest-Gelderland",
    provincie: "Gelderland",
    gemeenten: ["Buren", "Culemborg", "Maasdriel", "Neder-Betuwe", "Tiel", "West Betuwe", "West Maas en Waal", "Zaltbommel"],
    percentageBovenVraagprijs: 71,
    gemiddeldOverbod: 3.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Gelderland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/5dwhnhu4/marktoverzicht_regio_zuidwest-gelderland_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Delfzijl en omgeving",
    provincie: "Groningen",
    gemeenten: ["Eemsdelta"],
    percentageBovenVraagprijs: 76,
    gemiddeldOverbod: 6.6,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Delfzijl en omgeving, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/i3sbaay0/marktoverzicht_regio_delfzijl_en_omgeving_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Oost-Groningen",
    provincie: "Groningen",
    gemeenten: ["Oldambt", "Pekela", "Stadskanaal", "Veendam", "Westerwolde"],
    percentageBovenVraagprijs: 76,
    gemiddeldOverbod: 5.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Oost-Groningen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/otzhfi3o/marktoverzicht_regio_oost-groningen_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Overig Groningen",
    provincie: "Groningen",
    gemeenten: ["Groningen", "Het Hogeland", "Midden-Groningen", "Westerkwartier"],
    percentageBovenVraagprijs: 84,
    gemiddeldOverbod: 9.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Overig Groningen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/3nmcyilw/marktoverzicht_regio_overig_groningen_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Midden-Limburg",
    provincie: "Limburg",
    gemeenten: ["Echt-Susteren", "Leudal", "Maasgouw", "Nederweert", "Roerdalen", "Roermond", "Weert"],
    percentageBovenVraagprijs: 68,
    gemiddeldOverbod: 3.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Midden-Limburg, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/kzndyf1u/marktoverzicht_regio_midden-limburg_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Noord-Limburg",
    provincie: "Limburg",
    gemeenten: ["Beesel", "Bergen (L.)", "Gennep", "Horst aan de Maas", "Mook en Middelaar", "Peel en Maas", "Venlo", "Venray"],
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 4.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Limburg, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/fo4nedxp/marktoverzicht_regio_noord-limburg_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Zuid-Limburg",
    provincie: "Limburg",
    gemeenten: [
      "Simpelveld",
      "Sittard-Geleen",
      "Stein",
      "Vaals",
      "Valkenburg aan de Geul",
      "Beek",
      "Beekdaelen",
      "Brunssum",
      "Eijsden-Margraten",
      "Gulpen-Wittem",
      "Voerendaal",
      "Heerlen",
      "Kerkrade",
      "Landgraaf",
      "Maastricht",
      "Meerssen",
    ],
    percentageBovenVraagprijs: 65,
    gemiddeldOverbod: 2.6,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuid-Limburg, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/ghwjmpyq/marktoverzicht_regio_zuid-limburg_2e_kwartaal_2026-1.pdf",
  },
  {
    regio: "Midden-Noord-Brabant",
    provincie: "Noord-Brabant",
    gemeenten: [
      "Waalwijk",
      "Alphen-Chaam",
      "Altena",
      "Baarle-Nassau",
      "Dongen",
      "Gilze en Rijen",
      "Goirle",
      "Hilvarenbeek",
      "Loon op Zand",
      "Oisterwijk",
      "Tilburg",
    ],
    percentageBovenVraagprijs: 72,
    gemiddeldOverbod: 4.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Midden-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/pzljmymi/marktoverzicht-regio-midden-noord-brabant-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Noordoost-Noord-Brabant",
    provincie: "Noord-Brabant",
    gemeenten: [
      "Vught",
      "Den Bosch",
      "Bernheze",
      "Boekel",
      "Boxtel",
      "Heusden",
      "Land van Cuijk",
      "Maashorst",
      "Meierijstad",
      "Oss",
      "Sint-Michielsgestel",
    ],
    percentageBovenVraagprijs: 59,
    gemiddeldOverbod: 1.8,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noordoost-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/ovfgjblr/marktoverzicht-regio-noordoost-noord-brabant-2e-kwartaal-2026.pdf",
  },
  {
    regio: "West-Noord-Brabant",
    provincie: "Noord-Brabant",
    gemeenten: [
      "Steenbergen",
      "Woensdrecht",
      "Zundert",
      "Bergen op Zoom",
      "Breda",
      "Drimmelen",
      "Etten-Leur",
      "Geertruidenberg",
      "Halderberge",
      "Moerdijk",
      "Oosterhout",
      "Roosendaal",
      "Rucphen",
    ],
    percentageBovenVraagprijs: 68,
    gemiddeldOverbod: 3.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} West-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/edac0fc0/marktoverzicht-regio-west-noord-brabant-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidoost-Noord-Brabant",
    provincie: "Noord-Brabant",
    gemeenten: [
      "Son en Breugel",
      "Valkenswaard",
      "Veldhoven",
      "Waalre",
      "Heeze-Leende",
      "Helmond",
      "Laarbeek",
      "Nuenen, Gerwen en Nederwetten",
      "Oirschot",
      "Asten",
      "Bergeijk",
      "Best",
      "Bladel",
      "Cranendonck",
      "Reusel-De Mierden",
      "Someren",
      "Deurne",
      "Eersel",
      "Eindhoven",
      "Geldrop-Mierlo",
      "Gemert-Bakel",
    ],
    percentageBovenVraagprijs: 60,
    gemiddeldOverbod: 1.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/ms1bw0uk/marktoverzicht-regio-zuidoost-noord-brabant-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Agglomeratie Haarlem",
    provincie: "Noord-Holland",
    gemeenten: ["Bloemendaal", "Haarlem", "Heemstede", "Zandvoort"],
    percentageBovenVraagprijs: 69,
    gemiddeldOverbod: 4.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Agglomeratie Haarlem, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/tyjdh34w/marktoverzicht-regio-agglomeratie-haarlem-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Alkmaar en omgeving",
    provincie: "Noord-Holland",
    gemeenten: ["Alkmaar", "Bergen (NH.)", "Dijk en Waard", "Heiloo"],
    percentageBovenVraagprijs: 62,
    gemiddeldOverbod: 2.6,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Alkmaar en omgeving, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/z00psght/marktoverzicht-regio-alkmaar-en-omgeving-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Groot-Amsterdam",
    provincie: "Noord-Holland",
    gemeenten: [
      "Uithoorn",
      "Waterland",
      "Aalsmeer",
      "Amstelveen",
      "Amsterdam",
      "Diemen",
      "Edam-Volendam",
      "Haarlemmermeer",
      "Landsmeer",
      "Oostzaan",
      "Ouder-Amstel",
      "Purmerend",
    ],
    percentageBovenVraagprijs: 75,
    gemiddeldOverbod: 5.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Groot-Amsterdam, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/q1mizp1t/marktoverzicht-regio-groot-amsterdam-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Het Gooi en Vechtstreek",
    provincie: "Noord-Holland",
    gemeenten: ["Blaricum", "Gooise Meren", "Hilversum", "Huizen", "Laren", "Wijdemeren"],
    percentageBovenVraagprijs: 58,
    gemiddeldOverbod: 1.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Het Gooi en Vechtstreek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/2pjcqjps/marktoverzicht-regio-het-gooi-en-vechtstreek-2e-kwartaal-2026.pdf",
  },
  {
    regio: "IJmond",
    provincie: "Noord-Holland",
    gemeenten: ["Beverwijk", "Castricum", "Heemskerk", "Uitgeest", "Velsen"],
    percentageBovenVraagprijs: 77,
    gemiddeldOverbod: 5.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} IJmond, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/pepnlszd/marktoverzicht-regio-ijmond-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Kop van Noord-Holland",
    provincie: "Noord-Holland",
    gemeenten: [
      "Texel",
      "Den Helder",
      "Drechterland",
      "Enkhuizen",
      "Hollands Kroon",
      "Hoorn",
      "Koggenland",
      "Medemblik",
      "Opmeer",
      "Schagen",
      "Stede Broec",
    ],
    percentageBovenVraagprijs: 71,
    gemiddeldOverbod: 4.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Kop van Noord-Holland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/sakicobr/marktoverzicht-regio-kop-van-noord-holland-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Zaanstreek",
    provincie: "Noord-Holland",
    gemeenten: ["Wormerland", "Zaanstad"],
    percentageBovenVraagprijs: 75,
    gemiddeldOverbod: 3.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zaanstreek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/mm5lfqyk/marktoverzicht-regio-zaanstreek-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Noord-Overijssel",
    provincie: "Overijssel",
    gemeenten: ["Dalfsen", "Hardenberg", "Kampen", "Ommen", "Staphorst", "Steenwijkerland", "Zwartewaterland", "Zwolle"],
    percentageBovenVraagprijs: 76,
    gemiddeldOverbod: 5.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Overijssel, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/n20b4ap5/marktoverzicht-regio-noord-overijssel-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Twente",
    provincie: "Overijssel",
    gemeenten: [
      "Rijssen-Holten",
      "Tubbergen",
      "Twenterand",
      "Wierden",
      "Almelo",
      "Borne",
      "Dinkelland",
      "Enschede",
      "Haaksbergen",
      "Hellendoorn",
      "Hengelo",
      "Hof van Twente",
      "Losser",
      "Oldenzaal",
    ],
    percentageBovenVraagprijs: 64,
    gemiddeldOverbod: 2.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Twente, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/znvjxfrm/marktoverzicht-regio-twente-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidwest-Overijssel",
    provincie: "Overijssel",
    gemeenten: ["Deventer", "Olst-Wijhe", "Raalte"],
    percentageBovenVraagprijs: 75,
    gemiddeldOverbod: 6.4,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Overijssel, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/meflrnnp/marktoverzicht-regio-zuidwest-overijssel-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Utrecht",
    provincie: "Utrecht",
    gemeenten: [
      "Stichtse Vecht",
      "Utrecht",
      "Utrechtse Heuvelrug",
      "Veenendaal",
      "Vijfheerenlanden",
      "Wijk bij Duurstede",
      "Woerden",
      "Woudenberg",
      "Zeist",
      "Lopik",
      "Montfoort",
      "Nieuwegein",
      "Oudewater",
      "Renswoude",
      "Amersfoort",
      "Baarn",
      "Bunnik",
      "Bunschoten",
      "De Bilt",
      "Rhenen",
      "Soest",
      "De Ronde Venen",
      "Eemnes",
      "Houten",
      "IJsselstein",
      "Leusden",
    ],
    percentageBovenVraagprijs: 80,
    gemiddeldOverbod: 8.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Utrecht, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/12jdu35e/marktoverzicht-regio-utrecht-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Overig Zeeland",
    provincie: "Zeeland",
    gemeenten: [
      "Borsele",
      "Goes",
      "Kapelle",
      "Middelburg",
      "Noord-Beveland",
      "Reimerswaal",
      "Schouwen-Duiveland",
      "Tholen",
      "Veere",
      "Vlissingen",
    ],
    percentageBovenVraagprijs: 55,
    gemiddeldOverbod: 1.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Overig Zeeland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/xovn0u2k/marktoverzicht-regio-overig-zeeland-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Zeeuws-Vlaanderen",
    provincie: "Zeeland",
    gemeenten: ["Hulst", "Sluis", "Terneuzen"],
    percentageBovenVraagprijs: 29,
    gemiddeldOverbod: -1.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zeeuws-Vlaanderen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/wuulrzr3/marktoverzicht-regio-zeeuws-vlaanderen-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Agglomeratie Den Haag",
    provincie: "Zuid-Holland",
    gemeenten: ["'s-Gravenhage", "Leidschendam-Voorburg", "Pijnacker-Nootdorp", "Rijswijk", "Wassenaar", "Zoetermeer"],
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 3.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Agglomeratie Den Haag, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/erihz5rp/marktoverzicht-regio-agglomeratie-den-haag-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Delft en Westland",
    provincie: "Zuid-Holland",
    gemeenten: ["Delft", "Midden-Delfland", "Westland"],
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 3.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Delft en Westland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/cgdhzjn0/marktoverzicht-regio-delft-en-westland-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Groot-Rijnmond",
    provincie: "Zuid-Holland",
    gemeenten: [
      "Rotterdam",
      "Schiedam",
      "Voorne aan Zee",
      "Vlaardingen",
      "Zuidplas",
      "Albrandswaard",
      "Barendrecht",
      "Capelle aan den IJssel",
      "Goeree-Overflakkee",
      "Hoeksche Waard",
      "Krimpen aan den IJssel",
      "Lansingerland",
      "Maassluis",
      "Nissewaard",
      "Ridderkerk",
    ],
    percentageBovenVraagprijs: 68,
    gemiddeldOverbod: 3.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Groot-Rijnmond, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/shojduw1/marktoverzicht-regio-groot-rijnmond-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Agglomeratie Leiden en Bollenstreek",
    provincie: "Zuid-Holland",
    gemeenten: [
      "Zoeterwoude",
      "Hillegom",
      "Kaag en Braassem",
      "Katwijk",
      "Leiden",
      "Leiderdorp",
      "Lisse",
      "Noordwijk",
      "Oegstgeest",
      "Teylingen",
      "Voorschoten",
    ],
    percentageBovenVraagprijs: 77,
    gemiddeldOverbod: 5.3,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Agglomeratie Leiden en Bollenstreek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/yuzdoy2f/marktoverzicht-regio-agglomeratie-leiden-en-bollenstreek-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Oost-Zuid-Holland",
    provincie: "Zuid-Holland",
    gemeenten: ["Alphen aan den Rijn", "Bodegraven-Reeuwijk", "Gouda", "Krimpenerwaard", "Nieuwkoop", "Waddinxveen"],
    percentageBovenVraagprijs: 80,
    gemiddeldOverbod: 6.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Oost-Zuid-Holland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/qbqleie5/marktoverzicht-regio-oost-zuid-holland-2e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidoost-Zuid-Holland",
    provincie: "Zuid-Holland",
    gemeenten: [
      "Alblasserdam",
      "Dordrecht",
      "Gorinchem",
      "Hardinxveld-Giessendam",
      "Hendrik-Ido-Ambacht",
      "Molenlanden",
      "Papendrecht",
      "Sliedrecht",
      "Zwijndrecht",
    ],
    percentageBovenVraagprijs: 77,
    gemiddeldOverbod: 5.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Zuid-Holland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/tctjmhyx/marktoverzicht-regio-zuidoost-zuid-holland-2e-kwartaal-2026.pdf",
  },
];
