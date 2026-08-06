import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, listMatchenVoorKlant, maakMatch } from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";

// -----------------------------------------------------------------------------
// Directe matchcontrole (#3-aanvulling): meteen na het opslaan van een
// zoekopdracht met locatie wil de makelaar meteen 3-5 actueel te koop staande
// woningen zien die aan de criteria voldoen, in plaats van te moeten wachten
// op de eerstvolgende dagelijkse cron (/api/cron/matches-controleren). Zelfde
// opslaglogica als die cron (dedupe op URL, via maakMatch), alleen hier
// synchroon voor één dossier en met een kleine limiet (MAX_DIRECT) zodat de
// pagina niet te lang op een eerste resultaat hoeft te wachten.
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

  const [bestaande, feedItems] = await Promise.all([
    listMatchenVoorKlant(id),
    haalFundaMatches(locatie, dossier.zoekopdracht?.budgetMax ?? null, dossier.zoekopdracht?.kenmerken, MAX_DIRECT),
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
      prijsLabel: item.prijsLabel,
      fotoUrl: item.fotoUrl,
    });
  }

  return NextResponse.json({ ok: true, nieuweMatches: nieuweItems.length, totaalGevonden: feedItems.length });
}
