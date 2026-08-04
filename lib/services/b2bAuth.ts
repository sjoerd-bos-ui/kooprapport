import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/services/kvStore";
import { getGebruiker, getOrganisatie } from "@/lib/services/b2bStore";
import type { B2bGebruiker, B2bOrganisatie, B2bSessieData } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Simpele, eigen wachtwoord- en sessieauthenticatie voor "Kooprapport
// Zakelijk" -- er was in dit project nog helemaal geen auth, en gezien de
// kleine, sales-achtige doelgroep (organisaties worden handmatig aangemaakt,
// zie app/api/admin/zakelijk/organisaties/route.ts) is een externe
// auth-provider voor nu bewust niet toegevoegd. Wachtwoorden worden met
// Node's ingebouwde crypto.scrypt gehasht (geen extra dependency nodig,
// zelfde "geen dependency toevoegen tenzij het echt moet"-discipline als de
// rest van dit project) -- geschikt voor dit doel, maar vervang dit door een
// gevestigde auth-oplossing zodra dit verder opschaalt dan een handvol
// handmatig aangemaakte kantoren.
//
// Sessies zijn simpele random tokens die naar userId+orgId wijzen in de
// bestaande kvStore (geen JWT/eigen signing nodig), met een cookie
// (`b2b_session`, httpOnly) die dat token bevat.
// -----------------------------------------------------------------------------

const SESSION_COOKIE = "b2b_session";
const SESSION_TTL_SECONDEN = 30 * 24 * 60 * 60; // 30 dagen

function sessionKey(token: string) {
  return `b2b-session:${token}`;
}

export function hashWachtwoord(wachtwoord: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(wachtwoord, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifieerWachtwoord(wachtwoord: string, hash: string, salt: string): boolean {
  const berekend = scryptSync(wachtwoord, salt, 64);
  const opgeslagen = Buffer.from(hash, "hex");
  if (berekend.length !== opgeslagen.length) return false;
  return timingSafeEqual(berekend, opgeslagen);
}

export async function maakSessie(data: B2bSessieData): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await kvSet(sessionKey(token), JSON.stringify(data), SESSION_TTL_SECONDEN);
  return token;
}

export async function verwijderSessie(token: string): Promise<void> {
  // Geen kvDel in kvStore.ts -- een lege waarde met TTL 1s is voor dit
  // kleinschalige gebruik voldoende (voorkomt uitbreiding van kvStore.ts
  // puur voor dit ene geval); de cookie wordt sowieso direct gewist.
  await kvSet(sessionKey(token), "", 1);
}

async function sessieDataUitToken(token: string | undefined): Promise<B2bSessieData | null> {
  if (!token) return null;
  const raw = await kvGet(sessionKey(token));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as B2bSessieData;
  } catch {
    return null;
  }
}

export interface B2bSessieContext {
  sessie: B2bSessieData;
  gebruiker: B2bGebruiker;
  organisatie: B2bOrganisatie;
}

async function contextUitSessieData(data: B2bSessieData | null): Promise<B2bSessieContext | null> {
  if (!data) return null;
  const [gebruiker, organisatie] = await Promise.all([getGebruiker(data.userId), getOrganisatie(data.orgId)]);
  if (!gebruiker || !organisatie) return null;
  return { sessie: data, gebruiker, organisatie };
}

// Voor gebruik in API-routes (NextRequest, bv. app/api/zakelijk/rapporten/route.ts).
export async function getB2bSessieUitRequest(req: NextRequest): Promise<B2bSessieContext | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const data = await sessieDataUitToken(token);
  return contextUitSessieData(data);
}

// Voor gebruik in server components/layouts (next/headers cookies()).
export async function getB2bSessieUitCookies(): Promise<B2bSessieContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const data = await sessieDataUitToken(token);
  return contextUitSessieData(data);
}

export const B2B_SESSION_COOKIE = SESSION_COOKIE;
export const B2B_SESSION_TTL_SECONDEN = SESSION_TTL_SECONDEN;
