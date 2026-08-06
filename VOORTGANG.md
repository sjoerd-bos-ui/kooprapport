# Voortgang Kooprapport Zakelijk — overdracht naar nieuwe chat

Laatste commit: `6313d43` (main), al gepusht en live (deployment
`dpl_6FBd9EukN6NLjbrMkAKYGEQF2Pwu`, geverifieerd via Vercel-logs).

## 0. BLOKKERT ALLES: Scrape.do-credits op (actie bij Sjoerd)

Na de matching-fixes bleek in productie dat élke live Funda-aanvraag een
**HTTP 401** terugkrijgt van de Scrape.do-proxy (gezien in de Vercel
runtime-logs, project `prj_fPZ56xnAsIHm2T8OVxqolCIyRnj0`, team
`team_1qccbjVK1I0UyHydlwbbpfzi`). Dit is GEEN code-bug: de opgebouwde
Funda-URL's kloppen precies (budget/locatie/type/filters allemaal correct),
maar de proxy geeft niets terug. Scrape.do's eigen documentatie zegt
expliciet: **401 = "You have no credits or your subscription has been
suspended."**

Kostenplaatje: elke zoekaanvraag EN elke individuele detailpagina (tot 15 per
zoekopdracht) kost 10 credits via de proxy — één "Ververs"-klik kan dus
100-160 credits kosten. Op het gratis niveau (1.000/maand) is dat na een
handjevol keer verversen (plus al het testen deze sessie) al op.

**Actie (kan alleen Sjoerd, is zijn account) — overgestapt op een gratis
alternatief in plaats van betalen bij Scrape.do:**

De code (`lib/data-sources/fundaFeed.ts`) ondersteunt nu ook **Bright Data's
Web Unlocker API** als proxy, naast Scrape.do. Bright Data heeft een
gratis-voor-altijd niveau van **5.000 verzoeken/maand, geen creditcard nodig**
(zojuist live geverifieerd op `brightdata.com/pricing/web-unlocker` en hun
eigen documentatie) — dat is ruim 30x zoveel als wat Scrape.do's gratis
niveau in de praktijk opleverde (die kostte 10 credits per verzoek, en één
zoekopdracht doet al snel 10-16 verzoeken).

Stappen om dit te activeren (moet Sjoerd zelf doen, ik kan geen account voor
je aanmaken):
1. Ga naar brightdata.com en maak een gratis account (geen kaart nodig).
2. Maak een "Web Unlocker API"-zone aan in het control panel.
3. Kopieer de **API key** en de **zone-naam** uit het Overview-tabblad van die zone.
4. Zet in Vercel → project `kooprapport` → Settings → Environment Variables
   twee nieuwe variabelen (Production): `BRIGHTDATA_API_TOKEN` (de API key) en
   `BRIGHTDATA_ZONE` (de zone-naam). Daarna opnieuw deployen (of gewoon
   wachten op de volgende deploy).
5. `SCRAPEDO_TOKEN` mag blijven staan of verwijderd worden — als
   `BRIGHTDATA_API_TOKEN`/`BRIGHTDATA_ZONE` beide gezet zijn, gebruikt de code
   automatisch Bright Data en wordt Scrape.do genegeerd.

Nog niet getest met een echte Bright Data-key (kan pas na stap 1-4 door
Sjoerd) — als er na het instellen nog steeds HTTP 401/geen matches zijn,
opnieuw de Vercel-runtime-logs op `[fundaFeed]` checken (zie hierboven hoe).

## 1. Direct te doen (ná het Scrape.do-issue)

1. **Werkgebied-pagina controleren.** Recent herbouwd (variant 1: provincie-heatmap
   bovenaan + sorteerbare/doorzoekbare tabel met vinkjes per regio + rustig paneel
   onderaan voor de warmste regio). Dit was al één keer afgekeurd omdat het niet
   overeenkwam met de goedgekeurde mockup — de herbouwde versie zou nu wél moeten
   kloppen, maar is nog niet door Sjoerd bevestigd op de live site. Vergrendelde
   vinkjes (🔒) horen bij regio's die via een gedeelde redactionele naam (bv.
   "Drenthe") in het werkgebied zitten; die pas je aan via "Regio's beheren"
   bovenaan de pagina, niet los in de tabel.

2. **Matching-fixes testen met een paar echte zoekopdrachten.** Vier bugs zijn
   gevonden en gefixt (zie sectie 2), maar nog niet door Sjoerd zelf getest op de
   live site na deploy. Concreet testplan:
   - Zet een zoekopdracht met een duidelijke ondergrens (bv. €300k–€500k) en klik
     "matches verversen" — controleer dat er geen woningen onder de €300k meer
     tussen staan.
   - Zet een woningtype (bv. "Vrijstaand") en controleer dat alle matches ook
     daadwerkelijk vrijstaande woningen zijn (niet meer appartementen).
   - Zet een minimum aantal slaapkamers en controleer dat matches er niet onder
     zitten.
   - Zet een energielabel-eis ("B of hoger") en controleer een paar matches op
     hun daadwerkelijke label.
   - Check de Vercel-runtime-logs op `[fundaFeed]`-regels — bij afgekeurde
     kandidaten staat nu een regel `LIVE x/y link(s) afgekeurd door lokale
     kenmerken-verificatie of prijs`, handig om te zien of het vangnet iets
     tegenhoudt.

## 2. Wat er deze sessie is gefixt (Funda-matching)

Grondig live tegen funda.nl geverifieerd (nooit gegokt), vier bugs gevonden:

1. **`budgetMin` werd nergens gebruikt** — niet in de Funda-URL, niet in de eigen
   prijscontrole. "€300k–€500k" leverde dus ook woningen ver onder de €300k op.
   Nu overal doorgevoerd (Funda-URL, lokale prijscontrole, opruimen van
   verouderde matches).
2. **Verkeerde Funda-parameter voor "2-onder-1-kapwoning"** (`semi_detached` i.p.v.
   het juiste `double` — `semi_detached` bleek Funda's aparte categorie
   "Halfvrijstaande woning" te zijn).
3. **Hoofdoorzaak van de meeste klachten**: als een zoekopdracht (locatie + budget
   + type + slaapkamers + energielabel samen) écht 0 resultaten oplevert op
   Funda, verdwijnt Funda's eigen resultatenlijst-blok. De oude code viel dan
   terug op het scrapen van *alle* woninglinks op de pagina, en pikte zo per
   ongeluk het betaalde "Toppositie"-blok op (willekeurige woningen van overal in
   Nederland, los van elk filter). Dat blok wordt nu altijd weggeknipt vóór er
   iets gescrapet wordt.
4. **Geen lokale nafiltering** — alleen prijs werd ooit teruggecontroleerd tegen
   de daadwerkelijk gescrapete woning. Nu wordt elke kandidaat ook op
   woningtype, slaapkamers, m² en energielabel geverifieerd tegen de kenmerken
   van de zoekopdracht, als vangnet tegen toekomstige Funda-wijzigingen of
   parameter-fouten. Ontbrekende data leidt nooit tot afwijzing, alleen
   aantoonbaar tegenstrijdige data.

De "Leliegracht, Amsterdam"-klacht bleek geen apart locatiebug — dat resolvet al
correct naar de juiste Funda-buurt; hoogstwaarschijnlijk ook getroffen door bug 3.

Relevante bestanden: `lib/data-sources/fundaFeed.ts`,
`lib/services/b2bStore.ts` (`ruimVerouderdeMatchenOp`),
`app/api/zakelijk/klanten/[id]/matches-verversen/route.ts`,
`app/api/cron/matches-controleren/route.ts`.

## 3. Wat er deze sessie ook is gedaan (zoekopdracht-formulier)

Gecommit in `114f339`: budget met duizendtal-opmaak en duidelijkere balk,
mooiere/makkelijkere locatie-invoer, slaapkamers-stappen beginnen bij 1 (was 2),
dakterras/lift/garage-filters gecorrigeerd, nieuw minimum-m²-veld, energielabel
omgezet naar "X of hoger"-classificatie (incl. "geen voorkeur").

## 4. Bekende, nog niet opgepakte punten (geen actieve bugs, wel mogelijk vervolg)

- **Straat-niveau locatie** (bv. exact "Leliegracht" i.p.v. de bredere buurt
  "Leliegracht e.o.") wordt nog niet ondersteund — Funda's straat-URL-formaat is
  al wel live geverifieerd (`selected_area=<plaats>/straat-<slug>`), maar er is
  geen actieve klacht die dit rechtvaardigt; alleen bouwen als hier expliciet
  behoefte aan is.
- **Werkgebied "variant 2"** (vast paneel rechts) is destijds als mockup getoond
  maar niet gebouwd — variant 1 is de gekozen/gebouwde versie.
- De precieze **oriëntatie** van een woningtype (bv. exact "vrijstaand" i.p.v.
  "hoekwoning") wordt lokaal nog niet dubbel gecontroleerd, alleen de grove
  familie huis/appartement. Kan later toegevoegd worden via de "Soort woonhuis"-
  tekst op de detailpagina (patroon is al bekend, zie sectie 2, punt 4) als dit
  ooit nog een klacht oplevert.

## 5. Werkwijze om vast te houden in het vervolg

- **Nooit gokken over Funda's gedrag** — altijd live verifiëren via de browser
  (checkbox aanklikken in het echte filterpaneel, resulterende URL aflezen,
  eventueel via JS de checkbox-`id`'s uitlezen). Dit heeft de afgelopen sessie
  meerdere concrete, niet voor de hand liggende bugs blootgelegd die anders
  gemist waren (o.a. de 2-onder-1-kap-mismatch en de topposities-vervuiling).
- Sjoerd vergelijkt gebouwde pagina's precies met eerder getoonde mockups/afspraken
  — bij twijfel liever expliciet checken dan aannemen dat "de bedoeling" volstaat.
