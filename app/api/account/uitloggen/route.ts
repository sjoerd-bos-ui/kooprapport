import { NextRequest, NextResponse } from "next/server";
import { verwijderSessie, CONSUMENT_SESSION_COOKIE } from "@/lib/services/consumentAuth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(CONSUMENT_SESSION_COOKIE)?.value;
  if (token) await verwijderSessie(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CONSUMENT_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
