import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, ruimVerouderdeMatchenOp, kapMatchenOpMax, maakMatch } from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { berekenMatchScore } from "@/lib/services/matchScore";
import { MAX_ZICHTBARE_MATCHEN } from "@/types/b2b";
import type { B2bWoningMatch } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Directe matchcontrole (#3-aanvulling): meteen na het opslaan van de
// koper-voorkeurenlijst wil de makelaar meteen actueel te koop staande
// woningen zien die aan de criteria voldoen, in plaats van te moeten wachten
// op de eerstvolgende dagelijkse cron (/api/cron/matches-controleren). Zelfde
// opslaglogica als die cron (dedupe op URL, via maakMatch), alleen hier
// synchroon voor één dossier.
//
// MATCHINGMODEL V2 (zie het Cowork-gesprek hierover, "matchingsproces onder
// de loep"): budget/locatie/kenmerken komen niet meer los van de
// zoekopdracht, maar worden AFGELEID uit de volledige koperVoorkeuren-
// vragenlijst (zie haalFundaMatches in fundaFeed.ts) -- dit endpoint stuurt
// nu dus alleen nog `koperVoorkeuren` door, niets anders. Elke gevonden
// kandidaat wordt meteen gescoord (berekenMatchScore, hetzelfde 100-
// puntenmodel) en alleen bewaard als hij >= MIN_MATCH_SCORE (60) haalt --
// "Score < 60: niet tonen als match" is dus al hier het eerste filter, niet
// pas achteraf bij het tonen.
//
// KANDIDATENPOOL: puur een grens op hoeveel ruwe Funda-resultaten gescand
// worden (zie fundaFeed.ts voor de paginering) -- losgekoppeld van
// MAX_ZICHTBARE_MATCHEN (hoeveel er uiteindelijk BEWAARD blijven, zie
// kapMatchenOpMax): een grotere kandidatenpool laat het scoremodel uit meer
// kiezen, i.p.v. zomaar de eerste woningen die Funda toevallig als eerste
// toont. Nog steeds geen garantie dat de VOLLEDIGE markt gezien wordt (dat
// zou een detailpagina-proxyverzoek per woning kosten) -- 100 is een bewust
// gekozen, ruimere maar nog beheersbare tussenstap. Kost meer Bright Data-
// credits per klik -- bewuste keuze, Sjoerd gaf eerder aan dat volledigheid
// zwaarder weegt dan credit-besparing.
const KANDIDATENPOOL = 100;

// Fetches via de Bright Data-proxy (zie lib/config/fundaFeed.ts) duren iets
// langer dan een kale directe fetch, en elke kandidaat die de 60-puntendrempel
// haalt kost er bovendien nog een (gratis, maar niet-instante) CBS-
// voorzieningenopzoeking bovenop (zie voorzieningenMatch.ts) als de koper
// voorzieningenwensen heeft opgegeven. Op 60 gehouden (bewezen haalbaar bij
// de oude, kleinere scope) -- haalFundaMatches() stopt de paginering zelf
// zodra de tijd/pagina's op zijn en geeft dan gewoon terug wat er tot dan toe
// gevonden is, dus een eventueel niet-volledig doorlopen scan faalt niet
// hard.
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const koperVoorkeuren = dossier.zoekopdracht?.koperVoorkeuren ?? null;
  if (!koperVoorkeuren) {
    return NextResponse.json({ error: "Vul eerst de voorkeurenlijst in." }, { status: 400 });
  }

  // BUGFIX (diagnose-sessie "wat hebben we maandelijks nodig"): ruimVerouderdeMatchenOp
  // moet vóór haalFundaMatches klaar zijn (niet parallel) -- de al bekende
  // matchURL's worden meegegeven zodat haalFundaMatches geen proxy-credits
  // verspilt aan detailpagina's van woningen die al bekend zijn.
  const bestaande = await ruimVerouderdeMatchenOp(id, koperVoorkeuren);
  const bekendeUrls = new Set(bestaande.map((m) => m.url));

  // BUGFIX (klacht "geeft nog steeds 0 matches zonder extra filter" --
  // bleek een stilzwijgend mislukte zoekaanvraag, ononderscheidbaar van een
  // oprechte 0-resultaten-uitkomst, zie fundaFeed.ts): `fout` gaat mee in de
  // response zodat de makelaar een duidelijk "zoeken niet gelukt, probeer
  // opnieuw"-signaal krijgt i.p.v. dat het lijkt alsof er simpelweg geen
  // passende woningen bestaan.
  const { items: feedItems, fout: zoekFout } = await haalFundaMatches(koperVoorkeuren, KANDIDATENPOOL, bekendeUrls);
  const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url)).slice(0, KANDIDATENPOOL);

  // Scoren VÓÓR opslaan: alleen kandidaten die de 60-puntendrempel halen
  // worden daadwerkelijk een B2bWoningMatch (zie MIN_MATCH_SCORE in
  // types/b2b.ts, "Score < 60: niet tonen als match"). Parallel (Promise.all)
  // i.p.v. serieel -- elke score kan een extra, gratis CBS-voorzieningen-
  // opzoeking triggeren (zie matchScore.ts), serieel zou dat bij 100
  // kandidaten veel te lang duren binnen maxDuration.
  const gescoord = await Promise.all(
    nieuweItems.map(async (item) => {
      const tijdelijkeMatch: B2bWoningMatch = {
        id: "",
        klantId: dossier.id,
        orgId: dossier.orgId,
        bron: "funda",
        titel: item.titel,
        url: item.url,
        prijs: item.prijs,
        prijsLabel: item.prijsLabel,
        fotoUrl: item.fotoUrl,
        verificatie: item.verificatie ?? null,
        gevondenOp: new Date().toISOString(),
      };
      const score = await berekenMatchScore(tijdelijkeMatch, koperVoorkeuren);
      return { item, score };
    })
  );

  let opgeslagen = 0;
  for (const { item, score } of gescoord) {
    if (!score.voldoetAanMinimum) continue;
    await maakMatch({
      klantId: dossier.id,
      orgId: dossier.orgId,
      bron: "funda",
      titel: item.titel,
      url: item.url,
      prijs: item.prijs,
      prijsLabel: item.prijsLabel,
      fotoUrl: item.fotoUrl,
      verificatie: item.verificatie ?? null,
    });
    opgeslagen++;
  }
  await kapMatchenOpMax(id, MAX_ZICHTBARE_MATCHEN);

  return NextResponse.json({
    ok: true,
    nieuweMatches: opgeslagen,
    totaalGevonden: feedItems.length,
    afgewezenOpScore: nieuweItems.length - opgeslagen,
    zoekFout,
  });
}
