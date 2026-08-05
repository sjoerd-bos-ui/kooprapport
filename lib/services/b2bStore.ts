import { randomUUID, randomBytes } from "crypto";
import { kvGet, kvSet, kvZAdd, kvZRangeByScore, kvIncrWithTtl } from "@/lib/services/kvStore";
import { slugify } from "@/lib/utils/slug";
import type {
  B2bOrganisatie,
  B2bGebruiker,
  B2bKlantdossier,
  B2bRapportAanvraag,
  B2bAbonnementTier,
  B2bUitnodiging,
  B2bTierWijzigingsverzoek,
} from "@/types/b2b";

// -----------------------------------------------------------------------------
// Opslaglaag voor "Kooprapport Zakelijk", bovenop de bestaande generieke
// kvStore (zie types/b2b.ts voor de uitleg waarom dit (nog) geen echte
// database is). Sleutelconventie: één JSON-blob per entiteit onder een
// voorspelbare sleutel (`b2b-org:<id>`), plus losse "index"-sorted-sets
// (kvZAdd/kvZRangeByScore, score = aanmaakmoment in ms) voor "alle X van
// organisatie Y", omdat deze kvStore geen native lijst-/scan-operatie heeft.
//
// kvZRangeByScore vraagt een bovengrens (maxScore) — Date.now() + een ruime
// marge (10 jaar) is hier gewoon "alles", zodat we niet ook nog een aparte
// "geef alles terug"-variant in kvStore.ts hoeven te bouwen voor dit ene
// gebruik.
// -----------------------------------------------------------------------------

const VER_IN_DE_TOEKOMST = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;

function orgKey(id: string) {
  return `b2b-org:${id}`;
}
function userKey(id: string) {
  return `b2b-user:${id}`;
}
function userByEmailKey(email: string) {
  return `b2b-user-by-email:${email.trim().toLowerCase()}`;
}
function orgUsersIndexKey(orgId: string) {
  return `b2b-org-users:${orgId}`;
}
function klantKey(id: string) {
  return `b2b-klant:${id}`;
}
function orgKlantenIndexKey(orgId: string) {
  return `b2b-org-klanten:${orgId}`;
}
function rapportKey(id: string) {
  return `b2b-rapport:${id}`;
}
function orgRapportenIndexKey(orgId: string) {
  return `b2b-org-rapporten:${orgId}`;
}
function klantRapportenIndexKey(klantId: string) {
  return `b2b-klant-rapporten:${klantId}`;
}
// Gebruiksteller per organisatie + kalendermaand (bv. "2026-08"). Geen
// TTL-loze counter mogelijk in deze kvStore (kvIncrWithTtl zet altijd een
// EXPIRE), dus een ruime 60 dagen -- ruim genoeg om de hele maand + wat marge
// te overbruggen, en omdat elke B2bRapportAanvraag zelf ook een tijdstempel
// heeft is de telling in principe altijd terug te reconstrueren.
function usageKey(orgId: string, jaarMaand: string) {
  return `b2b-usage:${orgId}:${jaarMaand}`;
}

export function huidigeJaarMaand(datum = new Date()): string {
  return `${datum.getUTCFullYear()}-${String(datum.getUTCMonth() + 1).padStart(2, "0")}`;
}

// --- Organisaties -----------------------------------------------------------

export async function maakOrganisatie(
  naam: string,
  tier: B2bAbonnementTier,
  quotumPerMaand: number
): Promise<B2bOrganisatie> {
  const org: B2bOrganisatie = {
    id: randomUUID(),
    naam,
    slug: slugify(naam),
    tier,
    quotumPerMaand,
    aangemaaktOp: new Date().toISOString(),
  };
  await kvSet(orgKey(org.id), JSON.stringify(org));
  return org;
}

export async function getOrganisatie(id: string): Promise<B2bOrganisatie | null> {
  const raw = await kvGet(orgKey(id));
  return raw ? (JSON.parse(raw) as B2bOrganisatie) : null;
}

// Gedeeld door instellingen-updates (werkgebied, branding) -- shallow merge
// op organisatie-niveau, zodat een update van het ene veld (bv. werkgebied)
// nooit per ongeluk het andere veld (bv. branding) wist.
export async function updateOrganisatie(
  id: string,
  patch: Partial<Pick<B2bOrganisatie, "werkgebiedRegios" | "branding" | "tier" | "quotumPerMaand">>
): Promise<B2bOrganisatie | null> {
  const org = await getOrganisatie(id);
  if (!org) return null;
  const bijgewerkt: B2bOrganisatie = { ...org, ...patch };
  await kvSet(orgKey(id), JSON.stringify(bijgewerkt));
  return bijgewerkt;
}

// --- Gebruikers ---------------------------------------------------------------

export async function maakGebruiker(
  gebruiker: Omit<B2bGebruiker, "id" | "aangemaaktOp">
): Promise<B2bGebruiker> {
  const bestaand = await kvGet(userByEmailKey(gebruiker.email));
  if (bestaand) {
    throw new Error(`Er bestaat al een gebruiker met e-mailadres ${gebruiker.email}.`);
  }
  const record: B2bGebruiker = {
    ...gebruiker,
    email: gebruiker.email.trim().toLowerCase(),
    id: randomUUID(),
    aangemaaktOp: new Date().toISOString(),
  };
  await kvSet(userKey(record.id), JSON.stringify(record));
  await kvSet(userByEmailKey(record.email), record.id);
  await kvZAdd(orgUsersIndexKey(record.orgId), Date.now(), record.id);
  return record;
}

// Wachtwoord resetten voor een bestaande gebruiker -- er is geen "wachtwoord
// vergeten"-zelfbedieningsflow in dit dashboard (zie de toelichting bij de
// inlogpagina), dus dit is de admin-route (zelfde ADMIN_SECRET-patroon als
// het aanmaken van een organisatie) om iemand weer toegang te geven.
export async function zetGebruikerWachtwoord(userId: string, hash: string, salt: string): Promise<void> {
  const gebruiker = await getGebruiker(userId);
  if (!gebruiker) throw new Error("Gebruiker niet gevonden.");
  const bijgewerkt: B2bGebruiker = { ...gebruiker, wachtwoordHash: hash, wachtwoordSalt: salt };
  await kvSet(userKey(userId), JSON.stringify(bijgewerkt));
}

export async function getGebruiker(id: string): Promise<B2bGebruiker | null> {
  const raw = await kvGet(userKey(id));
  return raw ? (JSON.parse(raw) as B2bGebruiker) : null;
}

export async function getGebruikerDoorEmail(email: string): Promise<B2bGebruiker | null> {
  const id = await kvGet(userByEmailKey(email));
  if (!id) return null;
  return getGebruiker(id);
}

export async function listGebruikersVoorOrg(orgId: string): Promise<B2bGebruiker[]> {
  const ids = await kvZRangeByScore(orgUsersIndexKey(orgId), VER_IN_DE_TOEKOMST);
  const gebruikers = await Promise.all(ids.map((id) => getGebruiker(id)));
  return gebruikers.filter((g): g is B2bGebruiker => g !== null);
}

// --- Klantdossiers ------------------------------------------------------------

export async function maakKlantdossier(
  dossier: Omit<B2bKlantdossier, "id" | "aangemaaktOp">
): Promise<B2bKlantdossier> {
  const record: B2bKlantdossier = {
    ...dossier,
    id: randomUUID(),
    aangemaaktOp: new Date().toISOString(),
  };
  await kvSet(klantKey(record.id), JSON.stringify(record));
  await kvZAdd(orgKlantenIndexKey(record.orgId), Date.now(), record.id);
  return record;
}

export async function getKlantdossier(id: string): Promise<B2bKlantdossier | null> {
  const raw = await kvGet(klantKey(id));
  return raw ? (JSON.parse(raw) as B2bKlantdossier) : null;
}

export async function zetKlantdossierStatus(id: string, status: B2bKlantdossier["status"]): Promise<B2bKlantdossier | null> {
  const dossier = await getKlantdossier(id);
  if (!dossier) return null;
  const bijgewerkt: B2bKlantdossier = { ...dossier, status };
  await kvSet(klantKey(id), JSON.stringify(bijgewerkt));
  return bijgewerkt;
}

export async function listKlantdossiersVoorOrg(orgId: string): Promise<B2bKlantdossier[]> {
  const ids = await kvZRangeByScore(orgKlantenIndexKey(orgId), VER_IN_DE_TOEKOMST);
  const dossiers = await Promise.all(ids.map((id) => getKlantdossier(id)));
  // Nieuwste eerst -- kvZRangeByScore geeft oplopend terug (zie kvStore.ts).
  return dossiers.filter((d): d is B2bKlantdossier => d !== null).reverse();
}

// --- Rapportaanvragen -----------------------------------------------------------

export async function maakRapportAanvraag(
  aanvraag: Omit<B2bRapportAanvraag, "id" | "aangemaaktOp">
): Promise<B2bRapportAanvraag> {
  const record: B2bRapportAanvraag = {
    ...aanvraag,
    id: randomUUID(),
    aangemaaktOp: new Date().toISOString(),
  };
  await kvSet(rapportKey(record.id), JSON.stringify(record));
  await kvZAdd(orgRapportenIndexKey(record.orgId), Date.now(), record.id);
  if (record.klantId) {
    await kvZAdd(klantRapportenIndexKey(record.klantId), Date.now(), record.id);
  }
  // BEWUST geen kvIncrWithTtl hier: het quotum wordt al verhoogd door
  // verbruikRapport(), die de aanroepende route (app/api/zakelijk/rapporten/
  // route.ts) VOORAF aanroept om te bepalen of er überhaupt een rapport
  // gegenereerd mag worden. Twee keer verhogen zou het verbruik dubbel tellen.
  return record;
}

export async function getRapportAanvraag(id: string): Promise<B2bRapportAanvraag | null> {
  const raw = await kvGet(rapportKey(id));
  return raw ? (JSON.parse(raw) as B2bRapportAanvraag) : null;
}

export async function listRapportenVoorOrg(orgId: string): Promise<B2bRapportAanvraag[]> {
  const ids = await kvZRangeByScore(orgRapportenIndexKey(orgId), VER_IN_DE_TOEKOMST);
  const rapporten = await Promise.all(ids.map((id) => getRapportAanvraag(id)));
  return rapporten.filter((r): r is B2bRapportAanvraag => r !== null).reverse();
}

export async function listRapportenVoorKlant(klantId: string): Promise<B2bRapportAanvraag[]> {
  const ids = await kvZRangeByScore(klantRapportenIndexKey(klantId), VER_IN_DE_TOEKOMST);
  const rapporten = await Promise.all(ids.map((id) => getRapportAanvraag(id)));
  return rapporten.filter((r): r is B2bRapportAanvraag => r !== null).reverse();
}

// --- Deellinks (zie app/deelrapport/[token]) ---------------------------------
// Los token-record (i.p.v. het rapport-id zelf publiek bruikbaar maken), zodat
// een link ingetrokken/vernieuwd kan worden zonder de rapport-id (en dus alle
// interne verwijzingen ernaar) te veranderen.
function deelTokenKey(token: string) {
  return `b2b-deeltoken:${token}`;
}

export async function maakOfVernieuwDeelToken(rapportId: string): Promise<string> {
  const rapport = await getRapportAanvraag(rapportId);
  if (!rapport) throw new Error("Rapport niet gevonden.");
  // Oud token (indien aanwezig) laten vervallen, zodat een eerder gedeelde
  // link na "vernieuwen" niet stilletjes blijft werken.
  if (rapport.deelToken) await kvSet(deelTokenKey(rapport.deelToken), "", 1);
  const token = randomBytes(24).toString("hex");
  await kvSet(deelTokenKey(token), rapportId);
  await kvSet(rapportKey(rapportId), JSON.stringify({ ...rapport, deelToken: token }));
  return token;
}

export async function verwijderDeelToken(rapportId: string): Promise<void> {
  const rapport = await getRapportAanvraag(rapportId);
  if (!rapport?.deelToken) return;
  await kvSet(deelTokenKey(rapport.deelToken), "", 1);
  await kvSet(rapportKey(rapportId), JSON.stringify({ ...rapport, deelToken: null }));
}

export async function getRapportAanvraagDoorDeelToken(token: string): Promise<B2bRapportAanvraag | null> {
  const rapportId = await kvGet(deelTokenKey(token));
  if (!rapportId) return null;
  return getRapportAanvraag(rapportId);
}

// --- Quotum -----------------------------------------------------------------

// Huidig verbruik komt uit de losse teller (snel, geen lijst nodig).
// Val je liever terug op tellen uit listRapportenVoorOrg (bv. na een
// KV-migratie) — dat blijft altijd kunnen, want elk rapport draagt zijn
// eigen aangemaaktOp-tijdstempel.
export async function huidigVerbruik(orgId: string): Promise<number> {
  const raw = await kvGet(usageKey(orgId, huidigeJaarMaand()));
  return raw ? Number(raw) : 0;
}

// Verhoogt de teller en geeft tegelijk terug of dit BINNEN het quotum paste
// -- atomair genoeg voor de schaal van dit project (zie ook de toelichting
// bij kvIncrWithTtl in kvStore.ts, single-process in-memory-fallback).
export async function verbruikRapport(orgId: string, quotumPerMaand: number): Promise<{ toegestaan: boolean; verbruikt: number }> {
  const jaarMaand = huidigeJaarMaand();
  const nieuweTeller = await kvIncrWithTtl(usageKey(orgId, jaarMaand), 60 * 24 * 60 * 60);
  return { toegestaan: nieuweTeller <= quotumPerMaand, verbruikt: nieuweTeller };
}

// Historisch verbruik per kalendermaand -- alleen af te leiden uit de
// rapporten zelf (de losse usageKey-teller heeft een TTL en is dus niet
// geschikt voor een terugblik van meerdere maanden). Gebruikt door de
// zelfbediening-/factuuroverzicht-pagina (#8).
export async function verbruikPerMaand(orgId: string, aantalMaanden: number): Promise<{ jaarMaand: string; aantal: number }[]> {
  const rapporten = await listRapportenVoorOrg(orgId);
  const nu = new Date();
  const maanden: { jaarMaand: string; aantal: number }[] = [];
  for (let i = 0; i < aantalMaanden; i++) {
    const datum = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() - i, 1));
    const jaarMaand = huidigeJaarMaand(datum);
    const aantal = rapporten.filter((r) => huidigeJaarMaand(new Date(r.aangemaaktOp)) === jaarMaand).length;
    maanden.push({ jaarMaand, aantal });
  }
  return maanden;
}

// --- Teamuitnodigingen --------------------------------------------------------

function uitnodigingKey(id: string) {
  return `b2b-uitnodiging:${id}`;
}
function uitnodigingByTokenKey(token: string) {
  return `b2b-uitnodiging-token:${token}`;
}
function orgUitnodigingenIndexKey(orgId: string) {
  return `b2b-org-uitnodigingen:${orgId}`;
}
const UITNODIGING_TTL_SECONDEN = 7 * 24 * 60 * 60;

export async function maakUitnodiging(
  orgId: string,
  email: string,
  uitgenodigdDoorUserId: string
): Promise<B2bUitnodiging> {
  const nu = new Date();
  const record: B2bUitnodiging = {
    id: randomUUID(),
    orgId,
    email: email.trim().toLowerCase(),
    token: randomBytes(24).toString("hex"),
    uitgenodigdDoorUserId,
    aangemaaktOp: nu.toISOString(),
    verlooptOp: new Date(nu.getTime() + UITNODIGING_TTL_SECONDEN * 1000).toISOString(),
    status: "open",
  };
  await kvSet(uitnodigingKey(record.id), JSON.stringify(record), UITNODIGING_TTL_SECONDEN);
  await kvSet(uitnodigingByTokenKey(record.token), record.id, UITNODIGING_TTL_SECONDEN);
  await kvZAdd(orgUitnodigingenIndexKey(orgId), Date.now(), record.id);
  return record;
}

export async function getUitnodigingDoorToken(token: string): Promise<B2bUitnodiging | null> {
  const id = await kvGet(uitnodigingByTokenKey(token));
  if (!id) return null;
  const raw = await kvGet(uitnodigingKey(id));
  return raw ? (JSON.parse(raw) as B2bUitnodiging) : null;
}

export async function zetUitnodigingGeaccepteerd(id: string): Promise<void> {
  const raw = await kvGet(uitnodigingKey(id));
  if (!raw) return;
  const uitnodiging = JSON.parse(raw) as B2bUitnodiging;
  await kvSet(uitnodigingKey(id), JSON.stringify({ ...uitnodiging, status: "geaccepteerd" }), UITNODIGING_TTL_SECONDEN);
}

export async function listOpenUitnodigingenVoorOrg(orgId: string): Promise<B2bUitnodiging[]> {
  const ids = await kvZRangeByScore(orgUitnodigingenIndexKey(orgId), VER_IN_DE_TOEKOMST);
  const uitnodigingen = await Promise.all(
    ids.map(async (id) => {
      const raw = await kvGet(uitnodigingKey(id));
      return raw ? (JSON.parse(raw) as B2bUitnodiging) : null;
    })
  );
  return uitnodigingen.filter((u): u is B2bUitnodiging => u !== null && u.status === "open").reverse();
}

// --- Zelfbediening abonnement --------------------------------------------------

function tierWijzigingKey(id: string) {
  return `b2b-tierwijziging:${id}`;
}
function orgTierWijzigingenIndexKey(orgId: string) {
  return `b2b-org-tierwijzigingen:${orgId}`;
}

export async function maakTierWijzigingsverzoek(
  input: Omit<B2bTierWijzigingsverzoek, "id" | "aangemaaktOp" | "status">
): Promise<B2bTierWijzigingsverzoek> {
  const record: B2bTierWijzigingsverzoek = {
    ...input,
    id: randomUUID(),
    aangemaaktOp: new Date().toISOString(),
    status: "openstaand",
  };
  await kvSet(tierWijzigingKey(record.id), JSON.stringify(record));
  await kvZAdd(orgTierWijzigingenIndexKey(record.orgId), Date.now(), record.id);
  return record;
}

export async function listTierWijzigingenVoorOrg(orgId: string): Promise<B2bTierWijzigingsverzoek[]> {
  const ids = await kvZRangeByScore(orgTierWijzigingenIndexKey(orgId), VER_IN_DE_TOEKOMST);
  const verzoeken = await Promise.all(
    ids.map(async (id) => {
      const raw = await kvGet(tierWijzigingKey(id));
      return raw ? (JSON.parse(raw) as B2bTierWijzigingsverzoek) : null;
    })
  );
  return verzoeken.filter((v): v is B2bTierWijzigingsverzoek => v !== null).reverse();
}
