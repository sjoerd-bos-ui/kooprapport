import { randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/services/kvStore";

// -----------------------------------------------------------------------------
// Wachtwoordloze authenticatie voor het B2C-"Mijn rapporten"-dashboard (zie
// het Cowork-gesprek "zelfstandig koperportaal" / "b2c-dashboard"). Zelfde
// eenvoudige random-token-in-KV-patroon als lib/services/b2bAuth.ts (geen
// JWT/eigen signing, geen externe auth-provider) -- alleen hier met een
// TWEEDE, kortlevend tokentype ervoor (het inlogtoken/magic link), omdat een
// consument per definitie geen wachtwoord heeft om mee in te loggen.
//
// Gekozen boven e-mail+wachtwoord (zie de afweging in de Cowork-chat): een
// koper logt hooguit een paar keer per jaar in (zo vaak koopt iemand geen
// huis), dus de herhaalde frictie van een wachtwoord onthouden weegt niet op
// tegen de eenmalige bouwkosten van een reset-flow -- een link in de mail is
// voor deze doelgroep zowel simpeler te bouwen als prettiger te gebruiken.
//
// Twee tokentypes, beide willekeurige, niet van e-mailadres afgeleide
// strings (voorkomt dat iemand zelf een token voor andermans e-mailadres kan
// verzinnen):
//   1. Inlogtoken (kort, 15 minuten, EENMALIG) -- verstuurd per mail, wijst
//      naar een e-mailadres, wordt na gebruik meteen ongeldig gemaakt.
//   2. Sessietoken (lang, 365 dagen, herbruikbaar) -- in een httpOnly-cookie,
//      wijst ook naar een e-mailadres, precies zoals b2b_session naar
//      userId+orgId wijst.
// -----------------------------------------------------------------------------

const SESSION_COOKIE = "consument_session";
const SESSION_TTL_SECONDEN = 365 * 24 * 60 * 60; // 365 dagen
const INLOG_TOKEN_TTL_SECONDEN = 15 * 60; // 15 minuten

function sessionKey(token: string): string {
  return `consument-session:${token}`;
}

function inlogTokenKey(token: string): string {
  return `consument-inlog:${token}`;
}

// Stap 1: een magic-link-token aanmaken (zie app/api/account/inlog-link/
// route.ts en app/api/account/koppel-bestelling/route.ts, de twee plekken
// die een koper een inlogmail sturen).
export async function maakInlogToken(email: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await kvSet(inlogTokenKey(token), email.trim().toLowerCase(), INLOG_TOKEN_TTL_SECONDEN);
  return token;
}

// Stap 2: het token uit de link verzilveren (zie app/api/account/bevestigen/
// route.ts) -- EENMALIG: meteen na lezen ongeldig maken (zelfde
// lege-waarde-met-TTL-1s-truc als verwijderSessie in b2bAuth.ts, geen kvDel
// nodig puur hiervoor), zodat een onderschepte/opnieuw bezochte link niet
// twee keer bruikbaar is.
export async function verifieerEnVerbruikInlogToken(token: string): Promise<string | null> {
  const email = await kvGet(inlogTokenKey(token));
  if (!email) return null;
  await kvSet(inlogTokenKey(token), "", 1);
  return email;
}

export async function maakSessie(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await kvSet(sessionKey(token), email.trim().toLowerCase(), SESSION_TTL_SECONDEN);
  return token;
}

export async function verwijderSessie(token: string): Promise<void> {
  await kvSet(sessionKey(token), "", 1);
}

async function emailUitToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  return kvGet(sessionKey(token));
}

// Voor gebruik in API-routes (NextRequest).
export async function getIngelogdeEmailUitRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return emailUitToken(token);
}

// Voor gebruik in server components/pagina's (next/headers cookies()).
export async function getIngelogdeEmailUitCookies(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return emailUitToken(token);
}

export const CONSUMENT_SESSION_COOKIE = SESSION_COOKIE;
export const CONSUMENT_SESSION_TTL_SECONDEN = SESSION_TTL_SECONDEN;

// Procesaudit-vervolg ("e-mail is nu verplicht bij checkout, koppel dat
// automatisch aan een account, geen magic-linkklik nodig"): zet direct een
// volwaardige sessie, zonder de inlogtoken-tussenstap uit
// verifieerEnVerbruikInlogToken. Verantwoording: de koper heeft dit
// e-mailadres zojuist zelf ingevuld ÉN er succesvol een betaling mee
// afgerond (zie app/api/betaling/aanmaken/route.ts en
// app/api/betaling/status/route.ts, de enige twee aanroepers) -- een
// afgeronde betaling is minstens zo'n sterk eigenaarschapsbewijs als één
// klik op een link in diezelfde inbox. Magic link (maakInlogToken/
// verifieerEnVerbruikInlogToken) blijft het pad voor een latere, nieuwe
// sessie op een ander moment/device (app/api/account/inlog-link/route.ts).
export async function zetConsumentSessieCookie(response: NextResponse, email: string): Promise<void> {
  const token = await maakSessie(email);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDEN,
  });
}
