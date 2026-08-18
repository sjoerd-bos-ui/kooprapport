import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier } from "@/lib/services/b2bStore";
import { maakKoperPortaalInlogToken } from "@/lib/services/koperPortaalAuth";
import { stuurKoperPortaalUitnodigingEmail } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Koperportaal-uitnodiging versturen (zie het Cowork-gesprek "Koperportaal
// voor Zakelijk-klanten") -- de makelaar klikt dit vanuit het klantdossier
// (components/zakelijk/KoperPortaalUitnodigen.tsx), gebruikt daarbij het
// bestaande zoekopdracht.emailKoper-veld (al aanwezig voor mailmeldingen,
// zie types/b2b.ts) als bestemming. Elke klik genereert een NIEUW magic-
// linktoken (koperPortaalAuth.maakKoperPortaalInlogToken) en verstuurt dat
// meteen -- geen apart "eerste keer vs. opnieuw"-onderscheid nodig zoals bij
// koper-mail-bevestiging hierboven, een koperportaal-inlogtoken is toch maar
// 15 minuten geldig en herhaald versturen kan geen kwaad.
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
    return NextResponse.json({ error: "Vul eerst een e-mailadres van de koper in en bewaar dat." }, { status: 400 });
  }

  const token = await maakKoperPortaalInlogToken(id);
  const inlogUrl = new URL(`/api/koper-portaal/inloggen?token=${token}`, APP_BASE_URL).toString();
  const resultaat = await stuurKoperPortaalUitnodigingEmail({
    naar: emailKoper,
    klantnaam: dossier.klantnaam,
    organisatieNaam: context.organisatie.branding?.weergaveNaam ?? context.organisatie.naam,
    inlogUrl,
  });

  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
