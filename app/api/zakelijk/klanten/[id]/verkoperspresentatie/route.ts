import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, listRapportenVoorKlant } from "@/lib/services/b2bStore";
import { genereerVerkoperspresentatie } from "@/lib/services/verkoperspresentatie";
import type { PresentatieToon, OptioneleDiaKey } from "@/types/verkoperspresentatie";
import { OPTIONELE_DIA_OPTIES } from "@/types/verkoperspresentatie";

// -----------------------------------------------------------------------------
// Genereert een verkoperspresentatie voor één rapport binnen een dossier.
// Zelfde auth/ownership-controle als matches-verversen/route.ts (sessie ->
// dossier -> orgId-check). Geen apart "verkoop"-only-check hier: het dossier-
// type bepaalt alleen of de knop in de UI verschijnt (zie de dossierpagina),
// niet of de route zelf iets weigert -- een gepersonaliseerde presentatie
// heeft geen inherente reden om bij een aankoopdossier te falen.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    rapportId?: string;
    toon?: PresentatieToon;
    verkoperNaam?: string;
    optioneleDias?: string[];
  } | null;
  if (!body?.rapportId) return NextResponse.json({ error: "Geen rapport opgegeven." }, { status: 400 });

  const toon: PresentatieToon = body.toon === "zakelijk" ? "zakelijk" : "persoonlijk";
  const verkoperNaam = body.verkoperNaam?.trim() || dossier.klantnaam;

  // Defensief tegen onbekende/verouderde waarden in de request (bv. een
  // dia-key die inmiddels is hernoemd of verwijderd) -- alleen echt geldige
  // OPTIONELE_DIA_OPTIES-waarden komen door, de rest wordt stilzwijgend
  // genegeerd i.p.v. een crash of een onbedoelde dia.
  const geldigeSleutels = new Set(OPTIONELE_DIA_OPTIES.map((o) => o.waarde));
  const optioneleDias = (body.optioneleDias ?? []).filter((k): k is OptioneleDiaKey => geldigeSleutels.has(k as OptioneleDiaKey));

  const rapporten = await listRapportenVoorKlant(id);
  const rapport = rapporten.find((r) => r.id === body.rapportId);
  if (!rapport) return NextResponse.json({ error: "Onbekend rapport in dit dossier." }, { status: 404 });

  const organisatieNaam = context.organisatie.branding?.weergaveNaam ?? context.organisatie.naam;
  const presentatie = await genereerVerkoperspresentatie(rapport.report, verkoperNaam, organisatieNaam, toon, optioneleDias);

  return NextResponse.json({ presentatie });
}
