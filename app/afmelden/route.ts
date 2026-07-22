import { NextRequest, NextResponse } from "next/server";
import { leesAfmeldEmail } from "@/lib/utils/afmeldLink";
import { meldAfVoorHerinnering } from "@/lib/services/afmeldlijst";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Afmeldlink uit de herinneringsmail (zie lib/services/email.ts). Voert de
// afmelding meteen door (geen extra bevestigingsklik nodig — standaardpraktijk
// bij e-mail-unsubscribe-links) en stuurt daarna door naar een gewone,
// cachebare bevestigingspagina. Een ongeldige/kapotte link krijgt dezelfde
// bevestigingspagina te zien i.p.v. een technische foutmelding: er is voor de
// bezoeker toch niets meer aan te doen, en of de link nu geldig was of niet,
// het gewenste eindresultaat ("ik krijg geen mail meer") is voor hem hetzelfde.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const payload = req.nextUrl.searchParams.get("e");
  const email = payload ? leesAfmeldEmail(payload) : null;
  if (email) {
    await meldAfVoorHerinnering(email);
  }
  return NextResponse.redirect(new URL("/afmelden/bevestigd", APP_BASE_URL));
}
