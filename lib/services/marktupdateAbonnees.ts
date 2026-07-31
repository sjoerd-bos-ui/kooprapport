import { randomBytes } from "crypto";
import { kvGet, kvSet, kvZAdd, kvZRangeByScore, kvZRem } from "@/lib/services/kvStore";

// -----------------------------------------------------------------------------
// Abonnees voor de Marktupdates-nieuwsbrief (elk kwartaal een e-mail bij een
// nieuwe update, zie /marktupdates). Zelfde kvStore-laag als
// lib/payments/bestellingen.ts en lib/services/afmeldlijst.ts (mock:
// in-memory Map, live: Upstash Redis) — geen aparte infrastructuur nodig.
//
// Dubbele opt-in: een aanmelding wordt pas een echt abonnement na een klik op
// de bevestigingslink in de e-mail (zie lib/services/email.ts:
// stuurMarktupdateBevestigingsEmail). Het bevestigingstoken is een
// willekeurige, NIET van het e-mailadres afgeleide waarde (crypto.randomBytes)
// — bewust anders dan lib/utils/afmeldLink.ts (dat gewoon het e-mailadres
// zelf base64url-codeert): bij afmelden is een vervalste link onschuldig (in
// het ergste geval meldt iemand een adres af dat niet van hemzelf is), maar
// bij AANMELDEN is dat precies het misbruik dat dubbele opt-in moet
// voorkomen — zonder een willekeurig token zou iemand anders' e-mailadres
// aangemeld kunnen worden zonder dat die persoon ooit de bevestigingsmail
// heeft gezien. Een token dat alleen in die ene e-mail staat, voorkomt dat.
//
// Bewust WEL het e-mailadres zelf bewaard (in tegenstelling tot
// afmeldlijst.ts, dat uitsluitend een hash bewaart): het hele punt van dit
// abonnement is om er straks daadwerkelijk een e-mail naartoe te kunnen
// sturen. Rechtvaardiging: expliciete, actieve aanmelding + dubbele opt-in +
// altijd een directe afmeldlink in elke verstuurde update (zie
// lib/utils/marktupdateAfmeldLink.ts). Zie ook app/privacy/page.tsx, sectie 2.
// -----------------------------------------------------------------------------

const PENDING_TTL_SECONDEN = 7 * 24 * 60 * 60; // een bevestigingslink is 7 dagen geldig
const ABONNEES_ZSET_KEY = "marktupdate-abonnees";

function pendingKey(token: string): string {
  return `marktupdate-pending:${token}`;
}
function abonneeKey(email: string): string {
  return `marktupdate-abonnee:${email.trim().toLowerCase()}`;
}

export interface MarktupdateAbonnee {
  email: string;
  bevestigdOp: string;
  afgemeldOp?: string;
}

export async function isActiefAbonnee(email: string): Promise<boolean> {
  const raw = await kvGet(abonneeKey(email));
  if (!raw) return false;
  try {
    const record = JSON.parse(raw) as MarktupdateAbonnee;
    return !record.afgemeldOp;
  } catch {
    return false;
  }
}

// Stap 1: aanmelding aanvragen. Genereert een willekeurig token, bewaart
// tijdelijk welk e-mailadres daarbij hoort en geeft het token terug zodat de
// aanroepende route (app/api/marktupdates/abonneren/route.ts) er een
// bevestigingsmail mee kan versturen.
export async function vraagAanmeldingAan(email: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await kvSet(pendingKey(token), email.trim().toLowerCase(), PENDING_TTL_SECONDEN);
  return token;
}

// Stap 2: bevestiging via de link in de e-mail. Geeft het e-mailadres terug
// bij een geldig (nog niet verlopen, nog niet eerder verlopen) token, anders
// null — de aanroepende route (app/api/marktupdates/bevestigen/route.ts)
// toont dan een nette "link werkt niet meer"-pagina i.p.v. een technische
// foutmelding.
export async function bevestigAanmelding(token: string): Promise<string | null> {
  const email = await kvGet(pendingKey(token));
  if (!email) return null;
  const record: MarktupdateAbonnee = { email, bevestigdOp: new Date().toISOString() };
  await kvSet(abonneeKey(email), JSON.stringify(record));
  await kvZAdd(ABONNEES_ZSET_KEY, Date.now(), email);
  return email;
}

export async function meldAf(email: string): Promise<void> {
  const genormaliseerd = email.trim().toLowerCase();
  const raw = await kvGet(abonneeKey(genormaliseerd));
  let bestaand: Partial<MarktupdateAbonnee> = {};
  if (raw) {
    try {
      bestaand = JSON.parse(raw) as MarktupdateAbonnee;
    } catch {
      bestaand = {};
    }
  }
  const record: MarktupdateAbonnee = {
    email: genormaliseerd,
    bevestigdOp: bestaand.bevestigdOp ?? new Date().toISOString(),
    afgemeldOp: new Date().toISOString(),
  };
  await kvSet(abonneeKey(genormaliseerd), JSON.stringify(record));
  await kvZRem(ABONNEES_ZSET_KEY, genormaliseerd);
}

// Voor het daadwerkelijk versturen van een kwartaalupdate later (nog geen
// aparte verzendroute in deze eerste versie — dit is de opzet waarmee dat
// straks kan): alle bevestigde, nog niet afgemelde e-mailadressen.
export async function alleActieveAbonnees(): Promise<string[]> {
  return kvZRangeByScore(ABONNEES_ZSET_KEY, Date.now());
}
