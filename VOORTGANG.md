# Voortgang Kooprapport Zakelijk — overdracht naar nieuwe chat

## -4. Nieuwste sessie: kandidatenpool losgekoppeld van weergavelimiet ("Funda 196, wij 25")

Vervolg op sectie -3 hieronder. Sjoerd testte opnieuw en meldde: "Kralingen
Crooswijk vind Funda bijvoorbeeld 196 koopwoningen en wij vinden er maar 25" --
expliciet aangemerkt als "dit is nu het belangrijkst".

- **Root cause (via Vercel runtime-logs, niet gegokt):** na de vorige
  bugfix (`MAX_DIRECT` gelijkgetrokken met `MAX_ZICHTBARE_MATCHEN` = 30) werd
  diezelfde 30 gebruikt voor twéé verschillende dingen tegelijk: "hoeveel ruwe
  Funda-links scannen" ÉN "hoeveel matches uiteindelijk bewaren/tonen". Het
  matchingmodel (scoring, zie `matchScore.ts`) kreeg dus nooit de kans om uit
  de volledige markt de béste 30 te kiezen -- het zag letterlijk nooit meer
  dan de eerste ~30 Funda-resultaten, punt.
- **Fix: twee aparte constanten, één per doel.**
  - `lib/data-sources/fundaFeed.ts`: `MAX_PAGINAS` van 3 naar 8, zodat de
    paginering ook echt meer dan ~30-45 links kan doorzoeken als de limiet dat
    toelaat.
  - `matches-verversen/route.ts` (handmatige "Ververs"-knop, één klik, één
    dossier): nieuwe `KANDIDATENPOOL = 100` -- ruim meer kandidaten scannen en
    scoren, maar nog steeds maar `MAX_ZICHTBARE_MATCHEN` (30) daadwerkelijk
    bewaren via `kapMatchenOpMax()`, die op score kiest. `maxDuration` bewust
    op 60 gelaten (al bewezen haalbaar; `haalFundaMatches` faalt niet hard bij
    tijdsdruk, geeft gewoon terug wat er tot dan toe gevonden is).
  - `cron/matches-controleren/route.ts` (dagelijkse cron, serieel over ALLE
    actieve dossiers van ALLE organisaties binnen hetzelfde tijdsbudget):
    nieuwe, bewust kleinere `CRON_KANDIDATENPOOL = 50` -- een grotere pool per
    dossier gaat hier direct ten koste van hoeveel dossiers er per aanroep aan
    de beurt komen, dus voorzichtiger dan de 100 van de handmatige knop.
  - Nog geen garantie dat de VOLLEDIGE markt (196) gezien wordt -- dat zou 196
    detailpagina-proxyverzoeken per refresh kosten, te duur/traag voor één
    klik. Bewuste, ruimere tussenstap. Kost meer Bright Data-credits per
    klik/cron-run dan voorheen -- bewuste keuze, Sjoerd gaf eerder al aan dat
    volledigheid zwaarder weegt dan credit-besparing.
  - Toekomstige verbetering (niet deze sessie geïmplementeerd, wel als
    commentaar vastgelegd in `fundaFeed.ts`): kenmerken (prijs/m²/kamers/
    energielabel) rechtstreeks van de zoekresultatenpagina lezen i.p.v. altijd
    een detailpagina te moeten ophalen -- zou goedkoop screenen van veel meer
    van de markt mogelijk maken, met dure detailpagina-fetches alleen nog voor
    een al voorgeselecteerde shortlist.
- `npx tsc --noEmit` schoon.

## -3. Vorige sessie: volledige-pool-bug, grotere zoek-indicator, koper-voorkeuren ook in de app

Vervolg op sectie -2 hieronder, na opnieuw live testen door Sjoerd:

- **BUGFIX (het belangrijkste punt): "Ververs" haalde maar een handjevol
  woningen op, terwijl een wijk zonder enig filter er honderden heeft.**
  Root cause: `MAX_DIRECT` in `matches-verversen/route.ts` stond op 5. Omdat
  Funda's zoekresultatenpagina standaard ~15 links per pagina teruggeeft,
  werd de paginering in `haalFundaMatches()` (tot 3 pagina's, zie
  `fundaFeed.ts`) hierdoor in de praktijk NOOIT gebruikt -- pagina 1 alleen
  leverde al genoeg links op om de lage limiet van 5 te halen, dus pagina
  2/3 werden letterlijk nooit opgevraagd. `MAX_DIRECT` gelijkgetrokken met
  `MAX_ZICHTBARE_MATCHEN` (30), zodat een handmatige "Ververs" nu ook echt de
  volledige kandidatenpool doorzoekt (zoals de dagelijkse cron al deed).
  `maxDuration` van `matches-verversen` opgehoogd van 30 naar 60 (de cron
  blijft op 30) omdat de paginering nu ook echt tijd kost. Kost meer Bright
  Data-credits per klik -- bewuste keuze, Sjoerd gaf aan dat volledigheid nu
  zwaarder weegt dan credit-besparing.
- **"Bezig met zoeken"-indicator vergroot.** Was een dun, makkelijk te missen
  regeltje -- nu een groot, gecentreerd kader met spinner, in zowel
  `ZoekopdrachtForm.tsx` (na opslaan) als `MatchesKaart.tsx` (bij "Ververs").
- **Koper-voorkeuren nu ook rechtstreeks in de app invulbaar.** Voorheen kon
  dat alleen via de publieke link. `ZoekopdrachtForm.tsx` heeft nu een eigen
  "Voorkeuren van de koper"-sectie met een Ja/Nee-standje ("Nog niet bekend"
  / "Nu invullen") en dezelfde 4 vragen als de publieke vragenlijst. De
  PATCH-route (`app/api/zakelijk/klanten/[id]/route.ts`) onderscheidt nu
  bewust "veld ontbreekt in de request" (koperVoorkeuren blijft ongewijzigd)
  van "veld is expliciet `null`" (bewust wissen) -- zodat drie standen
  mogelijk zijn: via de link, rechtstreeks door de makelaar, of geen van
  beide. Wie het laatst opslaat (koper via link, of makelaar in de app)
  wint -- geen samenvoeglogica, bewust simpel gehouden.
- `npx tsc --noEmit` schoon na elke stap. Nog steeds niet als ingelogde
  makelaar in de browser getest (geen inloggegevens in deze sandbox).

## -2. Vorige sessie: MatchesKaart-herontwerp + zoekfout-bug (na live feedback op het matchingmodel)

Sjoerd testte het matchingmodel (hieronder, `b84c7ff` + `2800409`) live en was
niet tevreden: geen zichtbaar effect van de koper-voorkeuren-antwoorden, geen
"toon meer"-knop, het ontwerp (hero-blok + altijd-open puntenverdeling onder
elke kaart) "ziet er echt niet uit", en Kralingen Crooswijk gaf nog steeds 0
matches. Per punt uitgezocht via de Vercel-productielogs en een live test
(Chrome + de koper-voorkeuren-vragenlijst zelf ingevuld):

- **Koper-voorkeuren werken wél** (bevestigd: POST naar
  `/api/koper-voorkeuren/[token]` gaf 200, live getest) -- het probleem was
  dat er nergens op de matches-pagina zichtbaar was DAT/WAT er verwerkt werd.
  Opgelost met een samenvattingsregel boven de resultaten
  (`koperVoorkeurenSamenvatting()` in `MatchesKaart.tsx`).
- **BUGFIX: mislukte zoekaanvraag zag eruit als "0 matches".** De
  wijk/buurt-slugfix (hieronder) bleek zelf wél correct te werken (live
  bevestigd in de productielogs: `rotterdam/wijk-kralingen-crooswijk` wordt
  goed opgebouwd) -- maar één van de testaanvragen kreeg een `AbortError`
  van de Bright Data-zoekaanvraag zelf, VOORDAT er ook maar een HTTP-status
  binnenkwam. `haalFundaMatches()` (`lib/data-sources/fundaFeed.ts`) ving dat
  af en gaf stilzwijgend een lege lijst terug -- ononderscheidbaar van een
  oprechte 0-resultaten-uitkomst. De functie geeft nu `{ items, fout }`
  terug i.p.v. kaal een array; `fout: true` alleen als er aan het einde nog
  niets bruikbaars is gevonden (een latere pagina die faalt nadat eerdere
  pagina's al links opleverden telt niet als fout). `matches-verversen` en
  de cron-route geven dit door (`zoekFout`/`zoekFouten` in de response);
  `ZoekopdrachtForm.tsx` en `MatchesKaart.tsx` tonen nu een aparte
  foutmelding i.p.v. dat te verbergen achter "0 gevonden". Bestaande
  klantdossiers met een al eerder gekozen wijk-locatie hebben nog steeds de
  oude, kale slug staan (zie hieronder) -- dat blijft een aparte, losstaande
  actie (opnieuw kiezen via de autocomplete).
- **Volledig herontwerp `MatchesKaart.tsx`**: geen apart, breder hero-blok
  meer voor de topmatch (vond Sjoerd onrustig) -- alle kaarten nu gelijk van
  vorm in één grid, topmatch krijgt alleen een badge. De volledige
  puntenverdeling staat nergens meer standaard op de pagina ("puur een i per
  huis") -- alleen een klein (i)-knopje per kaart dat een los
  overlay-schermpje opent (`ScoreModal`). Nieuw: een "Toon meer"-knop
  (`INITIEEL_ZICHTBAAR`/`STAP_ZICHTBAAR` = 9) i.p.v. in één keer alles tonen.
- Opschoning: `MatchesKaart.tsx` importeerde eerst `BUDGET_FLEXIBEL_MARGE`
  rechtstreeks uit `lib/data-sources/fundaFeed.ts` (server-only, met
  scraping-logica) -- dat hoort niet in een `"use client"`-bundle. Vervangen
  door een losse weergavewaarde. Let op: `lib/services/matchScore.ts` doet
  hetzelfde (importeert `ENERGIELABEL_VOLGORDE_FUNDA`/
  `ENERGIELABEL_AANTAL_FUNDA_WAARDEN` uit fundaFeed.ts) en wordt ook
  client-side gebruikt -- dat is een al langer bestaand patroon (dateert van
  vóór deze sessie), functioneel onschadelijk (Next vervangt de
  `process.env`-verwijzingen client-side met `undefined`, en de
  scrape-functies zelf worden nooit vanuit de client aangeroepen) maar wel
  onnodig bundle-gewicht/interne-logica-blootstelling. Nog niet opgeruimd --
  zou een aparte, gedeelde constants-file vergen (bv. in `types/b2b.ts`).
- `npx tsc --noEmit` schoon. Kon niet in de browser als ingelogde makelaar
  getest worden (geen inloggegevens in deze sandbox) -- Sjoerd: graag na
  deployment een dossier met matches + ingevulde koper-voorkeuren-link erbij
  controleren.

## -1. Vorige sessie: matchingmodel (commit `b84c7ff`) + wijk/buurt-slugbug

Sinds commit `cfca26b` hieronder zijn er twee dingen bijgekomen, **ook nog
niet gepusht** (zelfde push-blokkade als hieronder beschreven):

- **Matchingmodel** (`b84c7ff`): matches worden nu gescoord (prijs t.o.v.
  buurtgemiddelde, overtroffen kenmerken, versheid, bouwjaar, kavelgrootte,
  volledigheid) i.p.v. simpelweg op vindmoment getoond/opgeruimd, met een
  optionele korte koper-voorkeuren-vragenlijst (publieke link) die de
  gewichten en budget/kenmerken-soepelheid stuurt. Zie
  `lib/services/matchScore.ts` voor de volledige uitleg.
- **BUGFIX: wijk-niveau locaties (bv. "Kralingen Crooswijk", "Delfshaven")
  gaven 0 resultaten.** Live geverifieerd via Funda's eigen zoekbalk (Chrome,
  niet gegokt): een Funda-`buurt` heeft een kale slug
  (`selected_area=rotterdam/kralingen-oost`), maar een Funda-`wijk` heeft een
  verplicht `wijk-`-voorvoegsel (`selected_area=rotterdam/wijk-delfshaven`) —
  zonder dat voorvoegsel 0 resultaten. "Delfshaven" bestaat op Funda zelfs
  letterlijk als BEIDE tegelijk (wijk én buurt), precies waarom dat
  voorvoegsel nodig is. `mapPdokDoc()` in `lib/services/plaatsLookup.ts`
  kende dat onderscheid niet en gaf voor elke `wijk`-suggestie (niet alleen
  samengestelde namen) een kale, niet-werkende slug terug. Fix: `wijkSlug`
  krijgt nu `wijk-`-voorvoegsel wanneer `doc.type === "wijk"`.
  - **Bestaande klantdossiers met een al gekozen wijk-niveau locatie**
    (opgeslagen vóór deze fix) hebben nog de kale, foute slug in hun
    `zoekopdracht.locatie.wijkSlug` staan — er is geen migratie gedraaid
    (geen los PDOK-`type`-veld bewaard om op te migreren). Makelaar moet de
    locatie in zo'n dossier opnieuw kiezen via de autocomplete zodra deze fix
    live staat.
  - `npx tsc --noEmit` schoon; live opnieuw bevestigd na de fix door de
    berekende URL (`rotterdam/wijk-kralingen-crooswijk`) te vergelijken met
    de URL die Funda's eigen zoekbalk teruggaf (287 resultaten, identiek).

Laatste commit lokaal: `cfca26b` (main) — **NOG NIET GEPUSHT**. Deze sandbox
heeft geen netwerktoegang tot github.com (proxy-allowlist blokkeert het, geen
opgeslagen GitHub-credentials) en kon dus niet zelf `git push` doen, in
tegenstelling tot eerdere sessies. Sjoerd: run zelf `git push` vanuit een
terminal in deze map (`woningrapport-app`) op je eigen Mac — de commit staat
er al, dit is puur het delen ervan met GitHub/Vercel. Daarna pas opnieuw via
de Vercel MCP verifiëren dat de deployment READY is (was er bij het begin van
deze sessie nog niet, zie deployment `dpl_8zkxePNqmfeekm5ZwVuX9kBjtUEp` voor
de vorige, WEL live bevestigde stand op commit `3b39b7c`).

Project-ID's (voor wie de Vercel MCP gebruikt in de volgende chat):
project `prj_fPZ56xnAsIHm2T8OVxqolCIyRnj0`, team `team_1qccbjVK1I0UyHydlwbbpfzi`.

## 0. Deze sessie gefixt (commit `cfca26b`, wacht op push)

1. **Klacht: filter switchen (bv. balkon → tuin) liet oude matches staan.**
   Root cause: `voldoetAanKenmerken()` (`lib/data-sources/fundaFeed.ts`)
   controleerde nog nooit tuin/balkon/dakterras — alleen woningtype/
   slaapkamers/m²/energielabel (zie sectie 2 van de vorige sessie). Live
   geverifieerd via de daadwerkelijke DOM op meerdere Funda-detailpagina's
   (Chrome, niet gegokt): de "Kenmerken"-tabel heeft een dt/dd-rij "Tuin" die
   alleen bestaat als de woning een tuin heeft, en één gecombineerde rij
   "Balkon/dakterras" met een tekstwaarde ("Balkon aanwezig" / "Dakterras
   aanwezig") — vandaar `leesBuitenruimte()` die op de dt-tekst matcht en de
   dd-waarde op "balkon"/"dakterras" doorzoekt. `B2bMatchVerificatie` heeft nu
   `heeftTuin`/`heeftBalkon`/`heeftDakterras` (bewust `boolean`, geen
   `null` — afwezigheid van de rij is een betrouwbaar "heeft niet"-signaal,
   in tegenstelling tot de andere velden die altijd op de pagina staan).
   Belangrijk: `voldoetAanKenmerken` gebruikt `!== true` (niet `=== false`)
   voor deze drie, zodat BESTAANDE matches van vóór deze fix (hun snapshot
   mist deze velden, dus `undefined`) ook als verouderd worden behandeld en
   opnieuw gezocht worden — zelfde eenmalige aanpak als de vorige
   snapshot-loze-matches-fix.
   - Nog niet opgepakt (geen actieve klacht, wel een mogelijk aanverwant
     probleem gezien tijdens het live testen): de `garage_type`-parameter
     in `bouwZoekUrl` lijkt op een paar steekproeven GEEN garages terug te
     geven op Funda's eigen "Soort parkeergelegenheid"-veld — niet verder
     uitgezocht, dit was buiten scope van de gemelde klacht. Bij een klacht
     over garage-matches hier eerst kijken.
2. **UX: duidelijkere "bezig met zoeken"-melding.** Voorheen alleen een
   subtiele knoptekstwijziging ("Bezig…"). Nu een prominente banner met
   spinner ("Bezig met zoeken naar (nieuwe) woningen op Funda…") zowel bij
   het opslaan van een zoekopdracht (`ZoekopdrachtForm.tsx`) als bij de losse
   "Ververs"-knop (`MatchesKaart.tsx`).
   `npx tsc --noEmit` is schoon; geen `next build`/eslint gedraaid (eslint
   niet lokaal geïnstalleerd, geen netwerktoegang om het te installeren in
   deze sandbox).

## 1. Direct te doen

1. **Testen of matches nu écht kloppen.** Klik in een klantdossier op
   "Ververs" bij de matches. De eerste keer na deze fix horen eventuele oude,
   foute matches (bv. verkeerd energielabel/m²) te verdwijnen en vervangen te
   worden door opnieuw geverifieerde matches (zie sectie 2, laatste bugfix).
   Concreet testplan:
   - Budget met een duidelijke ondergrens (bv. €300k–€500k) → geen woningen
     onder de €300k.
   - Een woningtype (bv. "Vrijstaand") → alle matches ook echt dat type.
   - Een minimum aantal slaapkamers → matches er niet onder.
   - Een energielabel-eis ("B of hoger") → matches voldoen echt.
   - Check bij twijfel de Vercel-runtime-logs op `[fundaFeed]`-regels (via de
     Vercel MCP, `get_runtime_logs` met `deploymentId` erbij ivm timeouts op
     brede tijdranges) — laat zien welke proxy gebruikt wordt, hoeveel links
     al bekend waren (credits bespaard), en hoeveel er afgekeurd zijn door de
     kenmerken-verificatie.

2. **Werkgebied-pagina controleren.** Herbouwd (variant 1: provincie-heatmap
   + sorteerbare/doorzoekbare tabel met vinkjes + rustig paneel onderaan voor
   de warmste regio) nadat een eerdere versie was afgekeurd wegens niet
   overeenkomen met de goedgekeurde mockup. Nog niet expliciet door Sjoerd
   bevestigd op de live site. Vergrendelde vinkjes (🔒) = regio's via een
   gedeelde redactionele naam (bv. "Drenthe") — aanpassen via "Regio's
   beheren" bovenaan, niet los in de tabel.

3. **Cron-frequentie overwegen.** Nu 1x/dag (`vercel.json`,
   `/api/cron/matches-controleren`, 08:00). Vercel's Hobby-plan staat alleen
   1x/dag toe (en dan nog met ±59 min speling); Pro-plan tot 1x/minuut (live
   geverifieerd op vercel.com/docs/cron-jobs/usage-and-pricing). Met het
   Bright Data-gratisniveau (5.000 verzoeken/mnd) en de credit-besparing (zie
   sectie 2) is bv. elk uur (`0 * * * *`) haalbaar voor een handjevol actieve
   zoekopdrachten — nog niet doorgevoerd, wachtte op bevestiging welk
   Vercel-plan actief is.

## 2. Wat er deze sessie is gefixt — matching-pijplijn

Grondig live geverifieerd (nooit gegokt: browser-DOM, Vercel-productielogs,
en directe `web_fetch`-aanroepen naar funda.nl zelf, zie sectie 4 voor de
werkwijze). Zes bugs gevonden en opgelost, in volgorde van ontdekking:

1. **`budgetMin` werd nergens gebruikt** — niet in de Funda-URL, niet in de
   eigen prijscontrole. "€300k–€500k" leverde ook woningen ver onder de
   €300k op. Nu overal doorgevoerd.
2. **Verkeerde Funda-parameter voor "2-onder-1-kapwoning"** (`semi_detached`
   i.p.v. het juiste `double` — `semi_detached` bleek Funda's aparte
   categorie "Halfvrijstaande woning" te zijn).
3. **Hoofdoorzaak van de meeste klachten**: bij een streng samengestelde
   zoekopdracht die écht 0 resultaten oplevert, verdwijnt Funda's eigen
   resultatenlijst-blok (ld+json ItemList) volledig van de pagina. De oude
   fallback-scraper greep dan terug op *alle* woninglinks op de pagina en
   pikte zo het betaalde "Toppositie"-blok op (willekeurige, ongefilterde
   woningen). Dat blok wordt nu altijd weggeknipt vóór de fallback-regex
   draait.
4. **Geen lokale nafiltering** — alleen prijs werd teruggecontroleerd tegen
   de gescrapete woning. Nu wordt elke NIEUWE kandidaat ook op woningtype
   (huis/appartement), slaapkamers, m² en energielabel geverifieerd tegen de
   kenmerken, als vangnet. Ontbrekende data leidt nooit tot afwijzing, alleen
   aantoonbaar tegenstrijdige data.
5. **Scrape.do-credits op** (HTTP 401, "you have no credits") — te weinig
   gratis budget voor het daadwerkelijke gebruik (elke detailpagina kostte
   ook credits). Overgestapt op **Bright Data's Web Unlocker API**
   (`BRIGHTDATA_API_TOKEN` + `BRIGHTDATA_ZONE` env vars, inmiddels door
   Sjoerd ingesteld en werkend) — gratis-voor-altijd niveau van 5.000
   verzoeken/maand, ruim 30x zoveel als Scrape.do's gratis niveau in de
   praktijk opleverde. `fetchMetTimeout()` kiest nu Bright Data > Scrape.do
   (terugval) > kale directe fetch.
   - Bijbehorende optimalisatie: detailpagina's worden nu overgeslagen voor
     links die al bekend zijn als match (scheelt het grootste deel van het
     dagelijkse cron-verbruik, dat voorheen élke dag alles opnieuw ophaalde).
6. **BELANGRIJKSTE LAATSTE FIX — bestaande matches werden nooit herverifieerd**:
   nadat fix #4 live ging, bleven matches die *vóór* die fix (of tijdens de
   topposities-bug) waren opgeslagen gewoon staan — `ruimVerouderdeMatchenOp`
   controleerde alleen budget/locatie opnieuw, nooit woningtype/slaapkamers/
   m²/energielabel. Dit verklaarde het live-geconstateerde "energielabel A
   gekozen, F-woning in de matches". Bevestigd via een directe `web_fetch`
   naar Funda zelf (geen browser nodig) dat Funda's eigen filter wél correct
   werkte — de fout zat dus echt in oude, nooit-opgeruimde matches.
   Elke match slaat nu een verificatie-snapshot op
   (`B2bWoningMatch.verificatie`, zie `types/b2b.ts`); `ruimVerouderdeMatchenOp`
   toetst bestaande matches daar nu ook aan, en behandelt matches zonder
   snapshot (alles wat er vóór deze fix al stond) voor de zekerheid als
   verouderd.

Relevante bestanden: `lib/data-sources/fundaFeed.ts`, `lib/services/b2bStore.ts`
(`ruimVerouderdeMatchenOp`, `maakMatch`), `app/api/zakelijk/klanten/[id]/matches-verversen/route.ts`,
`app/api/cron/matches-controleren/route.ts`, `types/b2b.ts`.

De "Leliegracht, Amsterdam"-klacht bleek geen apart locatiebug — dat
resolvet al correct naar de juiste Funda-buurt; hoogstwaarschijnlijk ook
getroffen door bug 3/6 hierboven.

## 3. Wat er deze sessie ook is gedaan (zoekopdracht-formulier)

Gecommit in `114f339`: budget met duizendtal-opmaak en duidelijkere balk,
mooiere/makkelijkere locatie-invoer, slaapkamers-stappen beginnen bij 1 (was
2), dakterras/lift/garage-filters gecorrigeerd, nieuw minimum-m²-veld,
energielabel omgezet naar "X of hoger"-classificatie (incl. "geen voorkeur").

## 4. Bekende, nog niet opgepakte punten (geen actieve bugs, wel mogelijk vervolg)

- **Straat-niveau locatie** (bv. exact "Leliegracht" i.p.v. de bredere buurt
  "Leliegracht e.o.") wordt nog niet ondersteund — Funda's straat-URL-formaat
  is al wel live geverifieerd (`selected_area=<plaats>/straat-<slug>`), maar
  geen actieve klacht rechtvaardigt dit nu; alleen bouwen bij expliciete
  behoefte.
- **Werkgebied "variant 2"** (vast paneel rechts) is destijds als mockup
  getoond maar niet gebouwd — variant 1 is de gekozen/gebouwde versie.
- De precieze **oriëntatie** van een woningtype (bv. exact "vrijstaand" i.p.v.
  "hoekwoning") wordt lokaal nog niet dubbel gecontroleerd, alleen de grove
  familie huis/appartement. Patroon voor uitbreiding is al bekend ("Soort
  woonhuis"-tekst op de detailpagina), alleen nog niet nodig gebleken.
- **Cron-frequentie** — zie sectie 1, punt 3.

## 5. Werkwijze om vast te houden in het vervolg

- **Nooit gokken over Funda's gedrag** — altijd live verifiëren. Browser was
  lang de standaardmanier (checkbox aanklikken, resulterende URL aflezen),
  maar bleek traag/vervelend voor de gebruiker. Een directe `web_fetch` naar
  een Funda-URL (geen browser, geen credits) werkt vanuit deze omgeving ook
  prima en is veel sneller voor het controleren van zoekresultaten/HTML-
  structuur — gebruik dat als eerste keus, browser alleen als er echt
  interactie (klikken door een filterpaneel) nodig is.
- **Vercel-productielogs zijn de snelste manier om te zien wat er écht
  gebeurt** — via de Vercel MCP (`get_runtime_logs`, scope op `deploymentId`
  om timeouts te voorkomen bij brede tijdranges). Dit heeft in deze sessie
  het echte probleem (HTTP 401 op de proxy) meteen boven water gehaald,
  zonder dat de gebruiker iets hoefde te testen.
- Sjoerd vergelijkt gebouwde pagina's/gedrag precies met eerder besproken
  afspraken/mockups en test zelf grondig — bij twijfel liever expliciet
  checken (logs, directe fetch) dan aannemen dat een fix werkt.
