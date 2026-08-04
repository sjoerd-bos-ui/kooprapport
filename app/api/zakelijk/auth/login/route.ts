import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { getGebruikerDoorEmail } from "@/lib/services/b2bStore";
import { verifieerWachtwoord, maakSessie, B2B_SESSION_COOKIE, B2B_SESSION_TTL_SECONDEN } from "@/lib/services/b2bAuth";

// -----------------------------------------------------------------------------
// Inloggen voor "Kooprapport Zakelijk". Rate limiting (5 pogingen per 5
// minuten per IP) beschermt tegen wachtwoord-gokken -- zelfde patroon als
// app/api/admin/kortingscode/route.ts. Bewust een generieke foutmelding bij
// zowel "onbekend e-mailadres" als "verkeerd wachtwoord", zodat een
// aanvaller niet kan afleiden welke e-mailadressen wél bestaan.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "zakelijk-login", 5, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel inlogpogingen. Probeer het over een paar minuten opnieuw." }, { status: 429 });
  }

  let body: { email?: string; wachtwoord?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const email = body.email?.trim();
  const wachtwoord = body.wachtwoord;
  if (!email || !wachtwoord) {
    return NextResponse.json({ error: "E-mailadres en wachtwoord zijn verplicht." }, { status: 400 });
  }

  const generiekeFout = () => NextResponse.json({ error: "E-mailadres of wachtwoord onjuist." }, { status: 401 });

  const gebruiker = await getGebruikerDoorEmail(email);
  if (!gebruiker) return generiekeFout();

  const klopt = verifieerWachtwoord(wachtwoord, gebruiker.wachtwoordHash, gebruiker.wachtwoordSalt);
  if (!klopt) return generiekeFout();

  const token = await maakSessie({ userId: gebruiker.id, orgId: gebruiker.orgId });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(B2B_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: B2B_SESSION_TTL_SECONDEN,
  });
  return res;
}
