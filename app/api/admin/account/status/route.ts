import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { listBestellingenVoorEmail } from "@/lib/payments/bestellingen";
import { isGeldigEmailadres } from "@/lib/services/email";

// -----------------------------------------------------------------------------
// Diagnoseroute: laat zien of (en wat) er in de KV-store staat voor een
// e-mailadres in het B2C-consumentendashboard ("Mijn rapporten") -- zonder
// dat je daarvoor zelf hoeft in te loggen of de Upstash-console hoeft te
// openen. Zelfde ADMIN_SECRET-patroon als de andere admin-routes (bv.
// demo-vullen ernaast), hier alleen GET+query-param i.p.v. POST+body, want
// dit wijzigt niets.
//
// Voorbeeld:
//   curl -s "https://kooprapport.nl/api/admin/account/status?email=sjoerd-bos@live.nl" \
//     -H "Authorization: Bearer $ADMIN_SECRET"
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const limiet = await checkRateLimit(req, "admin-account-status", 20, 5 * 60);
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

  const email = req.nextUrl.searchParams.get("email")?.trim();
  if (!email || !isGeldigEmailadres(email)) {
    return NextResponse.json({ error: "Geef een geldig e-mailadres mee als ?email=..." }, { status: 400 });
  }

  const bestellingen = await listBestellingenVoorEmail(email);

  return NextResponse.json({
    email: email.trim().toLowerCase(),
    aantalBestellingen: bestellingen.length,
    bestellingen: bestellingen.map((b) => ({
      id: b.id,
      adres: b.address?.label ?? b.addressSlug,
      status: b.status,
      favoriet: !!b.favoriet,
      gearchiveerd: !!b.gearchiveerd,
      aangemaaktOp: b.aangemaaktOp,
    })),
  });
}
