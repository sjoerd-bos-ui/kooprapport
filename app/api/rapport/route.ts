import { NextRequest, NextResponse } from "next/server";
import type { AddressMeta } from "@/types/report";
import { getReport } from "@/lib/services/reportService";
import { checkRateLimit } from "@/lib/services/rateLimit";

// -----------------------------------------------------------------------------
// BELANGRIJK: dit is een Route Handler, die draait ALTIJD server-side (Node.js
// runtime), nooit in de browser. Dat is precies waarom deze route bestaat:
// getReport() leest live API-sleutels (EP_ONLINE_API_KEY, OVERHEID_IO_API_KEY,
// straks BAG_API_KEY e.d.) uit process.env — die mogen nooit in een
// "use client"-component terechtkomen, want dat zou meebundelen in de
// browser-JavaScript (zie ReportPageClient.tsx, dat hierheen fetch't in
// plaats van getReport() rechtstreeks te importeren).
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 30 rapportaanvragen per 5 minuten per IP — ruim genoeg voor iemand die
  // normaal aan het oriënteren is, krap genoeg om scripted misbruik van de
  // onderliggende gratis overheids-API's (BAG/EP-Online/CBS/PDOK) af te remmen.
  const limiet = await checkRateLimit(req, "rapport", 30, 5 * 60);
  if (!limiet.toegestaan) {
    return NextResponse.json(
      { error: "Te veel aanvragen. Probeer het over een paar minuten opnieuw." },
      { status: 429 }
    );
  }

  let address: AddressMeta;
  try {
    address = (await req.json()) as AddressMeta;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag: geen geldige JSON-body." }, { status: 400 });
  }

  if (!address || typeof address.postcode !== "string" || typeof address.huisnummer !== "string") {
    return NextResponse.json({ error: "Ongeldige aanvraag: adres ontbreekt of is onvolledig." }, { status: 400 });
  }

  const report = await getReport(address);
  return NextResponse.json(report);
}
