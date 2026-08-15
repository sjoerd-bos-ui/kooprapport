import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, vraagKoperWhatsappBevestigingAan } from "@/lib/services/b2bStore";
import { stuurKoperWhatsappBevestiging } from "@/lib/services/whatsapp";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Bevestigingsbericht OPNIEUW versturen naar het al opgeslagen telefoonKoper
// -- zelfde reden en opzet als koper-mail-bevestiging/route.ts hiernaast.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const telefoonKoper = dossier.zoekopdracht?.telefoonKoper;
  if (!telefoonKoper) {
    return NextResponse.json({ error: "Er is nog geen telefoonnummer van de koper opgeslagen." }, { status: 400 });
  }
  if (dossier.zoekopdracht?.telefoonKoperBevestigd) {
    return NextResponse.json({ error: "Dit nummer is al bevestigd." }, { status: 400 });
  }

  const token = await vraagKoperWhatsappBevestigingAan(id, telefoonKoper);
  const bevestigUrl = new URL(`/api/koper-whatsapp/bevestigen?token=${token}`, APP_BASE_URL).toString();
  const resultaat = await stuurKoperWhatsappBevestiging({
    naar: telefoonKoper,
    klantnaam: dossier.klantnaam,
    organisatieNaam: context.organisatie.branding?.weergaveNaam ?? context.organisatie.naam,
    bevestigUrl,
  });

  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
