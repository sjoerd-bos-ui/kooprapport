import { NextRequest, NextResponse } from "next/server";
import { leesMarktupdateAfmeldEmail } from "@/lib/utils/marktupdateAfmeldLink";
import { meldAf } from "@/lib/services/marktupdateAbonnees";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Afmeldlink uit elke verstuurde marktupdate-mail (nog te bouwen verzendflow,
// zie lib/services/marktupdateAbonnees.ts: alleActieveAbonnees()). Voert de
// afmelding meteen door (geen extra bevestigingsklik nodig — standaardpraktijk
// bij e-mail-unsubscribe-links) en stuurt daarna door naar een gewone,
// cachebare bevestigingspagina.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const payload = req.nextUrl.searchParams.get("e");
  const email = payload ? leesMarktupdateAfmeldEmail(payload) : null;
  if (email) {
    await meldAf(email);
  }
  return NextResponse.redirect(new URL("/marktupdates/afgemeld", APP_BASE_URL));
}
