import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, ruimVerouderdeMatchenOp, kapMatchenOpMax, maakMatch } from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { MAX_ZICHTBARE_MATCHEN } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Directe matchcontrole (#3-aanvulling): meteen na het opslaan van een
// zoekopdracht met locatie wil de makelaar meteen actueel te koop staande
// woningen zien die aan de criteria voldoen, in plaats van te moeten wachten
// op de eerstvolgende dagelijkse cron (/api/cron/matches-controleren). Zelfde
// opslaglogica als die cron (dedupe op URL, via maakMatch), alleen hier
// synchroon voor één dossier.
//
// BUGFIX: eerst werden matches alleen ooit toegevoegd -- een verlaagd budget
// liet oude, te dure matches gewoon staan, en er was geen bovengrens op het
// totaal. ruimVerouderdeMatchenOp() verwijdert eerst wat niet meer bij het
// huidige budget past, kapMatchenOpMax() knipt na het opslaan het totaal
// terug tot MAX_ZICHTBARE_MATCHEN -- "geen passende woningen? dan zijn het er
// ook gewoon minder", zie het gesprek hierover.
//
// BUGFIX 1 (klacht "Kralingen Crooswijk geeft maar 2 matches terwijl er
// zonder filter veel meer zijn"): stond op 5 -- omdat Funda's
// zoekresultatenpagina doorgaans al ~15 links per pagina teruggeeft, werd de
// paginering in haalFundaMatches() hierdoor in de praktijk NOOIT gebruikt:
// pagina 1 alleen leverde al genoeg links op om de lage limiet te halen.
//
// BUGFIX 2 (vervolgklacht, na het gelijktrekken met MAX_ZICHTBARE_MATCHEN:
// "Funda vindt 196 woningen, wij maar 25"): dit getal deed dubbel dienst als
// zowel "hoeveel ruwe links scannen" ALS "hoeveel tonen" -- daardoor keek het
// systeem letterlijk nooit verder dan de eerste ~30 Funda-resultaten,
// ongeacht hoe groot de wijk werkelijk is. KANDIDATENPOOL is nu bewust
// losgekoppeld van MAX_ZICHTBARE_MATCHEN: veel meer ruwe kandidaten scannen
// (en detailpagina's ophalen om te scoren), maar nog steeds maar
// MAX_ZICHTBARE_MATCHEN daarvan daadwerkelijk BEWAREN -- kapMatchenOpMax()
// kiest daaruit al op score (lib/services/matchScore.ts), dat is precies het
// hele punt van het matchingmodel: een grotere kandidatenpool om de beste 30
// uit te kunnen kiezen, i.p.v. zomaar de eerste 30 die Funda toevallig als
// eerste toont.
// Nog steeds geen garantie dat de VOLLEDIGE markt gezien wordt (196 zou zelf
// 196 detailpagina-proxyverzoeken kosten in één refresh, te duur/traag voor
// één klik) -- 100 is een bewust gekozen, ruimere maar nog beheersbare
// tussenstap. Kost aanzienlijk meer Bright Data-credits per klik dan
// voorheen -- bewuste keuze, Sjoerd gaf aan dat volledigheid nu zwaarder
// weegt dan credit-besparing.
const KANDIDATENPOOL = 100;

// Fetches via de Bright Data-proxy (zie lib/config/fundaFeed.ts) duren iets
// langer dan een kale directe fetch. Op 60 gehouden (bewezen haalbaar, zie
// eerdere deployment) ondanks de grotere kandidatenpool -- haalFundaMatches()
// stopt de paginering zelf zodra de tijd/pagina's op zijn en geeft dan
// gewoon terug wat er tot dan toe gevonden is (zie fundaFeed.ts), dus een
// eventueel niet-volledig doorlopen scan faalt niet hard, hij levert alleen
// iets minder op dan de volle 100. De dagelijkse cron (meerdere dossiers per
// aanroep) blijft bewust op een kleinere pool en 30s staan, zie de cron-route.
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const locatie = dossier.zoekopdracht?.locatie;
  if (!locatie) {
    return NextResponse.json({ error: "Kies eerst een locatie in de zoekopdracht." }, { status: 400 });
  }

  const budgetMin = dossier.zoekopdracht?.budgetMin ?? null;
  const budgetMax = dossier.zoekopdracht?.budgetMax ?? null;
  // BUGFIX (diagnose-sessie "wat hebben we maandelijks nodig"): ruimVerouderdeMatchenOp
  // moet nu vóór haalFundaMatches klaar zijn (niet meer parallel) -- de al
  // bekende matchURL's worden meegegeven zodat haalFundaMatches geen
  // proxy-credits meer verspilt aan detailpagina's van woningen die al
  // bekend zijn.
  // BUGFIX (diagnose-sessie "het klopt gewoon allemaal niet"): kenmerken
  // erbij, zodat ruimVerouderdeMatchenOp ook BESTAANDE matches die niet meer
  // aan woningtype/slaapkamers/m²/energielabel voldoen opruimt -- niet
  // alleen budget/locatie zoals voorheen (zie b2bStore.ts).
  // Matching-model: koperVoorkeuren erbij, zowel voor het opruimen van
  // bestaande matches (dezelfde budget-/kenmerkenmarge, zie b2bStore.ts) als
  // voor het live doorzoeken van Funda (zie haalFundaMatches).
  const koperVoorkeuren = dossier.zoekopdracht?.koperVoorkeuren ?? null;
  const bestaande = await ruimVerouderdeMatchenOp(id, budgetMin, budgetMax, locatie.label, dossier.zoekopdracht?.kenmerken, koperVoorkeuren);
  const bekendeUrls = new Set(bestaande.map((m) => m.url));
  // BUGFIX (klacht "geeft nog steeds 0 matches zonder extra filter" --
  // bleek een stilzwijgend mislukte zoekaanvraag, ononderscheidbaar van een
  // oprechte 0-resultaten-uitkomst, zie fundaFeed.ts): `fout` gaat mee in de
  // response zodat de makelaar een duidelijk "zoeken niet gelukt, probeer
  // opnieuw"-signaal krijgt i.p.v. dat het lijkt alsof er simpelweg geen
  // passende woningen bestaan.
  const { items: feedItems, fout: zoekFout } = await haalFundaMatches(
    locatie,
    budgetMin,
    budgetMax,
    dossier.zoekopdracht?.kenmerken,
    KANDIDATENPOOL,
    bekendeUrls,
    koperVoorkeuren
  );
  const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url)).slice(0, KANDIDATENPOOL);

  for (const item of nieuweItems) {
    await maakMatch({
      klantId: dossier.id,
      orgId: dossier.orgId,
      bron: "funda",
      titel: item.titel,
      url: item.url,
      prijs: item.prijs,
      prijsLabel: item.prijsLabel,
      fotoUrl: item.fotoUrl,
      locatieLabel: locatie.label,
      verificatie: item.verificatie ?? null,
    });
  }
  await kapMatchenOpMax(id, MAX_ZICHTBARE_MATCHEN);

  return NextResponse.json({ ok: true, nieuweMatches: nieuweItems.length, totaalGevonden: feedItems.length, zoekFout });
}
