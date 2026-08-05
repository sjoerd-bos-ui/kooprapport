import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { getUitnodigingDoorToken, zetUitnodigingGeaccepteerd, getOrganisatie, maakGebruiker } from "@/lib/services/b2bStore";
import { hashWachtwoord, maakSessie, B2B_SESSION_COOKIE, B2B_SESSION_TTL_SECONDEN } from "@/lib/services/b2bAuth";

// -----------------------------------------------------------------------------
// Publieke route (geen sessie nodig -- de uitnodigingslink IS de
// autorisatie), zie app/zakelijk/(auth)/uitnodiging/[token]/page.tsx.
// GET: gegevens tonen (kantoornaam) vóór iemand een wachtwoord instelt.
// POST: account daadwerkelijk aanmaken.
// -----------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const uitnodiging = await getUitnodigingDoorToken(token);
  if (!uitnodiging || uitnodiging.status !== "open") {
    return NextResponse.json({ error: "Deze uitnodiging is niet (meer) geldig." }, { status: 404 });
  }
  if (new Date(uitnodiging.verlooptOp).getTime() < Date.now()) {
    return NextResponse.json({ error: "Deze uitnodiging is verlopen." }, { status: 410 });
  }
  const organisatie = await getOrganisatie(uitnodiging.orgId);
  if (!organisatie) return NextResponse.json({ error: "Organisatie niet gevonden." }, { status: 404 });

  return NextResponse.json({ orgNaam: organisatie.naam, email: uitnodiging.email });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const limiet = await checkRateLimit(req, "zakelijk-uitnodiging-accepteren", 10, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

  const { token } = await params;
  const uitnodiging = await getUitnodigingDoorToken(token);
  if (!uitnodiging || uitnodiging.status !== "open") {
    return NextResponse.json({ error: "Deze uitnodiging is niet (meer) geldig." }, { status: 404 });
  }
  if (new Date(uitnodiging.verlooptOp).getTime() < Date.now()) {
    return NextResponse.json({ error: "Deze uitnodiging is verlopen." }, { status: 410 });
  }

  let body: { naam?: string; wachtwoord?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const naam = body.naam?.trim();
  const wachtwoord = body.wachtwoord;
  if (!naam) return NextResponse.json({ error: "Vul uw naam in." }, { status: 400 });
  if (!wachtwoord || wachtwoord.length < 8) {
    return NextResponse.json({ error: "Wachtwoord moet minstens 8 tekens zijn." }, { status: 400 });
  }

  const { hash, salt } = hashWachtwoord(wachtwoord);
  let gebruiker;
  try {
    gebruiker = await maakGebruiker({
      orgId: uitnodiging.orgId,
      naam,
      email: uitnodiging.email,
      rol: uitnodiging.rol,
      wachtwoordHash: hash,
      wachtwoordSalt: salt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Er bestaat al een account met dit e-mailadres.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  await zetUitnodigingGeaccepteerd(uitnodiging.id);

  const sessieToken = await maakSessie({ userId: gebruiker.id, orgId: gebruiker.orgId });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(B2B_SESSION_COOKIE, sessieToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: B2B_SESSION_TTL_SECONDEN,
  });
  return res;
}
