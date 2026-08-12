import { NextRequest, NextResponse } from "next/server";
import { bevestigKoperMail } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Bevestigingslink uit de dubbele-opt-in-mail voor koper-matchmeldingen (zie
// lib/services/email.ts: stuurKoperMailBevestigingsEmail, en het Cowork-
// gesprek "koper-e-mailadres heeft geen opt-in van de koper zelf"). Zelfde
// patroon als app/api/marktupdates/bevestigen/route.ts: voert de bevestiging
// meteen door en stuurt daarna door naar een gewone, cachebare pagina. Een
// ongeldig/verlopen/niet-meer-matchend token krijgt dezelfde pagina te zien,
// met een ander tekstblok (?ongeldig=1) -- zie app/koper-mail-bevestigd/page.tsx.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const dossier = token ? await bevestigKoperMail(token) : null;
  const url = new URL("/koper-mail-bevestigd", APP_BASE_URL);
  if (!dossier) url.searchParams.set("ongeldig", "1");
  return NextResponse.redirect(url);
}
