import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, listMatchenVoorKlant } from "@/lib/services/b2bStore";
import { berekenMatchScore } from "@/lib/services/matchScore";

// -----------------------------------------------------------------------------
// BUGFIX (Sjoerd: "de CBS databron geeft bij voorzieningen aan bij allemaal
// onbekend"): berekenMatchScore() (matchScore.ts) triggert een CBS OData-
// opzoeking (haalVoorzieningenVoorAdres -> voorzieningenMatch.ts ->
// buurtprofiel.ts, tabel 85560NED) en een PDOK-adresresolutie. Die score werd
// tot nu toe berekend IN DE BROWSER, vanuit een useEffect in MatchesKaart.tsx
// -- live geverifieerd (cross-origin fetch-test vanuit een paginacontext):
// PDOK zet `Access-Control-Allow-Origin: *` (werkt dus prima client-side),
// maar opendata.cbs.nl zet HELEMAAL GEEN CORS-headers. Een browser-fetch
// daarnaartoe faalt daardoor altijd met "TypeError: Failed to fetch", wat
// buurtprofiel.ts stilzwijgend opvangt (`.catch(() => [])`) -- het resultaat
// is dat de voorzieningenscore voor IEDEREEN, ALTIJD, op "onbekend" bleef
// staan. Geen regressie van een specifieke wijziging, maar een fundamentele
// architectuurfout: externe dataopzoekingen als deze horen server-side te
// gebeuren (server-naar-server heeft geen CORS-beperking).
//
// Deze route verplaatst de scoreberekening daarom hierheen. MatchesKaart.tsx
// roept 'm nu aan via fetch() i.p.v. berekenMatchScore() rechtstreeks te
// importeren en client-side uit te voeren. Zelfde autorisatiepatroon als
// matches-verversen/route.ts (ingelogde sessie + orgId-check).
//
// Bewust een POST (niet GET): dit doet externe netwerkaanroepen per match
// (CBS/PDOK) en is dus geen cachebare, idempotente "lees"-operatie in de
// strikte zin -- consistent met matches-verversen hiernaast.
export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const koperVoorkeuren = dossier.zoekopdracht?.koperVoorkeuren ?? null;
  const matches = await listMatchenVoorKlant(id);
  const gescoord = await Promise.all(
    matches.map(async (match) => ({ match, score: await berekenMatchScore(match, koperVoorkeuren) }))
  );
  gescoord.sort((a, b) => b.score.totaal - a.score.totaal);

  return NextResponse.json({ ok: true, gescoord });
}
