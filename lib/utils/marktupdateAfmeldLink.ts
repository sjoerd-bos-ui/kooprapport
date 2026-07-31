// -----------------------------------------------------------------------------
// Afmeldlink voor de Marktupdates-nieuwsbrief — zelfde afweging als
// lib/utils/afmeldLink.ts (bewust GEEN HMAC-ondertekening): een vervalste of
// geraden afmeldlink is onschuldig, in het ergste geval meldt iemand een
// e-mailadres af dat niet van hemzelf is. Geen beveiligings- of
// privacyprobleem (er wordt geen data prijsgegeven of ontgrendeld), dus geen
// extra geheime sleutel nodig. Gewoon het e-mailadres zelf, base64url-
// gecodeerd zodat het veilig in een URL past.
// -----------------------------------------------------------------------------

export function maakMarktupdateAfmeldPad(email: string): string {
  const payload = Buffer.from(email.trim().toLowerCase(), "utf-8").toString("base64url");
  return `/api/marktupdates/afmelden?e=${payload}`;
}

export function leesMarktupdateAfmeldEmail(payload: string): string | null {
  try {
    const email = Buffer.from(payload, "base64url").toString("utf-8");
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}
