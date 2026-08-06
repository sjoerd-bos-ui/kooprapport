import { NextRequest, NextResponse } from "next/server";
import { getB2bSessieUitRequest } from "@/lib/services/b2bAuth";
import { getKlantdossier, zetKlantdossierStatus, zetKlantdossierZoekopdracht, verwijderKlantdossier } from "@/lib/services/b2bStore";
import { legeKenmerken, B2B_WONINGTYPES } from "@/types/b2b";
import type { B2bDossierStatus, B2bZoekopdracht, B2bLocatie, B2bKenmerken } from "@/types/b2b";

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
    const budgetMin = typeof z.budgetMin === "number" && z.budgetMin > 0 ? z.budgetMin : null;
    const budgetMax = typeof z.budgetMax === "number" && z.budgetMax > 0 ? z.budgetMax : null;

    // Locatie moet, als aanwezig, een complete, expliciet gekozen suggestie
    // zijn (zie LocatieAutocomplete.tsx/plaatsLookup.ts) -- nooit vrije tekst
    // die hier alsnog tot een plaatsSlug omgezet zou worden.
    let locatie: B2bLocatie | null = null;
    if (z.locatie && typeof z.locatie === "object") {
      const l = z.locatie as Partial<B2bLocatie>;
      if (typeof l.label === "string" && l.label.trim() && typeof l.plaatsSlug === "string" && l.plaatsSlug.trim()) {
        locatie = {
          label: l.label.trim().slice(0, 120),
          plaatsSlug: l.plaatsSlug.trim().toLowerCase().slice(0, 80),
          wijkSlug: typeof l.wijkSlug === "string" && l.wijkSlug.trim() ? l.wijkSlug.trim().toLowerCase().slice(0, 80) : null,
        };
      } else {
        return NextResponse.json({ error: "Kies een locatie uit de suggesties." }, { status: 400 });
      }
    }

    const geldigeWoningtypes = B2B_WONINGTYPES.map((w) => w.waarde);
    const kInput = (z.kenmerken ?? {}) as Partial<B2bKenmerken>;
    const kenmerken: B2bKenmerken = {
      ...legeKenmerken(),
      woningtype: kInput.woningtype && geldigeWoningtypes.includes(kInput.woningtype) ? kInput.woningtype : null,
      minKamers: typeof kInput.minKamers === "number" && kInput.minKamers > 0 ? Math.round(kInput.minKamers) : null,
      minSlaapkamers: typeof kInput.minSlaapkamers === "number" && kInput.minSlaapkamers > 0 ? Math.round(kInput.minSlaapkamers) : null,
      tuin: Boolean(kInput.tuin),
      balkon: Boolean(kInput.balkon),
      dakterras: Boolean(kInput.dakterras),
      garage: Boolean(kInput.garage),
      lift: Boolean(kInput.lift),
      energielabelAB: Boolean(kInput.energielabelAB),
    };

    const matchenActief = Boolean(z.matchenActief);
    if (matchenActief && !locatie) {
      return NextResponse.json({ error: "Kies eerst een locatie om automatische meldingen aan te zetten." }, { status: 400 });
    }

    const bijgewerkt = await zetKlantdossierZoekopdracht(id, { budgetMin, budgetMax, locatie, kenmerken, matchenActief });
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
