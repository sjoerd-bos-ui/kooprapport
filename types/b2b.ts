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

// Structured locatie -- gekozen via de PDOK-gevoede autocomplete (plaatsen
// EN wijken, zie lib/services/plaatsLookup.ts), i.p.v. de eerdere vrije-tekst
// "locatieVoorkeur". `plaatsSlug`/`wijkSlug` zijn daardoor meteen ook de
// exacte Funda-zoekslugs -- dezelfde "nooit fuzzy-matchen tussen twee losse
// naamgevingen"-discipline als eerder bij werkgebiedRegios, maar nu opgelost
// dóór het los te leggen als aparte, gestructureerde velden i.p.v. door een
// los duplicaat-veld (het eerdere B2bMatchInstelling.plaats) te verplichten.
export interface B2bLocatie {
  label: string; // weergavetekst, bv. "Kralingen, Rotterdam" of "Rotterdam"
  plaatsSlug: string; // exacte Funda-plaatsslug, bv. "rotterdam"
  wijkSlug: string | null; // exacte Funda-wijkslug indien een wijk gekozen is, anders null (= hele plaats)
}

export type B2bWoningtype = "tussenwoning" | "hoekwoning" | "2-onder-1-kapwoning" | "vrijstaande-woning" | "appartement";

export const B2B_WONINGTYPES: { waarde: B2bWoningtype; label: string }[] = [
  { waarde: "tussenwoning", label: "Tussenwoning" },
  { waarde: "hoekwoning", label: "Hoekwoning" },
  { waarde: "2-onder-1-kapwoning", label: "2-onder-1-kapwoning" },
  { waarde: "vrijstaande-woning", label: "Vrijstaand" },
  { waarde: "appartement", label: "Appartement" },
];

// Energielabel als "X of beter"-classificatie i.p.v. losse per-label
// vinkjes -- Funda's eigen filter heeft 12 losse checkboxes
// (A+++++ t/m G, live geverifieerd via het filterpaneel), maar niemand
// filtert in de praktijk op dat niveau van precisie. Deze 7 waarden zijn
// een bewuste, eigen vereenvoudiging: "A" dekt bij het opbouwen van de
// Funda-zoekopdracht automatisch ook A+ t/m A+++++ mee (zie
// ENERGIELABEL_NAAR_FUNDA_WAARDEN in lib/data-sources/fundaFeed.ts).
export type B2bEnergielabel = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export const B2B_ENERGIELABELS: B2bEnergielabel[] = ["A", "B", "C", "D", "E", "F", "G"];

// Vaste, gestructureerde kenmerken i.p.v. de eerdere vrije-tekst "moetHebben"
// -- bewust, want vrije tekst ("min. 4 kamers, tuin op het zuiden") is voor
// een mens leesbaar maar onbruikbaar als filter op de Funda-feed. Elk
// kenmerk hier komt direct overeen met een (vermoedelijk) filter-padsegment
// van de feed, zie bouwZoekpad() in lib/data-sources/fundaFeed.ts.
export interface B2bKenmerken {
  woningtype: B2bWoningtype | null;
  minKamers: number | null;
  minSlaapkamers: number | null;
  minWoonoppervlak: number | null; // in m²
  tuin: boolean;
  balkon: boolean;
  dakterras: boolean;
  garage: boolean;
  lift: boolean;
  // "geen voorkeur" is bewust ook een expliciete keuze (null), niet een
  // afwezige/vergeten instelling -- zie het gesprek hierover.
  minEnergielabel: B2bEnergielabel | null;
}

export function legeKenmerken(): B2bKenmerken {
  return {
    woningtype: null,
    minKamers: null,
    minSlaapkamers: null,
    minWoonoppervlak: null,
    tuin: false,
    balkon: false,
    dakterras: false,
    garage: false,
    lift: false,
    minEnergielabel: null,
  };
}

// Essentiële informatie uit de zoekopdracht (#3) -- budget, locatie en
// kenmerken. `matchenActief` vervangt het eerdere losse
// B2bMatchInstelling-veld: nu de locatie al gestructureerd/exact is, heeft
// de matchfunctie (#2) geen eigen duplicaat-plaatsveld meer nodig en is het
// gewoon een aan/uit-stand op dezelfde zoekopdracht. Alles optioneel/
// nullable, want een dossier kan zonder ingevulde zoekopdracht bestaan.
export interface B2bZoekopdracht {
  budgetMin: number | null;
  budgetMax: number | null;
  locatie: B2bLocatie | null;
  kenmerken: B2bKenmerken;
  matchenActief: boolean;
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
  prijs: number | null; // ruwe waarde (voor budgetvergelijking) -- prijsLabel is alleen de weergavetekst
  prijsLabel: string | null;
  fotoUrl: string | null;
  // Locatie (B2bLocatie.label) van de zoekopdracht op het moment dat deze
  // match gevonden werd -- nodig om matches van een INMIDDELS GEWIJZIGDE
  // locatie te kunnen herkennen en opruimen (zie ruimVerouderdeMatchenOp in
  // b2bStore.ts), zelfde reden als het prijs-veld hierboven voor budget.
  locatieLabel: string | null;
  gevondenOp: string; // ISO
}

// Harde grens op het aantal getoonde matches (zie b2bStore.ts#kapMatchenOpMax)
// -- bewuste keuze: liever eerlijk "maximaal 10, en anders minder" dan een
// lijst die blijft aangroeien met steeds oudere/marginale treffers.
export const MAX_ZICHTBARE_MATCHEN = 10;

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
