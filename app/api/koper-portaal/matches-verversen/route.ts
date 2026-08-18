import { NextRequest, NextResponse } from "next/server";
import { getKoperDossierIdUitRequest } from "@/lib/services/koperPortaalAuth";
import { getKlantdossier, ruimVerouderdeMatchenOp, kapMatchenOpMax, maakMatch } from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { voldoetAanHardeEisen } from "@/lib/services/matchScore";
import { MAX_ZICHTBARE_MATCHEN } from "@/types/b2b";
import type { B2bWoningMatch } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Koperportaal-tegenhanger van app/api/zakelijk/klanten/[id]/matches-
// verversen/route.ts -- vrijwel woordelijk dezelfde zoeklogica, alleen hier
// voor de ingelogde koper i.p.v. de makelaar. Slaat op onder het ECHTE
// dossierId/orgId van de makelaar (zie de toelichting in
// ../zoekopdracht/route.ts) -- geen apart "koper"-orgId zoals bij de
// consumentenkant.
// -----------------------------------------------------------------------------

const KANDIDATENPOOL = 100;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const dossierId = await getKoperDossierIdUitRequest(req);
  if (!dossierId) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const dossier = await getKlantdossier(dossierId);
  if (!dossier) return NextResponse.json({ error: "Onbekend dossier." }, { status: 404 });

  const koperVoorkeuren = dossier.zoekopdracht?.koperVoorkeuren ?? null;
  if (!koperVoorkeuren) {
    return NextResponse.json({ error: "Vul eerst de voorkeurenlijst in." }, { status: 400 });
  }

  const bestaande = await ruimVerouderdeMatchenOp(dossierId, koperVoorkeuren);
  const bekendeUrls = new Set(bestaande.map((m) => m.url));

  const { items: feedItems, fout: zoekFout } = await haalFundaMatches(koperVoorkeuren, KANDIDATENPOOL, bekendeUrls);
  const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url)).slice(0, KANDIDATENPOOL);

  let opgeslagen = 0;
  for (const item of nieuweItems) {
    const tijdelijkeMatch: B2bWoningMatch = {
      id: "",
      klantId: dossierId,
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
      klantId: dossierId,
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
  await kapMatchenOpMax(dossierId, MAX_ZICHTBARE_MATCHEN);

  return NextResponse.json({
    ok: true,
    nieuweMatches: opgeslagen,
    totaalGevonden: feedItems.length,
    afgewezenOpHardeEis: nieuweItems.length - opgeslagen,
    zoekFout,
  });
}
