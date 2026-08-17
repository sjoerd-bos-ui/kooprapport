import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { maakBestelling, zetStatus, zetFavoriet, zetGearchiveerd, zetDemoRapport } from "@/lib/payments/bestellingen";
import { genereerDemoAdres, genereerDemoRapport, DEMO_WONINGEN, type DemoWoningInput } from "@/lib/services/b2bDemoData";
import { canonicalAddressKey } from "@/lib/utils/slug";
import { isGeldigEmailadres } from "@/lib/services/email";

// -----------------------------------------------------------------------------
// Vult "Mijn rapporten" (het B2C-consumentendashboard, app/account/page.tsx)
// met een handvol voorbeeldbestellingen voor een gegeven e-mailadres -- zodat
// het dashboard niet leeg oogt bij het testen/demonstreren, zonder dat daar
// een echte betaling of een echte (kostenveroorzakende, zie reportService.ts)
// Altum-aanroep voor nodig is. Zelfde ADMIN_SECRET-patroon en dezelfde
// DEMO_WONINGEN-adressenlijst als app/api/admin/zakelijk/demo-vullen/
// route.ts (B2B-tegenhanger), hier alleen voor het lichtere B2C-model: een
// Bestelling heeft geen los rapport nodig, alleen het adres zelf.
//
// Elke demo-bestelling krijgt ook meteen een volledig, vooraf gegenereerd
// Report (genereerDemoRapport, "mock"-modus, exact dezelfde functie als de
// B2B-demo-route al gebruikte) opgeslagen op Bestelling.demoReport --
// klikt iemand vanuit het dashboard door naar de rapportpagina, dan wordt
// DIT gebruikt i.p.v. een live/kostenveroorzakende aanroep (zie
// app/rapport/[slug]/page.tsx en app/api/rapport/premium/route.ts).
//
// Idempotent-ONVEILIG: elke aanroep voegt NIEUWE bestellingen toe (geen
// "al gevuld?"-check) -- bewust simpel, roep dit dus maar één keer aan per
// e-mailadres.
//
// Voorbeeld:
//   curl -X POST https://kooprapport.nl/api/admin/account/demo-vullen \
//     -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
//     -d '{"email":"sjoerd-bos@live.nl","aantal":2}'
//
// `aantal` is optioneel (standaard 5, het volledige plan hieronder) --
// Sjoerd wilde een keer specifiek "2 rapporten" i.p.v. de standaard 5, dus
// gewoon de eerste N items van hetzelfde vaste plan (favoriet/gearchiveerd-
// markeringen blijven zo consistent, ongeacht N).
// -----------------------------------------------------------------------------

interface DemoBestellingPlan {
  woning: DemoWoningInput;
  favoriet?: boolean;
  gearchiveerd?: boolean;
  bedragCenten: number;
}

const MAX_DEMO_BESTELLINGEN = DEMO_WONINGEN.length;

function plan(): DemoBestellingPlan[] {
  const [w1, w2, w3, w4, w5] = DEMO_WONINGEN;
  return [
    { woning: w1, favoriet: true, bedragCenten: 1195 },
    { woning: w2, bedragCenten: 1195 },
    { woning: w3, bedragCenten: 1195 },
    { woning: w4, gearchiveerd: true, bedragCenten: 995 }, // afwijkend bedrag, puur voor variatie in de demo
    { woning: w5, bedragCenten: 1195 },
  ];
}

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "admin-account-demo-vullen", 5, 5 * 60);
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

  let body: { email?: string; aantal?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }
  const email = body.email?.trim();
  if (!email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  const gevraagdAantal =
    typeof body.aantal === "number" && Number.isFinite(body.aantal) ? Math.round(body.aantal) : MAX_DEMO_BESTELLINGEN;
  const aantalTeVullen = Math.min(Math.max(1, gevraagdAantal), MAX_DEMO_BESTELLINGEN);

  let aantalBestellingen = 0;
  for (const item of plan().slice(0, aantalTeVullen)) {
    const address = genereerDemoAdres(item.woning);
    const addressKey = canonicalAddressKey(address);
    if (!addressKey) continue; // defensief, kan niet gebeuren met de vaste DEMO_WONINGEN-lijst

    const bestelling = await maakBestelling(addressKey, item.bedragCenten, address, email, "Demo koper");
    await zetStatus(bestelling.id, "paid");
    await zetDemoRapport(bestelling.id, genereerDemoRapport(item.woning));
    if (item.favoriet) await zetFavoriet(bestelling.id, true);
    if (item.gearchiveerd) await zetGearchiveerd(bestelling.id, true);
    aantalBestellingen += 1;
  }

  return NextResponse.json({ ok: true, email, aantalBestellingen });
}
