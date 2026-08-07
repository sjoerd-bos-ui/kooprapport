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
// BUGFIX (klacht "Kralingen Crooswijk geeft maar 2 matches terwijl er zonder
// filter veel meer zijn"): MAX_DIRECT stond op 5 -- omdat Funda's
// zoekresultatenpagina doorgaans al ~15 links per pagina teruggeeft, werd de
// paginering in haalFundaMatches() (MAX_PAGINAS=3, zie fundaFeed.ts) hierdoor
// in de praktijk NOOIT gebruikt: pagina 1 alleen leverde al genoeg links op
// om de lage limiet van 5 te halen, dus pagina 2/3 werden letterlijk nooit
// opgevraagd. MAX_DIRECT gelijkgetrokken met MAX_ZICHTBARE_MATCHEN zodat een
// handmatige "Ververs" ook echt de volledige kandidatenpool doorzoekt, net
// als de dagelijkse cron al deed. Kost meer Bright Data-credits per klik
// (tot MAX_ZICHTBARE_MATCHEN detailpagina's i.p.v. 5) -- bewuste keuze,
// volledigheid weegt hier zwaarder dan credit-besparing.
const MAX_DIRECT = MAX_ZICHTBARE_MATCHEN;

// Fetches via de Bright Data-proxy (zie lib/config/fundaFeed.ts) duren iets
// langer dan een kale directe fetch. Opgehoogd van 30 naar 60: met
// MAX_DIRECT nu op MAX_ZICHTBARE_MATCHEN kan de paginering (tot 3
// zoekpagina's, zie fundaFeed.ts) daadwerkelijk in werking treden -- dat kost
// meer tijd dan de vorige, altijd-1-pagina situatie. Dit is een bewust
// door de makelaar geïnitieerde, zichtbare actie (spinner staat al aan), dus
// een paar seconden langer wachten is acceptabel; de dagelijkse cron
// (meerdere dossiers per aanroep) blijft bewust op 30 staan.
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
    MAX_DIRECT,
    bekendeUrls,
    koperVoorkeuren
  );
  const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url)).slice(0, MAX_DIRECT);

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
