import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, ruimVerouderdeMatchenOp, kapMatchenOpMax, maakMatch } from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { voldoetAanHardeEisen } from "@/lib/services/matchScore";
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
// MATCHINGMODEL V3 (zie het Cowork-gesprek hierover, "ik twijfel over ons
// filtersysteem met punten"): budget/locatie/kenmerken komen AFGELEID uit de
// volledige koperVoorkeuren-vragenlijst (zie haalFundaMatches in
// fundaFeed.ts). Elke gevonden kandidaat wordt eerst getoetst aan de 7 harde
// eisen van fase 1 (voldoetAanHardeEisen, matchScore.ts) -- alleen wie daaraan
// voldoet wordt daadwerkelijk een B2bWoningMatch. Dat is nu een synchrone,
// goedkope check (geen scoreberekening meer nodig om te BESLISSEN of iets
// bewaard wordt): de fase-2-score (voor de onderlinge rangschikking) wordt
// pas later berekend, alleen nog als kapMatchenOpMax() moet kiezen wélke
// matches wegvallen bij een overschot, of bij het tonen in MatchesKaart.tsx --
// dus geen dure CBS-voorzieningenopzoeking meer per kandidaat tijdens het
// zoeken zelf.
//
// KANDIDATENPOOL: puur een grens op hoeveel ruwe Funda-resultaten gescand
// worden (zie fundaFeed.ts voor de paginering) -- losgekoppeld van
// MAX_ZICHTBARE_MATCHEN (hoeveel er uiteindelijk BEWAARD blijven, zie
// kapMatchenOpMax): een grotere kandidatenpool laat het model uit meer
// kiezen, i.p.v. zomaar de eerste woningen die Funda toevallig als eerste
// toont. Nog steeds geen garantie dat de VOLLEDIGE markt gezien wordt (dat
// zou een detailpagina-proxyverzoek per woning kosten) -- 100 is een bewust
// gekozen, ruimere maar nog beheersbare tussenstap. Kost meer Bright Data-
// credits per klik -- bewuste keuze, Sjoerd gaf eerder aan dat volledigheid
// zwaarder weegt dan credit-besparing.
const KANDIDATENPOOL = 100;

// Fetches via de Bright Data-proxy (zie lib/config/fundaFeed.ts) duren iets
// langer dan een kale directe fetch -- haalFundaMatches() stopt de paginering
// zelf zodra de tijd/pagina's op zijn en geeft dan gewoon terug wat er tot
// dan toe gevonden is, dus een eventueel niet-volledig doorlopen scan faalt
// niet hard.
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

  // Fase 1 -- synchroon, geen CBS-opzoeking nodig om te beslissen of iets
  // bewaard wordt (zie de toelichting bovenaan dit bestand).
  let opgeslagen = 0;
  for (const item of nieuweItems) {
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
    if (!voldoetAanHardeEisen(tijdelijkeMatch, koperVoorkeuren).voldoet) continue;
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
    afgewezenOpHardeEis: nieuweItems.length - opgeslagen,
    zoekFout,
  });
}
