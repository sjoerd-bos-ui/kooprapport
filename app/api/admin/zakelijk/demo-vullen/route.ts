import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import {
  getGebruikerDoorEmail,
  getOrganisatie,
  maakKlantdossier,
  maakRapportAanvraag,
  verbruikRapport,
} from "@/lib/services/b2bStore";
import { genereerDemoAdres, genereerDemoRapport, DEMO_WONINGEN } from "@/lib/services/b2bDemoData";
import type { B2bDossierType } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Vult een BESTAANDE organisatie met realistische demo-klantdossiers en
// -rapporten -- zodat een testaccount niet leeg oogt en je niet voor elke
// UI-check een echt (kostenveroorzakend, zie b2bDemoData.ts) rapport hoeft
// op te vragen. Zelfde ADMIN_SECRET-patroon als de andere admin-routes.
// Idempotent-ONVEILIG: elke aanroep voegt NIEUWE dossiers/rapporten toe
// (geen "al gevuld?"-check) -- bewust simpel, roep dit dus maar één keer aan
// per account.
//
// Voorbeeld:
//   curl -X POST https://kooprapport.nl/api/admin/zakelijk/demo-vullen \
//     -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
//     -d '{"email":"sjoerd-bos@live.nl"}'
// -----------------------------------------------------------------------------

interface DossierPlan {
  klantnaam: string;
  type: B2bDossierType;
  status: "lopend" | "afgerond";
  woningIndexen: number[]; // welke DEMO_WONINGEN aan dit dossier hangen
}

const PLAN: DossierPlan[] = [
  { klantnaam: "Fam. de Vries", type: "aankoop", status: "lopend", woningIndexen: [0, 7] },
  { klantnaam: "J. & M. Bakker", type: "aankoop", status: "lopend", woningIndexen: [1] },
  { klantnaam: "Van der Berg Vastgoed", type: "verkoop", status: "lopend", woningIndexen: [2] },
  { klantnaam: "Familie Jansen", type: "aankoop", status: "afgerond", woningIndexen: [3] },
  { klantnaam: "S. de Groot", type: "aankoop", status: "lopend", woningIndexen: [4, 5] },
  { klantnaam: "Kantoor Noord Vastgoed", type: "verkoop", status: "lopend", woningIndexen: [6] },
];

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "admin-zakelijk-demo-vullen", 5, 5 * 60);
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
  if (!body.email) {
    return NextResponse.json({ error: "email is verplicht (e-mailadres van een bestaande zakelijk-gebruiker)." }, { status: 400 });
  }

  const gebruiker = await getGebruikerDoorEmail(body.email);
  if (!gebruiker) {
    return NextResponse.json({ error: `Geen gebruiker gevonden met e-mailadres ${body.email}.` }, { status: 404 });
  }
  const organisatie = await getOrganisatie(gebruiker.orgId);
  if (!organisatie) return NextResponse.json({ error: "Organisatie niet gevonden." }, { status: 404 });

  let aantalDossiers = 0;
  let aantalRapporten = 0;

  for (const plan of PLAN) {
    const dossier = await maakKlantdossier({
      orgId: organisatie.id,
      klantnaam: plan.klantnaam,
      type: plan.type,
      status: plan.status,
      aangemaaktDoorUserId: gebruiker.id,
    });
    aantalDossiers += 1;

    for (const idx of plan.woningIndexen) {
      const woning = DEMO_WONINGEN[idx];
      if (!woning) continue;
      const adres = genereerDemoAdres(woning);
      const report = genereerDemoRapport(woning);
      await maakRapportAanvraag({
        orgId: organisatie.id,
        klantId: dossier.id,
        aangevraagdDoorUserId: gebruiker.id,
        adres,
        report,
      });
      await verbruikRapport(organisatie.id, organisatie.quotumPerMaand);
      aantalRapporten += 1;
    }
  }

  return NextResponse.json({ ok: true, orgNaam: organisatie.naam, aantalDossiers, aantalRapporten });
}
