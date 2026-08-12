# Migratieplan: KV-store → Postgres (Kooprapport Zakelijk)

Status: **schema/plan klaar, nog niet gebouwd**. Wacht op een `DATABASE_URL`
(Vercel Postgres/Neon) in `.env.local` — zie stap 0 hieronder. Dit document
is de opzet waarmee de daadwerkelijke migratie daarna in één keer goed kan.

## 0. Wat ik nodig heb om te starten

1. In het Vercel-dashboard van dit project: **Storage → Create Database →
   Postgres** (Neon-backed, gratis tier is genoeg om mee te beginnen).
2. De connection string die dat oplevert in `.env.local` zetten als
   `DATABASE_URL` (en later ook als env var op het echte Vercel-project,
   zodat productie 'm ook heeft).

Zodra die var er is, kan ik de schema hieronder daadwerkelijk aanmaken en
`lib/services/b2bStore.ts` ombouwen.

## 1. Scope: wat verhuist, wat blijft op de KV-store

Niet alles hoeft naar Postgres. Twee soorten data in dit project, met een
bewust verschillende bestemming:

**Verhuist naar Postgres** (duurzame, relationele bedrijfsdata — dít is de
reden voor deze migratie: "voordat hier betalende klanten met echte
facturatiehistorie op draaien, hoort dit vervangen te worden door een echte
database", zie types/b2b.ts):
- Organisaties, gebruikers, klantdossiers, woning-matches, rapportaanvragen,
  teamuitnodigingen, tier-wijzigingsverzoeken, quotumverbruik.

**Blijft op de KV-store** (inherent kortlevend/TTL-gebaseerd — daar is een
Redis-achtige store juist wél de juiste tool voor, Postgres heeft geen
ingebouwde TTL):
- Sessies (`lib/services/b2bAuth.ts`, 30 dagen TTL, cookie-gekoppeld token).
- Koper-mail-bevestigingstokens (`koper-mail-pending:*`, 7 dagen TTL).
- Rate limiting (`lib/services/rateLimit.ts`).
- Alles buiten Zakelijk (consumenten-bestellingen, marktupdate-abonnees,
  kortingscodes, afmeldlijst) — dat blijft ongemoeid, dit plan gaat
  specifiek over de Zakelijk-app (`b2bStore.ts`).

Dit betekent: `lib/services/kvStore.ts` blijft gewoon bestaan naast de
nieuwe Postgres-laag — geen vervanging, een aanvulling voor wat écht
kortlevend is.

## 2. Postgres-schema

```sql
-- Organisaties -----------------------------------------------------------
CREATE TABLE b2b_organisaties (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  tier              TEXT NOT NULL CHECK (tier IN ('starter', 'pro', 'kantoor')),
  quotum_per_maand  INTEGER NOT NULL,
  werkgebied_regios TEXT[],              -- NULL = nog niet ingesteld
  branding          JSONB,               -- { weergaveNaam, logoUrl, accentKleur } -- klein, altijd als geheel gelezen/geschreven, geen kolommen nodig
  aangemaakt_op     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gebruikers ---------------------------------------------------------------
CREATE TABLE b2b_gebruikers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES b2b_organisaties(id) ON DELETE CASCADE,
  naam              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,   -- genormaliseerd (lowercase) bij het schrijven
  rol               TEXT NOT NULL CHECK (rol IN ('eigenaar', 'lid')),
  wachtwoord_hash   TEXT NOT NULL,
  wachtwoord_salt   TEXT NOT NULL,
  aangemaakt_op     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_b2b_gebruikers_org ON b2b_gebruikers(org_id);

-- Klantdossiers (incl. ingebedde zoekopdracht) ------------------------------
CREATE TABLE b2b_klantdossiers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID NOT NULL REFERENCES b2b_organisaties(id) ON DELETE CASCADE,
  klantnaam                   TEXT NOT NULL,
  type                        TEXT NOT NULL CHECK (type IN ('aankoop', 'verkoop')),
  status                      TEXT NOT NULL CHECK (status IN ('lopend', 'afgerond')),
  aangemaakt_op               TIMESTAMPTZ NOT NULL DEFAULT now(),
  aangemaakt_door_user_id     UUID NOT NULL REFERENCES b2b_gebruikers(id),
  -- Zoekopdracht: veelgebruikte filtervelden als eigen kolom (de cron-route
  -- filtert hier direct op: matchen_actief/mail_bij_nieuwe_matches/
  -- email_koper_bevestigd), koperVoorkeuren zelf (8 velden incl. tot 3
  -- locaties) blijft één JSONB-blob -- wordt altijd in zijn geheel
  -- gelezen/geschreven (zetKoperVoorkeuren), nooit los bevraagd.
  zo_matchen_actief           BOOLEAN NOT NULL DEFAULT false,
  zo_koper_voorkeuren         JSONB,             -- NULL = nog niet ingevuld
  zo_koper_voorkeuren_token   TEXT UNIQUE,
  zo_email_koper              TEXT,
  zo_mail_bij_nieuwe_matches  BOOLEAN NOT NULL DEFAULT false,
  zo_email_koper_bevestigd    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_b2b_klantdossiers_org ON b2b_klantdossiers(org_id);
CREATE INDEX idx_b2b_klantdossiers_voorkeurentoken ON b2b_klantdossiers(zo_koper_voorkeuren_token) WHERE zo_koper_voorkeuren_token IS NOT NULL;
-- Voor de cron (matches-controleren/route.ts): snel alle dossiers vinden
-- met actief matchen zonder alle organisaties te hoeven doorlopen.
CREATE INDEX idx_b2b_klantdossiers_matchen_actief ON b2b_klantdossiers(id) WHERE zo_matchen_actief = true;

-- Woning-matches -------------------------------------------------------------
CREATE TABLE b2b_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id      UUID NOT NULL REFERENCES b2b_klantdossiers(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES b2b_organisaties(id) ON DELETE CASCADE,
  bron          TEXT NOT NULL DEFAULT 'funda',
  titel         TEXT NOT NULL,
  url           TEXT NOT NULL,
  prijs         INTEGER,
  prijs_label   TEXT,
  foto_url      TEXT,
  verificatie   JSONB,           -- B2bMatchVerificatie, ~20 velden, altijd als geheel gebruikt -- geen kolommen nodig
  gevonden_op   TIMESTAMPTZ NOT NULL DEFAULT now(),
  interessant   BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_b2b_matches_klant ON b2b_matches(klant_id);

-- Rapportaanvragen -------------------------------------------------------------
CREATE TABLE b2b_rapportaanvragen (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES b2b_organisaties(id) ON DELETE CASCADE,
  klant_id                  UUID REFERENCES b2b_klantdossiers(id) ON DELETE SET NULL,  -- NULL toegestaan: rapportdata overleeft het verwijderen van een dossier (zie verwijderKlantdossier in b2bStore.ts)
  aangevraagd_door_user_id  UUID NOT NULL REFERENCES b2b_gebruikers(id),
  adres                     JSONB NOT NULL,   -- AddressMeta
  report                    JSONB NOT NULL,   -- het VOLLEDIGE Report-object (groot, altijd opaak gebruikt -- PDF-generatie/weergave lezen dit als geheel)
  aangemaakt_op             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deel_token                TEXT UNIQUE
);
CREATE INDEX idx_b2b_rapporten_org ON b2b_rapportaanvragen(org_id);
CREATE INDEX idx_b2b_rapporten_klant ON b2b_rapportaanvragen(klant_id);

-- Teamuitnodigingen -------------------------------------------------------------
CREATE TABLE b2b_uitnodigingen (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES b2b_organisaties(id) ON DELETE CASCADE,
  email                     TEXT NOT NULL,
  token                     TEXT NOT NULL UNIQUE,
  rol                       TEXT NOT NULL CHECK (rol IN ('eigenaar', 'lid')),
  uitgenodigd_door_user_id  UUID NOT NULL REFERENCES b2b_gebruikers(id),
  aangemaakt_op             TIMESTAMPTZ NOT NULL DEFAULT now(),
  verloopt_op               TIMESTAMPTZ NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'geaccepteerd'))
);
CREATE INDEX idx_b2b_uitnodigingen_org ON b2b_uitnodigingen(org_id);
-- Geen native TTL in Postgres (in tegenstelling tot de huidige KV-versie,
-- die na 7 dagen vanzelf verdwijnt) -- queries filteren voortaan expliciet
-- op `verloopt_op > now()`, en een lichte periodieke cleanup (bv. een
-- dagelijkse cron, of gewoon een DELETE als bijvangst in getUitnodigingDoorToken)
-- ruimt verlopen rijen op.

-- Tier-wijzigingsverzoeken ---------------------------------------------------
CREATE TABLE b2b_tierwijzigingsverzoeken (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES b2b_organisaties(id) ON DELETE CASCADE,
  huidige_tier              TEXT NOT NULL,
  gewenste_tier             TEXT NOT NULL,
  aangevraagd_door_user_id  UUID NOT NULL REFERENCES b2b_gebruikers(id),
  aangemaakt_op             TIMESTAMPTZ NOT NULL DEFAULT now(),
  status                    TEXT NOT NULL DEFAULT 'openstaand' CHECK (status IN ('openstaand', 'verwerkt'))
);
CREATE INDEX idx_b2b_tierwijzigingen_org ON b2b_tierwijzigingsverzoeken(org_id);

-- Quotumverbruik --------------------------------------------------------------
-- Vervangt de KV-teller (usageKey, met TTL) door een echte, atomair
-- ophoogbare rij per organisatie+kalendermaand. Postgres kan dit in ÉÉN
-- statement doen (UPDATE ... SET aantal = aantal + 1 WHERE aantal < quotum
-- RETURNING aantal) -- eigenlijk een NETTERE atomaire garantie dan de
-- huidige kvIncrWithTtl-aanpak, geen aparte "was dit binnen quotum"-race.
CREATE TABLE b2b_quotumverbruik (
  org_id      UUID NOT NULL REFERENCES b2b_organisaties(id) ON DELETE CASCADE,
  jaar_maand  TEXT NOT NULL,     -- bv. "2026-08", zelfde formaat als huidigeJaarMaand() in b2bStore.ts
  aantal      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, jaar_maand)
);
```

## 3. Sleutel-mapping (KV → Postgres)

| Huidige KV-sleutel (b2bStore.ts)         | Wordt                                                          |
|-------------------------------------------|-----------------------------------------------------------------|
| `b2b-org:<id>`                            | rij in `b2b_organisaties`                                       |
| `b2b-alle-orgs` (index)                   | vervalt — `SELECT * FROM b2b_organisaties` kan direct           |
| `b2b-user:<id>` / `b2b-user-by-email:<e>` | rij in `b2b_gebruikers`, lookup via `WHERE email = $1`           |
| `b2b-org-users:<orgId>` (index)           | vervalt — `WHERE org_id = $1`                                   |
| `b2b-klant:<id>`                          | rij in `b2b_klantdossiers`                                       |
| `b2b-org-klanten:<orgId>` (index)         | vervalt — `WHERE org_id = $1 ORDER BY aangemaakt_op DESC`         |
| `b2b-koperVoorkeurenToken:<token>`        | vervalt — `WHERE zo_koper_voorkeuren_token = $1`                 |
| `koper-mail-pending:<token>`              | **blijft op KV** (TTL-gebaseerd, zie sectie 1)                   |
| `b2b-match:<id>`                          | rij in `b2b_matches`                                              |
| `b2b-klant-matches:<klantId>` (index)     | vervalt — `WHERE klant_id = $1 ORDER BY gevonden_op DESC`         |
| `b2b-rapport:<id>`                        | rij in `b2b_rapportaanvragen`                                     |
| `b2b-org-rapporten:<orgId>` / `b2b-klant-rapporten:<klantId>` (index) | vervalt — `WHERE org_id = $1` / `WHERE klant_id = $1` |
| `b2b-deeltoken:<token>`                   | vervalt — `WHERE deel_token = $1`                                 |
| `b2b-usage:<orgId>:<jaarMaand>`           | rij in `b2b_quotumverbruik`                                       |
| `b2b-uitnodiging:<id>` / `-token:<token>` | rij in `b2b_uitnodigingen`, lookup via `WHERE token = $1`          |
| `b2b-org-uitnodigingen:<orgId>` (index)   | vervalt — `WHERE org_id = $1 AND status = 'open' AND verloopt_op > now()` |
| `b2b-tierwijziging:<id>`                  | rij in `b2b_tierwijzigingsverzoeken`                                |
| `b2b-org-tierwijzigingen:<orgId>` (index) | vervalt — `WHERE org_id = $1`                                     |

Alle losse "index"-sorted-sets (kvZAdd/kvZRangeByScore) vervallen volledig —
dat was puur een noodoplossing omdat de KV-store geen "geef alles van
organisatie X"-query kent. Een gewone `WHERE org_id = $1`-query in Postgres
vervangt dat één-op-één, en is bovendien sneller (geen N+1: nu haalt
`listKlantdossiersVoorOrg` eerst een lijst id's op en doet dan N losse
`kvGet`-calls, straks is dat één query).

## 4. Wat blijft ONVERANDERD (belangrijk voor de rest van de app)

Alle ~70 exported functies in `b2bStore.ts` (`maakOrganisatie`,
`getKlantdossier`, `zetKlantdossierZoekopdracht`, `listMatchenVoorKlant`,
etc.) behouden exact dezelfde signatuur en hetzelfde teruggegeven
TypeScript-type. Alleen de IMPLEMENTATIE binnenin verandert (SQL i.p.v.
kvGet/kvSet/kvZAdd). Dat betekent: geen enkel ander bestand in de app hoeft
aangepast te worden — alle ~15 API-routes en componenten die `b2bStore.ts`
aanroepen (klanten-routes, cron, matches-verversen, rapporten-routes, etc.)
blijven ongewijzigd. Dit is bewust zo ontworpen: het risico zit in de
migratie zelf (dataconsistentie, één keer goed overzetten), niet in het
herschrijven van de hele app.

## 5. Migratiestappen (zodra `DATABASE_URL` er is)

1. Schema hierboven aanmaken (via `query_database`/migratie-script).
2. Eenmalig migratiescript: leest alle bestaande KV-sleutels
   (`b2b-org:*`, `b2b-user:*`, etc. — de huidige Upstash-store blijft
   intussen gewoon actief) en schrijft ze naar de nieuwe tabellen.
3. `lib/services/b2bStore.ts` herschrijven: elke functie krijgt een SQL-
   implementatie i.p.v. kvGet/kvSet, exact dezelfde export-namen/signaturen
   (zie sectie 4).
4. `npx tsc --noEmit` + handmatig doorlopen van de belangrijkste flows
   (dossier aanmaken, matches verversen, rapport aanvragen, quotum-check).
5. Committen, deployen, een periode dubbel laten draaien/verifiëren voordat
   de oude KV-sleutels (`b2b-*`) definitief opgeruimd worden.

## 6. Wat dit NIET oplost (bewust buiten scope)

- Geen automatische Mollie-abonnementeninning (dat is een apart traject,
  zie B2bTierWijzigingsverzoek in types/b2b.ts — dat blijft voorlopig een
  handmatig e-mailverzoek, ongeacht welke database eronder zit).
- Geen zelfregistratie voor nieuwe organisaties (bewuste, sales-achtige
  keuze, zie de toelichting bovenaan types/b2b.ts) — een echte database
  maakt zelfregistratie makkelijker te bouwen, maar is er geen onderdeel van.
