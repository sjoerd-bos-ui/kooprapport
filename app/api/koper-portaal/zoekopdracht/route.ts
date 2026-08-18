import { NextRequest, NextResponse } from "next/server";
import { getKoperDossierIdUitRequest } from "@/lib/services/koperPortaalAuth";
import { getKlantdossier, zetKoperVoorkeuren, listMatchenVoorKlant } from "@/lib/services/b2bStore";
import { valideerKoperVoorkeuren } from "@/lib/services/koperVoorkeurenValidatie";

// -----------------------------------------------------------------------------
// Koperportaal-tegenhanger van app/api/zakelijk/klanten/[id]/route.ts (alleen
// het zoekopdracht-deel) -- geen orgId-check nodig zoals bij de makelaar-
// route: de koperportaal-sessie (koperPortaalAuth.ts) wijst zelf al naar
// precies één dossierId, dat IS hier het ownership-bewijs. Anders dan bij de
// consumenten-tegenhanger (consumentZoekopdracht.ts, een namespaced
// "consument:{email}"-sleutel) is dit gewoon het ECHTE B2bKlantdossier van de
// makelaar -- wijzigingen die de koper hier maakt (voorkeuren, matches
// verversen, favorieten) zijn dus meteen ook zichtbaar in het dossier dat de
// makelaar ziet (app/zakelijk/(dashboard)/klanten/[id]/page.tsx), precies het
// doel van dit portaal: de koper beheert het zelf, de makelaar ziet alleen
// het resultaat.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const dossierId = await getKoperDossierIdUitRequest(req);
  if (!dossierId) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const dossier = await getKlantdossier(dossierId);
  if (!dossier) return NextResponse.json({ error: "Onbekend dossier." }, { status: 404 });

  const matches = await listMatchenVoorKlant(dossierId);
  return NextResponse.json({ voorkeuren: dossier.zoekopdracht?.koperVoorkeuren ?? null, matches });
}

export async function PUT(req: NextRequest) {
  const dossierId = await getKoperDossierIdUitRequest(req);
  if (!dossierId) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const resultaat = valideerKoperVoorkeuren(body);
  if (!resultaat.ok) return NextResponse.json({ error: resultaat.error }, { status: 400 });

  const bijgewerkt = await zetKoperVoorkeuren(dossierId, resultaat.waarde);
  if (!bijgewerkt) return NextResponse.json({ error: "Onbekend dossier." }, { status: 404 });
  return NextResponse.json({ ok: true, voorkeuren: resultaat.waarde });
}
