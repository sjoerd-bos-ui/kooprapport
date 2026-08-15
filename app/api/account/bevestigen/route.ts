import { NextRequest, NextResponse } from "next/server";
import { verifieerEnVerbruikInlogToken, maakSessie, CONSUMENT_SESSION_COOKIE, CONSUMENT_SESSION_TTL_SECONDEN } from "@/lib/services/consumentAuth";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Magic-linkbevestiging uit stuurAccountInlogEmail (zie lib/services/
// consumentAuth.ts). Verzilvert het eenmalige inlogtoken, zet daarna de
// langlevende sessiecookie en stuurt door naar het dashboard -- zelfde
// twee-staps-opzet als app/api/koper-mail/bevestigen/route.ts aan de
// Zakelijk-kant, alleen hier resulterend in een ECHTE ingelogde sessie
// (koper-mail bevestigt alleen een toestemmingsvlag, geen sessie).
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const email = token ? await verifieerEnVerbruikInlogToken(token) : null;

  if (!email) {
    const url = new URL("/account/inloggen", APP_BASE_URL);
    url.searchParams.set("ongeldig", "1");
    return NextResponse.redirect(url);
  }

  const sessieToken = await maakSessie(email);
  const res = NextResponse.redirect(new URL("/account", APP_BASE_URL));
  res.cookies.set(CONSUMENT_SESSION_COOKIE, sessieToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONSUMENT_SESSION_TTL_SECONDEN,
  });
  return res;
}
