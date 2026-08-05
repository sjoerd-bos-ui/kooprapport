import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { updateOrganisatie } from "@/lib/services/b2bStore";
import { alleGebruikteRegioNamen } from "@/lib/services/marktAlert";
import type { B2bBranding } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Eén PATCH-endpoint voor de twee zelfbedienings-instellingen die geen eigen
// entiteit hebben (werkgebied + branding, zie types/b2b.ts) -- allebei
// gewoon velden op de organisatie zelf, dus geen apart CRUD-endpoint per
// veld nodig. Alleen "eigenaar" mag dit wijzigen: branding/werkgebied is
// organisatiebreed, geen per-gebruiker instelling.
// -----------------------------------------------------------------------------

const HEX_KLEUR = /^#[0-9a-fA-F]{6}$/;

function valideerBranding(input: unknown): { ok: true; branding: B2bBranding } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) return { ok: false, error: "Ongeldige branding." };
  const raw = input as Record<string, unknown>;

  const weergaveNaam = typeof raw.weergaveNaam === "string" ? raw.weergaveNaam.trim() : "";
  const logoUrl = typeof raw.logoUrl === "string" ? raw.logoUrl.trim() : "";
  const accentKleur = typeof raw.accentKleur === "string" ? raw.accentKleur.trim() : "";

  if (logoUrl && !logoUrl.startsWith("https://")) {
    return { ok: false, error: "Logo-URL moet met https:// beginnen." };
  }
  if (accentKleur && !HEX_KLEUR.test(accentKleur)) {
    return { ok: false, error: "Accentkleur moet een hex-code zijn, bv. #0F766E." };
  }

  return {
    ok: true,
    branding: {
      weergaveNaam: weergaveNaam || null,
      logoUrl: logoUrl || null,
      accentKleur: accentKleur || null,
    },
  };
}

export async function PATCH(req: NextRequest) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  if (context.gebruiker.rol !== "eigenaar") {
    return NextResponse.json({ error: "Alleen de eigenaar van de organisatie kan deze instellingen wijzigen." }, { status: 403 });
  }

  let body: { werkgebiedRegios?: unknown; branding?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const patch: { werkgebiedRegios?: string[]; branding?: B2bBranding } = {};

  if (body.werkgebiedRegios !== undefined) {
    if (!Array.isArray(body.werkgebiedRegios) || body.werkgebiedRegios.some((r) => typeof r !== "string")) {
      return NextResponse.json({ error: "werkgebiedRegios moet een lijst met tekst zijn." }, { status: 400 });
    }
    // Alleen namen accepteren die ook echt ooit in een Marktupdate zijn
    // gebruikt -- nooit ongefilterde tekst opslaan die vervolgens toch nooit
    // een match kan opleveren.
    const geldig = new Set(alleGebruikteRegioNamen());
    const gekozen = (body.werkgebiedRegios as string[]).filter((naam) => geldig.has(naam));
    patch.werkgebiedRegios = gekozen;
  }

  if (body.branding !== undefined) {
    const resultaat = valideerBranding(body.branding);
    if (!resultaat.ok) return NextResponse.json({ error: resultaat.error }, { status: 400 });
    patch.branding = resultaat.branding;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
  }

  const bijgewerkt = await updateOrganisatie(context.organisatie.id, patch);
  return NextResponse.json({ ok: true, organisatie: bijgewerkt });
}
