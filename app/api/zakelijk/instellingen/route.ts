import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { updateOrganisatie } from "@/lib/services/b2bStore";
import { alleGebruikteRegioNamen } from "@/lib/services/marktAlert";
import { REGIO_OVERBIEDEN } from "@/lib/content/regioOverbieden";
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

  // Logo is óf een al gehoste https://-URL, óf een in de browser verkleinde
  // base64 data-URI (zie BrandingForm.tsx -- geen bestandsopslag in dit
  // project, dus dit is de manier om echt een bestand te "uploaden" zonder
  // een nieuwe, betaalde dienst toe te voegen). Een ruime lengtelimiet
  // voorkomt dat hier per ongeluk (of moedwillig) een veel te grote blob in
  // de organisatie-JSON terechtkomt.
  if (logoUrl && !logoUrl.startsWith("https://") && !logoUrl.startsWith("data:image/")) {
    return { ok: false, error: "Logo moet een https://-URL zijn, of een geüpload bestand." };
  }
  if (logoUrl.length > 400_000) {
    return { ok: false, error: "Dit logo is te groot. Probeer een kleinere/eenvoudigere afbeelding." };
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
    // Alleen namen accepteren die ergens een match kunnen opleveren -- nooit
    // ongefilterde tekst opslaan. Dat is ofwel een redactionele naam die
    // ooit in een Marktupdate is gebruikt (het bestaande, grove pad, zie
    // WerkgebiedForm/RegiosBeherenPaneel), OFWEL een officiële COROP-
    // regionaam uit REGIO_OVERBIEDEN zelf (het nieuwe, fijnmazige pad,
    // rechtstreeks vanuit de tabel op de Werkgebied-pagina -- zie
    // werkgebiedStatusVoorRegio/overbiedenVoorWerkgebied in
    // lib/content/regioOverbieden.ts voor hoe beide vormen naast elkaar
    // blijven werken).
    const geldig = new Set([...alleGebruikteRegioNamen(), ...REGIO_OVERBIEDEN.map((r) => r.regio)]);
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
