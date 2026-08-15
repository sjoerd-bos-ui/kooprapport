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
import { voldoetAanHardeEisen } from "@/lib/services/matchScore";
import { stuurNieuweMatchesEmail, stuurNieuweMatchesKoperEmail } from "@/lib/services/email";
import { stuurNieuweMatchesKoperWhatsapp } from "@/lib/services/whatsapp";
import { APP_BASE_URL } from "@/lib/config/payment";
import { MAX_ZICHTBARE_MATCHEN } from "@/types/b2b";
import type { B2bWoningMatch } from "@/types/b2b";

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
// MATCHINGMODEL V3 (zie het Cowork-gesprek hierover, "ik twijfel over ons
// filtersysteem met punten"): budget/locatie/kenmerken worden afgeleid uit de
// volledige koperVoorkeuren-vragenlijst (zie haalFundaMatches in
// fundaFeed.ts) -- een dossier zonder ingevulde koperVoorkeuren wordt hier
// overgeslagen (er is dan simpelweg niets om op te zoeken). Elke kandidaat
// wordt net als bij de handmatige "Ververs"-knop (matches-verversen/route.ts)
// eerst getoetst aan de 8 harde eisen van fase 1 (voldoetAanHardeEisen,
// matchScore.ts) en alleen bij een `voldoet: true` bewaard -- synchroon, geen
// CBS-voorzieningenopzoeking per kandidaat meer nodig om dat te beslissen.
//
// DOSSIER_LIMIET: puur een grens op hoe lang één cron-aanroep duurt, geen
// functionele limiet -- bij meer actieve dossiers dan dit pakt de volgende
// geplande aanroep de rest gewoon weer op (zoekopdracht.matchenActief blijft
// staan totdat iemand het uitzet).
//
// TIJDSBUDGET: dossiers worden hier serieel verwerkt, en één
// haalFundaMatches()-aanroep via de proxy duurt merkbaar langer dan een kale
// directe fetch (zie lib/config/fundaFeed.ts). In plaats van een vast (en per
// definitie giswerk) aantal dossiers, stopt de loop zodra het tijdsbudget
// bijna op is -- de rest wordt, net als voorheen bij te veel dossiers, gewoon
// door de volgende geplande cron-aanroep opgepakt.
// -----------------------------------------------------------------------------

const DOSSIER_LIMIET = 200;
const TIJDSBUDGET_MS = 22000; // marge onder maxDuration=30

// Bewust een kleinere kandidatenpool dan de 100 van de handmatige "ververs
// nu"-knop -- deze cron verwerkt serieel ALLE actieve dossiers van ALLE
// organisaties binnen hetzelfde tijdsbudget (TIJDSBUDGET_MS/maxDuration
// hierboven), dus een grotere pool per dossier gaat direct ten koste van
// hoeveel dossiers er per aanroep aan de beurt komen. 50 is een bewuste
// tussenstap: ruim boven de oude 30, maar nog beheersbaar qua proxytijd/
// -credits over mogelijk tientallen dossiers heen.
const CRON_KANDIDATENPOOL = 50;

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
  let mailsKoperVerstuurd = 0;
  let mailsKoperMislukt = 0;
  // WhatsApp-alerts ("eerste zijn", zie het Cowork-gesprek "de grootste
  // functionaliteiten waar we echt de markt mee opschudden"): aparte tellers,
  // los van de e-mailtellers hierboven -- een dossier kan beide, één van
  // beide, of geen van beide kanalen aan hebben staan.
  let whatsappVerstuurd = 0;
  let whatsappMislukt = 0;
  // BUGFIX: telt hoe vaak de zoekaanvraag zelf mislukte (netwerk/timeout,
  // zie fundaFeed.ts) i.p.v. gewoon 0 nieuwe matches op te leveren -- zichtbaar
  // in de cron-response, zodat dit niet verborgen blijft achter "nieuweMatches: 0".
  let zoekFouten = 0;

  outer: for (const org of organisaties) {
    const dossiers = await listKlantdossiersVoorOrg(org.id);
    for (const dossier of dossiers) {
      const koperVoorkeuren = dossier.zoekopdracht?.koperVoorkeuren ?? null;
      if (!dossier.zoekopdracht?.matchenActief || !koperVoorkeuren) continue;
      if (dossiersGecontroleerd >= DOSSIER_LIMIET) break outer;
      if (Date.now() - startTijd > TIJDSBUDGET_MS) break outer;
      dossiersGecontroleerd++;

      try {
        // BUGFIX (diagnose-sessie "wat hebben we maandelijks nodig"): niet
        // parallel met haalFundaMatches -- de bekende matchURL's moeten eerst
        // bekend zijn zodat haalFundaMatches geen proxy-credits verspilt aan
        // detailpagina's van woningen die al bekend zijn. Dit is de
        // dagelijkse cron, dus juist hier (elke dag, voor elk actief dossier)
        // levert dit verreweg de grootste besparing op.
        const bestaande = await ruimVerouderdeMatchenOp(dossier.id, koperVoorkeuren);
        const bekendeUrls = new Set(bestaande.map((m) => m.url));
        const { items: feedItems, fout: zoekFout } = await haalFundaMatches(koperVoorkeuren, CRON_KANDIDATENPOOL, bekendeUrls);
        if (zoekFout) zoekFouten++;
        const nieuweItems = feedItems.filter((item) => !bekendeUrls.has(item.url));
        if (nieuweItems.length === 0) continue;

        const nieuwOpgeslagen: typeof nieuweItems = [];
        for (const item of nieuweItems) {
          const tijdelijkeMatch: B2bWoningMatch = {
            id: "",
            klantId: dossier.id,
            orgId: org.id,
            bron: "funda",
            titel: item.titel,
            url: item.url,
            prijs: item.prijs,
            prijsLabel: item.prijsLabel,
            fotoUrl: item.fotoUrl,
            verificatie: item.verificatie ?? null,
            gevondenOp: new Date().toISOString(),
          };
          if (!voldoetAanHardeEisen(tijdelijkeMatch, koperVoorkeuren).voldoet) continue;
          await maakMatch({
            klantId: dossier.id,
            orgId: org.id,
            bron: "funda",
            titel: item.titel,
            url: item.url,
            prijs: item.prijs,
            prijsLabel: item.prijsLabel,
            fotoUrl: item.fotoUrl,
            verificatie: item.verificatie ?? null,
          });
          nieuwOpgeslagen.push(item);
        }
        if (nieuwOpgeslagen.length === 0) continue;

        await kapMatchenOpMax(dossier.id, MAX_ZICHTBARE_MATCHEN);
        nieuweMatches += nieuwOpgeslagen.length;

        const makelaar = await getGebruiker(dossier.aangemaaktDoorUserId);
        if (makelaar) {
          const resultaat = await stuurNieuweMatchesEmail({
            naar: makelaar.email,
            klantnaam: dossier.klantnaam,
            dossierUrl: new URL(`/zakelijk/klanten/${dossier.id}`, APP_BASE_URL).toString(),
            matches: nieuwOpgeslagen.map((item) => ({ titel: item.titel, url: item.url, prijsLabel: item.prijsLabel })),
          });
          if (resultaat.ok) mailsVerstuurd++;
          else mailsMislukt++;
        }

        // Koper-mailnotificatie (zie het Cowork-gesprek "Nieuwe matches ...
        // via de mail"): apart van de makelaar-mail hierboven, eigen aan/uit-
        // vlag (mailBijNieuweMatches) en eigen ontvanger (emailKoper) -- een
        // dossier kan dus de makelaar wel informeren en de koper niet, of
        // andersom. Organisatienaam (branding) i.p.v. "Kooprapport Zakelijk"
        // als afzendernaam in de tekst: de koper kent zijn makelaar.
        // BELANGRIJK -- emailKoperBevestigd: dubbele opt-in (zie types/b2b.ts
        // en het Cowork-gesprek "koper-e-mailadres heeft geen opt-in van de
        // koper zelf"). Zonder deze check zou een makelaar iemands adres
        // kunnen invullen en meteen mail laten sturen zonder dat de koper
        // daar ooit toestemming voor heeft gegeven -- mailBijNieuweMatches
        // mag dus aan staan, maar er gaat pas echt iets uit ná bevestiging.
        if (
          dossier.zoekopdracht?.mailBijNieuweMatches &&
          dossier.zoekopdracht.emailKoper &&
          dossier.zoekopdracht.emailKoperBevestigd
        ) {
          // Personalisatie voor de v2-mail (zie het Cowork-gesprek "veel mooier
          // maken"): budget/locatie komen uit de al ingevulde koperVoorkeuren
          // (kunnen ontbreken -- de mail moet ook zonder deze regel goed ogen,
          // zie de "??" fallbacks in stuurNieuweMatchesKoperEmail zelf), en de
          // "Zoekopdracht aanpassen"-link hergebruikt het bestaande publieke
          // koperVoorkeurenToken i.p.v. er hier eentje aan te maken.
          const voorkeuren = dossier.zoekopdracht.koperVoorkeuren;
          const budgetLabel =
            voorkeuren?.maxKoopprijs != null
              ? `€ ${new Intl.NumberFormat("nl-NL").format(voorkeuren.maxKoopprijs)}`
              : null;
          const locatieLabel =
            voorkeuren && voorkeuren.voorkeurLocaties.length > 0
              ? voorkeuren.voorkeurLocaties.map((l) => l.label).join(", ")
              : null;
          const voorkeurenUrl = dossier.zoekopdracht.koperVoorkeurenToken
            ? new URL(`/koper-voorkeuren/${dossier.zoekopdracht.koperVoorkeurenToken}`, APP_BASE_URL).toString()
            : null;

          const resultaat = await stuurNieuweMatchesKoperEmail({
            naar: dossier.zoekopdracht.emailKoper,
            klantnaam: dossier.klantnaam,
            organisatieNaam: org.branding?.weergaveNaam ?? org.naam,
            matches: nieuwOpgeslagen.map((item) => ({ titel: item.titel, url: item.url, prijsLabel: item.prijsLabel })),
            budgetLabel,
            locatieLabel,
            voorkeurenUrl,
          });
          if (resultaat.ok) mailsKoperVerstuurd++;
          else mailsKoperMislukt++;
        }

        // WhatsApp-alerts (zie types/b2b.ts: whatsappBijNieuweMatches/
        // telefoonKoperBevestigd) -- zelfde dubbele-opt-in-voorwaarde als
        // hierboven bij de koper-mail, los kanaal met eigen aan/uit-toggle:
        // een dossier kan de koper via mail EN WhatsApp informeren, via maar
        // één van de twee, of via geen van beide.
        if (
          dossier.zoekopdracht?.whatsappBijNieuweMatches &&
          dossier.zoekopdracht.telefoonKoper &&
          dossier.zoekopdracht.telefoonKoperBevestigd
        ) {
          const resultaat = await stuurNieuweMatchesKoperWhatsapp({
            naar: dossier.zoekopdracht.telefoonKoper,
            klantnaam: dossier.klantnaam,
            organisatieNaam: org.branding?.weergaveNaam ?? org.naam,
            matches: nieuwOpgeslagen.map((item) => ({ titel: item.titel, url: item.url, prijsLabel: item.prijsLabel })),
          });
          if (resultaat.ok) whatsappVerstuurd++;
          else whatsappMislukt++;
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
    mailsKoperVerstuurd,
    mailsKoperMislukt,
    whatsappVerstuurd,
    whatsappMislukt,
    zoekFouten,
  });
}
