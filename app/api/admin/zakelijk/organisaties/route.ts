import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { maakOrganisatie, maakGebruiker } from "@/lib/services/b2bStore";
import { hashWachtwoord } from "@/lib/services/b2bAuth";
import { getTierInfo, type B2bAbonnementTier } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Handmatige onboarding voor "Kooprapport Zakelijk" -- zelfde opzet als
// app/api/admin/kortingscode/route.ts: geen UI, een beveiligde route die je
// zelf via curl aanroept nadat je met een kantoor hebt afgesproken welk
// abonnement ze afnemen. Er is bewust GEEN publiek aanmeldformulier (zie het
// Cowork-gesprek: kleinere, sales-achtige doelgroep, jij activeert zelf).
//
// Voorbeeld:
//   curl -X POST https://kooprapport.nl/api/admin/zakelijk/organisaties \
//     -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
//     -d '{"organisatieNaam":"Makelaarskantoor De Vries","tier":"pro","eigenaarNaam":"Anne de Vries","eigenaarEmail":"anne@devries-makelaars.nl","wachtwoord":"..."}'
//
// Het antwoord bevat het tijdelijke wachtwoord NIET terug (dat stuur je zelf,
// dat is verplicht input) -- deel de inloggegevens rechtstreeks met de klant,
// bv. telefonisch of via een bestaand, vertrouwd kanaal, nooit onversleuteld
// per e-mail als het te vermijden is.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "admin-zakelijk-organisaties", 10, 5 * 60);
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

  let body: {
    organisatieNaam?: string;
    tier?: B2bAbonnementTier;
    quotumPerMaand?: number;
    eigenaarNaam?: string;
    eigenaarEmail?: string;
    wachtwoord?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const { organisatieNaam, tier, eigenaarNaam, eigenaarEmail, wachtwoord } = body;
  if (!organisatieNaam || !tier || !eigenaarNaam || !eigenaarEmail || !wachtwoord) {
    return NextResponse.json(
      { error: "organisatieNaam, tier, eigenaarNaam, eigenaarEmail en wachtwoord zijn verplicht." },
      { status: 400 }
    );
  }
  if (wachtwoord.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minstens 8 tekens zijn." }, { status: 400 });
  }
  const tierInfo = getTierInfo(tier);

  const organisatie = await maakOrganisatie(organisatieNaam, tier, body.quotumPerMaand ?? tierInfo.quotumPerMaand);
  const { hash, salt } = hashWachtwoord(wachtwoord);
  try {
    const gebruiker = await maakGebruiker({
      orgId: organisatie.id,
      naam: eigenaarNaam,
      email: eigenaarEmail,
      rol: "eigenaar",
      wachtwoordHash: hash,
      wachtwoordSalt: salt,
    });
    return NextResponse.json({
      ok: true,
      organisatie: { id: organisatie.id, naam: organisatie.naam, slug: organisatie.slug, tier: organisatie.tier, quotumPerMaand: organisatie.quotumPerMaand },
      gebruiker: { id: gebruiker.id, email: gebruiker.email },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij het aanmaken van de gebruiker.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
