import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { maakTierWijzigingsverzoek, listTierWijzigingenVoorOrg } from "@/lib/services/b2bStore";
import { stuurTierWijzigingsverzoekEmail } from "@/lib/services/email";
import { getTierInfo, type B2bAbonnementTier } from "@/types/b2b";

const GELDIGE_TIERS: B2bAbonnementTier[] = ["starter", "pro", "kantoor"];

// -----------------------------------------------------------------------------
// Zie AbonnementZelfbediening.tsx en de toelichting bij
// B2bTierWijzigingsverzoek in types/b2b.ts: dit verandert het abonnement NIET
// direct (geen Mollie-abonnementenkoppeling in dit project), maar registreert
// het verzoek en e-mailt Sjoerd om het te bevestigen/verwerken.
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  if (context.gebruiker.rol !== "eigenaar") {
    return NextResponse.json({ error: "Alleen de eigenaar kan het abonnement wijzigen." }, { status: 403 });
  }

  let body: { gewensteTier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!body.gewensteTier || !GELDIGE_TIERS.includes(body.gewensteTier as B2bAbonnementTier)) {
    return NextResponse.json({ error: "Ongeldige tier." }, { status: 400 });
  }
  const gewensteTier = body.gewensteTier as B2bAbonnementTier;

  const bestaande = await listTierWijzigingenVoorOrg(context.organisatie.id);
  if (bestaande.some((v) => v.status === "openstaand")) {
    return NextResponse.json({ error: "Er staat al een wijziging open." }, { status: 409 });
  }
  if (gewensteTier === context.organisatie.tier) {
    return NextResponse.json({ error: "Dit is al uw huidige tier." }, { status: 400 });
  }

  const verzoek = await maakTierWijzigingsverzoek({
    orgId: context.organisatie.id,
    huidigeTier: context.organisatie.tier,
    gewensteTier,
    aangevraagdDoorUserId: context.gebruiker.id,
  });

  await stuurTierWijzigingsverzoekEmail({
    orgNaam: context.organisatie.naam,
    huidigeTierLabel: getTierInfo(context.organisatie.tier).label,
    gewensteTierLabel: getTierInfo(gewensteTier).label,
    aangevraagdDoorNaam: context.gebruiker.naam,
    aangevraagdDoorEmail: context.gebruiker.email,
  });

  return NextResponse.json({ ok: true, verzoek });
}
