import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, zetKlantdossierStatus, zetKlantdossierZoekopdracht, verwijderKlantdossier } from "@/lib/services/b2bStore";
import { valideerKoperVoorkeuren } from "@/lib/services/koperVoorkeurenValidatie";
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

    const bijgewerkt = await zetKlantdossierZoekopdracht(id, {
      matchenActief,
      koperVoorkeuren,
      koperVoorkeurenToken: dossier.zoekopdracht?.koperVoorkeurenToken ?? null,
    });
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
