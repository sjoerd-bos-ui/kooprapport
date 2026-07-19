# Kooprapport — frontend (mockdata, API-architectuur voorbereid)

Frontend op basis van het bouwplan. Draait volledig op mockdata (deterministisch: zelfde adres = altijd hetzelfde rapport), maar de data-/API-laag is opgezet alsof er al echte bronnen achter zitten. Zie **[docs/DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md)** voor de volledige data-architectuur: veldaudit, bronstatusmodel, per-bron integratiechecklist en fallback-gedrag.

## Wat zit erin

- **Homepage** (`app/page.tsx`) — hero, adres-zoekbalk met autocomplete, link naar voorbeeldrapport.
- **Adres invoerflow** (`components/address/AddressSearchBar.tsx`) — autocomplete op 5 mockadressen, of vrije tekst met eenvoudige parser.
- **Loading/analyse-scherm** (`components/report/LoadingAnalysis.tsx`) — stapsgewijze voortgang (BAG → energielabel → woningwaarde → buurtverkopen → rapport samenstellen).
- **Gratis preview** — samenvattingssectie, altijd zichtbaar.
- **Premium unlock-sectie** — banner + paywall-modal met mock-iDEAL-betaling (`components/report/PaywallModal.tsx`).
- **Locked rapportdelen** — woningwaarde-detail, energielabel-detail, BAG-detail, buurtverkopen, marktanalyse: geblurd met slot-overlay tot "betaald" is.

## Service- en data-architectuur

```
types/dataSource.ts       → bronstatusmodel: SourceMeta, SourceResult<T>, DataMode
lib/config/dataSources.ts → mock/live-schakelaar + API-key-envvars per bron
lib/adapters/withResilience.ts → gedeelde timeout/error-afhandeling
lib/data-sources/         → één adapter per bron (bag, energielabel, woningwaarde, buurtverkopen):
                             raw-API-type + mapper + mockgenerator + live-stub, alles in SourceResult<T>
lib/services/reportService.ts → haalt alle bronnen parallel op, bouwt marktanalyse defensief,
                                  faalt nooit hard
```

Elke adapter levert een `SourceResult<T>` (`{ data: T | null, meta }`) i.p.v. kale data — de UI weet altijd of iets bevestigd, publiek, premium, mock of niet-beschikbaar is, en toont dat ook. Omschakelen naar een echte bron: `.env.local` invullen (zie `.env.example`) en de `TODO`-fetch in het betreffende `lib/data-sources/*.ts`-bestand activeren.

Live-fetches draaien server-side via de Route Handler `app/api/rapport/route.ts` — `ReportPageClient` (een client-component) roept `getReport()` dus nooit rechtstreeks aan, maar `fetch("/api/rapport", …)`. Dat is bewust: alleen zo blijven API-keys uit `process.env` op de server en komen ze nooit in de browserbundel terecht.

**Bouwjaar, gebruiksdoel, oppervlakte en woningtype zijn al live**, ook terwijl `BAG_MODE=mock` staat: die vier velden worden binnen de mock-adapter altijd bij de echte, gratis PDOK/BAG-koppeling opgehaald (zie `lib/services/bouwjaarLookup.ts`) — geen sleutel nodig. Energielabel ondersteunt twee live-providers naast `mock`: `ENERGIELABEL_PROVIDER=ep-online` (gratis, KvK-nummer verplicht bij het aanvragen van de sleutel) of `overheid-io` (geen KvK nodig, betaald vanaf ca. €15/mnd). De geschatte woningwaarde (`market`) draait op de Altum AI Woningwaarde API (AVM — modelschatting, geen WOZ-waarde of taxatie): met `ALTUM_MODE=live` en `ALTUM_SANDBOX=true` (default) test je gratis tegen Altum's sandbox, zonder credits of eigen sleutel; zet `ALTUM_SANDBOX=false` zodra je een eigen, betaalde `ALTUM_API_KEY` hebt. Zie `.env.example` voor alle env-vars.

## Run-instructies

Vereist: Node.js 18+ en npm.

```bash
cd woningrapport-app
npm install
npm run dev
```

Open http://localhost:3000

- Typ een adres op de homepage (of klik "Bekijk een voorbeeldrapport").
- Elk adres genereert altijd dezelfde mockdata (deterministisch op basis van het adres).
- Klik op "Ontgrendel volledig rapport" of "Betaal met iDEAL" in de modal om de premium-secties te ontgrendelen (mock, geen echte transactie).

Voor een productie-build: `npm run build && npm run start`.

## Bekende beperkingen (bewust, voor v1)

- Geen echte adres-autocomplete (later: PDOK Locatieserver), geen echte kaart (later: PDOK/Mapbox).
- PDF-download-knop is een stub.
- Geen account/login, geen echte betaalprovider — dat volgt in een latere iteratie zoals in het bouwplan beschreven.
- Buurtverkopen staat nog op `mock` (geen officiële/gratis open API — vereist een commerciële leverancier, zie `.env.example`). BAG, energielabel en geschatte woningwaarde hebben wél een werkende live-koppeling (zie hierboven) — zie docs/DATA_ARCHITECTURE.md voor de volledige stand van zaken per bron.

## Let op — build niet lokaal getest

Deze omgeving had geen toegang tot de npm-registry, dus `npm install`/`npm run build` kon hier niet worden uitgevoerd. De code is zorgvuldig handmatig gecontroleerd op imports, types en JSX-structuur, maar test de build zelf even bij het opstarten — laat het weten als je een foutmelding tegenkomt, dan los ik die meteen op.
