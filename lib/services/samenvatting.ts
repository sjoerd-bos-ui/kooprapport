import type { Report } from "@/types/report";
import type { ChipToon } from "@/lib/utils/toonKleuren";
import { berekenVeiligheidsscore, bepaalVeiligheidsBand, VEILIGHEID_BAND } from "@/lib/utils/veiligheidsscore";
import { duidEnergielabel } from "@/lib/utils/energielabel";

// -----------------------------------------------------------------------------
// Samenvatting — de compacte, één-oogopslag afsluiting van het rapport (app-
// tabblad "Samenvatting" + PDF-pagina 7). Zelfde grondregel als de rest van
// de app: "moet altijd feitelijk blijven en verifieerbaar". Deze generator
// verzint dus NIETS — elke zin komt rechtstreeks uit velden die al ergens
// anders in het rapport staan (fundering.label/toelichting, buurtprofiel.
// samenvatting, energielabel-duiding, veiligheidsscore, de bestaande
// insights[]) of is een simpele, transparante afgeleide berekening die
// elders in de app op precies dezelfde manier al gebeurt (bv.
// berekenVeiligheidsscore, duidEnergielabel — geen nieuwe aannames).
//
// Werkt voor ELK adres, niet alleen de curatieve showcase: elke bouwsteen
// hieronder is een kandidaat die alleen meedoet als de onderliggende data
// er echt is (SourceResult.data != null / specifiek veld != null). Ontbreekt
// een databron, dan valt dat onderdeel simpelweg weg — nooit een gegokte
// vervangende zin.
//
// Taalniveau: doelgroep "vanaf Mavo niveau" (expliciete eis) — korte zinnen,
// gangbare woorden, geen vakjargon ("confidence interval", "AVM",
// "compleetheid") in de samenvattende teksten. Waar de rest van het rapport
// wel jargon gebruikt, wordt het hier vertaald naar gewone taal.
// -----------------------------------------------------------------------------

export interface SamenvattingKernstat {
  key: string;
  label: string;
  waarde: string;
  toelichting: string;
  toon: ChipToon;
  ringFractie: number; // 0-1, puur visuele vulling van de ringgauge, afgeleid van toon
}

export interface Samenvatting {
  titel: string;
  totaalbeeld: string;
  eindconclusie: string;
  pluspunten: string[];
  aandachtspunten: string[];
  kernstats: SamenvattingKernstat[];
  gebruiksblok: string[];
}

// Zelfde, al goedgekeurde tekst als op de Waarde-indicatie-tab en in de PDF —
// bewust hier hergebruikt (geen nieuwe copy verzinnen voor het praktische
// gebruiksblok).
const GEBRUIKSBLOK = [
  "Onderhandelingsbasis bij aan-/verkoop",
  "Oriëntatie bij hypotheek of herfinanciering",
  "Richtlijn voor de verzekerde waarde",
  "Startpunt voor vermogensplanning",
];

// Grove visuele weging per toon, uitsluitend voor de ringgauge-vulling op de
// kernstat-kaarten (Concept A) — geen cijfer op zich, puur een consistente
// indicatie: gunstig vult het meest, risico het minst.
const RINGFRACTIE: Record<ChipToon, number> = {
  gunstig: 0.86,
  neutraal: 0.55,
  aandacht: 0.55,
  risico: 0.24,
  accent: 0.7,
};

interface Kandidaat {
  prioriteit: number; // hoger = eerder gekozen
  tekst: string;
}

function topN(kandidaten: Kandidaat[], n: number): string[] {
  return kandidaten
    .sort((a, b) => b.prioriteit - a.prioriteit)
    .slice(0, n)
    .map((k) => k.tekst);
}

function top3(kandidaten: Kandidaat[]): string[] {
  return topN(kandidaten, 3);
}

export function buildSamenvatting(report: Report): Samenvatting {
  const { building, energy, market, nearbySales, buurtprofiel, fundering, kavel, insights, dataQuality } = report;

  // ---------------------------------------------------------------------
  // Kernstats — maximaal 4, alleen kaarten waarvoor echt data is.
  // ---------------------------------------------------------------------
  const kernstats: SamenvattingKernstat[] = [];

  if (fundering.data?.niveau) {
    const niveau = fundering.data.niveau;
    const toon: ChipToon = niveau === "laag" ? "gunstig" : niveau === "midden" ? "aandacht" : "risico";
    const waarde = niveau === "laag" ? "Laag risico" : niveau === "midden" ? "Gemiddeld risico" : "Verhoogd risico";
    kernstats.push({
      key: "fundering",
      label: "Fundering",
      waarde,
      toelichting: fundering.data.toelichting ?? "Gebaseerd op het bouwjaar en de bodem in dit gebied.",
      toon,
      ringFractie: RINGFRACTIE[toon],
    });
  }

  const misdrijvenPer1000 = buurtprofiel.data?.veiligheid.misdrijvenPer1000;
  if (misdrijvenPer1000 != null) {
    const score = berekenVeiligheidsscore(misdrijvenPer1000);
    const band = bepaalVeiligheidsBand(score);
    kernstats.push({
      key: "veiligheid",
      label: "Veiligheid",
      waarde: `${VEILIGHEID_BAND[band].tekst} (${score}/10)`,
      toelichting: `${misdrijvenPer1000} misdrijven per 1.000 inwoners in de buurt.`,
      toon: band,
      ringFractie: RINGFRACTIE[band],
    });
  }

  if (energy.data?.klasse) {
    const duiding = duidEnergielabel(energy.data.klasse);
    const geldigTot = energy.data.geldigTot ? new Date(energy.data.geldigTot).getFullYear() : null;
    kernstats.push({
      key: "energie",
      label: "Energie",
      waarde: `Label ${energy.data.klasse}`,
      toelichting: geldigTot ? `Geldig tot ${geldigTot}.` : duiding?.stookkostenTekst ?? "Geregistreerd energielabel.",
      toon: duiding?.toon ?? "neutraal",
      ringFractie: RINGFRACTIE[duiding?.toon ?? "neutraal"],
    });
  }

  // Alleen het "dagelijks leven"-thema (huisarts/apotheek/supermarkt) voor
  // deze ene samenvattende kernstat — gezin/onderwijs en bereikbaarheid zijn
  // een ander soort afweging en horen bij het volledige buurtprofiel-tabblad,
  // niet samengeklonterd in één cijfer op de Samenvatting.
  const dagelijksVoorzieningen = (buurtprofiel.data?.voorzieningen.items ?? []).filter((i) => i.thema === "dagelijks");
  const afstanden = dagelijksVoorzieningen.map((i) => i.afstandKm);
  if (afstanden.length > 0) {
    const gemiddeld = Math.round((afstanden.reduce((a, b) => a + b, 0) / afstanden.length) * 10) / 10;
    // Zelfde soort eenvoudige, transparante drempel als berekenVeiligheidsscore
    // hierboven al gebruikt — geen nieuwe, verborgen aanname.
    const toon: ChipToon = gemiddeld <= 1 ? "gunstig" : gemiddeld <= 2.5 ? "neutraal" : "aandacht";
    // Namen komen rechtstreeks uit de items die er ook echt zijn voor dit
    // adres — bij bv. een ontbrekende apotheek noemt de toelichting die dus
    // niet mee, i.p.v. een vaste tekst met alle drie hardcoded.
    kernstats.push({
      key: "voorzieningen",
      label: "Voorzieningen",
      waarde: `${gemiddeld} km`,
      toelichting: `Gemiddelde afstand tot ${dagelijksVoorzieningen.map((i) => i.key).join(", ")}.`,
      toon,
      ringFractie: RINGFRACTIE[toon],
    });
  }

  // ---------------------------------------------------------------------
  // Insight-helper — het bestaande, al-berekende "woningwaarde-vs-
  // buurtverkopen"-inzicht hergebruiken i.p.v. zelf opnieuw drempels te
  // verzinnen (zie buildInsights() in lib/services/insights.ts). BUG die hier
  // zat: deze zocht naar key "waarde-buurt" (een naam uit het losse
  // showcase-bestand lib/pdf/voorbeeldRapport.ts), terwijl de echte generator
  // de key "woningwaarde-vs-buurtverkopen" gebruikt — waardeInsight was
  // daardoor bij elk live rapport altijd undefined, en de bijbehorende plus-/
  // aandachtspunt verscheen dus nooit. lib/services/insights.ts genereert
  // ook geen aparte "veiligheid"- of "fundering"-insights (die kernstats
  // hierboven komen rechtstreeks uit hun eigen brondata), dus die twee opzoek-
  // pogingen waren dode code en zijn verwijderd.
  const waardeInsight = insights.find((i) => i.key === "woningwaarde-vs-buurtverkopen");
  // Zelfde soort hergebruik: het al berekende "energie-vs-bouwjaar"-inzicht
  // (buildInsights() in insights.ts) stond al klaar maar werd tot nu toe
  // nergens in de samenvatting getoond.
  const energieInsight = insights.find((i) => i.key === "energie-vs-bouwjaar");

  // "Gezin" en "bereikbaarheid" zijn dezelfde voorzieningen-thema's als
  // "dagelijks" hierboven, alleen voor de twee nieuwe kandidaten verderop.
  const gezinVoorzieningen = (buurtprofiel.data?.voorzieningen.items ?? []).filter((i) => i.thema === "gezin");
  const gezinAfstanden = gezinVoorzieningen.map((i) => i.afstandKm);
  const bereikbaarheidVoorzieningen = (buurtprofiel.data?.voorzieningen.items ?? []).filter(
    (i) => i.thema === "bereikbaarheid"
  );
  const bereikbaarheidAfstanden = bereikbaarheidVoorzieningen.map((i) => i.afstandKm);

  // ---------------------------------------------------------------------
  // Pluspunten — kandidatenpool, elk gegated door een echt databveld.
  // ---------------------------------------------------------------------
  const plusKandidaten: Kandidaat[] = [];

  if (fundering.data?.niveau === "laag") {
    plusKandidaten.push({
      prioriteit: 10,
      tekst: "Lage kans op funderingsproblemen. Het bouwjaar en de bodem hier geven geen duidelijke waarschuwingssignalen.",
    });
  }
  if (misdrijvenPer1000 != null && bepaalVeiligheidsBand(berekenVeiligheidsscore(misdrijvenPer1000)) === "gunstig") {
    plusKandidaten.push({
      prioriteit: 9,
      tekst: "Veilige buurt. Hier worden minder misdrijven geregistreerd dan in andere buurten.",
    });
  }
  if (energy.data?.klasse && duidEnergielabel(energy.data.klasse)?.toon === "gunstig") {
    plusKandidaten.push({
      prioriteit: 8,
      tekst: `Energielabel ${energy.data.klasse}. Dat betekent meestal lagere energiekosten.`,
    });
  }
  if (afstanden.length > 0) {
    const gemiddeld = afstanden.reduce((a, b) => a + b, 0) / afstanden.length;
    if (gemiddeld <= 1) {
      plusKandidaten.push({
        prioriteit: 7,
        tekst: "Alles dichtbij. Huisarts, supermarkt en school zijn vlakbij.",
      });
    }
  }
  if (waardeInsight?.toon === "positief") {
    plusKandidaten.push({
      prioriteit: 6,
      tekst: "De geschatte waarde ligt hoger dan vergelijkbare woningen in de buurt.",
    });
  }
  if (nearbySales.data && nearbySales.data.aantalLaatste12Maanden >= 8 && !nearbySales.data.verruimd) {
    plusKandidaten.push({
      prioriteit: 5,
      tekst: "Er zijn genoeg recente verkopen in de buurt om de schatting goed mee te vergelijken.",
    });
  }
  if (energieInsight?.toon === "positief" && energy.data?.klasse && building.data?.bouwjaar != null) {
    plusKandidaten.push({
      prioriteit: 6.5,
      tekst: `Energielabel ${energy.data.klasse} is beter dan gebruikelijk voor een woning uit ${building.data.bouwjaar}.`,
    });
  }
  // Kavel alleen als pluspunt bij een pand met precies 1 verblijfsobject:
  // bij meerdere eenheden in hetzelfde pand (bv. een appartement) is de
  // kavel niet exclusief voor deze woning, dus zegt de grootte ervan niets
  // over déze specifieke wooneenheid. aantalVerblijfsobjecten is hetzelfde
  // BAG-veld dat ook Appartement/Meergezinswoning/Eengezinswoning bepaalt
  // (zie lib/data-sources/bag.ts), dus geen nieuwe aanname, alleen hergebruik.
  if (
    building.data?.aantalVerblijfsobjecten === 1 &&
    building.data?.oppervlakteM2 != null &&
    kavel.data?.oppervlakteM2 != null &&
    kavel.data.oppervlakteM2 >= building.data.oppervlakteM2 * 1.5
  ) {
    plusKandidaten.push({
      prioriteit: 4.5,
      tekst: `Ruim perceel: ${kavel.data.oppervlakteM2} m² kavel tegenover ${building.data.oppervlakteM2} m² bebouwd. Ruimte voor tuin of aanbouw.`,
    });
  }
  if (gezinAfstanden.length > 0) {
    const gemiddeld = gezinAfstanden.reduce((a, b) => a + b, 0) / gezinAfstanden.length;
    if (gemiddeld <= 1) {
      const namen = gezinVoorzieningen.map((i) => i.label.toLowerCase());
      const namenTekst = namen.length > 1 ? `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}` : namen[0];
      plusKandidaten.push({
        prioriteit: 4,
        tekst: `Fijn voor gezinnen: ${namenTekst} liggen dichtbij.`,
      });
    }
  }
  // Bewust GEEN "altijd-beschikbare vulling" meer hier (dataQuality
  // compleetheid, pandStatus) — dat waren geen echte pluspunten van de
  // WONING, alleen ware feiten over het rapport zelf (datadekking) of
  // triviale administratie (bijna elk bewoond pand is "in gebruik"). Beter
  // eerlijk minder dan 3 pluspunten tonen dan de lijst opvullen met iets
  // dat geen koper echt iets vertelt. Zie ReportView.tsx/ReportDocument.tsx
  // voor de "Geen bekend voor dit adres."-fallback bij een lege lijst.

  // ---------------------------------------------------------------------
  // Aandachtspunten — zelfde opzet, gespiegeld.
  // ---------------------------------------------------------------------
  const aandachtKandidaten: Kandidaat[] = [];

  if (fundering.data?.niveau && fundering.data.niveau !== "laag") {
    aandachtKandidaten.push({
      prioriteit: 10,
      tekst:
        fundering.data.niveau === "hoog"
          ? "Verhoogd funderingsrisico. Twijfel je? Laat het checken door een erkend bureau."
          : "Gemiddeld funderingsrisico. Vraag hier bij een bezichtiging naar.",
    });
  } else if (fundering.data?.niveau) {
    // Universele voorzichtigheidszin, ook bij "laag" — geldt altijd omdat
    // dit een gebiedsindicatie is, geen onderzoek van dit ene pand.
    aandachtKandidaten.push({
      prioriteit: 2,
      tekst: "Let op: deze inschatting geldt voor het hele gebied, niet alleen voor dit pand.",
    });
  }
  if (energy.data?.klasse && duidEnergielabel(energy.data.klasse)?.toon === "risico") {
    aandachtKandidaten.push({
      prioriteit: 8.5,
      tekst: `Laag energielabel (${energy.data.klasse}). Houd rekening met hogere energiekosten.`,
    });
  }
  if (waardeInsight && waardeInsight.toon !== "positief") {
    aandachtKandidaten.push({
      prioriteit: 8,
      tekst: "De geschatte waarde wijkt af van het buurtgemiddelde. Neem dit goed mee in je beslissing.",
    });
  }
  if (misdrijvenPer1000 != null && bepaalVeiligheidsBand(berekenVeiligheidsscore(misdrijvenPer1000)) !== "gunstig") {
    aandachtKandidaten.push({
      prioriteit: 6,
      tekst: "In deze buurt worden meer misdrijven geregistreerd dan gemiddeld.",
    });
  }
  if (nearbySales.data?.verruimd) {
    aandachtKandidaten.push({
      prioriteit: 5,
      tekst: "Er waren weinig vergelijkbare verkopen dichtbij, dus is er breder gezocht (verder weg en/of verder terug in de tijd).",
    });
  }
  if (energy.data && !energy.data.isolatie) {
    aandachtKandidaten.push({
      prioriteit: 3,
      tekst: "De isolatie van dak, muren en vloer is niet apart geregistreerd voor dit adres.",
    });
  }
  if (dataQuality.compleetheid !== "volledig") {
    aandachtKandidaten.push({
      prioriteit: 4,
      tekst: "Niet alle gegevens voor dit adres waren beschikbaar. Bekijk de andere onderdelen van dit rapport voor de details.",
    });
  }
  if (energieInsight?.toon === "negatief" && energy.data?.klasse && building.data?.bouwjaar != null) {
    aandachtKandidaten.push({
      prioriteit: 3.5,
      tekst: `Energielabel ${energy.data.klasse} is lager dan gebruikelijk voor een woning uit ${building.data.bouwjaar}.`,
    });
  }
  if (bereikbaarheidAfstanden.length > 0) {
    const gemiddeld = Math.round((bereikbaarheidAfstanden.reduce((a, b) => a + b, 0) / bereikbaarheidAfstanden.length) * 10) / 10;
    if (gemiddeld > 3) {
      const namen = bereikbaarheidVoorzieningen.map((i) => i.label.toLowerCase());
      const namenTekst = namen.length > 1 ? `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}` : namen[0];
      aandachtKandidaten.push({
        prioriteit: 2.5,
        tekst: `Minder centraal: ${namenTekst} liggen gemiddeld op ${String(gemiddeld).replace(".", ",")} km.`,
      });
    }
  }
  // Bewust GEEN generieke disclaimer-vulling meer hier — die stond al
  // (bijna letterlijk) in elke variant van de eindconclusie hieronder, dus
  // was hier puur dubbelop en niet adresspecifiek. Beter eerlijk minder dan
  // 3 aandachtspunten dan een niet-onderscheidende zin meetellen.

  const pluspunten = top3(plusKandidaten);
  const aandachtspunten = top3(aandachtKandidaten);

  // ---------------------------------------------------------------------
  // Titel — eenvoudige, eerlijke toon op basis van of er een "hard"
  // risicosignaal is (fundering hoog, energie E-G, veiligheid risico) — geen
  // gok, gewoon tellen wat er al berekend is.
  // ---------------------------------------------------------------------
  const harderRisicoAanwezig = kernstats.some((k) => k.toon === "risico");
  const heeftGunstig = kernstats.some((k) => k.toon === "gunstig");
  const titel = harderRisicoAanwezig
    ? "Een paar dingen om extra te checken"
    : heeftGunstig
      ? "Over het algemeen een goed beeld"
      : "Overzicht van deze woning";

  // ---------------------------------------------------------------------
  // Totaalbeeld — kandidatenpool, zelfde patroon als pluspunten/aandacht-
  // spunten hierboven: elke zin is gegated door een echt databronveld, en we
  // kiezen de 4 belangrijkste die daadwerkelijk beschikbaar zijn. Dat houdt
  // de alinea kort én zo compleet mogelijk voor ELK adres, ook als voor een
  // ander adres bv. het energielabel ontbreekt — in plaats van de vorige
  // vaste lijst van maximaal 3 velden (waarde/buurt/fundering), die bij veel
  // adressen te mager was en het energielabel, de veiligheidsscore en de
  // vergelijking met het buurtgemiddelde helemaal negeerde. De generieke
  // buurtprofiel.samenvatting-zin ("volledige duiding vind je in het
  // rapport") is bewust NIET meer opgenomen: die is marketing-achtige
  // vulling, geen feit — de concretere veiligheid/voorzieningen-kandidaten
  // hieronder vervangen 'm met echte cijfers.
  // ---------------------------------------------------------------------
  const totaalbeeldKandidaten: Kandidaat[] = [];

  if (market.data) {
    const waardeTekst = `De geschatte waarde is ${formatEuro(market.data.geschatteWaarde)}`;
    totaalbeeldKandidaten.push({
      prioriteit: 10,
      tekst: waardeInsight?.tekst ? `${waardeTekst}, ${waardeInsight.tekst}.` : `${waardeTekst}.`,
    });
  }
  if (building.data?.bouwjaar != null && building.data?.oppervlakteM2 != null) {
    const type = building.data.woningtype ? building.data.woningtype.toLowerCase() : "woning";
    totaalbeeldKandidaten.push({
      prioriteit: 9,
      tekst: `Dit is een ${type} uit ${building.data.bouwjaar} van ${building.data.oppervlakteM2} m².`,
    });
  }
  if (fundering.data?.label) {
    totaalbeeldKandidaten.push({ prioriteit: 8, tekst: `Funderingsrisico: ${fundering.data.label.toLowerCase()}.` });
  }
  if (energy.data?.klasse) {
    const duiding = duidEnergielabel(energy.data.klasse);
    if (duiding) {
      totaalbeeldKandidaten.push({
        prioriteit: 7,
        tekst: `Het energielabel is ${energy.data.klasse}, dat zit in de ${duiding.kwartTekst}.`,
      });
    }
  }
  if (misdrijvenPer1000 != null) {
    const score = berekenVeiligheidsscore(misdrijvenPer1000);
    const band = bepaalVeiligheidsBand(score);
    totaalbeeldKandidaten.push({
      prioriteit: 6,
      tekst: `De buurt scoort ${VEILIGHEID_BAND[band].tekst.toLowerCase()} op veiligheid (${score}/10).`,
    });
  }
  if (afstanden.length > 0) {
    const gemiddeld = Math.round((afstanden.reduce((a, b) => a + b, 0) / afstanden.length) * 10) / 10;
    // Namen i.p.v. hardcoded "Huisarts, supermarkt en school" — schaalt
    // automatisch mee als een van de drie voor dit adres ontbreekt.
    const namen = dagelijksVoorzieningen.map((i) => i.label.toLowerCase());
    const namenTekst = namen.length > 1 ? `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}` : namen[0];
    const werkwoord = namen.length > 1 ? "liggen" : "ligt";
    totaalbeeldKandidaten.push({
      prioriteit: 5,
      tekst: `${namenTekst.charAt(0).toUpperCase()}${namenTekst.slice(1)} ${werkwoord} gemiddeld op ${String(gemiddeld).replace(".", ",")} km.`,
    });
  }
  if (nearbySales.data && nearbySales.data.aantalLaatste12Maanden > 0) {
    totaalbeeldKandidaten.push({
      prioriteit: 4,
      tekst: `Er zijn de afgelopen ${nearbySales.data.zoekvensterMaanden} maanden ${nearbySales.data.aantalLaatste12Maanden} vergelijkbare woningen verkocht in de buurt.`,
    });
  }

  const totaalbeeldZinnen = topN(totaalbeeldKandidaten, 4);
  const totaalbeeld =
    totaalbeeldZinnen.length > 0 ? totaalbeeldZinnen.join(" ") : "Voor dit adres is nog niet genoeg data bekend voor een totaalbeeld.";

  // ---------------------------------------------------------------------
  // Eindconclusie — korte, afsluitende zin, Mavo-niveau, geen jargon.
  //
  // Drie varianten, elk gekoppeld aan wat er al berekend is (geen nieuwe
  // aannames t.o.v. harderRisicoAanwezig/kernstats hierboven):
  //   1. Hard risicosignaal aanwezig (fundering hoog, energie E-G, of
  //      veiligheid risico) — wint altijd, ongeacht hoeveel data er is.
  //   2. Geen hard risico, EN minstens 2 kernstats bekend — dit is verreweg
  //      de meest voorkomende situatie (bijna elk adres heeft minstens
  //      fundering + energie + veiligheid + voorzieningen deels bekend), dus
  //      deze tekst hoeft niet per se "gunstig" te zijn, alleen "geen harde
  //      risico's" — dat is al een eerlijke, positieve constatering op zich.
  //   3. Minder dan 2 kernstats bekend (dus ook geen risico te herkennen,
  //      want daarvoor is minstens 1 kernstat nodig) — dit is de zeldzame
  //      "te weinig data"-situatie, bewust apart gehouden van variant 2 zodat
  //      variant 2 niet ten onrechte data suggereert die er niet is.
  //
  // Elke variant sluit bewust af met een korte, positieve/aanmoedigende zin
  // — generiek en niet gekoppeld aan een niet-geverifieerd feit over dit
  // specifieke pand, dus geen inbreuk op "moet feitelijk blijven": het is een
  // aanmoediging voor het proces, geen claim over de woning. Bewust ook niet
  // koper-specifiek (geen "bod", geen "bezichtiging") — dit rapport is voor
  // iedereen die iets wil weten over een adres, niet alleen een kandidaat-koper.
  let eindconclusie: string;
  if (harderRisicoAanwezig) {
    eindconclusie =
      "Deze woning heeft duidelijke pluspunten, maar er zijn ook een paar dingen die om extra aandacht vragen. Neem de aandachtspunten hierboven serieus: vraag ernaar, en bel bij twijfel gerust een specialist, bijvoorbeeld voor de fundering. Dit rapport is een eerlijk startpunt, geen vervanging voor eigen onderzoek of professioneel advies. Met de juiste vragen in je achterzak sta je straks gewoon een stuk sterker in je schoenen.";
  } else if (kernstats.length >= 2) {
    eindconclusie =
      "Deze woning scoort op de meeste onderdelen goed, en we zien geen grote rode vlaggen. Toch niet blind instappen: gebruik dit rapport als stevig startpunt, en vul 'm aan met een kijkje ter plekke, een goed gesprek en eventueel een bouwkundige keuring. Kortom: een kanshebber om verder te verkennen. Succes!";
  } else {
    eindconclusie =
      "Voor dit adres hebben we nog niet genoeg data voor een compleet beeld. Gebruik wat we wel gevonden hebben als startpunt, en vul het zelf aan: kijk goed rond, stel de juiste vragen, en schakel waar nodig een expert in. Kom je er niet helemaal uit? We kijken graag met je mee. Hoe meer je uitzoekt, hoe zekerder je straks staat.";
  }

  return {
    titel,
    totaalbeeld,
    eindconclusie,
    pluspunten,
    aandachtspunten,
    kernstats: kernstats.slice(0, 4),
    gebruiksblok: GEBRUIKSBLOK,
  };
}

function formatEuro(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}
