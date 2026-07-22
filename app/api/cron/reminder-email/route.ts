import { NextRequest, NextResponse } from "next/server";
import { kvZRangeByScore, kvZRem } from "@/lib/services/kvStore";
import { stuurHerinneringEmail } from "@/lib/services/email";
import { kortingBeschikbaar, kortingWeergave, maakKortingToken } from "@/lib/utils/kortingToken";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Cron-endpoint (zie vercel.json: elk uur) dat de herinneringsmail-wachtrij
// leegt -- elke job die 48 uur geleden is ingepland (zie app/api/rapport/
// preview-email/route.tsx) en waarvan de score inmiddels <= nu is, wordt hier
// verstuurd en daarna uit de wachtrij verwijderd.
//
// BEVEILIGING: Vercel voegt bij een geconfigureerde cronjob automatisch een
// "Authorization: Bearer $CRON_SECRET"-header toe (zie Vercel-documentatie
// over Cron Jobs) -- zonder CRON_SECRET in de omgeving weigert deze route
// elk verzoek (fail-closed), want zonder die check zou dit een publiek,
// ongeauthenticeerd endpoint zijn dat op aanvraag e-mails verstuurt.
//
// BATCH_LIMIET: per cron-aanroep maximaal dit aantal mails versturen -- puur
// een grens op hoe lang één serverless-aanroep duurt, geen functionele
// limiet (bij meer openstaande jobs pakt de volgende uurlijkse aanroep de
// rest gewoon op).
// -----------------------------------------------------------------------------

const REMINDER_QUEUE_KEY = "reminder:queue";
const KORTING_GELDIG_MS = 24 * 60 * 60 * 1000;
const BATCH_LIMIET = 25;

interface ReminderJob {
  email: string;
  adresLabel: string;
  previewPath: string;
  addressKey: string;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is niet geconfigureerd." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
  }

  // Test-bypass, ALLEEN buiten productie: normaal staat een net aangemaakte
  // taak 48 uur in de toekomst (zie preview-email/route.tsx), dus zonder dit
  // zou lokaal testen altijd "0 verstuurd" opleveren totdat je echt 48 uur
  // wacht. ?test=1 doet net alsof "nu" ver in de toekomst ligt, zodat elke
  // openstaande taak meteen als vervallen telt. process.env.NODE_ENV-check
  // zorgt dat deze query-param op de live site nooit iets doet, zelfs niet
  // per ongeluk.
  const testBypass = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("test") === "1";
  const grens = testBypass ? Number.MAX_SAFE_INTEGER : Date.now();

  const jobsRuw = await kvZRangeByScore(REMINDER_QUEUE_KEY, grens);
  const teVerwerken = jobsRuw.slice(0, BATCH_LIMIET);

  let verstuurd = 0;
  let mislukt = 0;

  for (const ruw of teVerwerken) {
    // Ongeacht of het versturen hieronder lukt: deze job altijd uit de
    // wachtrij halen. Een blijvend kapotte job (bv. ongeldig e-mailadres dat
    // er ooit toch doorheen glipte) zou anders elk uur opnieuw geprobeerd
    // worden zonder ooit te verdwijnen.
    await kvZRem(REMINDER_QUEUE_KEY, ruw);

    let job: ReminderJob;
    try {
      job = JSON.parse(ruw);
    } catch {
      mislukt++;
      continue;
    }

    let previewUrl: string;
    try {
      const url = new URL(job.previewPath, APP_BASE_URL);
      if (kortingBeschikbaar()) {
        const token = maakKortingToken(job.addressKey, Date.now() + KORTING_GELDIG_MS);
        if (token) url.searchParams.set("korting", token);
      }
      previewUrl = url.toString();
    } catch {
      mislukt++;
      continue;
    }

    const resultaat = await stuurHerinneringEmail({
      naar: job.email,
      adresLabel: job.adresLabel,
      previewUrl,
      korting: kortingWeergave() ?? undefined,
    });

    if (resultaat.ok) {
      verstuurd++;
    } else {
      mislukt++;
      console.error(`[cron/reminder-email] versturen mislukt voor ${job.email}:`, resultaat.error);
    }
  }

  return NextResponse.json({ ok: true, verstuurd, mislukt, resterend: jobsRuw.length - teVerwerken.length });
}
