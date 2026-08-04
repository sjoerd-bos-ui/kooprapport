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

export interface B2bOrganisatie {
  id: string;
  naam: string;
  slug: string; // gebruikt in de widget-embedcode (data-kantoor="<slug>")
  tier: B2bAbonnementTier;
  quotumPerMaand: number; // los van getTierInfo() opgeslagen, zodat een individuele afspraak kan afwijken van de standaardtier
  aangemaaktOp: string; // ISO
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

export interface B2bKlantdossier {
  id: string;
  orgId: string;
  klantnaam: string;
  type: B2bDossierType;
  status: B2bDossierStatus;
  aangemaaktOp: string; // ISO
  aangemaaktDoorUserId: string;
}

export interface B2bRapportAanvraag {
  id: string;
  orgId: string;
  klantId: string | null;
  aangevraagdDoorUserId: string;
  adres: AddressMeta;
  report: Report;
  aangemaaktOp: string; // ISO
}

export interface B2bSessieData {
  userId: string;
  orgId: string;
}
