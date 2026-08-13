import { randomUUID, randomBytes } from "crypto";
import { kvGet, kvSet, kvDel, kvZAdd, kvZRangeByScore, kvZRem, kvIncrWithTtl } from "@/lib/services/kvStore";
import { slugify } from "@/lib/utils/slug";
import { voldoetAanHardeEisen } from "@/lib/services/matchScore";
import { vindGekoppeldRapport } from "@/lib/services/matchRapportKoppeling";
import { haalListingDetails } from "@/lib/data-sources/fundaFeed";
import type {
  B2bOrganisatie,
  B2bGebruiker,
  B2bKlantdossier,
  B2bRapportAanvraag,
  B2bAbonnementTier,
  B2bUitnodiging,
  B2bTierWijzigingsverzoek,
  B2bWoningMatch,
  B2bKoperVoorkeuren,
  B2bMatchVerificatie,
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
function matchKey(id: string) {
  return `b2b-match:${id}`;
}
function klantMatchenIndexKey(klantId: string) {
  return `b2b-klant-matches:${klantId}`;
}
// Reverse lookup voor de publieke koper-voorkeuren-vragenlijst (matching-
// model) -- zelfde eenvoudige patroon als deelTokenKey verderop in dit
// bestand (los token-record i.p.v. de klant-id zelf publiek bruikbaar maken).
function koperVoorkeurenTokenKey(token: string) {
  return `b2b-koperVoorkeurenToken:${token}`;
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

// Index van ALLE organisatie-id's, ongeacht welke -- tot nu toe was er nooit
// een plek nodig die over alle organisaties heen moest itereren (elke andere
// query gaat via een bekende orgId). De matches-cron (app/api/cron/matches-
// controleren/route.ts) moet wél elke organisatie met actieve matching
// kunnen vinden zonder de id's vooraf te kennen, vandaar deze losse index.
const ALLE_ORGS_INDEX_KEY = "b2b-alle-orgs";

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
  await kvZAdd(ALLE_ORGS_INDEX_KEY, Date.now(), org.id);
  return org;
}

export async function listAlleOrganisaties(): Promise<B2bOrganisatie[]> {
  const ids = await kvZRangeByScore(ALLE_ORGS_INDEX_KEY, VER_IN_DE_TOEKOMST);
  const orgs = await Promise.all(ids.map((id) => getOrganisatie(id)));
  return orgs.filter((o): o is B2bOrganisatie => o !== null);
}

// Eenmalige backfill voor organisaties die vóór ALLE_ORGS_INDEX_KEY zijn
// aangemaakt (dus nog niet in die index staan) -- zie app/api/admin/zakelijk/
// organisaties/herindexeren/route.ts. Idempotent: kvZAdd op een member die er
// al in staat overschrijft alleen de score, geen dubbele entry.
export async function herindexeerOrganisatie(orgId: string): Promise<boolean> {
  const org = await getOrganisatie(orgId);
  if (!org) return false;
  await kvZAdd(ALLE_ORGS_INDEX_KEY, Date.now(), orgId);
  return true;
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

export async function zetKlantdossierZoekopdracht(
  id: string,
  zoekopdracht: B2bKlantdossier["zoekopdracht"]
): Promise<B2bKlantdossier | null> {
  const dossier = await getKlantdossier(id);
  if (!dossier) return null;
  const bijgewerkt: B2bKlantdossier = { ...dossier, zoekopdracht };
  await kvSet(klantKey(id), JSON.stringify(bijgewerkt));
  return bijgewerkt;
}

// --- Deel-link "Favorieten vergelijken" ---------------------------------------
// Zelfde tokenpatroon als maakOfVernieuwDeelToken (rapporten) verderop in dit
// bestand, maar dan dossier-niveau en idempotent herbruikt zoals
// maakOfVernieuwKoperVoorkeurenToken hierboven -- zie de toelichting bij
// favorietenDeelToken in types/b2b.ts voor waarom dit BEWUST geen bevroren
// momentopname is.
function favorietenDeelTokenKey(token: string): string {
  return `deel-favorieten:${token}`;
}

export async function maakOfVernieuwFavorietenDeelToken(dossierId: string): Promise<string> {
  const dossier = await getKlantdossier(dossierId);
  if (!dossier) throw new Error("Klantdossier niet gevonden.");
  if (dossier.favorietenDeelToken) return dossier.favorietenDeelToken;
  const token = randomBytes(24).toString("base64url");
  await kvSet(favorietenDeelTokenKey(token), dossierId);
  await kvSet(klantKey(dossierId), JSON.stringify({ ...dossier, favorietenDeelToken: token }));
  return token;
}

export async function verwijderFavorietenDeelToken(dossierId: string): Promise<void> {
  const dossier = await getKlantdossier(dossierId);
  if (!dossier?.favorietenDeelToken) return;
  await kvSet(favorietenDeelTokenKey(dossier.favorietenDeelToken), "", 1);
  await kvSet(klantKey(dossierId), JSON.stringify({ ...dossier, favorietenDeelToken: null }));
}

export async function getKlantdossierDoorFavorietenDeelToken(token: string): Promise<B2bKlantdossier | null> {
  const dossierId = await kvGet(favorietenDeelTokenKey(token));
  if (!dossierId) return null;
  return getKlantdossier(dossierId);
}

// --- Deel-link "Vergelijken" (volledige rapporten) ----------------------------
// In tegenstelling tot de favorieten-deellink hierboven IS dit wel een vaste
// momentopname: de makelaar kiest in DossierVergelijken.tsx een specifieke
// selectie van 2-3 rapporten en deelt PRECIES die vergelijking -- rapporten
// zijn bovendien al onveranderlijk (eenmaal gegenereerd), dus een snapshot
// van rapport-id's is hier zonder risico, in tegenstelling tot een
// momentopname van (wél muterende) favorieten. Geen idempotente hergebruik
// zoals hierboven: elke "delen"-klik legt de op dat moment geselecteerde
// combinatie vast, ook als die per selectie verschilt.
interface VergelijkingDeel {
  orgId: string;
  rapportIds: string[];
}

function vergelijkingDeelTokenKey(token: string): string {
  return `deel-vergelijking:${token}`;
}

export async function maakVergelijkingDeelToken(orgId: string, rapportIds: string[]): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const data: VergelijkingDeel = { orgId, rapportIds };
  await kvSet(vergelijkingDeelTokenKey(token), JSON.stringify(data));
  return token;
}

export async function getVergelijkingDoorDeelToken(token: string): Promise<B2bRapportAanvraag[] | null> {
  const raw = await kvGet(vergelijkingDeelTokenKey(token));
  if (!raw) return null;
  let data: VergelijkingDeel;
  try {
    data = JSON.parse(raw) as VergelijkingDeel;
  } catch {
    return null;
  }
  const rapporten = await Promise.all(data.rapportIds.map((id) => getRapportAanvraag(id)));
  const geldig = rapporten.filter((r): r is B2bRapportAanvraag => r != null && r.orgId === data.orgId);
  return geldig.length >= 2 ? geldig : null;
}

// --- Koper-voorkeuren (matching-model) ----------------------------------------
// Publieke, niet-ingelogde vragenlijst-link voor de koper (zie het Cowork-
// gesprek hierover) -- zelfde tokenpatroon als maakOfVernieuwDeelToken
// verderop: een los, herroepbaar token i.p.v. de klant-id zelf publiek
// bruikbaar maken.

// Idempotent qua dossier: bestaat er al een token, dan wordt die gewoon
// hergebruikt (geen nieuwe link nodig bij elke klik op "kopieer link" in de
// makelaar-UI) -- alleen als er nog geen token is, wordt er één aangemaakt.
export async function maakOfVernieuwKoperVoorkeurenToken(dossierId: string): Promise<string> {
  const dossier = await getKlantdossier(dossierId);
  if (!dossier) throw new Error("Klantdossier niet gevonden.");
  const bestaandToken = dossier.zoekopdracht?.koperVoorkeurenToken;
  if (bestaandToken) return bestaandToken;

  const token = randomBytes(24).toString("hex");
  const basisZoekopdracht: B2bKlantdossier["zoekopdracht"] = dossier.zoekopdracht ?? {
    matchenActief: false,
    koperVoorkeuren: null,
    koperVoorkeurenToken: null,
    emailKoper: null,
    mailBijNieuweMatches: false,
    emailKoperBevestigd: false,
  };
  await kvSet(koperVoorkeurenTokenKey(token), dossierId);
  await zetKlantdossierZoekopdracht(dossierId, { ...basisZoekopdracht, koperVoorkeurenToken: token });
  return token;
}

export async function getKlantdossierDoorKoperVoorkeurenToken(token: string): Promise<B2bKlantdossier | null> {
  const dossierId = await kvGet(koperVoorkeurenTokenKey(token));
  if (!dossierId) return null;
  return getKlantdossier(dossierId);
}

// Slaat de ingevulde antwoorden op -- shallow merge op zoekopdracht-niveau,
// zodat het invullen van de vragenlijst nooit per ongeluk al ingestelde
// budget/locatie/kenmerken van de makelaar overschrijft.
export async function zetKoperVoorkeuren(dossierId: string, voorkeuren: B2bKoperVoorkeuren): Promise<B2bKlantdossier | null> {
  const dossier = await getKlantdossier(dossierId);
  if (!dossier || !dossier.zoekopdracht) return null;
  return zetKlantdossierZoekopdracht(dossierId, { ...dossier.zoekopdracht, koperVoorkeuren: voorkeuren });
}

// --- Dubbele opt-in koper-e-mail (zie het Cowork-gesprek "koper-e-mailadres
// heeft geen opt-in van de koper zelf") ----------------------------------------
// Zelfde patroon als lib/services/marktupdateAbonnees.ts (vraagAanmeldingAan
// / bevestigAanmelding): een willekeurig, NIET van het e-mailadres afgeleid
// token (crypto.randomBytes) -- een voorspelbaar token zou een makelaar in
// staat stellen om zelf een adres te "bevestigen" zonder dat de koper ooit de
// mail heeft gezien, precies wat dubbele opt-in moet voorkomen. Bewust een
// APART kv-record i.p.v. meteen op het dossier zetten: het adres in de
// pending-record is de snapshot van het moment waarop de bevestigingsmail
// verstuurd is -- als de makelaar het adres daarna nog wijzigt (nieuwe
// aanvraag, nieuw token), mag een oude link nooit meer het nieuwe adres
// kunnen bevestigen. Vandaar de match-check in bevestigKoperMail hieronder.

const KOPER_MAIL_PENDING_TTL_SECONDEN = 7 * 24 * 60 * 60; // 7 dagen geldig, zelfde als marktupdateAbonnees.ts

function koperMailPendingKey(token: string): string {
  return `koper-mail-pending:${token}`;
}

interface KoperMailPending {
  dossierId: string;
  email: string;
}

// Stap 1: aanvragen. Geeft het token terug zodat de aanroepende route er een
// bevestigingsmail (stuurKoperMailBevestigingsEmail) mee kan versturen.
export async function vraagKoperMailBevestigingAan(dossierId: string, email: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const pending: KoperMailPending = { dossierId, email: email.trim().toLowerCase() };
  await kvSet(koperMailPendingKey(token), JSON.stringify(pending), KOPER_MAIL_PENDING_TTL_SECONDEN);
  return token;
}

// Stap 2: bevestiging via de link in de e-mail (zie app/api/koper-mail/
// bevestigen/route.ts). Zet emailKoperBevestigd pas op `true` als het
// dossier nog bestaat EN het huidige emailKoper nog exact overeenkomt met
// het adres waar de bevestigingsmail destijds naartoe ging -- zo kan een
// oude, nog niet-verlopen link nooit een inmiddels gewijzigd adres
// bevestigen. Geeft het bijgewerkte dossier terug bij succes, anders `null`
// (de aanroepende route toont dan een "link werkt niet meer"-pagina).
export async function bevestigKoperMail(token: string): Promise<B2bKlantdossier | null> {
  const raw = await kvGet(koperMailPendingKey(token));
  if (!raw) return null;
  let pending: KoperMailPending;
  try {
    pending = JSON.parse(raw) as KoperMailPending;
  } catch {
    return null;
  }

  const dossier = await getKlantdossier(pending.dossierId);
  if (!dossier || !dossier.zoekopdracht) return null;
  if ((dossier.zoekopdracht.emailKoper ?? "").trim().toLowerCase() !== pending.email) return null;

  return zetKlantdossierZoekopdracht(pending.dossierId, { ...dossier.zoekopdracht, emailKoperBevestigd: true });
}

// Verwijdert een klantdossier (#3). Rapportdata wordt NOOIT weggegooid (dat
// zou onomkeerbaar historische Altum-data kosten die de organisatie al
// betaald heeft) -- rapporten die aan dit dossier hingen blijven gewoon
// bestaan in de organisatiebrede /rapporten-lijst, alleen ontkoppeld
// (klantId -> null) zodat er nergens een rapport overblijft dat naar een
// niet-bestaand dossier verwijst. Matches (hieronder) horen wél specifiek bij
// dit dossier en hebben geen zelfstandige waarde -- die worden dus wel
// meeverwijderd.
export async function verwijderKlantdossier(id: string): Promise<boolean> {
  const dossier = await getKlantdossier(id);
  if (!dossier) return false;

  const rapportIds = await kvZRangeByScore(klantRapportenIndexKey(id), VER_IN_DE_TOEKOMST);
  for (const rapportId of rapportIds) {
    const rapport = await getRapportAanvraag(rapportId);
    if (rapport) {
      await kvSet(rapportKey(rapportId), JSON.stringify({ ...rapport, klantId: null }));
    }
  }

  const matchIds = await kvZRangeByScore(klantMatchenIndexKey(id), VER_IN_DE_TOEKOMST);
  for (const matchId of matchIds) {
    await kvDel(matchKey(matchId));
  }
  await kvDel(klantMatchenIndexKey(id));

  await kvDel(klantKey(id));
  await kvDel(klantRapportenIndexKey(id));
  await kvZRem(orgKlantenIndexKey(dossier.orgId), id);
  return true;
}

// --- Woning-matches (Funda e.d.) ---------------------------------------------

export async function maakMatch(match: Omit<B2bWoningMatch, "id" | "gevondenOp">): Promise<B2bWoningMatch> {
  const record: B2bWoningMatch = {
    ...match,
    id: randomUUID(),
    gevondenOp: new Date().toISOString(),
  };
  await kvSet(matchKey(record.id), JSON.stringify(record));
  await kvZAdd(klantMatchenIndexKey(record.klantId), Date.now(), record.id);
  return record;
}

// BUGFIX (Sjoerd: "bij minimaal 60m² geeft die nog steeds woningen van 54
// m²"): match.verificatie is tot nu toe een EENMALIGE snapshot van het
// moment waarop de match werd gevonden (zie maakMatch hierboven) -- die
// wordt daarna nooit meer ververst, alleen opnieuw GETOETST (zie
// ruimVerouderdeMatchenOp). Als de scrape op het vindmoment een veld niet
// kon lezen (bv. woonoppervlak: null, zie de "kon niet worden vastgesteld"-
// bugfixes in fundaFeed.ts), dan bleef dat veld voor ALTIJD null, ook nadat
// de scraper zelf inmiddels gefixt was -- faaltOppervlak() behandelt
// "onbekend" bewust nooit als afwijzingsgrond, dus zo'n match bleef stilzwijgend
// staan, ook al was de woning in werkelijkheid te klein. Deze functie
// persisteert een ververste verificatie-snapshot zodat zo'n match zich maar
// ÉÉN keer hoeft te "herstellen" -- zie de her-verificatiestap in
// ruimVerouderdeMatchenOp hieronder.
export async function bijwerkenMatchVerificatie(match: B2bWoningMatch, verificatie: B2bMatchVerificatie): Promise<void> {
  const bijgewerkt: B2bWoningMatch = { ...match, verificatie };
  await kvSet(matchKey(match.id), JSON.stringify(bijgewerkt));
}

// "Bewaar als interessant" (zie het Cowork-gesprek "Bewaar als interessant"):
// een handmatige markering zodat de makelaar een match kan vastzetten terwijl
// hij meerdere kandidaten verzamelt, vóórdat hij kiest welke een volledig
// rapport verdienen. Beschermt tegen de WEERGAVELIMIET (kapMatchenOpMax, zie
// hieronder) ÉN tegen automatisch opruimen bij een gewijzigde zoekopdracht of
// gewijzigde beschikbaarheid (zie ruimVerouderdeMatchenOp hieronder) -- zie
// het latere Cowork-gesprek "favoriet alleen verwijderen als de koper
// daarop klikt": een favoriet verdwijnt alleen nog als de makelaar 'm zelf
// weer uitvinkt (interessant: false), nooit meer stilzwijgend door een
// achtergrondtaak. De UI toont wel een status-badge als een favoriet niet
// meer aan de huidige zoekopdracht voldoet of niet meer beschikbaar is (zie
// MatchesKaart.tsx), zodat dat nooit onopgemerkt blijft.
export async function zetMatchInteressant(match: B2bWoningMatch, interessant: boolean): Promise<B2bWoningMatch> {
  const bijgewerkt: B2bWoningMatch = { ...match, interessant };
  await kvSet(matchKey(match.id), JSON.stringify(bijgewerkt));
  return bijgewerkt;
}

export async function listMatchenVoorKlant(klantId: string): Promise<B2bWoningMatch[]> {
  const ids = await kvZRangeByScore(klantMatchenIndexKey(klantId), VER_IN_DE_TOEKOMST);
  const matches = await Promise.all(ids.map(async (id) => {
    const raw = await kvGet(matchKey(id));
    return raw ? (JSON.parse(raw) as B2bWoningMatch) : null;
  }));
  return matches.filter((m): m is B2bWoningMatch => m !== null).reverse();
}

export async function verwijderMatch(match: Pick<B2bWoningMatch, "id" | "klantId">): Promise<void> {
  await kvDel(matchKey(match.id));
  await kvZRem(klantMatchenIndexKey(match.klantId), match.id);
}

// BUGFIX: matches werden alleen ooit TOEGEVOEGD, nooit opgeruimd -- verlaagde
// je het budget, dan bleven eerder gevonden woningen boven dat nieuwe budget
// gewoon zichtbaar staan. Wordt aangeroepen vóór een nieuwe matches-
// verversen/cron-ronde: verwijdert bestaande matches die niet meer voldoen,
// en geeft de resterende (nog wel passende) matches terug zodat de
// aanroeper daarna nog weet welke URL's al bekend zijn (voor de dedupe-stap).
//
// MATCHINGMODEL V3 (zie het Cowork-gesprek hierover, "ik twijfel over ons
// filtersysteem met punten"): dit herverifieerde onder v2 de volledige
// match-score (berekenMatchScore) en keek of die nog boven de
// MIN_MATCH_SCORE-drempel (60) uitkwam. Dat concept is vervangen door
// voldoetAanHardeEisen() -- de 8 harde eisen uit fase 1 (budget, locatie,
// woningtype, kamers, oppervlak, buitenruimte, energielabel,
// beschikbaarheid), ALTIJD verplicht. Voldoet een bestaande match niet meer
// aan één daarvan (bv. door een gewijzigd budget/locatievoorkeur, of doordat
// de woning inmiddels onder bod/verkocht is), dan gaat hij eruit -- geen
// scoreberekening meer nodig om dat vast te stellen (voldoetAanHardeEisen is
// synchroon en triggert nooit een CBS-voorzieningenopzoeking), dus dit is nu
// ook goedkoper dan voorheen.
//
// VERVOLG (Sjoerd: "bij minimaal 60m² geeft die nog steeds woningen van 54
// m², ook bij andere fix dit nu goed"): "opnieuw toetsen" gebeurde tot nu toe
// tegen de BEVROREN verificatie-snapshot van het vindmoment (match.
// verificatie) -- als daarin een veld ontbrak (scrape-gat, zie de
// woonoppervlak-bugfixes in fundaFeed.ts), bleef dat veld voor altijd null en
// werd de bijbehorende harde eis dus voor altijd als "onbekend, niet
// afwijzen" behandeld, zelfs nadat de scraper zelf allang was gefixt. Elke
// match met zo'n gat krijgt hieronder eerst een verse detailpagina-fetch
// (haalListingDetails, fundaFeed.ts) voordat hij tegen de harde eisen wordt
// getoetst -- en die verse snapshot wordt meteen ook opgeslagen
// (bijwerkenMatchVerificatie), zodat een match zich maar één keer hoeft te
// "herstellen".
//
// Velden die voldoetAanHardeEisen() daadwerkelijk raadpleegt (oppervlak,
// kamers, energielabel, beschikbaarheid, woningtype) EN die op een normale
// Funda-detailpagina altijd behoren te bestaan (in tegenstelling tot bv.
// perceeloppervlak, dat bij appartementen legitiem altijd null is) -- zie
// bijwerkenMatchVerificatie hierboven voor de bug die dit oplost.
//
// UITBREIDING (klacht "slaapkamers onbekend in de favorieten-vergelijking,
// die zijn niet onbekend, gewoon opzoeken"): slaapkamers staat NIET in
// voldoetAanHardeEisen() (geen harde eis), dus stond hier eerder niet in de
// lijst -- maar Funda scrapet dat veld wél altijd apart (zie de losse
// slaapkamers-regex in leesLokaleVerificatieData, fundaFeed.ts, dezelfde
// icoonrij als m²/energielabel), dus een `null` hier is een scrape-gat, geen
// legitiem "bestaat niet" zoals bij perceeloppervlak. Zonder dit hier mee te
// toetsen bleef zo'n gat voor altijd null staan (nooit een aanleiding voor
// herverificatie), en dat is precies wat de favorieten-vergelijktabel als
// "onbekend" liet zien terwijl Funda het gewoon toont.
function heeftOnvolledigeVerificatie(v: B2bMatchVerificatie | null): boolean {
  if (!v) return true;
  return (
    v.woonoppervlak == null ||
    v.kamers == null ||
    v.slaapkamers == null ||
    v.energielabel == null ||
    v.status == null ||
    v.woningtypeFamilie == null
  );
}

// Bovengrens op het aantal her-verificatie-fetches per aanroep: dit voegt
// een echte Funda-detailpagina-fetch toe (dezelfde proxy/kosten als een
// nieuwe kandidaat, zie fundaFeed.ts) -- bij veel dossiers met verouderde
// snapshots mag dit de TIJDSBUDGET_MS van de cron (matches-controleren/
// route.ts) niet laten ontsporen. 5 is ruim genoeg om normale gevallen (een
// handvol matches met een gat) in één ronde te helen; de rest volgt gewoon
// bij de volgende aanroep.
const MAX_HERVERIFICATIES_PER_AANROEP = 5;

// BEWUSTE UITZONDERING (zie het Cowork-gesprek "favoriet alleen verwijderen
// als de koper daarop klikt"): favorieten (match.interessant === true)
// worden hieronder NOOIT automatisch opgeruimd, ook niet als ze niet meer
// aan de (inmiddels gewijzigde) harde eisen voldoen of niet meer
// "beschikbaar" zijn. Dit is een bewuste omkering van het eerdere gedrag
// (zie de oudere versie van deze functie in de git-geschiedenis, "een
// favoriet die naar een verkochte woning wijst helpt niemand") -- de
// makelaar wil zelf bepalen wanneer een favoriet verdwijnt, niet dat de
// achtergrondtaak dat stilzwijgend voor hem doet. De verificatie-snapshot
// wordt voor favorieten wel gewoon ververst (zie de herverificatiestap
// hieronder) zodat de weergave (bv. de status-badge in MatchesKaart.tsx)
// actueel blijft, alleen VERWIJDEREN gebeurt niet meer automatisch.
export async function ruimVerouderdeMatchenOp(klantId: string, koperVoorkeuren: B2bKoperVoorkeuren | null): Promise<B2bWoningMatch[]> {
  const bestaande = await listMatchenVoorKlant(klantId);
  if (!koperVoorkeuren) {
    // Geen voorkeurenlijst (meer) ingevuld -- er is dan niets om niet-
    // favoriete matches tegen te toetsen, die gaan eruit. Favorieten
    // blijven staan (zie de toelichting hierboven).
    for (const match of bestaande) {
      if (!match.interessant) await verwijderMatch(match);
    }
    return bestaande.filter((m) => m.interessant === true);
  }
  const passend: B2bWoningMatch[] = [];
  let herverificaties = 0;
  for (const match of bestaande) {
    let teToetsen = match;
    if (herverificaties < MAX_HERVERIFICATIES_PER_AANROEP && heeftOnvolledigeVerificatie(match.verificatie)) {
      herverificaties++;
      const verse = await haalListingDetails(match.url).catch(() => null);
      if (verse?.verificatie) {
        teToetsen = { ...match, verificatie: verse.verificatie };
        await bijwerkenMatchVerificatie(match, verse.verificatie);
      }
    }
    if (match.interessant === true) {
      passend.push(teToetsen);
      continue;
    }
    const { voldoet } = voldoetAanHardeEisen(teToetsen, koperVoorkeuren);
    if (voldoet) {
      passend.push(teToetsen);
    } else {
      await verwijderMatch(match);
    }
  }
  return passend;
}

// "Maximaal 30 resultaten" (MAX_ZICHTBARE_MATCHEN) is een bewuste, harde
// grens (zie het gesprek hierover): een matchlijst die blijft aangroeien
// totdat hij half uit verouderde/marginale treffers bestaat is erger dan
// gewoon eerlijk minder tonen. Wordt aangeroepen NA het opslaan van nieuwe
// matches.
//
// VEREENVOUDIGING (Sjoerd, "vragenlijst echt inkorten tot alleen harde
// eisen" / "score helemaal weg"): dit rangschikte een tijdlang op
// matchingsscore (berekenMatchScore) en liet de LAAGST scorende matches als
// eerste wegvallen -- dat scoreproces bestaat niet meer (zie matchScore.ts).
// Terug naar FIFO (oudste-eerst): `listMatchenVoorKlant` geeft al newest-
// first terug, dus de oudste matches staan aan het EIND van `huidige`. Een
// match met een gekoppeld Kooprapport (vindGekoppeldRapport) blijft
// beschermd, ongeacht leeftijd -- de makelaar heeft daar al tijd in
// gestoken, die mag nooit stilzwijgend uit het overzicht verdwijnen. Zijn er
// méér beschermde matches dan maxAantal, dan wordt de cap bewust niet
// gehaald -- bescherming gaat voor de weergavelimiet.
//
// UITBREIDING ("Bewaar als interessant"): een match die de makelaar
// handmatig heeft gemarkeerd (zetMatchInteressant, zie hierboven) is even
// beschermd als een match met een gekoppeld rapport -- ook daar is al een
// bewuste keuze in gestoken.
//
// Alle matches die hier binnenkomen, voldoen al aan de harde eisen (dat is
// al gegarandeerd vóór het opslaan, zie matches-verversen/route.ts en
// cron/matches-controleren/route.ts, en ruimVerouderdeMatchenOp() hierboven
// ruimt bestaande matches op zodra dat niet meer zo is) -- dit is dus puur
// een weergavelimiet, geen tweede afwijzingsronde.
export async function kapMatchenOpMax(klantId: string, maxAantal: number): Promise<void> {
  const huidige = await listMatchenVoorKlant(klantId); // newest-first
  if (huidige.length <= maxAantal) return;

  const rapporten = await listRapportenVoorKlant(klantId);
  const beschermdeIds = new Set(
    huidige.filter((m) => m.interessant === true || vindGekoppeldRapport(m.titel, rapporten) != null).map((m) => m.id)
  );

  const teVeel = huidige.length - maxAantal;
  const kandidaten = huidige.filter((m) => !beschermdeIds.has(m.id));
  // `kandidaten` staat nog steeds newest-first -- de laatste `teVeel`
  // elementen zijn dus de OUDSTE onbeschermde matches. `slice` met een
  // negatieve start die groter is dan de array clampt vanzelf naar het
  // begin, dus als er minder onbeschermde kandidaten zijn dan `teVeel`
  // worden die simpelweg allemaal verwijderd (bescherming gaat voor de cap).
  const teVerwijderen = kandidaten.slice(-teVeel);

  for (const match of teVerwijderen) {
    await verwijderMatch(match);
  }
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
  uitgenodigdDoorUserId: string,
  rol: B2bGebruiker["rol"] = "lid"
): Promise<B2bUitnodiging> {
  const nu = new Date();
  const record: B2bUitnodiging = {
    id: randomUUID(),
    orgId,
    email: email.trim().toLowerCase(),
    token: randomBytes(24).toString("hex"),
    rol,
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

// Uitnodiging intrekken -- verwijdert zowel het record zelf als de
// token-lookup (zodat een al gekopieerde link niet blijft werken) en de
// index-vermelding. orgId wordt meegegeven en gecontroleerd door de
// aanroepende route, niet hier -- zelfde verantwoordelijkheidsverdeling als
// de andere store-functies in dit bestand.
export async function verwijderUitnodiging(id: string): Promise<void> {
  const raw = await kvGet(uitnodigingKey(id));
  if (!raw) return;
  const uitnodiging = JSON.parse(raw) as B2bUitnodiging;
  await kvSet(uitnodigingKey(id), "", 1);
  await kvSet(uitnodigingByTokenKey(uitnodiging.token), "", 1);
  await kvZRem(orgUitnodigingenIndexKey(uitnodiging.orgId), id);
}

export async function getUitnodiging(id: string): Promise<B2bUitnodiging | null> {
  const raw = await kvGet(uitnodigingKey(id));
  return raw ? (JSON.parse(raw) as B2bUitnodiging) : null;
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
