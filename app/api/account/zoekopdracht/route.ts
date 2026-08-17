import { NextRequest, NextResponse } from "next/server";
import { getIngelogdeEmailUitRequest } from "@/lib/services/consumentAuth";
import { getConsumentVoorkeuren, zetConsumentVoorkeuren, consumentKlantId } from "@/lib/services/consumentZoekopdracht";
import { listMatchenVoorKlant } from "@/lib/services/b2bStore";
import { valideerKoperVoorkeuren } from "@/lib/services/koperVoorkeurenValidatie";

// -----------------------------------------------------------------------------
// B2C-tegenhanger van app/api/zakelijk/klanten/[id]/route.ts (alleen het
// zoekopdracht-deel) -- geen klantdossier-id nodig, de ingelogde
// consumentensessie (consumentAuth.ts) IS de eigenaar. Zie de toelichting in
// lib/services/consumentZoekopdracht.ts voor waarom de onderliggende
// match-opslag gewoon uit b2bStore.ts hergebruikt wordt.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const email = await getIngelogdeEmailUitRequest(req);
  if (!email) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const voorkeuren = await getConsumentVoorkeuren(email);
  const matches = await listMatchenVoorKlant(consumentKlantId(email));
  return NextResponse.json({ voorkeuren, matches });
}

export async function PUT(req: NextRequest) {
  const email = await getIngelogdeEmailUitRequest(req);
  if (!email) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const resultaat = valideerKoperVoorkeuren(body);
  if (!resultaat.ok) return NextResponse.json({ error: resultaat.error }, { status: 400 });

  await zetConsumentVoorkeuren(email, resultaat.waarde);
  return NextResponse.json({ ok: true, voorkeuren: resultaat.waarde });
}
