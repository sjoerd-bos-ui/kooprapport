import type { AddressMeta, Report } from "@/types/report";

// -----------------------------------------------------------------------------
// B2B-dashboard voor (aankoop)makelaars en hypotheekadviseurs — "Kooprapport
// Zakelijk". Losstaand domein van de consumentenflow (types/report.ts blijft
// ongewijzigd): een organisatie neemt een abonnement met een maandelijks
// quotum, gebruikers binnen die organisatie vragen daarbinnen volledige
// rapporten op (geen paywall per rapport, dat is precies het verschil met de
// consumentenkant), gekoppeld aan een optioneel klantdossier.
//
// ONBOARDING: bewust GEEN zelfregistratie (zie het Cowork-gesprek hierover)
// — een organisatie wordt aangemaakt via de beveiligde admin-route
// (app/api/admin/zakelijk/organisaties/route.ts), zelfde ADMIN_SECRET-patroon
// als app/api/admin/kortingscode/route.ts. Dat past bij een kleinere,
// sales-achtige doelgroep i.p.v. een publiek self-service-formulier.
//
// PERSISTENTIE: er is in dit project geen relationele database, alleen de
// generieke kvStore (lib/services/kvStore.ts, Upstash Redis of een in-memory
// fallback). Voor een eerste werkende versie is dat voldoende (zie
// lib/services/b2bStore.ts voor de sleutelstructuur), maar voordat hier
// betalende klanten met echte facturatiehistorie op draaien, hoort dit
// vervangen te worden door een echte database (bv. Postgres) — dezelfde
// pragmatische mock/live-aanpak als de rest van dit project, alleen dan wel
// een keer daadwerkelijk gemigreerd.
// -----------------------------------------------------------------------------

export type B2bAbonnementTier = "starter" | "pro" | "kantoor";

export interface B2bAbonnementTierInfo {
  tier: B2bAbonnementTier;
  label: string;
  quotumPerMaand: number;
  prijsPerMaandLabel: string; // weergavetekst, geen los bedragveld -- nog geen echte Mollie-koppeling
}

// Indicatieve tiers -- prijzen zijn nog niet met een echte
// Mollie-abonnementenkoppeling geverifieerd (zie de toelichting bij
// lib/config/payment.ts: Mollie was tot nu toe bewust alleen voor
// eenmalige betalingen). Aanpassen zodra de daadwerkelijke prijsstelling
// vaststaat.
export const B2B_ABONNEMENT_TIERS: B2bAbonnementTierInfo[] = [
  { tier: "starter", label: "Starter", quotumPerMaand: 10, prijsPerMaandLabel: "op aanvraag" },
  { tier: "pro", label: "Pro", quotumPerMaand: 50, prijsPerMaandLabel: "op aanvraag" },
  { tier: "kantoor", label: "Kantoor", quotumPerMaand: 150, prijsPerMaandLabel: "op aanvraag" },
];

export function getTierInfo(tier: B2bAbonnementTier): B2bAbonnementTierInfo {
  return B2B_ABONNEMENT_TIERS.find((t) => t.tier === tier) ?? B2B_ABONNEMENT_TIERS[0];
}

// Eigen huisstijl op alles wat een EINDKLANT te zien krijgt (het gedeelde
// rapport, zie app/deelrapport/[token]) -- alle velden optioneel, zodat een
// kantoor zonder ingevulde branding gewoon de standaard Kooprapport-uitstraling
// behoudt. Geen file-upload-infrastructuur in dit project (zie ook de
// widget-/badge-aanpak in instellingen), dus een logo is een geplakte URL,
// geen upload.
export interface B2bBranding {
  weergaveNaam: string | null; // bv. "Jansen Makelaars" i.p.v. "Kooprapport" op het gedeelde rapport
  logoUrl: string | null;
  accentKleur: string | null; // hex, bv. "#0F766E" -- toegepast via inline style, niet via Tailwind-config (per-org, geen build-time kleur)
}

export interface B2bOrganisatie {
  id: string;
  naam: string;
  slug: string; // gebruikt in de widget-embedcode (data-kantoor="<slug>")
  tier: B2bAbonnementTier;
  quotumPerMaand: number; // los van getTierInfo() opgeslagen, zodat een individuele afspraak kan afwijken van de standaardtier
  aangemaaktOp: string; // ISO
  // Onderstaande velden zijn later toegevoegd -- bestaande, al opgeslagen
  // organisaties hebben deze niet, dus overal defensief lezen (?? fallback),
  // nooit aannemen dat ze bestaan.
  werkgebiedRegios?: string[]; // exacte MarktupdateRegioRij.naam-waarden (zie lib/services/marktAlert.ts) -- bewust GEEN COROP-regionamen, om nooit te hoeven fuzzy-matchen tussen twee losse naamgevingen
  branding?: B2bBranding;
}

export type B2bRol = "eigenaar" | "lid";

export interface B2bGebruiker {
  id: string;
  orgId: string;
  naam: string;
  email: string; // genormaliseerd (lowercase) als opslagsleutel, zie b2bStore.ts
  rol: B2bRol;
  wachtwoordHash: string;
  wachtwoordSalt: string;
  aangemaaktOp: string; // ISO
}

export type B2bDossierType = "aankoop" | "verkoop";
export type B2bDossierStatus = "lopend" | "afgerond";

// Essentiële informatie uit de zoekopdracht (#3) -- bewust een klein, vast
// setje vrije velden i.p.v. een los notitieveld: budget en locatie zijn de
// twee dingen die een makelaar bij vrijwel elk aankooptraject nodig heeft om
// snel een nieuw rapport te kunnen beoordelen ("past dit binnen het budget
// van deze klant?"). Alles optioneel/nullable, want een dossier kan zonder
// ingevulde zoekopdracht bestaan (bestaande dossiers hebben dit veld niet).
export interface B2bZoekopdracht {
  budgetMin: number | null;
  budgetMax: number | null;
  locatieVoorkeur: string | null; // vrije tekst, bv. "Rotterdam-Zuid, max 20 min. naar centrum"
  moetHebben: string | null; // vrije tekst, bv. "min. 4 kamers, tuin op het zuiden, geen begane grond"
}

// Matching op nieuwe woningaanbiedingen (Funda e.d.) die aan de zoekopdracht
// voldoen. Bewust een APARTE, expliciet door de makelaar ingevulde `plaats`
// i.p.v. deze af te leiden uit zoekopdracht.locatieVoorkeur (vrije tekst,
// zie B2bZoekopdracht hierboven) -- dezelfde "nooit fuzzy-matchen tussen twee
// losse naamgevingen"-discipline als bij werkgebiedRegios/REGIO_OVERBIEDEN:
// een verkeerd geraden plaatsnaam zou een lege of verkeerde feed opleveren
// zonder dat iemand dat meteen doorheeft.
export interface B2bMatchInstelling {
  actief: boolean;
  plaats: string; // exacte Funda-plaatsnaam, bv. "rotterdam" (lowercase, geen spaties -- zie lib/data-sources/fundaFeed.ts)
}

export interface B2bKlantdossier {
  id: string;
  orgId: string;
  klantnaam: string;
  type: B2bDossierType;
  status: B2bDossierStatus;
  aangemaaktOp: string; // ISO
  aangemaaktDoorUserId: string;
  zoekopdracht?: B2bZoekopdracht;
  matchInstelling?: B2bMatchInstelling;
}

// Eén gevonden woningadvertentie die aan de zoekopdracht van een klant
// voldoet (zie app/api/cron/matches-controleren/route.ts). `bron` is bewust
// een union (nu alleen "funda") zodat een volgende platform (Pararius,
// Jaap.nl) later zonder migratie toegevoegd kan worden.
export type B2bMatchBron = "funda";

export interface B2bWoningMatch {
  id: string;
  klantId: string;
  orgId: string;
  bron: B2bMatchBron;
  titel: string;
  url: string;
  prijsLabel: string | null;
  fotoUrl: string | null;
  gevondenOp: string; // ISO
}

export interface B2bRapportAanvraag {
  id: string;
  orgId: string;
  klantId: string | null;
  aangevraagdDoorUserId: string;
  adres: AddressMeta;
  report: Report;
  aangemaaktOp: string; // ISO
  // Los, herroepbaar deel-token (zie lib/services/b2bDeelrapport.ts) --
  // BEWUST niet gewoon het rapport-id zelf gebruiken als publieke link: een
  // los token kan ingetrokken/opnieuw gegenereerd worden zonder de rapport-id
  // (en daarmee alle interne links ernaar) te veranderen.
  deelToken?: string | null;
}

export interface B2bSessieData {
  userId: string;
  orgId: string;
}

// --- Teamuitnodigingen -------------------------------------------------------
// Zie lib/services/b2bStore.ts (maakUitnodiging/etc.) en
// app/api/zakelijk/team/uitnodigen/route.ts. Een uitnodiging is een los
// record met een eigen token (mailtoken, niet de sessie-token), zodat de
// ontvanger via een publieke link (geen login nodig) een wachtwoord kan
// instellen en zo lid wordt van de organisatie.
export interface B2bUitnodiging {
  id: string;
  orgId: string;
  email: string; // genormaliseerd (lowercase)
  token: string;
  rol: B2bRol; // rol die de uitgenodigde krijgt zodra de uitnodiging geaccepteerd wordt
  uitgenodigdDoorUserId: string;
  aangemaaktOp: string; // ISO
  verlooptOp: string; // ISO -- 7 dagen geldig
  status: "open" | "geaccepteerd";
}

// --- Zelfbediening abonnement -------------------------------------------------
// Zie lib/services/b2bStore.ts en app/api/zakelijk/abonnement/wijzigen/route.ts.
// BEWUST geen automatische Mollie-incasso hier: er is in dit project alleen
// een eenmalige-betaling-koppeling met Mollie (zie lib/config/payment.ts),
// geen abonnementen-API. Dit registreert een wijzigingsverzoek en informeert
// Sjoerd per e-mail, zodat het quotum/tier handmatig bevestigd/verwerkt kan
// worden -- geen stille aanname dat er al automatisch geïncasseerd wordt.
export interface B2bTierWijzigingsverzoek {
  id: string;
  orgId: string;
  huidigeTier: B2bAbonnementTier;
  gewensteTier: B2bAbonnementTier;
  aangevraagdDoorUserId: string;
  aangemaaktOp: string; // ISO
  status: "openstaand" | "verwerkt";
}
