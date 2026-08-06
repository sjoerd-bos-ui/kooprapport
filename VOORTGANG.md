# Voortgang Kooprapport Zakelijk — overdracht naar nieuwe chat

Laatste commit: `ae33446` (main). Nog niet bevestigd of dit al gepusht/gedeployed is —
zie stap 1 hieronder.

## 1. Direct te doen

1. **Pushen en deployen.**
   ```
   cd "/Users/sjoerdbos/Werkmap Kooprapport/woningrapport-app" && git push
   ```
   Wacht op de Vercel-deploy en ga dan pas verder met testen (stap 2+3).

2. **Werkgebied-pagina controleren.** Recent herbouwd (variant 1: provincie-heatmap
   bovenaan + sorteerbare/doorzoekbare tabel met vinkjes per regio + rustig paneel
   onderaan voor de warmste regio). Dit was al één keer afgekeurd omdat het niet
   overeenkwam met de goedgekeurde mockup — de herbouwde versie zou nu wél moeten
   kloppen, maar is nog niet door Sjoerd bevestigd op de live site. Vergrendelde
   vinkjes (🔒) horen bij regio's die via een gedeelde redactionele naam (bv.
   "Drenthe") in het werkgebied zitten; die pas je aan via "Regio's beheren"
   bovenaan de pagina, niet los in de tabel.

3. **Matching-fixes testen met een paar echte zoekopdrachten.** Vier bugs zijn
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
