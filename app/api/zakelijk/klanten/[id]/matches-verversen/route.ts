import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, ruimVerouderdeMatchenOp, kapMatchenOpMax, maakMatch } from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { MAX_ZICHTBARE_MATCHEN } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Directe matchcontrole (#3-aanvulling): meteen na het opslaan van een
// zoekopdracht met locatie wil de makelaar meteen 3-5 actueel te koop staande
// woningen zien die aan de criteria voldoen, in plaats van te moeten wachten
// op de eerstvolgende dagelijkse cron (/api/cron/matches-controleren). Zelfde
// opslaglogica als die cron (dedupe op URL, via maakMatch), alleen hier
// synchroon voor één dossier en met een kleine limiet (MAX_DIRECT) zodat de
// pagina niet te lang op een eerste resultaat hoeft te wachten.
//
// BUGFIX: eerst werden matches alleen ooit toegevoegd -- een verlaagd budget
// liet oude, te dure matches gewoon staan, en er was geen bovengrens op het
// totaal. ruimVerouderdeMatchenOp() verwijdert eerst wat niet meer bij het
// huidige budget past, kapMatchenOpMax() knipt na het opslaan het totaal
// terug tot MAX_ZICHTBARE_MATCHEN (10) -- "geen passende woningen? dan zijn
// het er ook gewoon minder", zie het gesprek hierover.
// -----------------------------------------------------------------------------

const MAX_DIRECT = 5;

// Fetches via de Scrape.do-proxy (zie lib/config/fundaFeed.ts) duren iets
// langer dan een kale directe fetch -- de Vercel-standaardlimiet van 10s is
// daar krap voor, vandaar expliciet opgehoogd.
export const maxDuration = 30;

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
  const [bestaande, feedItems] = await Promise.all([
    ruimVerouderdeMatchenOp(id, budgetMin, budgetMax, locatie.label),
    haalFundaMatches(locatie, budgetMin, budgetMax, dossier.zoekopdracht?.kenmerken, MAX_DIRECT),
  ]);
  const bekendeUrls = new Set(bestaande.map((m) => m.url));
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
    });
  }
  await kapMatchenOpMax(id, MAX_ZICHTBARE_MATCHEN);

  return NextResponse.json({ ok: true, nieuweMatches: nieuweItems.length, totaalGevonden: feedItems.length });
}
