import { NextRequest, NextResponse } from "next/server";
import { getIngelogdeEmailUitRequest } from "@/lib/services/consumentAuth";
import { getConsumentVoorkeuren, consumentKlantId } from "@/lib/services/consumentZoekopdracht";
import { ruimVerouderdeMatchenOp, kapMatchenOpMax, maakMatch } from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { voldoetAanHardeEisen } from "@/lib/services/matchScore";
import { MAX_ZICHTBARE_MATCHEN } from "@/types/b2b";
import type { B2bWoningMatch } from "@/types/b2b";

// -----------------------------------------------------------------------------
// B2C-tegenhanger van app/api/zakelijk/klanten/[id]/matches-verversen/
// route.ts -- vrijwel woordelijk dezelfde zoeklogica (KANDIDATENPOOL, fase-1
// harde-eisen-toetsing via voldoetAanHardeEisen), alleen hier voor de
// ingelogde consument i.p.v. een makelaar-klantdossier. `orgId: "consument"`
// is puur een vaste, herkenbare waarde voor het (bij dit gebruik ongebruikte)
// B2bWoningMatch.orgId-veld -- er is geen echte B2B-organisatie bij
// betrokken.
// -----------------------------------------------------------------------------

const KANDIDATENPOOL = 100;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const email = await getIngelogdeEmailUitRequest(req);
  if (!email) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const koperVoorkeuren = await getConsumentVoorkeuren(email);
  if (!koperVoorkeuren) {
    return NextResponse.json({ error: "Vul eerst de voorkeurenlijst in." }, { status: 400 });
  }

  const klantId = consumentKlantId(email);
  const bestaande = await ruimVerouderdeMatchenOp(klantId, koperVoorkeuren);
  const bekendeUrls = new Set(bestaande.map((m) => m.url));

  const { items: feedItems, fout: zoekFout } = await haalFundaMatches(koperVoorkeuren, KANDIDATENPOOL, bekendeUrls);
  const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url)).slice(0, KANDIDATENPOOL);

  let opgeslagen = 0;
  for (const item of nieuweItems) {
    const tijdelijkeMatch: B2bWoningMatch = {
      id: "",
      klantId,
      orgId: "consument",
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
      klantId,
      orgId: "consument",
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
  await kapMatchenOpMax(klantId, MAX_ZICHTBARE_MATCHEN);

  return NextResponse.json({
    ok: true,
    nieuweMatches: opgeslagen,
    totaalGevonden: feedItems.length,
    afgewezenOpHardeEis: nieuweItems.length - opgeslagen,
    zoekFout,
  });
}
