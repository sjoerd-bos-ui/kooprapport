// -----------------------------------------------------------------------------
// Overbied-cijfers per NVM COROP-regio, 3e kwartaal 2026.
//
// Herkomst: dit zijn GEEN geschatte of afgeleide cijfers. Elk regel is
// overgenomen uit het officiële, per-regio "Marktoverzicht"-document dat NVM
// zelf publiceert op nvm.nl/wonen/marktinformatie-wonen/ (rubriek
// "Marktoverzichten en regionale analyses per COROP-regio"). Voor elke regio
// is het exacte document opgehaald en zijn de twee onderstaande velden
// letterlijk overgenomen uit de tabel "Marktindicatoren":
//
// - percentageBovenVraagprijs: rij "% Boven vraagprijs verkocht", kolom
//   "Totaal", huidig kwartaal (2026-3).
// - gemiddeldOverbod: rij "Vraag-verkoopprijsverschil", kolom "Totaal",
//   huidig kwartaal (2026-3). Positief = gemiddeld boven vraagprijs verkocht.
//
// Controle: de landelijke Bijlage 2 ("Marktoverzicht Nederland 3e kwartaal
// 2026") noemt 66% boven vraagprijs verkocht en 3,3% gemiddeld verschil; de
// regiocijfers hieronder lopen daar logisch omheen (bv. Overig Groningen 80%,
// Flevoland 80%, Zeeuws-Vlaanderen 26%).
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
    const coropNamen = MARKTUPDATE_NAAM_NAAR_COROP[naam];
    if (coropNamen) {
      for (const coropNaam of coropNamen) {
        const regio = REGIO_OVERBIEDEN.find((r) => r.regio === coropNaam);
        if (regio && !gezien.has(regio.regio)) {
          gezien.add(regio.regio);
          resultaat.push(regio);
        }
      }
      continue;
    }
    // NIEUW: `naam` is geen bekende redactionele Marktupdate-naam -- kan
    // ook een officiële COROP-regionaam zelf zijn, rechtstreeks gekozen via
    // de tabel/heatmap op de Werkgebied-pagina (zie WerkgebiedTabel.tsx en
    // werkgebiedStatusVoorRegio hieronder) i.p.v. via een redactionele naam.
    // Achterwaarts compatibel: bestaande, alleen-redactionele werkgebieden
    // blijven exact hetzelfde werken, dit is puur een extra, fijnmaziger pad.
    const directeRegio = REGIO_OVERBIEDEN.find((r) => r.regio === naam);
    if (directeRegio && !gezien.has(directeRegio.regio)) {
      gezien.add(directeRegio.regio);
      resultaat.push(directeRegio);
    }
  }
  return resultaat;
}

// Is een specifieke COROP-regio onderdeel van het werkgebied, en zo ja, via
// welk pad? "direct" = de officiële regionaam staat letterlijk in
// werkgebiedRegios (toegevoegd via de tabel) en kan dus veilig los
// aan/uitgezet worden. "editorial" = onderdeel via een gedeelde
// redactionele naam (bv. "Drenthe" dekt 3 COROP-regio's tegelijk) -- zo'n
// regio kan NIET los uitgezet worden zonder de andere twee mee te raken,
// dus de tabel toont die als vergrendeld (beheer dan via "Regio's beheren").
export type WerkgebiedRegioStatus = "direct" | "editorial" | "geen";

export function werkgebiedStatusVoorRegio(regioNaam: string, werkgebiedRegios: string[] | undefined): WerkgebiedRegioStatus {
  if (!werkgebiedRegios || werkgebiedRegios.length === 0) return "geen";
  if (werkgebiedRegios.includes(regioNaam)) return "direct";
  const editorialeNamen = editorialeNamenVoorRegio(regioNaam);
  if (editorialeNamen.some((naam) => werkgebiedRegios.includes(naam))) return "editorial";
  return "geen";
}

// Gemiddeld overbod per provincie -- puur een aggregatie over de al
// bestaande, officiële REGIO_OVERBIEDEN-data (geen nieuwe/geschatte
// cijfers), voor de provincie-heatmap op de Werkgebied-pagina.
export interface ProvincieOverbiedSamenvatting {
  provincie: string;
  gemiddeldOverbod: number;
  aantalRegios: number;
}

export function overbiedenPerProvincie(): ProvincieOverbiedSamenvatting[] {
  const perProvincie = new Map<string, { som: number; aantal: number }>();
  for (const regio of REGIO_OVERBIEDEN) {
    const huidig = perProvincie.get(regio.provincie) ?? { som: 0, aantal: 0 };
    huidig.som += regio.gemiddeldOverbod;
    huidig.aantal += 1;
    perProvincie.set(regio.provincie, huidig);
  }
  return Array.from(perProvincie.entries())
    .map(([provincie, { som, aantal }]) => ({ provincie, gemiddeldOverbod: som / aantal, aantalRegios: aantal }))
    .sort((a, b) => a.provincie.localeCompare(b.provincie, "nl"));
}

const PERIODE = "Q3 2026";
const BRON_PREFIX = "NVM Marktoverzicht";

export const REGIO_OVERBIEDEN: RegioOverbiedCijfer[] = [
  {
    regio: "Noord-Drenthe",
    provincie: "Drenthe",
    gemeenten: ["Aa en Hunze", "Assen", "Midden-Drenthe", "Noordenveld", "Tynaarlo"],
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 4.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Drenthe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/2a4ds52k/marktoverzicht-regio-noord-drenthe-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidoost-Drenthe",
    provincie: "Drenthe",
    gemeenten: ["Borger-Odoorn", "Coevorden", "Emmen"],
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 4.4,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Drenthe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/v02b2r52/marktoverzicht-regio-zuidoost-drenthe-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidwest-Drenthe",
    provincie: "Drenthe",
    gemeenten: ["De Wolden", "Hoogeveen", "Meppel", "Westerveld"],
    percentageBovenVraagprijs: 41,
    gemiddeldOverbod: 0.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Drenthe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/gxhm32w5/marktoverzicht-regio-zuidwest-drenthe-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Flevoland",
    provincie: "Flevoland",
    gemeenten: ["Almere", "Dronten", "Lelystad", "Noordoostpolder", "Urk", "Zeewolde"],
    percentageBovenVraagprijs: 80,
    gemiddeldOverbod: 4.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Flevoland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/omqn2yvb/marktoverzicht-regio-flevoland-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 60,
    gemiddeldOverbod: 2.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Friesland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/gorbbczj/marktoverzicht-regio-noord-friesland-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidoost-Friesland",
    provincie: "Friesland",
    gemeenten: ["Heerenveen", "Ooststellingwerf", "Opsterland", "Smallingerland", "Weststellingwerf"],
    percentageBovenVraagprijs: 60,
    gemiddeldOverbod: 1.8,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Friesland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/glicwku3/marktoverzicht-regio-zuidoost-friesland-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidwest-Friesland",
    provincie: "Friesland",
    gemeenten: ["De Fryske Marren", "Súdwest-Fryslân"],
    percentageBovenVraagprijs: 54,
    gemiddeldOverbod: 1.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Friesland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/dcen11vt/marktoverzicht-regio-zuidwest-friesland-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 4.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Achterhoek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/wdhgppmu/marktoverzicht-regio-achterhoek-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 75,
    gemiddeldOverbod: 4.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Arnhem Nijmegen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/qqenzmqz/marktoverzicht-regio-arnhem-nijmegen-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 63,
    gemiddeldOverbod: 2.4,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Veluwe, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/zuaf41j2/marktoverzicht-regio-veluwe-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidwest-Gelderland",
    provincie: "Gelderland",
    gemeenten: ["Buren", "Culemborg", "Maasdriel", "Neder-Betuwe", "Tiel", "West Betuwe", "West Maas en Waal", "Zaltbommel"],
    percentageBovenVraagprijs: 64,
    gemiddeldOverbod: 2.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Gelderland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/gdej1vb4/marktoverzicht-regio-zuidwest-gelderland-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Delfzijl en omgeving",
    provincie: "Groningen",
    gemeenten: ["Eemsdelta"],
    percentageBovenVraagprijs: 73,
    gemiddeldOverbod: 6.3,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Delfzijl en omgeving, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/4j0n4xmj/marktoverzicht-regio-delfzijl-en-omgeving-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Oost-Groningen",
    provincie: "Groningen",
    gemeenten: ["Oldambt", "Pekela", "Stadskanaal", "Veendam", "Westerwolde"],
    percentageBovenVraagprijs: 69,
    gemiddeldOverbod: 4.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Oost-Groningen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/jswafpxp/marktoverzicht-regio-oost-groningen-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Overig Groningen",
    provincie: "Groningen",
    gemeenten: ["Groningen", "Het Hogeland", "Midden-Groningen", "Westerkwartier"],
    percentageBovenVraagprijs: 80,
    gemiddeldOverbod: 7.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Overig Groningen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/t2gjvu5f/marktoverzicht-regio-overig-groningen-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Midden-Limburg",
    provincie: "Limburg",
    gemeenten: ["Echt-Susteren", "Leudal", "Maasgouw", "Nederweert", "Roerdalen", "Roermond", "Weert"],
    percentageBovenVraagprijs: 60,
    gemiddeldOverbod: 1.8,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Midden-Limburg, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/x2yo24nw/marktoverzicht-regio-midden-limburg-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Noord-Limburg",
    provincie: "Limburg",
    gemeenten: ["Beesel", "Bergen (L.)", "Gennep", "Horst aan de Maas", "Mook en Middelaar", "Peel en Maas", "Venlo", "Venray"],
    percentageBovenVraagprijs: 71,
    gemiddeldOverbod: 3.3,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Limburg, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/ndeehv0t/marktoverzicht-regio-noord-limburg-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 60,
    gemiddeldOverbod: 2.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuid-Limburg, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/s2ubqjos/marktoverzicht-regio-zuid-limburg-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 65,
    gemiddeldOverbod: 2.6,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Midden-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/npkpes54/marktoverzicht-regio-midden-noord-brabant-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 57,
    gemiddeldOverbod: 1.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noordoost-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/njlnh3bk/marktoverzicht-regio-noordoost-noord-brabant-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 63,
    gemiddeldOverbod: 2.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} West-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/yfiphwet/marktoverzicht-regio-west-noord-brabant-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 55,
    gemiddeldOverbod: 1.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Noord-Brabant, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/1god1s4o/marktoverzicht-regio-zuidoost-noord-brabant-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Agglomeratie Haarlem",
    provincie: "Noord-Holland",
    gemeenten: ["Bloemendaal", "Haarlem", "Heemstede", "Zandvoort"],
    percentageBovenVraagprijs: 66,
    gemiddeldOverbod: 2.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Agglomeratie Haarlem, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/bqvhr1sy/marktoverzicht-regio-agglomeratie-haarlem-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Alkmaar en omgeving",
    provincie: "Noord-Holland",
    gemeenten: ["Alkmaar", "Bergen (NH.)", "Dijk en Waard", "Heiloo"],
    percentageBovenVraagprijs: 57,
    gemiddeldOverbod: 1.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Alkmaar en omgeving, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/pwafpymt/marktoverzicht-regio-alkmaar-en-omgeving-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 73,
    gemiddeldOverbod: 5.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Groot-Amsterdam, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/0n0n1d0d/marktoverzicht-regio-groot-amsterdam-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Het Gooi en Vechtstreek",
    provincie: "Noord-Holland",
    gemeenten: ["Blaricum", "Gooise Meren", "Hilversum", "Huizen", "Laren", "Wijdemeren"],
    percentageBovenVraagprijs: 47,
    gemiddeldOverbod: 0.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Het Gooi en Vechtstreek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/vhqp50dm/marktoverzicht-regio-het-gooi-en-vechtstreek-3e-kwartaal-2026.pdf",
  },
  {
    regio: "IJmond",
    provincie: "Noord-Holland",
    gemeenten: ["Beverwijk", "Castricum", "Heemskerk", "Uitgeest", "Velsen"],
    percentageBovenVraagprijs: 68,
    gemiddeldOverbod: 3.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} IJmond, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/mqclm5sy/marktoverzicht-regio-ijmond-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 66,
    gemiddeldOverbod: 3.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Kop van Noord-Holland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/0n3hf1pn/marktoverzicht-regio-kop-van-noord-holland-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zaanstreek",
    provincie: "Noord-Holland",
    gemeenten: ["Wormerland", "Zaanstad"],
    percentageBovenVraagprijs: 71,
    gemiddeldOverbod: 3.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zaanstreek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/w4dnau0c/marktoverzicht-regio-zaanstreek-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Noord-Overijssel",
    provincie: "Overijssel",
    gemeenten: ["Dalfsen", "Hardenberg", "Kampen", "Ommen", "Staphorst", "Steenwijkerland", "Zwartewaterland", "Zwolle"],
    percentageBovenVraagprijs: 70,
    gemiddeldOverbod: 4.0,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Noord-Overijssel, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/4dnhbzl2/marktoverzicht-regio-noord-overijssel-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 58,
    gemiddeldOverbod: 1.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Twente, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/nbunz5of/marktoverzicht-regio-twente-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zuidwest-Overijssel",
    provincie: "Overijssel",
    gemeenten: ["Deventer", "Olst-Wijhe", "Raalte"],
    percentageBovenVraagprijs: 72,
    gemiddeldOverbod: 4.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidwest-Overijssel, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/jb3n14bo/marktoverzicht-regio-zuidwest-overijssel-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 76,
    gemiddeldOverbod: 6.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Utrecht, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/uabjxwgv/marktoverzicht-regio-utrecht-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 46,
    gemiddeldOverbod: 0.1,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Overig Zeeland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/1jxiec5q/marktoverzicht-regio-overig-zeeland-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Zeeuws-Vlaanderen",
    provincie: "Zeeland",
    gemeenten: ["Hulst", "Sluis", "Terneuzen"],
    percentageBovenVraagprijs: 26,
    gemiddeldOverbod: -1.2,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zeeuws-Vlaanderen, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/cqyjndky/marktoverzicht-regio-zeeuws-vlaanderen-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Agglomeratie Den Haag",
    provincie: "Zuid-Holland",
    gemeenten: ["'s-Gravenhage", "Leidschendam-Voorburg", "Pijnacker-Nootdorp", "Rijswijk", "Wassenaar", "Zoetermeer"],
    percentageBovenVraagprijs: 64,
    gemiddeldOverbod: 2.7,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Agglomeratie Den Haag, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/mcrhummf/marktoverzicht-regio-agglomeratie-den-haag-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Delft en Westland",
    provincie: "Zuid-Holland",
    gemeenten: ["Delft", "Midden-Delfland", "Westland"],
    percentageBovenVraagprijs: 62,
    gemiddeldOverbod: 2.5,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Delft en Westland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/npbj4smc/marktoverzicht-regio-delft-en-westland-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 60,
    gemiddeldOverbod: 1.8,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Groot-Rijnmond, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/ikjp1qj1/marktoverzicht-regio-groot-rijnmond-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 72,
    gemiddeldOverbod: 3.9,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Agglomeratie Leiden en Bollenstreek, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/g4nlppbp/marktoverzicht-regio-agglomeratie-leiden-en-bollenstreek-3e-kwartaal-2026.pdf",
  },
  {
    regio: "Oost-Zuid-Holland",
    provincie: "Zuid-Holland",
    gemeenten: ["Alphen aan den Rijn", "Bodegraven-Reeuwijk", "Gouda", "Krimpenerwaard", "Nieuwkoop", "Waddinxveen"],
    percentageBovenVraagprijs: 72,
    gemiddeldOverbod: 4.3,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Oost-Zuid-Holland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/0aheurvz/marktoverzicht-regio-oost-zuid-holland-3e-kwartaal-2026.pdf",
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
    percentageBovenVraagprijs: 68,
    gemiddeldOverbod: 3.3,
    periodeLabel: PERIODE,
    bron: `${BRON_PREFIX} Zuidoost-Zuid-Holland, ${PERIODE}`,
    bronUrl: "https://www.nvm.nl/media/y1jai45p/marktoverzicht-regio-zuidoost-zuid-holland-3e-kwartaal-2026.pdf",
  },
];
