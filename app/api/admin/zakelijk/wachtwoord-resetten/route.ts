import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { getGebruikerDoorEmail, zetGebruikerWachtwoord } from "@/lib/services/b2bStore";
import { hashWachtwoord } from "@/lib/services/b2bAuth";

// -----------------------------------------------------------------------------
// Admin-route om het wachtwoord van een bestaande "Kooprapport Zakelijk"-
// gebruiker te resetten -- zelfde ADMIN_SECRET-patroon als
// app/api/admin/zakelijk/organisaties/route.ts. Nodig omdat er geen
// zelfbedienings-"wachtwoord vergeten"-flow bestaat (zie de toelichting bij
// de inlogpagina): dit is de enige manier om weer toegang te krijgen tot een
// account waarvan het wachtwoord onbekend is.
//
// Voorbeeld:
//   curl -X POST https://kooprapport.nl/api/admin/zakelijk/wachtwoord-resetten \
//     -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
//     -d '{"email":"anne@devries-makelaars.nl","nieuwWachtwoord":"..."}'
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "admin-zakelijk-wachtwoord-resetten", 10, 5 * 60);
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

  let body: { email?: string; nieuwWachtwoord?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const email = body.email?.trim();
  const nieuwWachtwoord = body.nieuwWachtwoord;
  if (!email || !nieuwWachtwoord) {
    return NextResponse.json({ error: "email en nieuwWachtwoord zijn verplicht." }, { status: 400 });
  }
  if (nieuwWachtwoord.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minstens 8 tekens zijn." }, { status: 400 });
  }

  const gebruiker = await getGebruikerDoorEmail(email);
  if (!gebruiker) {
    return NextResponse.json({ error: `Geen gebruiker gevonden met e-mailadres ${email}.` }, { status: 404 });
  }

  const { hash, salt } = hashWachtwoord(nieuwWachtwoord);
  await zetGebruikerWachtwoord(gebruiker.id, hash, salt);

  return NextResponse.json({ ok: true, email: gebruiker.email });
}
