import { NextRequest, NextResponse } from "next/server";
import { bevestigAanmelding } from "@/lib/services/marktupdateAbonnees";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Bevestigingslink uit de dubbele-opt-in-mail (zie lib/services/email.ts:
// stuurMarktupdateBevestigingsEmail). Voert de bevestiging meteen door en
// stuurt daarna door naar een gewone, cachebare bevestigingspagina. Een
// ongeldig/verlopen token krijgt dezelfde pagina te zien, met een ander
// tekstblok (?ongeldig=1) — zie app/marktupdates/aangemeld/page.tsx.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const email = token ? await bevestigAanmelding(token) : null;
  const url = new URL("/marktupdates/aangemeld", APP_BASE_URL);
  if (!email) url.searchParams.set("ongeldig", "1");
  return NextResponse.redirect(url);
}
