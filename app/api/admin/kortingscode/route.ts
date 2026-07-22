import { NextRequest, NextResponse } from "next/server";
import { maakKortingscode } from "@/lib/utils/kortingscode";

// -----------------------------------------------------------------------------
// Eigen "adminpaneel" -- bewust geen UI, gewoon een beveiligde route die je
// zelf via curl in Terminal aanroept om een nieuwe kortingscode te maken.
// Beveiligd met ADMIN_SECRET (nieuwe env var, niet hetzelfde als
// CRON_SECRET of KORTING_SECRET) -- zonder die var weigert deze route alles,
// want zonder wachtwoord zou dit een publiek endpoint zijn waarmee IEDEREEN
// gratis kortingscodes voor zichzelf kan aanmaken.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET is niet geconfigureerd." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  let body: { code?: string; percentage?: number; maxGebruik?: number; geldigDagen?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const { code, percentage, maxGebruik, geldigDagen } = body;
  // 1-100 toegestaan (100 = gratis, handig voor je eigen testcodes) --
  // eerder stond hier per ongeluk "< 100", waardoor een 100%-testcode zoals
  // SJOERD100 altijd werd geweigerd.
  if (!code || typeof percentage !== "number" || percentage <= 0 || percentage > 100) {
    return NextResponse.json({ error: "code en percentage (1-100) zijn verplicht." }, { status: 400 });
  }

  const resultaat = await maakKortingscode(code, percentage, maxGebruik ?? 1, geldigDagen ?? 30);

  return NextResponse.json({
    ok: true,
    code: resultaat.code,
    percentage,
    maxGebruik: maxGebruik ?? 1,
    geldigTot: new Date(resultaat.geldigTot).toISOString(),
  });
}
