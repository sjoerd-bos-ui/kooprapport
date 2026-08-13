import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { listRapportenVoorOrg, maakVergelijkingDeelToken } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Deel-link voor de LOSSE, cross-dossier vergelijkpagina (app/zakelijk/
// (dashboard)/vergelijken/page.tsx, het eigen "Vergelijken"-item in de
// zijbalk) -- zie het Cowork-gesprek "check de deellink van de vergelijking
// van de rapporten nog, die staat er niet in": de eerder gebouwde
// vergelijking-deel-route zat onder /api/zakelijk/klanten/[id]/ en vereiste
// dus een klantId, maar deze pagina vergelijkt rapporten org-breed, niet
// per se van hetzelfde dossier. Aparte, org-geschoolde route i.p.v. de
// klant-route hier hergebruiken met een nep-klantId. maakVergelijkingDeelToken
// zelf was al org-geschoold (geen klantId in de opgeslagen data), dus dat
// hergebruikt 1-op-1.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rapportIds = Array.isArray(body?.rapportIds) ? (body.rapportIds as unknown[]).filter((x): x is string => typeof x === "string") : [];
  if (rapportIds.length < 2) {
    return NextResponse.json({ error: "Selecteer minstens twee rapporten om te delen." }, { status: 400 });
  }

  const rapportenVanOrg = await listRapportenVoorOrg(context.organisatie.id);
  const toegestaneIds = new Set(rapportenVanOrg.map((r) => r.id));
  if (!rapportIds.every((rid) => toegestaneIds.has(rid))) {
    return NextResponse.json({ error: "Eén of meer rapporten horen niet bij deze organisatie." }, { status: 400 });
  }

  const token = await maakVergelijkingDeelToken(context.organisatie.id, rapportIds);
  return NextResponse.json({ ok: true, deelUrl: `${APP_BASE_URL}/deelvergelijking/${token}` });
}
