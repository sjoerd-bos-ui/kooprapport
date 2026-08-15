import { NextRequest, NextResponse } from "next/server";
import { bevestigKoperWhatsapp } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Bevestigingslink uit het dubbele-opt-in WhatsApp-bericht (zie
// lib/services/whatsapp.ts: stuurKoperWhatsappBevestiging). Zelfde patroon
// als app/api/koper-mail/bevestigen/route.ts hiernaast.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const dossier = token ? await bevestigKoperWhatsapp(token) : null;
  const url = new URL("/koper-whatsapp-bevestigd", APP_BASE_URL);
  if (!dossier) url.searchParams.set("ongeldig", "1");
  return NextResponse.redirect(url);
}
