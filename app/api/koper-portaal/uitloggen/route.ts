import { NextRequest, NextResponse } from "next/server";
import { verwijderKoperPortaalSessie, KOPER_PORTAAL_SESSION_COOKIE } from "@/lib/services/koperPortaalAuth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(KOPER_PORTAAL_SESSION_COOKIE)?.value;
  if (token) await verwijderKoperPortaalSessie(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(KOPER_PORTAAL_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
