# Voortgang Kooprapport Zakelijk — overdracht naar nieuwe chat

## -9. Nieuwste sessie: slaapkamers-fix + site-brede SEO-herschrijving

**Slaapkamers "nog steeds op onbekend":** de vorige sessie had alleen de
re-fetch-frequentie verhoogd (slaapkamers toegevoegd aan
`heeftOnvolledigeVerificatie`), niet de eigenlijke extractie gefixt. Root
cause: `leesLokaleVerificatieData` in `fundaFeed.ts` las slaapkamers ALLEEN
uit de fragiele iconenrij op de detailpagina, zonder fallback. Fix:
`leesSlaapkamersUitAantalKamers(html)` toegevoegd, die het betrouwbare
"Aantal kamers"-dt/dd-blok parsed (bv. "4 kamers (3 slaapkamers)") als
PRIMAIRE bron; de oude iconenrij-regex is nu fallback. Commit `6d0f2bb`.

**SEO-audit (Sjoerd: "Check de SEO... wees kritisch, maar zorg voor maximaal
vindbaarheid!", n.a.v. een screenshot van het `/biedadvies`-zoekresultaat
dat niet aansloot bij echte zoekintentie):** eerst een voorstel voor
`/biedadvies` alleen, daarna op Sjoerds verzoek ("belangrijk is dat je dit
bij alle beschikbare pagina's aanpast") een volledige pagina-voor-pagina
audit in de chat gepresenteerd (incl. expliciete "geen wijziging nodig"-
oordelen voor juridische/vertrouwenspagina's als Contact/Privacy/
Voorwaarden/Werkwijze) — goedgekeurd met "oke doe het beste". Alle
title/description-herschrijvingen zijn gegrond in live zoekresultaten-
onderzoek (concurrenten, echte zoekvraag-formulering), niet geraden.

**Doorgevoerd:**

- `app/layout.tsx`: site-brede default `<title>` template van interne
  merktaal ("Premium woningdata per adres") naar de echte zoekvraag ("Wat is
  dit huis waard? Woningwaarde, biedadvies en funderingsrisico per adres").
- `app/page.tsx`: homepage-description herschreven, H1 bewust ongewijzigd
  gelaten.
- `app/biedadvies/page.tsx`: title/description/H1 herschreven rond "hoeveel
  bieden op een huis" i.p.v. de productnaam "Biedadvies"; BreadcrumbList
  JSON-LD toegevoegd (ontbrak als enige hoofdnavigatiepagina); nieuwe
  feitelijke alinea onder de tool die "hoeveel wordt er gemiddeld overboden
  in Nederland" beantwoordt met de eigen NVM-regiocijfers (regionale
  uitersten uit `regioOverbieden.ts`/de NVM-persrapportage Q2 2026 — bewust
  GEEN verzonnen landelijk gemiddelde, dat veld bestaat niet).
- `app/koopgids/page.tsx`: hub-title naar "Huis kopen: complete koopgids met
  checklist".
- `app/marktupdates/page.tsx`: hub-title naar "Woningmarktcijfers:
  huizenprijzen en overbieden per kwartaal".
- `lib/content/marktupdates.ts`: nieuw optioneel `metaTitel`-veld per
  artikel (los van de narratieve H1/`titel`) + ingevuld voor Q1/Q2 2026;
  `app/marktupdates/[slug]/page.tsx` se `generateMetadata` gebruikt nu
  `metaTitel ?? titel` voor `<title>`/OG-title, H1 blijft `titel`.
- `app/woningmarkt/page.tsx`: hub-title naar "Huizenprijzen per stad en
  regio (NVM-cijfers)".
- `app/woningmarkt/[stad]/page.tsx` + `app/woningmarkt/regio/[regio]/page.tsx`:
  nieuwste `periodeLabel` (bv. "2e kwartaal 2026") toegevoegd aan de title,
  zodat een cijfer-pagina in Google niet tijdloos/verouderd oogt.

**Bewust NIET aangepast:** Contact/Privacy/Voorwaarden/Werkwijze/Waarom
Kooprapport — geen generieke zoektermen om op te ranken, herschrijven zou
alleen ruis toevoegen.

**Nog open (niet door Sjoerd beantwoord):** Vercel build-fout
(`next/font/google` module-not-found) tijdens deze sessie gesignaleerd —
gediagnosticeerd als omgevings-/CDN-gerelateerd (niet veroorzaakt door eigen
commits, `layout.tsx` stond al sinds `a40c010` ongewijzigd). Twee opties
voorgelegd (handmatige redeploy vs. overstappen naar self-hosted
`next/font/local`) — Sjoerd heeft hier nog niet op gereageerd.

## -8. Vorige sessie: B2C-accountmodel ("Mijn rapporten")

Sjoerd: "laten we eerst een dashboard bouwen voor b2c... visualize eerst
goed." Na een visualize-ronde (eerst magic-link-only geschiedenisoverzicht,
toen een Rabo "Bepaal je Bod"-screenshot als concreet voorbeeld: "Nee ik wil
na het kopen direct zo iets. We gaan dus wel naar een account model") volgde
een expliciete afweging in de chat (magic link vs. wachtwoord vs. beide) —
Sjoerd koos magic link, "accountmoment" bleef "geen voorkeur" dus het
aanbevolen automatisch-bij-aankoop-moment is aangehouden.

**Uitgangspositie (onderzocht vóór het bouwen):** er bestond helemaal geen
consumentenaccount — alles puur anoniem/adres-gebonden, een `Bestelling`
had geen e-mailveld en verviel na 24 uur.

**Gebouwd:**

- `types/report.ts`/`lib/payments/bestellingen.ts`: `Bestelling` uitgebreid
  met `address` (volledig `AddressMeta`, nodig om vanuit het dashboard direct
  naar het juiste rapport te linken via `buildReportHref`), `email`,
  `favoriet`, `gearchiveerd`. TTL wordt automatisch 5 jaar zodra een
  bestelling aan een e-mailadres gekoppeld is (was altijd 24 uur).
  `koppelEmailAanBestelling`/`listBestellingenVoorEmail` (sorted-set-index,
  zelfde patroon als b2bStore.ts) / `zetFavoriet`/`zetGearchiveerd`.
- `lib/services/consumentAuth.ts` (nieuw): zelfde eenvoudige
  random-token-in-KV-sessiepatroon als `b2bAuth.ts`, met een TWEEDE
  tokentype ervoor (kortlevend, eenmalig inlogtoken/magic link — een
  consument heeft immers geen wachtwoord). Cookie `consument_session`, 365
  dagen.
- `stuurAccountInlogEmail` in `email.ts`.
- Routes: `api/account/koppel-bestelling` (nieuw account bij eerste keer
  "Bewaar in account" op een ontgrendeld rapport), `api/account/inlog-link`
  (terugkerend, altijd hetzelfde succesbericht — geen adres-enumeratie),
  `api/account/bevestigen` (verzilvert token, zet sessiecookie),
  `api/account/uitloggen`, `api/account/rapporten/[id]` PATCH
  (favoriet/gearchiveerd, met ownership-check tegen de sessie-e-mail).
- `app/account/inloggen` + `app/account` (dashboard, naar het
  goedgekeurde Rabo-geïnspireerde ontwerp: adres-toevoegen bovenaan,
  tabbladen Recent/Favoriet/Gearchiveerd, kaartgrid met "+"-kaart).
  `noindex` — persoonlijk overzicht, geen publieke content.
  `AccountDashboard.tsx`/`AccountInlogForm.tsx` nieuw.
- `ReportView.tsx`: nieuwe, LOSSE "Bewaar in account"-knop/formulier naast
  (niet in) de bestaande "Verstuur naar mail" — die laatste belooft
  expliciet het adres niet te bewaren, dus bewust twee gescheiden acties met
  eigen state/copy i.p.v. hergebruik.
- `api/betaling/aanmaken`: slaat nu het volledige adres op de bestelling op,
  en koppelt 'm automatisch aan een al ingelogde koper (geen nieuwe
  e-mailinvoer nodig bij een 2e/3e aankoop).
- "Mijn rapporten"-link toegevoegd aan SiteHeader + MobileNavMenu.
- Nieuw `SearchIcon` toegevoegd aan `components/report/icons.tsx` (ontbrak).

**Bewust simpel gehouden (v1):** geen "waarde-indicatie" op de dashboardkaart
(zou een nieuwe Altum-aanroep per kaart vereisen) — toont in plaats daarvan
het betaalde bedrag + datum, wat al beschikbaar is zonder extra kosten.

## -7. WhatsApp-alerts ("eerste zijn")

Sjoerd vroeg om de 5 grootste, markt-opschuddende functionaliteiten voor
Zakelijk; koos optie 1: realtime eerste-reactie-alerts. Twee expliciete
keuzes via AskUserQuestion: kanaal = WhatsApp (i.p.v. SMS), frequentie =
elke 15 minuten (i.p.v. 5 min of elk uur).

**Gebouwd, zelfde dubbele-opt-in-patroon als de bestaande koper-e-mail:**

- `types/b2b.ts`: `B2bZoekopdracht` uitgebreid met `telefoonKoper`,
  `whatsappBijNieuweMatches`, `telefoonKoperBevestigd`.
- `lib/services/whatsapp.ts` (nieuw): Twilio WhatsApp-API via kale fetch
  (geen SDK, zelfde stijl als email.ts/Resend). `naarE164Telefoonnummer()`
  normaliseert NL-notaties. **Belangrijke beperking (WhatsApp Business
  Policy, geen technische keuze van ons)**: business-initiated berichten
  buiten een 24-uurs sessievenster moeten via een door Meta goedgekeurd
  sjabloon (Twilio Content API, `TWILIO_CONTENT_SID_*`) — Sjoerd moet dit
  ÉÉNMALIG zelf aanmaken/goedkeuren in de Twilio Console, kan niet vanuit
  deze codebase. Zonder sjabloon-SID valt het terug op vrije tekst (werkt
  alleen in de Sandbox of binnen het sessievenster).
- `lib/services/b2bStore.ts`: `vraagKoperWhatsappBevestigingAan`/
  `bevestigKoperWhatsapp`, exact analoog aan de e-mail-tegenhangers.
- Nieuwe routes: `api/zakelijk/klanten/[id]/koper-whatsapp-bevestiging`
  (opnieuw versturen), `api/koper-whatsapp/bevestigen` (klik-link),
  `koper-whatsapp-bevestigd` (landingspagina).
- `api/zakelijk/klanten/[id]/route.ts` PATCH: telefoonnummer opslaan/
  valideren, opt-in-reset bij wijziging, bevestigingsbericht versturen.
- `ZoekopdrachtForm.tsx`: telefoonveld + WhatsApp-toggle naast het
  bestaande e-mailblok, zelfde bevestigd/wacht-op-bevestiging-badges.
- `cron/matches-controleren/route.ts`: verstuurt WhatsApp naast (niet i.p.v.)
  de koper-mail, eigen tellers in de response.
- `vercel.json`: matches-controleren van 1x/dag naar `*/15 * * * *`.
  **Vereist een Vercel Pro-abonnement** — Hobby staat alleen dagelijkse
  cronjobs toe. Dit verhoogt ook de Funda-proxykosten (Scrape.do) fors
  t.o.v. de oude dagelijkse frequentie — bewust akkoord via
  AskUserQuestion.
- Dashboard "wachten op koper"-tegel telt nu ook onbevestigde
  WhatsApp-nummers mee (niet alleen e-mail).

**Nog te doen door Sjoerd zelf, buiten deze codebase:**
1. Twilio-account + WhatsApp-afzender (Sandbox om te testen, eigen
   goedgekeurd nummer voor productie), env vars invullen (zie
   `.env.example`).
2. Content-templates aanmaken/laten goedkeuren in Twilio Console voor
   productiegebruik buiten het sessievenster.
3. Vercel-abonnement controleren/upgraden naar Pro voor de 15-minuten-cron.

## -6. Vorige sessie: matchingmodel-v3 — twee fasen i.p.v. één optelsom

Sjoerd, na testen van v2: "Ik twijfel nu over ons filtersysteem met punten;
we scoren matches, maar een match kan 90 punten krijgen die in een heel
ander gebied ligt." Kern van het probleem: locatie was maar 20 van de ~108
punten in v2's ene grote optelsom, dus een woning kon op de overige negen
onderdelen zo goed scoren dat een fout gebied (of te duur, verkeerd type, te
klein, etc.) volledig gecompenseerd werd. Voor iets fundamenteels als
"ligt dit in het gewenste gebied" hoort geen compensatie te bestaan.

Na een aantal rondes voorstellen-in-tekst (eerst alleen locatie hard maken,
toen een "vinkje aan = harde eis"-idee per vraag) besliste Sjoerd: "Vinkje
aan, stop daarmee anders vult diegene dat niet in, gooi dus hele
puntensysteem op de schop" -- geen opt-in toggles, gewoon een structurele
knip.

**Nieuwe architectuur: twee fasen.**

- **Fase 1 -- `voldoetAanHardeEisen()` (nieuw, matchScore.ts), synchroon,
  altijd verplicht.** 7 harde eisen: budget, locatie, woningtype, kamers,
  woonoppervlakte, buitenruimte, energielabel. Voldoet een kandidaat niet aan
  ÉÉN daarvan (BEVESTIGD, nooit op basis van ontbrekende scrapedata), dan is
  het sowieso geen match -- geen punten, geen compensatie. Boven budget mag
  nog 10% (dezelfde marge als de Funda-zoekopdracht zelf gebruikt, en
  Nederlandse biedpraktijk: bieden boven vraagprijs is normaal) -- bewust de
  enige uitzondering met marge, de rest is strikt op het gekozen getal/
  label/type.
- **Fase 2 -- `berekenMatchScore()` (herschreven), alleen voor overlevers van
  fase 1.** Scoort niet meer "voldoet het aan het minimum" (dat staat al
  vast) maar "hoeveel BETER dan het gevraagde minimum is dit" -- anders zou
  elke overlever toch weer de volle punten krijgen en zou er niets meer te
  rangschikken zijn. Budget: hoe verder onder het max, hoe hoger. Locatie:
  bonus voor de EERST gekozen (dus hoogst geprefereerde) locatie t.o.v. de
  2e/3e. Woningtype: bonus voor het eerst gekozen type. Kamers/oppervlak:
  bonus per eenheid boven het minimum. Buitenruimte: tuin > dakterras >
  balkon. Energielabel: bonus per klasse boven het gekozen minimum. Parkeren
  en de prioriteitenbonus waren al zuiver rangschikkend en zijn ongewijzigd.
  Totaal blijft dezelfde 108-ruwe-punten-gekapt-op-100-opzet als v2.
- **Contract tussen de fasen:** aanroepers (b2bStore.ts, matches-verversen/
  route.ts, cron/matches-controleren/route.ts) roepen EERST
  voldoetAanHardeEisen() aan en pas bij `voldoet: true` berekenMatchScore().
  Bijkomend voordeel: voldoetAanHardeEisen() is synchroon en triggert nooit
  de CBS-voorzieningenopzoeking (voorzieningenMatch.ts) -- die dure lookup
  gebeurt nu alleen nog voor kandidaten die de harde eisen al gehaald hebben,
  i.p.v. voor elke kandidaat tijdens het zoeken. Merkbare snelheids-/
  kostenwinst bij matches-verversen (100 kandidaten) en de dagelijkse cron.
- **`lib/services/gebiedIndeling.ts`:** `vergelijkLocatie()` uitgebreid naar
  `vergelijkLocatieUitgebreid()`, die ook de INDEX teruggeeft van welke
  gekozen locatie exact matchte (nodig voor de fase-2-bonus "eerst gekozen
  locatie scoort hoger").
- **`types/b2b.ts`:** `MIN_MATCH_SCORE` (de oude 60-puntendrempel als
  afwijzingsgrond) verwijderd -- die rol is nu fase 1. `B2B_DEALBREAKERS`
  teruggebracht van 11 naar 7 opties: "Geen tuin/balkon", "Prijs boven
  budget", "Minder kamers dan gewenst" en "Kleinere oppervlakte dan gewenst"
  verwijderd, want die overlapten volledig met een fase-1-harde-eis en konden
  dus nooit meer triggeren voor een kandidaat die de dealbreakers-check
  bereikt. "Slecht energielabel" (eigen vaste grens, "lager dan C", los van
  de koper-gekozen ondergrens uit Vraag 8) blijft wel bestaan.
- **`components/zakelijk/MatchesKaart.tsx`:** scorecirkel/labels/toelichting
  drukken niet meer "voldoet dit" uit maar "hoeveel beter dan gevraagd" --
  een korte tekstregel bovenaan legt dat nu uit ("elke woning hier voldoet
  al aan de harde eisen").

`npx tsc --noEmit -p tsconfig.json` schoon.

## -5b. Vorige sessie: Vraag 3 (locatie) landelijk gemaakt

Direct na de matchingmodel-v2-rebuild hieronder testte Sjoerd de nieuwe
vragenlijst en reageerde op Vraag 3: "Dit waren voorbeelden; mensen moeten
alles kunnen kiezen in Nederland natuurlijk ; maak het systeem ook daarop."
De net gebouwde Vraag 3 beperkte locatiekeuze namelijk nog tot 10 vaste
Rotterdam-regio-opties (+ "Andere") -- die vaste lijst is nu volledig
vervangen door dezelfde landelijke, live PDOK-autocomplete als de oude
zoekopdracht, voor alle (tot 3) locatieslots.

- `types/b2b.ts`: `B2bVoorkeurLocatie`/`B2B_VOORKEUR_LOCATIES` verwijderd.
  `B2bKoperVoorkeuren.voorkeurLocaties` is nu `B2bLocatie[]` (was
  `B2bVoorkeurLocatie[]`); `voorkeurLocatieAnders` (de vroegere
  "Andere"-uitzondering) is vervallen -- elk van de 3 slots gebruikt nu
  dezelfde autocomplete, geen aparte "Andere"-optie meer nodig.
- `lib/services/gebiedIndeling.ts`: volledig herschreven. De vaste
  Rotterdam-kwadrant-indeling + aangrenzendheidsgraaf (`classificeerGebied`/
  `zijnAangrenzend`) is vervangen door `vergelijkLocatie()`, een generieke
  tekstvergelijking (plaats + evt. wijk, genormaliseerd, substring-match in
  beide richtingen) tussen een gevonden woning en de gekozen
  `B2bLocatie`-voorkeuren. Een vaste, handmatig onderhouden
  aangrenzendheidsgraaf is voor heel Nederland niet haalbaar; deze aanpak
  werkt overal.
- `lib/services/matchScore.ts` (Component 2, locatie, 20 pt): drie tiers
  i.p.v. de oude drie (exact/aangrenzend/overig) -- "exact" (20, plaats+wijk
  bevestigd), "onbekend" (12, kon niet bevestigd worden, geen
  afwijzingsgrond), "geen_match" (4, aantoonbaar buiten de gekozen
  locatie(s) -- vooral relevant bij het herscoren van een al opgeslagen match
  na een gewijzigde locatiekeuze).
- `lib/data-sources/fundaFeed.ts`: `afgeleideGebiedSlugs()` sterk
  vereenvoudigd -- elke `B2bLocatie` bevat al de exacte Funda-slug
  (`plaatsSlug`/`wijkSlug`), dus de vertaaltabellen (`GEMEENTE_SLUGS`,
  `ROTTERDAM_KWADRANTEN`) zijn vervallen.
- `lib/services/koperVoorkeurenValidatie.ts`: Vraag 3 valideert nu een array
  van 1-3 losse `B2bLocatie`-objecten (elk via de bestaande
  `valideerLocatie()`-helper) i.p.v. een vaste-waarden-array.
- `components/zakelijk/VoorkeurenVragenlijst.tsx`: nieuwe `LocatiePicker`-
  subcomponent -- gekozen locaties als verwijderbare chips, met een
  `LocatieAutocomplete`-invoerveld voor de volgende keuze zolang er ruimte
  is (max 3). `LocatieAutocomplete` is zelf single-value, dus na elke keuze
  wordt het invoerveld via een wijzigende `key`-prop geremount zodat het weer
  leeg begint.
- `components/zakelijk/ZoekopdrachtForm.tsx`: locatie-chipweergave
  vereenvoudigd tot `koperVoorkeuren.voorkeurLocaties.map(l => l.label)`.

`npx tsc --noEmit -p tsconfig.json` schoon.

## -5. Vorige sessie: matchingmodel-v2 — volledige herbouw (13-vragen/100-punten)

Sjoerd's opdracht, verbatim: "Matchingsproces onder de loep nemen ; alle data
zijn van Funda te halen op voorzieningen na - die halen we uit ons eigen
systeem en maken we de koppeling - mochten er antwoorden in staan die net
niet passen kan je dat aanpassen, bouw maar" -- gevolgd door een volledige
spec voor een 13-vragen/7-stappen koperVoorkeuren-vragenlijst en een
10-componenten/100-puntenscore (drempel 60, tiers 60-79 "redelijk"/80-100
"sterk"). Via drie rondes verduidelijkingsvragen bevestigde Sjoerd: de nieuwe
vragenlijst wordt door de makelaar ingevuld, en vervangt **het complete oude
formulier** (zowel de oude 4-vragen koper-voorkeuren als de oude, losse
budget/locatie/kenmerken-zoekopdracht) -- "Vervangt het hele formulier".

**Kernverandering:** `B2bZoekopdracht` heeft nog maar drie velden
(`matchenActief`, `koperVoorkeuren`, `koperVoorkeurenToken`). Budget, locatie
en woningtype komen niet meer uit losse zoekopdrachtvelden, maar worden
AFGELEID uit de volledige `B2bKoperVoorkeuren` (13 vragen) -- diezelfde
antwoorden sturen zowel de daadwerkelijke Funda-zoekopdracht
(`haalFundaMatches` in `fundaFeed.ts`) als de matchscore (`matchScore.ts`).

**Nieuwe/gewijzigde bestanden:**
- `types/b2b.ts`: volledig herschreven vocabulaire voor alle 13 vragen
  (`B2B_BUDGET_OPTIES`, `B2B_VOORKEUR_LOCATIES`, `B2B_WONINGTYPE_VOORKEUREN`,
  `B2B_MIN_KAMERS_OPTIES`, `B2B_MIN_OPPERVLAK_OPTIES`,
  `B2B_BUITENRUIMTE_OPTIES`, `B2B_MIN_ENERGIELABEL_OPTIES`,
  `B2B_VOORZIENING_WENSEN`, `B2B_PARKEREN_OPTIES`, `B2B_DEALBREAKERS`,
  `B2B_AFWEGINGEN`, `B2B_PRIORITEITEN`), nieuwe `B2bKoperVoorkeuren`
  (13 velden), `MIN_MATCH_SCORE = 60`. Oude 4-velden-`B2bKoperVoorkeuren`,
  `B2bKenmerken`, `B2bWoningtype` etc. verwijderd.
- `lib/services/gebiedIndeling.ts` (nieuw): eigen, beargumenteerde
  Rotterdam-kwadrant-naar-wijk-indeling + aangrenzendheidsgraaf
  (`classificeerGebied`, `zijnAangrenzend`) -- expliciet gedocumenteerd als
  eigen interpretatie, geen officiële CBS-/Funda-indeling.
- `lib/data-sources/fundaFeed.ts`: `haalFundaMatches(voorkeuren, limiet,
  bekendeUrls)` -- bouwt de zoek-URL nu uit de koperVoorkeuren (multi-gebied
  via Funda's `selected_area`-comma-lijst, multi-woningtype via
  `object_type`), en leest nieuwe detailpaginavelden (kamers, lift, woonlaag,
  parkeren, ruw woningsubtype, Funda's eigen breadcrumb-gebied) -- alles live
  geverifieerd via Chrome-DOM vóór implementatie.
- `lib/services/voorzieningenMatch.ts` (nieuw): koppelt Vraag 9
  (voorzieningenwensen) aan het bestaande CBS-gebaseerde
  `buurtprofiel.ts` (al gebruikt voor consumentenrapporten) -- gratis/keyless,
  alleen aangeroepen als de koper daadwerkelijk voorzieningenwensen/
  -dealbreaker/-prioriteit heeft opgegeven.
- `lib/services/matchScore.ts`: volledig herbouwd, nu `async` (kan een
  voorzieningenopzoeking triggeren), 10 componenten (budget 20, locatie 20,
  woningtype 15, kamers 12, oppervlak 10, buitenruimte 8, energielabel 8,
  parkeren 5, dealbreakers -20 bij trigger, prioriteitenbonus 10) -- de
  componentsom uit de opgave (108) wordt gekapt op 100 voor het eindcijfer;
  de losse componentscores blijven ongewijzigd zichtbaar. Ontbrekende
  scrapegegevens leiden nooit tot afwijzing (middelste tier), behalve bij
  locatie (bewust laagste tier bij een niet-classificeerbaar gebied, zie
  toelichting in de code).
- `lib/services/koperVoorkeurenValidatie.ts` (nieuw): gedeelde validator voor
  alle 13 velden, gebruikt door zowel de makelaar-route als de publieke
  token-route.
- `lib/services/b2bStore.ts`: `ruimVerouderdeMatchenOp`/`kapMatchenOpMax` nu
  async (scoren via `berekenMatchScore`), evictie bij score < 60.
- API-routes (`klanten/[id]`, `koper-voorkeuren/[token]`,
  `matches-verversen`, `cron/matches-controleren`): allemaal bijgewerkt naar
  het nieuwe model -- elke gevonden kandidaat wordt vóór opslaan gescoord,
  alleen bewaard bij score >= 60.
- `components/zakelijk/VoorkeurenVragenlijst.tsx` (nieuw): gedeelde
  7-stappen-wizard voor alle 13 vragen, hergebruikt door zowel
  `ZoekopdrachtForm.tsx` (makelaar, in de app) als `KoperVoorkeurenForm.tsx`
  (publieke koper-link) -- precies zoals eerder al het patroon was ("moet op
  deze manier ingevuld kunnen worden via de link, maar ook niet ingevuld of
  via de app zelf"), nu toegepast op de volledige lijst i.p.v. alleen de
  laatste 4 vragen. Beide oude formulieren (budget/locatie/kenmerken-tegels
  EN de oude 4-vragen-blok) zijn volledig vervangen, niet aangevuld.
- `components/zakelijk/MatchesKaart.tsx`: scoreweergave bijgewerkt naar de
  nieuwe 10-componenten-vorm (`punten`/`maxPunten` i.p.v. `behaald`/
  `maximum`); scores worden nu asynchroon in een `useEffect` berekend (met
  een korte "Scores worden berekend…"-status) omdat `berekenMatchScore` niet
  langer synchroon is; de koper-voorkeuren-samenvatting bovenaan toont nu de
  belangrijkste prioriteiten en dealbreakers (Vraag 13/11) i.p.v. de
  vervallen prioriteit/bouwstijl-velden.

**Interpretatiekeuzes (spec liet ruimte, expliciet gedocumenteerd in de
code, niet stilzwijgend ingevuld):** Rotterdam-kwadrant-indeling en
aangrenzendheidsgraaf zijn eigen werk, geen officiële classificatie;
woningtype-gelijkenisgroepen (aaneengeschakeld/vrijstaand-achtig/gestapeld);
"Benedenwoning zonder lift" geïnterpreteerd als "hogere verdieping zonder
lift" (de letterlijke lezing zou nooit triggeren); parkeren/buitenruimte-
tiers aangevuld waar de opgave gaten liet; "quiet_location" en
"condition_year" (prioriteitenbonus) hebben geen echte databron en vallen
terug op een neutrale/bouwjaar-benaderde tier; componentsom 108 → gekapt op
100 voor het eindcijfer.

`npx tsc --noEmit -p tsconfig.json` schoon (geen fouten). Nog niet als
ingelogde makelaar in de browser getest (geen inloggegevens in deze
sandbox) -- eerstvolgende sessie: live doorlopen van de nieuwe wizard (beide
invulkanalen) en een paar Funda-zoekopdrachten, om te bevestigen dat de
langlopende "verkeerde wijken"-klacht met dit volledig herbouwde model ook
daadwerkelijk verdwenen is.

## -4. Vorige sessie: kandidatenpool losgekoppeld van weergavelimiet ("Funda 196, wij 25")

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

- ~~**Straat-niveau locatie**~~ — GEBOUWD (Cowork-sessie "top 10"-lijst,
  punt 10): `B2bLocatie.straatSlug`, PDOK-type `weg` toegevoegd aan
  plaatsLookup.ts, `afgeleideGebiedSlugs()` in fundaFeed.ts geeft nu
  `<plaats>/straat-<slug>`, en `B2bMatchVerificatie.straatRuw` (laatste
  BreadcrumbList-entry) wordt door `vergelijkLocatieUitgebreid()` vergeleken
  bij een gekozen straat. Het zoek-URL-formaat is LIVE GEVERIFIEERD via
  `web_fetch` tijdens het bouwen zelf (niet alleen aangenomen op basis van de
  eerdere aantekening hierboven): `selected_area=rotterdam/straat-reserveboezemstraat`
  gaf "1 koopwoningen in Reserveboezemstraat, Rotterdam" en precies het juiste
  huis terug. De breadcrumb op de detailpagina (voor `straatRuw`) is NIET los
  herverifieerd tegen de ruwe JSON-LD -- leunt op hetzelfde, al eerder
  vertrouwde breadcrumbpatroon als `gebiedRuw` (bevestigd zichtbaar op de
  pagina: "Nieuw Crooswijk" als tussenliggende breadcrumb-stap).
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
