import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, vraagKoperMailBevestigingAan } from "@/lib/services/b2bStore";
import { stuurKoperMailBevestigingsEmail } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Bevestigingsmail OPNIEUW versturen naar het al opgeslagen emailKoper --
// voor als de koper 'm gemist heeft (spamfilter, verwijderd, etc.). Losse
// route i.p.v. hergebruik van de PATCH in ../route.ts: die stuurt een nieuwe
// bevestigingsmail alleen bij een ECHTE wijziging van het adres (zie de
// toelichting daar), dus "gewoon opnieuw versturen naar hetzelfde adres"
// hoort hier, niet daar.
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  const emailKoper = dossier.zoekopdracht?.emailKoper;
  if (!emailKoper) {
    return NextResponse.json({ error: "Er is nog geen e-mailadres van de koper opgeslagen." }, { status: 400 });
  }
  if (dossier.zoekopdracht?.emailKoperBevestigd) {
    return NextResponse.json({ error: "Dit adres is al bevestigd." }, { status: 400 });
  }

  const token = await vraagKoperMailBevestigingAan(id, emailKoper);
  const bevestigUrl = new URL(`/api/koper-mail/bevestigen?token=${token}`, APP_BASE_URL).toString();
  const resultaat = await stuurKoperMailBevestigingsEmail({
    naar: emailKoper,
    klantnaam: dossier.klantnaam,
    organisatieNaam: context.organisatie.branding?.weergaveNaam ?? context.organisatie.naam,
    bevestigUrl,
  });

  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
