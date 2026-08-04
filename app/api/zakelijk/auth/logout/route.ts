import { NextRequest, NextResponse } from "next/server";
import { verwijderSessie, B2B_SESSION_COOKIE } from "@/lib/services/b2bAuth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(B2B_SESSION_COOKIE)?.value;
  if (token) await verwijderSessie(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(B2B_SESSION_COOKIE);
  return res;
}
