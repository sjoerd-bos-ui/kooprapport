import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import {
  getKlantdossier,
  zetKlantdossierStatus,
  zetKlantdossierZoekopdracht,
  verwijderKlantdossier,
  vraagKoperMailBevestigingAan,
} from "@/lib/services/b2bStore";
import { valideerKoperVoorkeuren } from "@/lib/services/koperVoorkeurenValidatie";
import { isGeldigEmailadres, stuurKoperMailBevestigingsEmail } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";
import type { B2bDossierStatus, B2bZoekopdracht } from "@/types/b2b";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  let body: { status?: B2bDossierStatus; zoekopdracht?: Partial<B2bZoekopdracht> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (body.status !== undefined) {
    if (body.status !== "lopend" && body.status !== "afgerond") {
      return NextResponse.json({ error: "status moet 'lopend' of 'afgerond' zijn." }, { status: 400 });
    }
    const bijgewerkt = await zetKlantdossierStatus(id, body.status);
    return NextResponse.json({ ok: true, dossier: bijgewerkt });
  }

  if (body.zoekopdracht !== undefined) {
    const z = body.zoekopdracht;

    // MATCHINGMODEL V2 (zie het Cowork-gesprek hierover, "matchingsproces
    // onder de loep"): de 13-vragen koperVoorkeuren-lijst VERVANGT het hele
    // oude formulier (budget/locatie/kenmerken EN de oude 4-vragen koper-
    // voorkeuren) -- er is dus nu maar één ding om te valideren/opslaan.
    // Zelfde drie standen als voorheen (zie het gesprek "moet op deze manier
    // ingevuld kunnen worden via de link, maar ook niet ingevuld of via de
    // app zelf"), nu toegepast op het VOLLEDIGE formulier i.p.v. alleen de
    // laatste 4 vragen:
    //   1. via de publieke vragenlijst-link (ongewijzigd qua route, zie
    //      app/api/koper-voorkeuren/[token]/route.ts) -- roept
    //      zetKoperVoorkeuren rechtstreeks aan, buiten dit endpoint om.
    //   2. rechtstreeks door de makelaar in het dashboard
    //      (VoorkeurenVragenlijst.tsx) -- stuurt hier een volledig,
    //      ingevuld `koperVoorkeuren`-object mee.
    //   3. helemaal niet ingevuld -- de UI stuurt dan expliciet
    //      `koperVoorkeuren: null` mee.
    // Als het veld in de request-body ONTBREEKT (niet hetzelfde als `null`)
    // blijft de al opgeslagen waarde ongewijzigd -- zodat een eventuele
    // toekomstige aanroeper die dit veld nog niet kent nooit per ongeluk
    // al ingevulde koper-voorkeuren wist.
    let koperVoorkeuren = dossier.zoekopdracht?.koperVoorkeuren ?? null;
    if ("koperVoorkeuren" in z) {
      if (z.koperVoorkeuren === null) {
        koperVoorkeuren = null;
      } else {
        const resultaat = valideerKoperVoorkeuren(z.koperVoorkeuren);
        if (!resultaat.ok) {
          return NextResponse.json({ error: resultaat.error }, { status: 400 });
        }
        koperVoorkeuren = resultaat.waarde;
      }
    }

    const matchenActief = Boolean(z.matchenActief);
    if (matchenActief && !koperVoorkeuren) {
      return NextResponse.json({ error: "Vul eerst de voorkeurenlijst in om automatische meldingen aan te zetten." }, { status: 400 });
    }

    // Koper-mailnotificatie (zie het Cowork-gesprek "Nieuwe matches ... via
    // de mail"): zelfde "ontbreekt in body = ongewijzigd laten"-patroon als
    // koperVoorkeuren hierboven, zodat een aanroeper die deze velden niet
    // meestuurt nooit per ongeluk een al ingevuld e-mailadres wist.
    const emailKoperWasVoor = (dossier.zoekopdracht?.emailKoper ?? "").trim().toLowerCase();
    let emailKoper = dossier.zoekopdracht?.emailKoper ?? null;
    if ("emailKoper" in z) {
      const waarde = z.emailKoper?.trim() || null;
      if (waarde && !isGeldigEmailadres(waarde)) {
        return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
      }
      emailKoper = waarde;
    }

    const mailBijNieuweMatches = Boolean(z.mailBijNieuweMatches);
    if (mailBijNieuweMatches && !emailKoper) {
      return NextResponse.json({ error: "Vul eerst een e-mailadres van de koper in om mailmeldingen aan te zetten." }, { status: 400 });
    }

    // DUBBELE OPT-IN (zie types/b2b.ts: emailKoperBevestigd): een gewijzigd
    // e-mailadres verliest altijd zijn bevestiging, ongeacht of het nieuw is
    // of terug is naar een eerder adres -- eenvoudiger en veiliger dan per
    // adres een geschiedenis bijhouden, en het is toch nooit meer dan één
    // klik voor de koper om opnieuw te bevestigen. Alleen bij een ECHTE
    // wijziging (ander adres dan wat er al stond) gaat er een nieuwe
    // bevestigingsmail uit -- simpelweg opnieuw dezelfde waarde opslaan
    // (bv. omdat de makelaar alleen mailBijNieuweMatches toggelt) mag nooit
    // een makelaar spammen met herhaalde bevestigingsmails naar de koper.
    const emailWerkelijkGewijzigd = "emailKoper" in z && (emailKoper?.trim().toLowerCase() ?? "") !== emailKoperWasVoor;
    const emailKoperBevestigd = emailWerkelijkGewijzigd ? false : dossier.zoekopdracht?.emailKoperBevestigd ?? false;

    const bijgewerkt = await zetKlantdossierZoekopdracht(id, {
      matchenActief,
      koperVoorkeuren,
      koperVoorkeurenToken: dossier.zoekopdracht?.koperVoorkeurenToken ?? null,
      emailKoper,
      mailBijNieuweMatches,
      emailKoperBevestigd,
    });

    if (emailWerkelijkGewijzigd && emailKoper) {
      const token = await vraagKoperMailBevestigingAan(id, emailKoper);
      const bevestigUrl = new URL(`/api/koper-mail/bevestigen?token=${token}`, APP_BASE_URL).toString();
      // Bewust niet blokkerend op het antwoord van de PATCH -- een mislukte
      // verzending (bv. Resend nog niet geconfigureerd in dev) mag het
      // opslaan van het e-mailadres zelf niet laten mislukken; de makelaar
      // kan de bevestigingsmail hierna alsnog opnieuw laten versturen.
      await stuurKoperMailBevestigingsEmail({
        naar: emailKoper,
        klantnaam: dossier.klantnaam,
        organisatieNaam: context.organisatie.branding?.weergaveNaam ?? context.organisatie.naam,
        bevestigUrl,
      });
    }

    return NextResponse.json({ ok: true, dossier: bijgewerkt });
  }

  return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitRequest(req);
  if (!context) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) {
    return NextResponse.json({ error: "Onbekend klantdossier." }, { status: 404 });
  }

  await verwijderKlantdossier(id);
  return NextResponse.json({ ok: true });
}
