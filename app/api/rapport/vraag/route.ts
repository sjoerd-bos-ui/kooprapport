import { NextRequest, NextResponse } from "next/server";
import type { Report } from "@/types/report";
import { checkRateLimit } from "@/lib/services/rateLimit";
import { beantwoordVraag } from "@/lib/services/vraagAssistent";

// -----------------------------------------------------------------------------
// "Vraag het aan uw rapport" -- zelfde vertrouwensmodel als POST /api/rapport/
// pdf en /api/rapport/email: de client stuurt het Report-object mee dat op
// dat moment al ontgrendeld op het scherm staat, geen nieuwe rapport-opbouw
// of dure databron-aanroep. Rate limit is hier BELANGRIJKER dan bij pdf/
// email: dit kan (in live-modus) een echte, per-aanroep kostenveroorzakende
// Anthropic-aanroep zijn, en een bezoeker kan in theorie veel vragen achter
// elkaar typen.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const limiet = await checkRateLimit(req, "rapport-vraag", 20, 10 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json({ error: "Te veel vragen achter elkaar. Probeer het over een paar minuten opnieuw." }, { status: 429 });
  }

  let body: { report?: Report; vraag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  const { report, vraag } = body;
  if (!report || !report.core?.address?.postcode) {
    return NextResponse.json({ error: "Ongeldige aanvraag: rapportgegevens ontbreken of zijn onvolledig." }, { status: 400 });
  }
  if (!vraag || !vraag.trim()) {
    return NextResponse.json({ error: "Vul een vraag in." }, { status: 400 });
  }

  const resultaat = await beantwoordVraag(report, vraag);
  if ("error" in resultaat) {
    return NextResponse.json({ error: resultaat.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, antwoord: resultaat.antwoord, bron: resultaat.bron });
}
