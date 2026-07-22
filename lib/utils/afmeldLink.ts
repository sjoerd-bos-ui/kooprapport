// -----------------------------------------------------------------------------
// Afmeldlink voor de herinneringsmail — bewust GEEN HMAC-ondertekening zoals
// bij kortingToken.ts: het ergste dat kan gebeuren bij een vervalste/geraden
// link is dat iemand een e-mailadres afmeldt voor een reclame-herinnering die
// niet van hemzelf is. Vervelend voor die ene mail, geen beveiligings- of
// privacyprobleem (er wordt geen data prijsgegeven of ontgrendeld) — een
// extra geheime sleutel erbij zou hier onnodige complexiteit toevoegen voor
// een risico dat het niet rechtvaardigt. Gewoon het e-mailadres zelf,
// base64url-gecodeerd zodat het veilig in een URL past.
// -----------------------------------------------------------------------------

export function maakAfmeldPad(email: string): string {
  const payload = Buffer.from(email.trim().toLowerCase(), "utf-8").toString("base64url");
  return `/afmelden?e=${payload}`;
}

export function leesAfmeldEmail(payload: string): string | null {
  try {
    const email = Buffer.from(payload, "base64url").toString("utf-8");
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}
