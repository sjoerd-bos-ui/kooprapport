import { NextRequest, NextResponse } from "next/server";
import {
  listAlleOrganisaties,
  listKlantdossiersVoorOrg,
  ruimVerouderdeMatchenOp,
  kapMatchenOpMax,
  maakMatch,
  getGebruiker,
} from "@/lib/services/b2bStore";
import { haalFundaMatches } from "@/lib/data-sources/fundaFeed";
import { stuurNieuweMatchesEmail } from "@/lib/services/email";
import { APP_BASE_URL } from "@/lib/config/payment";
import { MAX_ZICHTBARE_MATCHEN } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Cron-endpoint (zie vercel.json) dat voor elk klantdossier met actieve
// matching (B2bKlantdossier.zoekopdracht.matchenActief) de Funda-feed opnieuw
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
// geplande aanroep de rest gewoon weer op (zoekopdracht.matchenActief blijft
// staan totdat iemand het uitzet).
//
// TIJDSBUDGET (diagnose-sessie, met de Scrape.do-proxy erbij): dossiers
// worden hier serieel verwerkt, en één haalFundaMatches()-aanroep via de
// proxy duurt merkbaar langer dan een kale directe fetch (zie
// lib/config/fundaFeed.ts) -- DOSSIER_LIMIET=200 was dus volstrekt onhaalbaar
// binnen de 30s maxDuration hieronder. In plaats van een vast (en per
// definitie giswerk) aantal dossiers, stopt de loop nu zodra het tijdsbudget
// bijna op is -- de rest wordt, net als voorheen bij te veel dossiers, gewoon
// door de volgende geplande cron-aanroep opgepakt.
// -----------------------------------------------------------------------------

const DOSSIER_LIMIET = 200;
const TIJDSBUDGET_MS = 22000; // marge onder maxDuration=30

export const maxDuration = 30;

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
  const startTijd = Date.now();

  let dossiersGecontroleerd = 0;
  let nieuweMatches = 0;
  let mailsVerstuurd = 0;
  let mailsMislukt = 0;
  // BUGFIX: telt hoe vaak de zoekaanvraag zelf mislukte (netwerk/timeout,
  // zie fundaFeed.ts) i.p.v. gewoon 0 nieuwe matches op te leveren -- zichtbaar
  // in de cron-response, zodat dit niet verborgen blijft achter "nieuweMatches: 0".
  let zoekFouten = 0;

  outer: for (const org of organisaties) {
    const dossiers = await listKlantdossiersVoorOrg(org.id);
    for (const dossier of dossiers) {
      if (!dossier.zoekopdracht?.matchenActief || !dossier.zoekopdracht.locatie) continue;
      if (dossiersGecontroleerd >= DOSSIER_LIMIET) break outer;
      if (Date.now() - startTijd > TIJDSBUDGET_MS) break outer;
      dossiersGecontroleerd++;

      try {
        const budgetMin = dossier.zoekopdracht.budgetMin ?? null;
        const budgetMax = dossier.zoekopdracht.budgetMax ?? null;
        const locatieLabel = dossier.zoekopdracht.locatie.label;
        // BUGFIX (diagnose-sessie "wat hebben we maandelijks nodig"): niet meer
        // parallel -- de bekende matchURL's moeten eerst bekend zijn zodat
        // haalFundaMatches geen proxy-credits verspilt aan detailpagina's van
        // woningen die al bekend zijn. Dit is de dagelijkse cron, dus juist
        // hier (elke dag, voor elk actief dossier) levert dit verreweg de
        // grootste besparing op.
        // BUGFIX (diagnose-sessie "het klopt gewoon allemaal niet"): kenmerken
        // erbij, zodat ook BESTAANDE matches die niet meer aan woningtype/
        // slaapkamers/m²/energielabel voldoen hier worden opgeruimd -- dit is
        // de dagelijkse cron, dus dit is ook de plek waar dat structureel
        // gebeurt (zie b2bStore.ts).
        // Matching-model: koperVoorkeuren erbij, zelfde reden als in
        // matches-verversen/route.ts.
        const koperVoorkeuren = dossier.zoekopdracht.koperVoorkeuren ?? null;
        const bestaande = await ruimVerouderdeMatchenOp(
          dossier.id,
          budgetMin,
          budgetMax,
          locatieLabel,
          dossier.zoekopdracht.kenmerken,
          koperVoorkeuren
        );
        const bekendeUrls = new Set(bestaande.map((m) => m.url));
        const { items: feedItems, fout: zoekFout } = await haalFundaMatches(
          dossier.zoekopdracht.locatie,
          budgetMin,
          budgetMax,
          dossier.zoekopdracht.kenmerken,
          MAX_ZICHTBARE_MATCHEN,
          bekendeUrls,
          koperVoorkeuren
        );
        if (zoekFout) zoekFouten++;
        const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url));
        if (nieuweItems.length === 0) continue;

        for (const item of nieuweItems) {
          await maakMatch({
            klantId: dossier.id,
            orgId: org.id,
            bron: "funda",
            titel: item.titel,
            url: item.url,
            prijs: item.prijs,
            prijsLabel: item.prijsLabel,
            fotoUrl: item.fotoUrl,
            locatieLabel,
            verificatie: item.verificatie ?? null,
          });
        }
        await kapMatchenOpMax(dossier.id, MAX_ZICHTBARE_MATCHEN);
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
    zoekFouten,
  });
}
