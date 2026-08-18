import { NextRequest, NextResponse } from "next/server";
import { verifieerKoperPortaalInlogToken, zetKoperPortaalSessieCookie } from "@/lib/services/koperPortaalAuth";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Magic-linkbevestiging uit stuurKoperPortaalUitnodigingEmail (zie
// lib/services/email.ts) -- zelfde twee-staps-opzet als
// app/api/account/bevestigen/route.ts aan de consumentenkant: token
// verzilveren, sessiecookie zetten, doorsturen naar het dashboard.
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const dossierId = token ? await verifieerKoperPortaalInlogToken(token) : null;

  if (!dossierId) {
    const url = new URL("/koper-portaal/inloggen", APP_BASE_URL);
    url.searchParams.set("ongeldig", "1");
    return NextResponse.redirect(url);
  }

  const res = NextResponse.redirect(new URL("/koper-portaal", APP_BASE_URL));
  await zetKoperPortaalSessieCookie(res, dossierId);
  return res;
}
