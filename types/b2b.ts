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
// behoudt. `logoUrl` is een gewone string, maar in de praktijk meestal een
// base64 data-URI: BrandingForm.tsx verkleint een geüpload bestand client-side
// (canvas, max 160px) en slaat dat direct hier op -- geen aparte
// bestandsopslag nodig (geen Vercel Blob/S3/Cloudinary). Wie liever een al
// gehoste URL gebruikt, kan die ook gewoon plakken; het veld accepteert beide.
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
  // STRAAT-NIVEAU (zie het Cowork-gesprek "straat-niveau locatie wordt nog
  // niet ondersteund"): exacte Funda-straatslug indien de koper een specifieke
  // straat koos i.p.v. een wijk/buurt/plaats, anders null. Sluit elkaar uit
  // met wijkSlug -- PDOK levert per suggestie precies één type (woonplaats/
  // wijk/buurt/weg) terug, zie plaatsLookup.ts. Funda's URL-formaat hiervoor
  // (`<plaats>/straat-<slug>`) is hetzelfde live-verificatiepatroon als het
  // "wijk-"-voorvoegsel voor wijken, zie afgeleideGebiedSlugs() in
  // lib/data-sources/fundaFeed.ts.
  straatSlug: string | null;
}

// Energielabel als "X of beter"-classificatie i.p.v. losse per-label
// vinkjes -- Funda's eigen filter heeft 12 losse checkboxes
// (A+++++ t/m G, live geverifieerd via het filterpaneel), maar niemand
// filtert in de praktijk op dat niveau van precisie. Deze 7 waarden zijn
// een bewuste, eigen vereenvoudiging: "A" dekt bij het opbouwen van de
// Funda-zoekopdracht automatisch ook A+ t/m A+++++ mee (zie
// ENERGIELABEL_NAAR_FUNDA_WAARDEN in lib/data-sources/fundaFeed.ts).
export type B2bEnergielabel = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export const B2B_ENERGIELABELS: B2bEnergielabel[] = ["A", "B", "C", "D", "E", "F", "G"];

// Essentiële informatie uit de zoekopdracht (#3). Sinds de matchingmodel-v2-
// herbouw (zie het Cowork-gesprek hierover, "matchingsproces onder de loep")
// vervangt de volledige 13-vragen-lijst (B2bKoperVoorkeuren hieronder) het
// VOLLEDIGE oude formulier (budget/locatie/kenmerken EN de oude, aparte
// 4-vragen koper-voorkeuren) -- niet alleen de score, ook wat er op Funda
// gezocht wordt (budget uit Vraag 1, locatie uit Vraag 3, woningtype uit
// Vraag 4, zie afgeleideZoekcriteria() in lib/services/koperVoorkeuren.ts)
// komt nu allemaal uit dit ene formulier. `matchenActief` blijft BEWUST een
// los, makelaar-only veld (niet onderdeel van de vragenlijst): de koper kiest
// nooit zelf of automatisch matchen aan staat.
export interface B2bZoekopdracht {
  matchenActief: boolean;
  // Matching-model: koperVoorkeuren = ingevulde antwoorden (of null, nog niet
  // ingevuld), koperVoorkeurenToken = het token voor de publieke
  // vragenlijst-link (zie maakOfVernieuwKoperVoorkeurenToken in
  // lib/services/b2bStore.ts) -- pas aangemaakt zodra de makelaar de link
  // voor het eerst genereert, dus ook hier `null` totdat dat gebeurt.
  koperVoorkeuren: B2bKoperVoorkeuren | null;
  koperVoorkeurenToken: string | null;
  // "Bewaar als interessant" / mail-notificaties (zie het Cowork-gesprek
  // "Nieuwe matches ... via de mail"): het e-mailadres van de koper zelf,
  // door de makelaar ingevuld. Los van `koperVoorkeuren` omdat het een
  // contactgegeven is, geen zoekcriterium. `null` = nog niet ingevuld.
  emailKoper: string | null;
  // Aan/uit-instelling, analoog aan `matchenActief` hierboven -- bewust een
  // apart veld i.p.v. "mail versturen zodra emailKoper gevuld is": de
  // makelaar kan een adres invullen zonder dat er meteen mail uitgaat (bv.
  // tijdens het gesprek met de koper, voordat die toestemming heeft
  // gegeven). Alleen relevant als emailKoper ook is ingevuld EN bevestigd is
  // (zie emailKoperBevestigd hieronder) -- zie de check in de cron-route.
  mailBijNieuweMatches: boolean;
  // DUBBELE OPT-IN (zie het Cowork-gesprek "koper-e-mailadres heeft geen
  // opt-in van de koper zelf"): de makelaar vult emailKoper in, maar dat is
  // een derde die toestemming geeft namens iemand anders -- niet genoeg voor
  // AVG-nette mailmeldingen. Daarom, zelfde patroon als de Marktupdates-
  // nieuwsbrief (lib/services/marktupdateAbonnees.ts): zodra emailKoper wordt
  // gezet/gewijzigd (zie de PATCH-route) gaat er een bevestigingsmail naar
  // DAT adres, en pas na een klik op de link daarin wordt dit `true`. De
  // cron-route (matches-controleren) stuurt nooit mail bij `false`, ook niet
  // als mailBijNieuweMatches al aan staat -- de makelaar kan de toggle vast
  // aanzetten, het gaat pas echt lopen zodra de koper heeft bevestigd. Wordt
  // automatisch weer `false` zodra emailKoper verandert (nieuwe bevestiging
  // nodig voor een nieuw adres).
  emailKoperBevestigd: boolean;

  // WHATSAPP-ALERTS ("eerste zijn", zie het Cowork-gesprek "de grootste
  // functionaliteiten waar we echt de markt mee opschudden"): zelfde
  // drieledige patroon als emailKoper/mailBijNieuweMatches/
  // emailKoperBevestigd hierboven -- telefoonnummer los van koperVoorkeuren
  // (contactgegeven, geen zoekcriterium), een eigen aan/uit-toggle, en
  // dubbele opt-in vóór er daadwerkelijk berichten uitgaan (zie
  // lib/services/b2bStore.ts: vraagKoperWhatsappBevestigingAan/
  // bevestigKoperWhatsapp). Altijd genormaliseerd naar E.164 (bv.
  // "+31612345678") vóórdat het hier wordt opgeslagen -- zie
  // lib/services/whatsapp.ts: naarE164Telefoonnummer.
  telefoonKoper: string | null;
  // Analoog aan mailBijNieuweMatches: bewust een apart aan/uit-veld, niet
  // "stuur zodra telefoonKoper gevuld is" -- de makelaar kan een nummer
  // vastleggen zonder dat er meteen een bericht uitgaat.
  whatsappBijNieuweMatches: boolean;
  // Zelfde dubbele-opt-in-principe als emailKoperBevestigd: de cron
  // (matches-controleren) stuurt nooit WhatsApp-berichten bij `false`, ook
  // niet als whatsappBijNieuweMatches al aan staat. Wordt automatisch weer
  // `false` zodra telefoonKoper verandert.
  telefoonKoperBevestigd: boolean;
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
  // Deel-link voor de "Favorieten vergelijken"-tab (zie het Cowork-gesprek
  // "maak de deellink"), zelfde tokenpatroon als B2bRapportAanvraag.deelToken
  // hierboven. BEWUST op dossier-niveau (niet op een vaste momentopname van
  // matches): de publieke pagina (app/deelfavorieten/[token]) toont bij elk
  // bezoek de op dat moment actuele favorieten van dit dossier, want een
  // shortlist die de makelaar met een koper deelt hoort "live" te blijven
  // meebewegen als er favorieten bij komen of af gaan -- in tegenstelling tot
  // een afgerond rapport (dat IS een vaste momentopname, vandaar dat
  // deelToken daar wel een bevroren rapport-id aanwijst).
  favorietenDeelToken?: string | null;
}

// Eén gevonden woningadvertentie die aan de zoekopdracht van een klant
// voldoet (zie app/api/cron/matches-controleren/route.ts). `bron` is bewust
// een union (nu alleen "funda") zodat een volgende platform (Pararius,
// Jaap.nl) later zonder migratie toegevoegd kan worden.
export type B2bMatchBron = "funda";

// Snapshot van de lokale kenmerken-verificatie (zie leesLokaleVerificatieData/
// voldoetAanKenmerken in lib/data-sources/fundaFeed.ts) op het moment dat een
// match werd opgeslagen -- zie B2bWoningMatch.verificatie hieronder voor het
// waarom.
// BUGFIX (klacht "ik switch van balkon naar tuin en oude matches blijven
// staan"): tuin/balkon/dakterras zaten HELEMAAL NIET in deze snapshot en
// werden dus ook nooit door voldoetAanKenmerken() gecontroleerd -- alleen
// woningtype/slaapkamers/m²/energielabel. Een match die ooit (terecht) als
// "heeft balkon" was gevonden, werd bij het wijzigen van de zoekopdracht naar
// "moet tuin hebben" dus nooit opnieuw getoetst en bleef gewoon staan, exact
// hetzelfde patroon als de eerdere DERDE BUGFIX hierboven (energielabel),
// alleen dan voor deze drie kenmerken. Bewust wél `boolean` (niet
// `boolean | null`) -- in tegenstelling tot slaapkamers/m²/energielabel (die
// altijd op de pagina staan, dus "niet gevonden" = onze scrape schoot
// tekort) is bij Funda's eigen "Buitenruimte"-blok de AFWEZIGHEID van de
// "Tuin"- resp. "Balkon/dakterras"-rij live geverifieerd het signaal dat de
// woning dat kenmerk simpelweg niet heeft (zie leesLokaleVerificatieData in
// lib/data-sources/fundaFeed.ts) -- geen onzekerheid, dus geen `null`-geval
// nodig.
export interface B2bMatchVerificatie {
  woningtypeFamilie: "huis" | "appartement" | null;
  slaapkamers: number | null;
  woonoppervlak: number | null;
  energielabel: string | null;
  heeftTuin: boolean;
  heeftBalkon: boolean;
  heeftDakterras: boolean;
  // Uitbreiding voor het matching-scoremodel (zie lib/services/matchScore.ts)
  // -- live geverifieerd op meerdere Funda-detailpagina's (Chrome-DOM, dt/dd-
  // rijen "Bouwjaar", "Perceel", "Vraagprijs per m²", "Gem. vraagprijs / m²").
  // Alle vier `null` als de rij ontbreekt (bv. Perceel bestaat niet bij
  // appartementen, die hebben geen eigen grond) -- dat leidt in de score
  // nooit tot afwijzing, alleen tot 0 punten op dat ene onderdeel.
  bouwjaar: number | null;
  perceeloppervlak: number | null; // in m², alleen bij huizen
  vraagprijsPerM2: number | null;
  buurtgemiddeldePrijsPerM2: number | null;
  // -----------------------------------------------------------------------
  // Matchingmodel v2 (100-puntensysteem, zie lib/services/matchScore.ts) --
  // ALLES hieronder is LIVE GEVERIFIEERD op meerdere Funda-detailpagina's
  // (Chrome-DOM, "Reserveboezemstraat 5", "Buizenwerf 235", "Voorschoterlaan
  // 101" e.a., zie VOORTGANG.md voor de fundstukken) vóór implementatie, niet
  // gegokt.
  //
  // "Aantal kamers" dt/dd-rij toont BEIDE getallen in één string, bv.
  // "4 kamers (3 slaapkamers)" -- kamers is het TOTAAL (incl. woonkamer
  // e.d.), losstaand van slaapkamers hierboven (dat komt uit de losse
  // iconenrij bovenaan de pagina, ongewijzigd).
  kamers: number | null;
  // Funda's "Voorzieningen"-rij is een kommagescheiden lijst (bv. "Lift,
  // mechanische ventilatie, en TV kabel") -- lift wordt hieruit gelezen,
  // ontbreekt de rij (of ontbreekt "Lift" erin) dan is er geen lift. Zelfde
  // "afwezig = nee"-discipline als bij heeftTuin/heeftBalkon hierboven.
  heeftLift: boolean;
  // "Gelegen op" (bv. "Begane grond" of "10e woonlaag") -- 0 = begane grond,
  // anders het woonlaagnummer. `null` als de rij ontbreekt (bv. bij
  // grondgebonden huizen, die hebben geen "woonlaag"-concept) -- geen
  // aanname dat dat begane grond betekent.
  woonlaag: number | null;
  // Eigen parkeerplek: aanwezig zodra de losse "Soort garage"/"Capaciteit"-
  // rijen bestaan (alleen aanwezig als de woning zelf een garage/parkeerplek
  // heeft, live bevestigd op "Reserveboezemstraat 5": "Soort garage" =
  // "Inpandig", "Capaciteit" = "1 auto"). `parkeerOmschrijving` is de
  // ALTIJD aanwezige, bredere "Soort parkeergelegenheid"-rij (buurtniveau,
  // bv. "Betaald parkeren, op eigen terrein, parkeergarage en
  // parkeervergunningen") -- gebruikt om "geen parkeermogelijkheid" te
  // herkennen voor de parkeren-score/dealbreaker.
  heeftEigenParkeerplek: boolean;
  parkeerOmschrijving: string | null;
  // Ruwe tekst van "Soort woonhuis" (huizen, bv. "Herenhuis, tussenwoning")
  // of "Soort appartement" (appartementen, bv. "Portiekflat (appartement)")
  // -- bevat het fijnmazige subtype waar woningtypeFamilie hierboven (alleen
  // huis/appartement) geen onderscheid in maakt. Wordt in matchScore.ts met
  // trefwoorden (tussenwoning/hoekwoning/vrijstaand/halfvrijstaand/studio)
  // geclassificeerd, zie classificeerWoningsubtype().
  woningsubtypeRuw: string | null;
  // De naam van het gebied dat FUNDA ZELF aan deze woning toekent, gelezen
  // uit het BreadcrumbList-JSON-LD-blok op de detailpagina (live
  // geverifieerd: "Reserveboezemstraat 5" -> breadcrumb "Rotterdam" >
  // "Nieuw Crooswijk" > straatnaam) -- Funda's eigen, al toegekende
  // buurt/wijknaam, betrouwbaarder dan zelf uit het adres proberen af te
  // leiden. Gebruikt voor de locatie-score (vergelijkLocatie() in
  // lib/services/gebiedIndeling.ts).
  gebiedRuw: string | null;
  // De LAATSTE breadcrumb-entry (dezelfde bron als gebiedRuw hierboven, maar
  // dan één positie verder): bij "Reserveboezemstraat 5" is dat letterlijk
  // "Reserveboezemstraat 5" -- straat+huisnummer, geen apart geparste
  // straatnaam. Dat is bewust genoeg: vergelijkLocatie() gebruikt dezelfde
  // substring-vergelijking als voor wijk/buurt ("reserveboezemstraat 5"
  // bevat "reserveboezemstraat"), dus geen extra parsing nodig om een
  // straat-niveau voorkeur (B2bLocatie.straatSlug) te verifiëren.
  straatRuw: string | null;
  plaatsnaam: string | null;
  // BUGFIX (Sjoerd: "de beschikbaar-fix werkt niet, ook niet op Vercel"):
  // de eerdere fix zette alleen een URL-filter op de ZOEKOPDRACHT
  // (availability=available in fundaFeed.ts), dus een al opgeslagen match
  // werd nooit meer herzien als de woning nadien onder bod/verkocht ging.
  // Live geverifieerd (Chrome-DOM, zowel een "Onder bod"- als een
  // "Beschikbaar"-woning): Funda toont de status als een gewone dt/dd-rij
  // "Status" op de detailpagina (<dt>Status</dt><dd>Beschikbaar</dd>),
  // exact hetzelfde patroon als Bouwjaar/Aantal kamers/etc. Ruwe tekst hier
  // bewaard ("Beschikbaar", "Onder bod", "Verkocht onder voorbehoud",
  // "Onder optie", ...) -- classificatie (voldoet/faalt) gebeurt in
  // matchScore.ts, niet hier.
  status: string | null;
}

// -----------------------------------------------------------------------------
// Koper-voorkeuren v2 (matchingmodel-herbouw, zie het Cowork-gesprek hierover
// "matchingsproces onder de loep") -- de VOLLEDIGE, 13-vragen/7-stappen-lijst
// die het oude 4-vragen-formulier (prioriteit/bouwstijl/budgetFlexibel/
// kenmerkenFlexibel) EN het aparte budget/locatie/kenmerken-zoekopdracht-
// formulier samen vervangt. Ingevuld door de makelaar (in de app, zie
// components/zakelijk/VoorkeurenVragenlijst.tsx) -- de publieke koper-link
// (zelfde tokenpatroon als B2bRapportAanvraag.deelToken) blijft bestaan als
// alternatief invulkanaal, zie het gesprek "moet op deze manier ingevuld
// kunnen worden via de link, maar ook niet ingevuld of via de app zelf" uit
// de vorige sessie -- dat principe verandert niet, alleen de vragenlijst zelf.
// `null` op B2bZoekopdracht.koperVoorkeuren = nog niet ingevuld: er wordt dan
// niets gezocht/gescoord (zie afgeleideZoekcriteria() in
// lib/services/koperVoorkeuren.ts) totdat dit formulier is ingevuld -- geen
// vage terugval meer op losse velden zoals voorheen, want die bestaan niet
// meer los van dit formulier.
// -----------------------------------------------------------------------------

// --- Stap 1: budget -----------------------------------------------------------
// NIEUW (Sjoerd, visuele herontwerp-sessie van het zoekfilterproces): budget
// was een vaste keuze uit 6 buckets (tot 550k, daarboven alleen "550k_plus"
// zonder eigen maximum) -- te grof voor de Rotterdamse markt, waar ook
// woningen ruim boven de € 700.000 voorkomen. Vervangen door een doorlopend
// getal (een schuifregelaar in de UI, zie VoorkeurenVragenlijst.tsx) met een
// eigen, expliciete "nog geen vast maximum"-keuze i.p.v. een bucket-waarde
// ervoor ("uncertain"). `maxKoopprijs: number | null` op B2bKoperVoorkeuren
// zelf (zie onderaan dit bestand) -- `null` betekent nu precies hetzelfde als
// voorheen de "uncertain"-bucket: geen budgetgrens toegepast, altijd volledige
// punten op dit onderdeel (zie scorePrijsCriterium/faaltBudget in
// matchScore.ts).
//
// BUGFIX/migratie: bestaande dossiers hebben hier nog een oude bucket-string
// (bv. "350k_450k") staan i.p.v. een getal -- overal waar dit veld gelezen
// wordt (matchScore.ts, fundaFeed.ts, ZoekopdrachtForm.tsx,
// VoorkeurenVragenlijst.tsx) is dat defensief met `typeof === "number"`
// afgevangen, zelfde discipline als bij de eerdere opschoningen van
// verwijderde keuze-opties dit traject.
export const BUDGET_MIN = 100000;
export const BUDGET_MAX = 1500000;
export const BUDGET_STAP = 5000;

export type B2bKostenKoperOptie = "yes_included" | "no_separate" | "unknown";

export const B2B_KOSTEN_KOPER_OPTIES: { waarde: B2bKostenKoperOptie; label: string }[] = [
  { waarde: "yes_included", label: "Ja, mijn budget is inclusief kosten koper" },
  { waarde: "no_separate", label: "Nee, ik houd rekening met extra kosten" },
  { waarde: "unknown", label: "Ik weet niet wat kosten koper zijn" },
];

// --- Stap 2: locatie -----------------------------------------------------------
// LANDELIJK, via dezelfde live PDOK-locatieserver-autocomplete als de oude
// zoekopdracht (B2bLocatie/plaatsLookup.ts/LocatieAutocomplete.tsx) -- geen
// vaste picklist meer. Eerdere versie beperkte dit tot 10 vaste
// Rotterdam-regio-opties ("Rotterdam Centrum/Noord/... , Schiedam,
// Vlaardingen, ..."); Sjoerd gaf expliciet aan dat kopers moeten kunnen
// kiezen uit heel Nederland ("dit waren voorbeelden; mensen moeten alles
// kunnen kiezen in Nederland natuurlijk"). Elk gekozen `B2bLocatie` is al
// een exacte, live-gevonden plaats óf wijk (dezelfde discipline als altijd:
// nooit vrije tekst fuzzy-matchen) en dus meteen ook een geldige
// Funda-zoekslug (zie afgeleideGebiedSlugs in lib/data-sources/fundaFeed.ts).
export const MAX_VOORKEUR_LOCATIES = 3;

// --- Stap 3: woning --------------------------------------------------------------
// Woningtype-waarden komen direct overeen met Funda's eigen
// object_type/object_type_house_orientation-waarden (live geverifieerd, zie
// WONINGTYPE_SEARCH_PARAMS in lib/data-sources/fundaFeed.ts) -- "studio"
// heeft geen eigen Funda-zoekfilter (blijkt in de praktijk een subtype van
// "appartement", zie de toelichting daar) en wordt daarom bij het zoeken
// mee-gescand onder "apartment", met een eigen classificatie pas bij het
// scoren (Component 3, matchScore.ts).
export type B2bWoningtypeVoorkeur = "apartment" | "studio" | "terraced" | "corner" | "semi_detached" | "detached" | "other";

export const B2B_WONINGTYPE_VOORKEUREN: { waarde: B2bWoningtypeVoorkeur; label: string }[] = [
  { waarde: "apartment", label: "Appartement" },
  { waarde: "studio", label: "Studio" },
  { waarde: "terraced", label: "Tussenwoning" },
  { waarde: "corner", label: "Hoekwoning" },
  { waarde: "semi_detached", label: "Halfvrijstaand" },
  { waarde: "detached", label: "Vrijstaand" },
  { waarde: "other", label: "Anders" },
];

export type B2bMinKamersOptie = "1" | "2" | "3" | "4" | "5_plus";

export const B2B_MIN_KAMERS_OPTIES: { waarde: B2bMinKamersOptie; label: string; minKamers: number }[] = [
  { waarde: "1", label: "1 kamer", minKamers: 1 },
  { waarde: "2", label: "2 kamers", minKamers: 2 },
  { waarde: "3", label: "3 kamers", minKamers: 3 },
  { waarde: "4", label: "4 kamers", minKamers: 4 },
  { waarde: "5_plus", label: "5+ kamers", minKamers: 5 },
];

export type B2bMinOppervlakOptie = "up_to_60" | "60_80" | "80_100" | "100_120" | "120_plus";

// BUGFIX/verduidelijking: dit is en was al een MINIMUM-filter (faaltOppervlak
// en scoreOppervlak in matchScore.ts kijken alleen naar minArea, er is geen
// bovengrens) -- de oude labels ("60 - 80 m²") suggereerden een bandbreedte
// met een plafond die er in de praktijk niet was. Labels hier aangepast naar
// echte minimumtaal ("Vanaf 60 m²"); het nooit-gebruikte maxArea-veld is
// geschrapt. De `waarde`-sleutels blijven ongewijzigd (bestaande dossiers
// blijven zo geldig valideren).
export const B2B_MIN_OPPERVLAK_OPTIES: { waarde: B2bMinOppervlakOptie; label: string; minArea: number }[] = [
  { waarde: "up_to_60", label: "Geen minimum", minArea: 0 },
  { waarde: "60_80", label: "Vanaf 60 m²", minArea: 60 },
  { waarde: "80_100", label: "Vanaf 80 m²", minArea: 80 },
  { waarde: "100_120", label: "Vanaf 100 m²", minArea: 100 },
  { waarde: "120_plus", label: "Vanaf 120 m²", minArea: 120 },
];

export type B2bBuitenruimteVoorkeur = "garden_required" | "balcony_ok" | "no_preference" | "not_important";

export const B2B_BUITENRUIMTE_OPTIES: { waarde: B2bBuitenruimteVoorkeur; label: string }[] = [
  { waarde: "garden_required", label: "Tuin verplicht" },
  { waarde: "balcony_ok", label: "Balkon of dakterras is voldoende" },
  { waarde: "no_preference", label: "Geen voorkeur" },
  { waarde: "not_important", label: "Niet belangrijk" },
];

export type B2bMinEnergielabelOptie = "A_plus" | "B_plus" | "C_plus" | "D_plus" | "no_preference";

export const B2B_MIN_ENERGIELABEL_OPTIES: { waarde: B2bMinEnergielabelOptie; label: string; minLabel: B2bEnergielabel | null }[] = [
  { waarde: "A_plus", label: "Label A of beter", minLabel: "A" },
  { waarde: "B_plus", label: "Label B of beter", minLabel: "B" },
  { waarde: "C_plus", label: "Label C of beter", minLabel: "C" },
  { waarde: "D_plus", label: "Label D of beter", minLabel: "D" },
  { waarde: "no_preference", label: "Geen voorkeur", minLabel: null },
];

// --- Het geheel ------------------------------------------------------------------
// VEREENVOUDIGING (Sjoerd, na de visuele herontwerp-sessie van het
// zoekfilterproces: "vragenlijst echt inkorten tot alleen harde eisen"): de
// koper-voorkeurenlijst bestond hiervoor uit 13 vragen over 7 stappen,
// inclusief voorzieningenwensen/parkeren (Vraag 9-10) en de drie vragen die
// het matchingmodel v4 (Fase 1 dealbreakers, Fase 2 gewogen score, Fase 3
// trade-off-bonus) voedden: dealbreakers (Vraag 11), afwegingen (Vraag 12) en
// prioriteiten (Vraag 13). Sjoerd gaf expliciet aan dat matches voortaan
// simpelweg getoond worden als ze aan alle harde eisen voldoen -- geen
// matchingsscore, geen ranking, geen dealbreaker-straf of trade-off-bonus
// meer. Die drie vragen (en de voorzieningen/parkeren-vraag, die alleen als
// scorecomponent en als automatische-dealbreaker-bron dienden) hebben zonder
// dat scoreproces geen functie meer en zijn hier volledig verwijderd, samen
// met de bijbehorende types (B2bVoorzieningWens, B2bParkerenVoorkeur,
// B2bDealbreaker, B2bAfweging, B2bPrioriteitOptie) en het volledige Fase 1-3
// van matchScore.ts (zie daar). Wat overblijft is precies Fase 0: de 7
// harde-eisen-vragen (budget, locatie, woningtype, kamers, oppervlak,
// buitenruimte, energielabel) -- zie voldoetAanHardeEisen() in matchScore.ts.
export interface B2bKoperVoorkeuren {
  maxKoopprijs: number | null; // null = nog geen vast maximum, zie de toelichting bij BUDGET_MIN hierboven
  kostenKoper: B2bKostenKoperOptie;
  // Landelijk, via PDOK-autocomplete gekozen plaatsen/wijken -- max
  // MAX_VOORKEUR_LOCATIES, minimaal 1. Zie de toelichting bij
  // MAX_VOORKEUR_LOCATIES hierboven.
  voorkeurLocaties: B2bLocatie[];
  woningtypes: B2bWoningtypeVoorkeur[];
  woningtypeAnders: string | null;
  minKamers: B2bMinKamersOptie;
  minOppervlak: B2bMinOppervlakOptie;
  buitenruimte: B2bBuitenruimteVoorkeur;
  minEnergielabel: B2bMinEnergielabelOptie;
  ingevuldOp: string; // ISO
}

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
  // BUGFIX (diagnose-sessie "het klopt gewoon allemaal niet"): een match werd
  // tot nu toe NOOIT opnieuw tegen woningtype/slaapkamers/m²/energielabel
  // gecontroleerd nadat hij eenmaal was opgeslagen -- alleen budget en
  // locatie werden bij elke verversing herzien. `null` = opgeslagen vóór dit
  // veld bestond -- wordt bij de eerstvolgende verversing voor de zekerheid
  // als verouderd behandeld (zie ruimVerouderdeMatchenOp in b2bStore.ts).
  //
  // MATCHINGMODEL V2/V3: het losse `locatieLabel`-veld (dat er hier ooit
  // stond) is vervallen. V3 (zie het Cowork-gesprek "ik twijfel over ons
  // filtersysteem met punten"): "is deze match nog steeds geldig" is nu
  // "voldoet hij nog steeds aan de 8 harde eisen van fase 1 tegen de HUIDIGE
  // koperVoorkeuren" (zie voldoetAanHardeEisen() in matchScore.ts en
  // ruimVerouderdeMatchenOp in b2bStore.ts) -- geen scoredrempel meer, een
  // score zegt sinds v3 alleen nog iets over de RANGSCHIKKING tussen
  // kandidaten die al aan de harde eisen voldoen.
  verificatie: B2bMatchVerificatie | null;
  gevondenOp: string; // ISO
  // "Bewaar als interessant" (zie het Cowork-gesprek van hetzelfde nummer):
  // een makelaar kan een match handmatig markeren zodat hij niet per ongeluk
  // wordt opgeruimd door ruimVerouderdeMatchenOp() (harde eisen gewijzigd)
  // of kapMatchenOpMax() (limiet van MAX_ZICHTBARE_MATCHEN) -- zie b2bStore.ts.
  // Optioneel (i.p.v. verplicht false) zodat oude matches zonder migratie
  // gewoon blijven werken; overal elders behandeld als `=== true`.
  interessant?: boolean;
}

// Harde grens op het aantal getoonde matches (zie b2bStore.ts#kapMatchenOpMax)
// -- bewuste keuze: liever eerlijk "maximaal 10, en anders minder" dan een
// lijst die blijft aangroeien met steeds oudere/marginale treffers.
// Was 10, opgehoogd naar 30 (zie het Cowork-gesprek hierover) nu de
// eviction niet meer FIFO is maar op score (zie kapMatchenOpMax in
// b2bStore.ts) -- 30 heeft alleen zin met een matchingsmodel dat ook
// daadwerkelijk kiest wélke 30 het beste zijn, anders toont dit gewoon meer
// willekeur. Live geverifieerd dat Funda's paginering (`&page=2`, `&page=3`)
// gewoon werkt (zie haalFundaMatches in fundaFeed.ts), dus er is nu ook een
// grotere kandidatenpool om uit te kiezen dan alleen de eerste
// zoekresultatenpagina.
export const MAX_ZICHTBARE_MATCHEN = 30;

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
