import { NextRequest, NextResponse } from "next/server";
import {
  listAlleOrganisaties,
  listKlantdossiersVoorOrg,
  listMatchenVoorKlant,
  maakMatch,
  getGebruiker,
} from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { stuurNieuweMatchesEmail } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Cron-endpoint (zie vercel.json) dat voor elk klantdossier met actieve
// matching (B2bKlantdossier.matchInstelling.actief) de Funda-feed opnieuw
// ophaalt, nieuwe advertenties (nog niet eerder opgeslagen URL) bewaart als
// B2bWoningMatch en de makelaar die het dossier heeft aangemaakt per e-mail
// informeert -- zelfde beveiligingspatroon als /api/cron/reminder-email
// (Vercel voegt bij een geconfigureerde cronjob automatisch
// "Authorization: Bearer $CRON_SECRET" toe).
//
// BEWUST per dossier een eigen try/catch: de Funda-feed is een niet-
// officiële, niet-ondersteunde bron (zie lib/data-sources/fundaFeed.ts) die
// op elk moment kan haperen -- één dossier waarvoor dat misgaat mag nooit de
// hele batch (en dus alle andere organisaties/klanten) laten stoppen.
//
// DOSSIER_LIMIET: puur een grens op hoe lang één cron-aanroep duurt, geen
// functionele limiet -- bij meer actieve dossiers dan dit pakt de volgende
// geplande aanroep de rest gewoon weer op (matchInstelling.actief blijft
// staan totdat iemand het uitzet).
// -----------------------------------------------------------------------------

const DOSSIER_LIMIET = 200;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is niet geconfigureerd." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  const organisaties = await listAlleOrganisaties();

  let dossiersGecontroleerd = 0;
  let nieuweMatches = 0;
  let mailsVerstuurd = 0;
  let mailsMislukt = 0;

  outer: for (const org of organisaties) {
    const dossiers = await listKlantdossiersVoorOrg(org.id);
    for (const dossier of dossiers) {
      if (!dossier.matchInstelling?.actief || !dossier.matchInstelling.plaats) continue;
      if (dossiersGecontroleerd >= DOSSIER_LIMIET) break outer;
      dossiersGecontroleerd++;

      try {
        const [bestaande, feedItems] = await Promise.all([
          listMatchenVoorKlant(dossier.id),
          haalFundaMatches(dossier.matchInstelling.plaats, dossier.zoekopdracht?.budgetMax ?? null),
        ]);
        const bekendeUrls = new Set(bestaande.map((m) => m.url));
        const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url));
        if (nieuweItems.length === 0) continue;

        for (const item of nieuweItems) {
          await maakMatch({
            klantId: dossier.id,
            orgId: org.id,
            bron: "funda",
            titel: item.titel,
            url: item.url,
            prijsLabel: item.prijsLabel,
            fotoUrl: item.fotoUrl,
          });
        }
        nieuweMatches += nieuweItems.length;

        const makelaar = await getGebruiker(dossier.aangemaaktDoorUserId);
        if (makelaar) {
          const resultaat = await stuurNieuweMatchesEmail({
            naar: makelaar.email,
            klantnaam: dossier.klantnaam,
            dossierUrl: new URL(`/zakelijk/klanten/${dossier.id}`, APP_BASE_URL).toString(),
            matches: nieuweItems.map((item) => ({ titel: item.titel, url: item.url, prijsLabel: item.prijsLabel })),
          });
          if (resultaat.ok) mailsVerstuurd++;
          else mailsMislukt++;
        }
      } catch (err) {
        console.error(`[cron/matches-controleren] mislukt voor dossier ${dossier.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    organisaties: organisaties.length,
    dossiersGecontroleerd,
    nieuweMatches,
    mailsVerstuurd,
    mailsMislukt,
  });
}
