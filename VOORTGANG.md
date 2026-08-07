# Voortgang Kooprapport Zakelijk — overdracht naar nieuwe chat

Laatste commit: `30bf239` (main) — **bevestigd live gedeployed** (deployment
`dpl_9qdQjtG26n2ngZC3pNc6qKS3BDJQ`, status READY, geverifieerd via Vercel
build logs). Niets hoeft nu meer gepusht te worden.

Project-ID's (voor wie de Vercel MCP gebruikt in de volgende chat):
project `prj_fPZ56xnAsIHm2T8OVxqolCIyRnj0`, team `team_1qccbjVK1I0UyHydlwbbpfzi`.

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
