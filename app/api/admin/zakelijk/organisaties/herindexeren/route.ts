import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { getGebruikerDoorEmail, herindexeerOrganisatie } from "@/lib/services/b2bStore";

// -----------------------------------------------------------------------------
// Eenmalige backfill-route: voegt de organisatie van een bestaande gebruiker
// toe aan de nieuwe ALLE_ORGS_INDEX_KEY-index (zie b2bStore.ts) -- nodig voor
// organisaties die AL bestonden voordat die index werd geïntroduceerd (de
// matches-cron, app/api/cron/matches-controleren/route.ts, kan anders alleen
// organisaties vinden die NA deze wijziging zijn aangemaakt). Zelfde
// ADMIN_SECRET-patroon als de andere admin-routes in deze map.
//
// Voorbeeld:
//   curl -X POST https://kooprapport.nl/api/admin/zakelijk/organisaties/herindexeren \
//     -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
//     -d '{"email":"sjoerd-bos@live.nl"}'
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "admin-zakelijk-herindexeren", 10, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het over een paar minuten opnieuw." }, { status: 429 });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET is niet geconfigureerd." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "email is verplicht." }, { status: 400 });
  }

  const gebruiker = await getGebruikerDoorEmail(email);
  if (!gebruiker) {
    return NextResponse.json({ error: `Geen gebruiker gevonden met e-mailadres ${email}.` }, { status: 404 });
  }

  const gelukt = await herindexeerOrganisatie(gebruiker.orgId);
  if (!gelukt) {
    return NextResponse.json({ error: "Organisatie niet gevonden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, orgId: gebruiker.orgId });
}
