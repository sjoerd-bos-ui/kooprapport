# Data- en API-architectuur

Dit document beschrijft hoe de app is voorbereid op echte databronnen: de veldaudit die aan de basis lag van de typewijzigingen, het bronstatusmodel, de adapterstructuur, en wat er nog moet gebeuren om elke bron daadwerkelijk live te zetten.

**Update (correctheidsronde):** het interne datamodel is herzien tot één canonieke structuur (`types/report.ts`): `core` (adres + titel/ondertitel), `building` (was `bag`/`BagData`), `energy` (was `energielabel`/`EnergielabelData`), `market` (was `woz`/`WozData`), `nearbySales` (was `buurtverkopen`/`BuurtverkopenData`), plus twee nieuwe, afgeleide onderdelen: `insights` en `dataQuality`. De losse `marktanalyse`/`MarktanalyseData` (een samenvoeging van WOZ-historie + buurtverkopen tot één "wijk-marktindex") is **geschrapt** — die suggereerde een samenhang tussen twee onafhankelijke bronnen die er feitelijk niet was. Zie §1a–§1c hieronder voor de details en de reden.

**Update (woningwaarde ipv WOZ):** er bestaat geen officiële/gratis WOZ-API en geen gratis bron voor een bevestigde laatste verkoopprijs (zie §1 hieronder voor de onderbouwing). Het `market`-domein is daarom omgezet van een (nooit gerealiseerde) WOZ-koppeling naar een echte, werkende koppeling: de Altum AI Woningwaarde API (AVM — Automated Valuation Model, bron-adapter `lib/data-sources/woningwaarde.ts`, voorheen `woz.ts`). Dit levert een modelgeschatte marktwaarde met bandbreedte, expliciet nooit gepresenteerd als taxatie, WOZ-waarde of bevestigde verkoopprijs — zie de i-toelichting in `ReportView.tsx`.

## 1. Veldaudit — wat is veilig, wat is onzeker

### Building — BAG (`BuildingData`, bron-adapter `bag.ts`, functie `fetchBuilding`)

| Veld | Status | Toelichting |
|---|---|---|
| `bouwjaar` | Veilig | Verplicht BAG-veld op pand-niveau. |
| `gebruiksdoel` | Veilig | Verplicht BAG-veld, gestandaardiseerde waardenlijst. Let op: de echte API geeft een array (`gebruiksdoelen`) terug — de mapper pakt het eerste element. |
| `pandStatus` | Veilig | Bestaat als officiële BAG-statusenum ("Pand in gebruik" e.d. zijn echte waarden). |
| `oppervlakteM2` | Veilig, met kanttekening | Verplicht op verblijfsobject-niveau, maar kan ontbreken bij niet-ingemeten objecten. Nu optioneel in de mapper-uitvoer. |
| `woningtype` | **Opgelost, verifieerbaar afgeleid** | Geen directe BAG-eigenschap, maar wel betrouwbaar afleidbaar uit bestaande BAG-velden: gebruiksdoel + `aantal_verblijfsobjecten` op het pand (Eengezinswoning/Meergezinswoning/Appartement), en bij een zelfstandig pand aanvullend verfijnd tot Vrijstaand/Twee-onder-een-kap/Hoekwoning/Tussenwoning via een echte geometrische buren-analyse op de pandgeometrie (`lib/services/grondgebondenType.ts`). Nooit een gok: lukt geen van deze stappen, dan blijft het veld leeg. |
| `inhoudM3` | **Onzeker — waarschijnlijk niet beschikbaar** | Staat niet in de BAG. Alleen aanwezig in de huidige mockdata; bij een live-koppeling blijft dit veld leeg tenzij een andere bron (bv. energielabelregistratie) het aanlevert. Nu optioneel. |
| `aantalVerblijfsobjecten` | Onzeker (extra call nodig) | Wel beschikbaar, maar vereist een aparte pand → verblijfsobjecten-relatiebevraging, niet gegarandeerd in één call. Nu optioneel. |

### Energy — EP-Online (`EnergyData`, bron-adapter `energielabel.ts`, functie `fetchEnergy`)

| Veld | Status | Toelichting |
|---|---|---|
| `klasse`, `registratiedatum`, `geldigTot` | Veilig, live | Kernvelden — geverifieerd tegen de officiële EP-Online OpenAPI-spec (`PandEnergielabelV5`). Twee live-providers ondersteund: rechtstreeks EP-Online (`ENERGIELABEL_PROVIDER=ep-online`, gratis maar KvK-nummer verplicht) of overheid.io (`overheid-io`, geen KvK nodig, betaald). |
| `isolatie.*` (dak/gevel/vloer/beglazing) | **Bestaat niet** | Geverifieerd: geen van beide bronnen levert aparte isolatiewaarden per bouwdeel. Dit sub-object blijft daarom altijd `undefined` — niet "soms onzeker", maar structureel afwezig. Nooit gevuld met een geraden waarde. |

**Correctheidsfix (historisch):** een eerdere versie van de mockgenerator lootte `klasse` en `isolatie.*` onafhankelijk van elkaar (logisch onmogelijk — een label wordt in werkelijkheid juist van isolatie/beglazing afgeleid). Die hele mockgenerator (incl. het gewogen-loten van isolatie) is inmiddels verwijderd: er wordt nooit meer een gesimuleerd energielabel getoond. Zonder bevestigde registratie blijft het veld leeg en toont de UI eerlijk "Onbekend"/"Niet beschikbaar".

### Market — geschatte woningwaarde van déze woning (`MarketData`, bron-adapter `woningwaarde.ts`, functie `fetchMarket`)

| Veld | Status | Toelichting |
|---|---|---|
| `geschatteWaarde` | Live via Altum AI AVM | `Output.PriceEstimation` uit de Altum Woningwaarde API — een modelschatting, geen taxatie of WOZ-waarde. |
| `bandbreedteMin`, `bandbreedteMax` | Live, indien te ontleden | Ontleed uit de vrije tekst `Output.Confidence` (bv. "90% Confidence Interval is 327363-429880."). Lukt het regex-patroon niet, dan blijven beide bewust `undefined` i.p.v. een gegokt getal. |
| `waarderingsdatum` | Live | `Output.ValuationDate` (formaat `YYYYMMDD`), omgezet naar ISO zodat `formatDate()` het kan parsen. |

**Waarom niet WOZ of een echte verkoopprijs:** er is geen officiële/gratis WOZ-API (wozwaardeloket.nl verbiedt geautomatiseerde bevraging; de Kadaster "WOZ Bevragen"-API is wettelijk beperkt tot Huisvestingswet/verhuurderschap/belastingdoeleinden) en geen gratis bron voor de laatste verkoopprijs (Kadaster Koopsommenregister is uitsluitend een betaald, handmatig product per adres — €1,50–3,70). Altum AI's Woningwaarde API (AVM) is in plaats daarvan gekozen: een verifieerbaar model met een expliciete bandbreedte, testbaar via een gratis, creditloze sandbox (`ALTUM_SANDBOX=true`, publieke gedeelde sleutel) voordat er een eigen sleutel/credits nodig zijn.

**Bewuste beperking t.o.v. de eerdere WOZ-opzet:** de AVM-respons bevat geen jaar-op-jaar tijdreeks — alleen één schatting per waarderingsdatum. Er is dus geen `historie`/`waardeontwikkelingPct`-veld meer en geen bijbehorend "waardeontwikkeling"-inzicht: dat zou een trend suggereren die deze bron niet levert.

### Nearby sales — Kadaster Koopsommenregister (`NearbySalesData`, bron-adapter `buurtverkopen.ts`, functie `fetchNearbySales`)

| Veld | Status | Toelichting |
|---|---|---|
| `verkopen`, `aantalLaatste12Maanden` | **Onzeker (structureel)** | Kadaster Koopsommenregister is een betaald/licentieproduct; vereist contract + radius-zoeklogica op basis van coördinaten, geen simpele adres-lookup. |
| `gemiddeldePrijsPerM2` | Onzeker | Niet te berekenen zonder verkopen — nu optioneel, valt terug op "Onbekend" bij een lege set. |
| `vergelijkbaar`, `deltaPct` per verkoop | **Geen brongegeven — berekend** | De bron kent onze woning niet. Deze twee velden bestaan niet op `NearbySaleRaw` (wat de adapter teruggeeft) maar worden na het parallel ophalen toegevoegd door `enrichNearbySales()` in `lib/services/insights.ts`, op basis van de daadwerkelijk opgehaalde `building.oppervlakteM2` en `market.geschatteWaarde`. Ontbreekt een van die twee, dan blijft `deltaPct` bewust `undefined` (UI toont "—") in plaats van een gegokt percentage. |

**Consequentie voor de typen:** `woningtype`, `inhoudM3`, `aantalVerblijfsobjecten`, `isolatie` en `gemiddeldePrijsPerM2` zijn optioneel in `types/report.ts`. Alle overige velden blijven verplicht omdat ze in de praktijk vrijwel altijd voorkomen in de brontypen zelf — de *beschikbaarheid van de bron als geheel* (wel/niet data, fout, time-out) wordt apart afgedekt door het bronstatusmodel hieronder, niet door elk veld optioneel te maken.

### 1a. Waarom `market` en `nearbySales` niet meer samengevoegd worden

De vorige versie combineerde WOZ-historie en buurtverkopen tot één `marktanalyse.conclusie` ("De woningwaarde in **deze buurt** is... gestegen, met N verkopen..."). Dat is feitelijk onjuist: de trend kwam uitsluitend uit de WOZ-historie van dít ene adres, niet uit buurtdata — één woning is geen wijkindex. Nu:

- `market` gaat uitsluitend over de modelgeschatte waarde van déze woning (Altum AI AVM).
- `nearbySales` gaat uitsluitend over transacties in de buurt, los van de modelschatting van het subject.
- Wil je de twee toch aan elkaar relateren (bv. "hoe verhoudt de geschatte waarde zich tot recente buurtverkopen"), dan gebeurt dat expliciet in `buildInsights()` — en alléén als beide bronnen daadwerkelijk data hebben. Ontbreekt één van de twee, dan wordt dat specifieke inzicht simpelweg niet gegenereerd, in plaats van met een halve/gegokte conclusie te vullen.

### 1b. Eén buurt-referentieprijs, niet twee losse

Eerder genereerde de HTML-preview twee onafhankelijke random "buurtgemiddelden" (één voor de woningwaarde-positionering, één voor de buurtverkopen-tabel) — die konden elkaar tegenspreken (bv. "vergelijkbaar met het buurtgemiddelde" terwijl de tabel ernaast heel andere prijzen toonde). Nu wordt overal dezelfde, daadwerkelijk opgehaalde `nearbySales.gemiddeldePrijsPerM2` gebruikt als referentie — er bestaat nog maar één bron van waarheid voor "wat is een vergelijkbare woning in de buurt waard".

### 1c. Insights, dataQuality en core — nieuw

- **`insights`** (`lib/services/insights.ts::buildInsights`) — een lijst afgeleide, mensleesbare bevindingen (energieprestatie vs. bouwperiode, waardeontwikkeling, positionering t.o.v. buurtverkopen, marktactiviteit). Elk inzicht wordt alleen toegevoegd als de onderliggende velden er daadwerkelijk zijn; geen enkel inzicht bevat een gegokte waarde. Leeg als er niets te concluderen valt — de UI toont dan simpelweg geen inzichtensectie in plaats van een lege of halfbakken kaart.
- **`dataQuality`** (`buildDataQuality`) — telt de status van alle vier bronnen op tot één samenvattend oordeel (`volledig` / `grotendeels-compleet` / `beperkt`) met een korte toelichting, getoond direct onder de adresheader (`DataQualityBanner`).
- **`core`** (`buildCore`) — titel/ondertitel voor de header, samengesteld uit alleen de velden die bekend zijn (bv. "Tussenwoning · bouwjaar 1974 · energielabel C"); ontbreken alle drie, dan staat er eerlijk "Kenmerken nog niet beschikbaar".

## 2. Bronstatusmodel

Elk rapportonderdeel is een `SourceResult<T>` (`types/dataSource.ts`):

```ts
interface SourceResult<T> {
  data: T | null;
  meta: SourceMeta;
}
```

`SourceMeta` combineert twee onafhankelijke assen:

- **`status`** — hoe betrouwbaar is de bron zelf: `confirmed` (officieel bevestigd, bv. BAG), `public` (publieke open data, bv. EP-Online), `premium` (betaalde/gelicenseerde bron, bv. Altum AI Woningwaarde API), `mock` (voorbeelddata), `unavailable` (niet geconfigureerd).
- **`state`** — wat gebeurde er bij de laatste bevraging: `success`, `partial` (velden ontbreken), `empty` (geen resultaten), `error`, `timeout`, `unavailable`.

`data` is alleen niet-`null` bij `success` of `partial`. De UI hoeft dus nergens te gokken: bestaat `data`, dan is er iets te tonen (eventueel met een "gedeeltelijk beschikbaar"-notitie); bestaat het niet, dan toont `DataUnavailableNotice` een van de bijpassende, rustige meldingen.

## 3. Adapterstructuur per bron

Elk bestand in `lib/data-sources/` volgt dezelfde opbouw:

1. **Raw API-type** — indicatieve vorm van het externe antwoord (apart van onze interne types, zodat een schemawijziging bij de bron niet meteen de UI raakt).
2. **Mapper** — pure functie `raw -> Partial<InterneData>`, defensief (ontbrekend veld → `undefined`, nooit geraden).
3. **`generateMock()`** — de bestaande deterministische mockgenerator (ongewijzigd gedrag).
4. **`fetchLive()`** — stub die de echte call zou doen; nu een duidelijke `throw` met de kant-en-klare (uitgecommentarieerde) fetch-code en een TODO.
5. **`fetch<Bron>()`** — het enige exportpunt dat `reportService` aanroept. Schakelt op basis van `lib/config/dataSources.ts` tussen mock/live en wrapt alles in `withResilience()`.

`withResilience()` (`lib/adapters/withResilience.ts`) is de enige plek met timeout/try-catch-logica: elke bron race't tegen zijn eigen `timeoutMs`, vangt fouten op, en classificeert het resultaat (`success`/`partial`/`empty`/`error`/`timeout`) via dezelfde helpers uit `types/dataSource.ts`. Geen enkele adapter herhaalt deze logica zelf.

## 4. Mock ↔ live wisselen

`lib/config/dataSources.ts` leest per bron een env var (`BAG_MODE`, `ENERGIELABEL_MODE`, `ALTUM_MODE`, `BUURTVERKOPEN_MODE`) die `"mock"` of `"live"` is; ontbreekt de var, dan is `mock` de veilige default. Zie `.env.example` voor alle variabelen, inclusief de namen van de API-key-env-vars per bron (`BAG_API_KEY`, `EP_ONLINE_API_KEY`, `ALTUM_API_KEY`, `KADASTER_KOOPSOMMEN_API_KEY`). Voor Altum geldt daarnaast `ALTUM_SANDBOX=true|false`: op `true` (de default in `.env.example`) gaat elke live-aanroep naar Altum's gratis, creditloze sandbox-endpoint met een door Altum publiek gedeelde sleutel — pas naar `false` zodra een eigen, betaalde `ALTUM_API_KEY` is geconfigureerd.

Belangrijk: live-fetches horen **server-side** te draaien (bv. via een Next.js route handler of server action), niet in de huidige client-side aanroep vanuit `ReportPageClient`. Zo blijven API-keys uit de browserbundel. Dit is de belangrijkste stap die nog moet gebeuren voordat een bron echt op `live` kan — zie risico's hieronder.

## 5. Fallback-matrix (hoe de UI reageert)

| Situatie | `state` | UI-gedrag |
|---|---|---|
| Alles aanwezig | `success` | Sectie toont normaal, groene/officiële badge. |
| Sommige velden ontbreken | `partial` | Sectie toont wel, met een gele notitie welke velden ontbreken. |
| Bron gaf geldig maar leeg antwoord | `empty` | Rustige melding: "geen resultaten gevonden bij deze bron". |
| Bron gaf een fout | `error` | Rustige melding + (kleine, ingehouden) technische toelichting. |
| Bron reageerde niet binnen de timeout | `timeout` | Melding: "reageerde niet op tijd, probeer later opnieuw". |
| Bron niet geconfigureerd (geen key) | `unavailable` | Melding: "niet beschikbaar", badge toont dat expliciet. |
| Eén bron faalt, andere niet | — | `Promise.all` per bron: een falende bron blokkeert de andere niet. |
| Onverwachte fout in `getReport` zelf | — | Top-level try/catch: hele rapport komt terug met alle onderdelen op `unavailable`, nooit een onafgehandelde promise-rejectie richting de UI. |

De betaalmuur (`locked`) en de data-beschikbaarheid (`hasData`) zijn losgekoppeld: een sectie zonder data toont nooit de "ontgrendel"-overlay (er is niets te ontgrendelen), ook niet als het rapport nog niet betaald is.

## 6. Per-bron integratiechecklist (nog te doen)

| Bron | Endpoint | Auth | Volgende stap |
|---|---|---|---|
| BAG (bouwjaar/gebruiksdoel/oppervlakte/woningtype) | PDOK BAG OGC API v2 (`api.pdok.nl/kadaster/bag/ogc/v2`) | Geen (gratis, keyless) | **Al live**, ook in `mock`-modus — zie `lib/services/bouwjaarLookup.ts`. |
| BAG (overige velden: pandstatus, aantal verblijfsobjecten als los BAG-veld) | `api.bag.kadaster.nl/lvbag/individuelebevragingen/v2` | `X-Api-Key` header | Sleutel aanvragen bij Kadaster, `fetchLive()` in `bag.ts` activeren. |
| Energielabel | `public.ep-online.nl/api/v5` (of `api.overheid.io/v3` als alternatief) | `Authorization` header (of `ovio-api-key`) | **Al live** zodra `ENERGIELABEL_MODE=live` + een geldige sleutel in `.env.local` staan — zie `.env.example`. |
| Geschatte woningwaarde | Altum AI Woningwaarde API (`api.altum.ai/avm`) | `x-api-key` header | **Sandbox klaar** (`ALTUM_SANDBOX=true`, gratis, geen credits) — voor productie: account op `mopsus.altum.ai`, eigen `ALTUM_API_KEY`, `ALTUM_SANDBOX=false`. |
| Buurtverkopen | Kadaster Koopsommenregister of leverancier | Contractafhankelijk | Licentie/leverancier regelen, radius-zoeklogica (coördinaten i.p.v. adres) toevoegen. |
| Adres-autocomplete | PDOK Locatieserver (gratis, geen key) | Geen | Losstaand van dit datamodel — kan het snelst live, ongeacht de andere bronnen. |

## 7. Wat is al goed voorbereid

- Uniform bronstatusmodel (`SourceResult<T>`) door de hele stack — types, service, UI.
- Elke adapter heeft een raw-type + mapper klaarstaan, ontkoppeld van de interne structuur.
- Gedeelde, geteste timeout/error-afhandeling (`withResilience`) — geen losse hacks per bron.
- Config-laag met mock/live-schakelaar en API-key-plekken per bron, zonder secrets in de code.
- UI toont bronstatus (badge), gedeeltelijke beschikbaarheid, en een rustige "niet beschikbaar"-melding — nooit een crash of stille aanname.
- `reportService` faalt nooit hard: parallelle bevraging, defensieve enrichment/insights, top-level fallback.
- Eén canonieke interne structuur (`core`/`building`/`energy`/`market`/`nearbySales`/`insights`/`dataQuality`) — componenten lezen nooit ruwe brondata.
- Cross-domein logica (buurtverkopen-vergelijking, inzichten, datakwaliteit-samenvatting) staat gebundeld in `lib/services/insights.ts`, gescheiden van de per-bron adapters — een adapter blijft puur "haal deze ene bron op".

## 8. Wat is nog mock / nog te doen

- Buurtverkopen staat nog op `mode: "mock"` (geen officiële/gratis open API, leverancierskeuze nodig). BAG (bouwjaar/gebruiksdoel/oppervlakte/woningtype), energielabel en geschatte woningwaarde (Altum AI, via sandbox) hebben al een werkende live-koppeling.
- **Opgelost:** `getReport()` liep eerder rechtstreeks vanuit `ReportPageClient` (een `"use client"`-component) — daardoor zou de hele adapterketen (incl. `process.env`-sleutel-lookups) in de browserbundel terechtkomen, en zou een live-sleutel in `.env.local` bij het draaien in de praktijk gewoon nooit gevonden worden (client-side heeft geen toegang tot server-`process.env`). Dit is verplaatst naar een Route Handler (`app/api/rapport/route.ts`, draait altijd server-side); `ReportPageClient` doet nu `fetch("/api/rapport", …)` in plaats van `getReport()` te importeren. De per-bron live voortgangsindicatie (`onProgress`) is daarmee wel vervangen door een getimede animatie in `ReportPageClient` — cosmetisch, want alle bronnen komen nu in één server-respons tegelijk terug.
- Adres-autocomplete en kaart gebruiken nog een vaste lijst / placeholder (ongewijzigd t.o.v. eerdere versie, buiten scope van deze ronde).
- Geen retry-logica (alleen timeout+fail) — voor productie is een beperkt aantal retries met backoff aan te raden bij `timeout`/`error`.
- Geen caching-laag — elke rapportaanvraag bevraagt alle bronnen opnieuw; bij echte, betaalde bronnen (Altum-credits in productie, buurtverkopen) is caching per adres/postcode financieel relevant.

## 9. Risico's en aandachtspunten

- **API-keys horen server-side.** Inmiddels opgelost via `app/api/rapport/route.ts` (zie §8) — let hier wel op bij nieuwe features: elke nieuwe plek die `getReport()` of een `lib/data-sources/*`-adapter rechtstreeks aanroept vanuit een `"use client"`-component herintroduceert hetzelfde lek.
- **Geschatte woningwaarde en buurtverkopen zijn beide leveranciersafhankelijk.** Woningwaarde draait via Altum AI (sandbox al werkend, productie kost credits per aanroep); buurtverkopen heeft nog geen leverancier — dat blijft het onderdeel met de grootste kans op vertraging/kosten.
- **BAG `inhoudM3` bestaat niet 1-op-1 in de bron.** Blijft een afgeleide indicatie (alleen getoond als de onderliggende oppervlakte bevestigd is), nooit een BAG-veld zelf. `woningtype` is inmiddels wél opgelost (zie §1, geometrische buren-analyse) — geen losse actie meer nodig.
- **Geen retry/backoff.** Bij een tijdelijke netwerkhapering toont de UI nu meteen "niet beschikbaar" na één timeout; overweeg 1–2 retries voor live-gebruik.
- **Geen automatische tests.** Deze ronde is handmatig gecontroleerd (Node-syntaxcheck op alle `.ts`-bestanden, structuurcontrole op de `.tsx`-bestanden); er is geen testrunner in dit project. Voor een live-koppeling zijn unit-tests op de mappers (raw → interne structuur, inclusief ontbrekende velden) de eerste aanrader.
