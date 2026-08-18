import { randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/services/kvStore";

// -----------------------------------------------------------------------------
// Wachtwoordloze authenticatie voor het "koperportaal" -- zelfbedieningstoegang
// voor de KOPER van een B2B-klantdossier (zie het Cowork-gesprek "grote
// wijzigingen in zakelijk" / "Koperportaal voor Zakelijk-klanten"). Tot nu toe
// beheerde alleen de makelaar het dossier (favorieten aanvinken, voorkeuren
// bijwerken via ZoekopdrachtForm.tsx) -- dit portaal geeft de koper zelf
// dezelfde matches-weergave en voorkeurenformulier, precies zoals het
// consumenten-account (lib/services/consumentAuth.ts) dat al deed voor losse
// rapportkopers. Bewust een APARTE sessie/tokenlaag, niet hergebruikt van
// consumentAuth.ts: een koperportaal-sessie wijst naar een KLANTDOSSIER-id
// (gescoped binnen één B2B-organisatie), een consumentensessie naar een
// e-mailadres -- twee verschillende identiteitsmodellen die niet door elkaar
// mogen lopen.
//
// ONBOARDING: bewust GEEN self-service-aanvraag door de koper zelf -- alleen
// de makelaar genereert en verstuurt de eerste uitnodiging (zie
// app/api/zakelijk/klanten/[id]/koper-portaal-uitnodigen/route.ts), vanuit
// hetzelfde emailKoper-veld dat al bestond voor mailmeldingen
// (types/b2b.ts: B2bZoekopdracht.emailKoper). Dat is zowel eenvoudiger
// (geen aparte wachtwoord/registratieflow) als veiliger (de makelaar --niet
// een willekeurige bezoeker-- bepaalt wie er toegang krijgt tot dit
// specifieke dossier).
//
// Twee tokentypes, zelfde patroon als consumentAuth.ts:
//   1. Inlogtoken (kort, 15 minuten) -- verstuurd per mail, wijst naar een
//      dossierId. Blijft (net als bij consumentAuth.ts) tot de TTL verlopen
//      i.p.v. na één GET al ongeldig -- zelfde reden: e-mailscanners die een
//      link vooraf bezoeken mogen de koper niet buitensluiten.
//   2. Sessietoken (180 dagen, herbruikbaar) -- in een httpOnly-cookie, wijst
//      ook naar een dossierId. Korter dan de 365 dagen van een
//      consumentensessie: een koopproces duurt doorgaans enkele maanden, geen
//      jaren, en het dossier zelf kan door de makelaar worden afgerond/
//      verwijderd.
// -----------------------------------------------------------------------------

const SESSION_COOKIE = "koper_portaal_session";
const SESSION_TTL_SECONDEN = 180 * 24 * 60 * 60; // 180 dagen
const INLOG_TOKEN_TTL_SECONDEN = 15 * 60; // 15 minuten

function sessionKey(token: string): string {
  return `koper-portaal-session:${token}`;
}

function inlogTokenKey(token: string): string {
  return `koper-portaal-inlog:${token}`;
}

// Stap 1: een magic-link-token aanmaken voor een specifiek klantdossier (zie
// app/api/zakelijk/klanten/[id]/koper-portaal-uitnodigen/route.ts).
export async function maakKoperPortaalInlogToken(dossierId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await kvSet(inlogTokenKey(token), dossierId, INLOG_TOKEN_TTL_SECONDEN);
  return token;
}

// Stap 2: het token uit de link verzilveren (zie
// app/api/koper-portaal/inloggen/route.ts). Zelfde bewuste keuze als
// consumentAuth.ts#verifieerEnVerbruikInlogToken: niet expliciet ongeldig
// maken na de eerste treffer, gewoon laten verlopen op de TTL.
export async function verifieerKoperPortaalInlogToken(token: string): Promise<string | null> {
  return kvGet(inlogTokenKey(token));
}

export async function maakKoperPortaalSessie(dossierId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await kvSet(sessionKey(token), dossierId, SESSION_TTL_SECONDEN);
  return token;
}

export async function verwijderKoperPortaalSessie(token: string): Promise<void> {
  await kvSet(sessionKey(token), "", 1);
}

async function dossierIdUitToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  return kvGet(sessionKey(token));
}

// Voor gebruik in API-routes (NextRequest).
export async function getKoperDossierIdUitRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return dossierIdUitToken(token);
}

// Voor gebruik in server components/pagina's (next/headers cookies()).
export async function getKoperDossierIdUitCookies(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return dossierIdUitToken(token);
}

export async function zetKoperPortaalSessieCookie(response: NextResponse, dossierId: string): Promise<void> {
  const token = await maakKoperPortaalSessie(dossierId);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDEN,
  });
}

export const KOPER_PORTAAL_SESSION_COOKIE = SESSION_COOKIE;
