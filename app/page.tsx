import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";
import { APP_BASE_URL } from "@/lib/config/payment";
import { buildReportHref, slugify } from "@/lib/utils/slug";
import { Logo } from "@/components/ui/Logo";
import SiteNavLink from "@/components/layout/SiteNavLink";
import MobileNavMenu from "@/components/layout/MobileNavMenu";
import VoorbeeldrapportSlider from "@/components/VoorbeeldrapportSlider";
import type { AddressMeta } from "@/types/report";
import {
  ChevronDownIcon,
  StoreIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  BoltIcon,
  MapPinIcon,
  FileCheckIcon,
  CheckIcon,
} from "@/components/report/icons";

// Vierde homepage-richting: indigo "SaaS"-uitstraling, gekozen na een reeks
// visuele concepten. Deze pagina heeft nu een eigen, lichte header/footer
// i.p.v. de gedeelde SiteHeader/SiteFooter (die blijven zwart/mosterd en
// worden alleen op de rapportpagina's gebruikt) — zo blijft deze restyle
// echt beperkt tot de homepage; de rapportpagina's zijn niet aangeraakt.
// SiteHeader.tsx/SiteFooter.tsx zelf zijn niet gewijzigd.
//
// Stappenkleuren zijn nu 3 tinten uit dezelfde merklijn (accent → lichte
// accent-tint → ink) i.p.v. 3 losse hex-kleuren die niet in het designsysteem
// zaten.
// Stap 2/3 waren eerder onnauwkeurig: stap 2 noemde "verwachte waarde", maar
// de waarde-indicatie is juist premium — gratis is bouwjaar, energielabel,
// oppervlakte en een eerste inschatting van het funderingsrisico (zelfde
// vier velden als de FAQ-vraag "Wat is het verschil tussen de gratis preview
// en het volledige rapport?" hierboven). Stap 3 noemt nu 3 concrete
// voorbeelden + "nog 5 andere onderdelen" — een geverifieerd, geen geschat
// cijfer: het ontgrendelde rapport heeft 8 tabbladen (Rapportoverzicht,
// Waarde, Verkopen, Object, Energie, Fundering, Buurt, Samenvatting, zie
// ReportView.tsx), waarvan hier 3 met naam genoemd worden, dus 5 over.
const STAPPEN = [
  {
    titel: "Vul een adres in",
    tekst: "Typ een adres of kies er een uit de suggesties.",
    icoon: MapPinIcon,
    badgeBg: "bg-[#EEF0FF]",
    badgeKleur: "text-accent",
    labelKleur: "text-accent",
  },
  {
    titel: "Bekijk de gratis preview",
    tekst: "Bouwjaar, energielabel, oppervlakte en een indicatie van het funderingsrisico, gratis en zonder account.",
    icoon: FileCheckIcon,
    badgeBg: "bg-[#F1EFFD]",
    badgeKleur: "text-[#8B85EE]",
    labelKleur: "text-[#8B85EE]",
  },
  {
    titel: "Ontgrendel het rapport",
    tekst: `Eenmalig ${RAPPORT_PRIJS}, zonder abonnement.`,
    icoon: CheckIcon,
    badgeBg: "bg-[#EAF3DE]",
    badgeKleur: "text-[#3B6D11]",
    labelKleur: "text-[#3B6D11]",
  },
];

// Veelgestelde vragen — dekt de volledige breedte van wat het product biedt
// (alle 8 rapportonderdelen + PDF, doelgroep, gratis-vs-premium, bronnen)
// i.p.v. alleen de kernobjecties. Volgorde: eerst "waarom dit product", dan
// "wat zit erin/voor wie", dan prijs/onafhankelijkheid, dan de resterende
// praktische vragen. Eerste vraag staat open zodat meteen duidelijk is dat
// dit uitklapbaar is.
//
// Toon: luchtiger dan een standaard support-FAQ, met af en toe een kwinkslag
// in de antwoorden — maar bewust niet grappig ten koste van de feiten. Elk
// getal, elke bron en elke belofte hieronder is identiek aan de vorige,
// zakelijke versie; alleen de formulering is losser. "u" blijft aangehouden
// (consistent met de rest van deze pagina), de humor zit in het ritme van de
// zin, niet in de aanspreekvorm.
const VEELGESTELDE_VRAGEN = [
  {
    vraag: "Waarom niet gewoon een gratis waardecheck?",
    antwoord:
      "Die geven meestal één getal en daarna stilte. Kooprapport zet waarde-indicatie, vergelijkbare verkopen, funderingsrisico, energielabel, verduurzamingsadvies en buurtprofiel naast elkaar in één rapport van 10 pagina's, zodat u niet alleen een cijfer heeft, maar ook weet wat dat cijfer eigenlijk betekent.",
    open: true,
  },
  {
    vraag: "Wat zit er precies in het volledige rapport?",
    antwoord:
      "Negen onderdelen, geen opvulling: rapportoverzicht, waarde-indicatie met bandbreedte, vergelijkbare verkopen met adressen en prijzen, objectgegevens, energieprestatie en label, een verduurzamingsadvies met concrete maatregelen en terugverdientijd, funderingsrisico met volledige duiding en advies, een buurtprofiel (veiligheid, voorzieningen, samenstelling) en een compacte samenvatting met eindconclusie. Ook gewoon te downloaden als PDF, of direct naar uw e-mail te sturen, voor als u het liever rustig doorleest, met koffie erbij.",
  },
  {
    vraag: "Voor wie is dit rapport bedoeld?",
    antwoord:
      "Voor kopers die een bod voorbereiden, verkopers die hun vraagprijs willen onderbouwen en huiseigenaren die gewoon willen weten waar ze wonen, zonder daar meteen een makelaar of taxateur bij te halen.",
  },
  {
    vraag: "Wat is het verschil tussen de gratis preview en het volledige rapport?",
    antwoord:
      "Gratis ziet u al bouwjaar, energielabel, oppervlakte en een eerste indicatie van het funderingsrisico. Na het ontgrendelen krijgt u de exacte waarde-indicatie met bandbreedte, alle vergelijkbare verkopen met adressen en prijzen, de volledige funderingsduiding met advies, het complete buurtprofiel én de samenvatting, plus het geheel als PDF, direct beschikbaar om te downloaden of naar uw mail te sturen.",
  },
  {
    vraag: "Is dit onafhankelijk of zit er een makelaar achter?",
    antwoord:
      "Geen makelaar in zicht. Kooprapport gebruikt uitsluitend officiële, erkende bronnen: Kadaster (BAG), RVO/EP-Online (energielabel), CBS (buurtcijfers), KCAF (funderingsrisico) en Altum AI (waardebepaling en verkoopdata). Wij hebben geen belang bij een hoge of lage uitkomst. Alleen bij een kloppende.",
  },
  {
    vraag: "Wat kost het?",
    antwoord: `De preview (bouwjaar, energielabel, oppervlakte, indicatie funderingsrisico) is en blijft gratis. Het volledige rapport ontgrendelt u eenmalig voor ${RAPPORT_PRIJS}. Geen abonnement, geen kleine lettertjes.`,
  },
  {
    vraag: "Hoe actueel zijn de gegevens?",
    antwoord:
      "Vers van de pers: verkoopcijfers, energielabels en bodemclassificaties komen rechtstreeks uit de laatste officiële registraties van de genoemde bronnen, niet uit een oud Excel-bestand.",
  },
  {
    vraag: "Kan ik meerdere adressen opzoeken?",
    antwoord:
      "Zoveel als u wilt. De gratis preview is niet gelimiteerd. U betaalt alleen voor de rapporten die u daadwerkelijk ontgrendelt, niet voor het rondneuzen.",
  },
  {
    vraag: "Wat gebeurt er met het adres dat ik opzoek?",
    antwoord:
      "We gebruiken het uitsluitend om uw rapport samen te stellen, niet om het door te verkopen of u lastig te vallen met een hypotheekadviseur. Zie ons privacybeleid voor de details.",
  },
  {
    vraag: "Wat als gegevens over mijn adres ontbreken?",
    antwoord:
      "Dan zeggen we gewoon eerlijk “niet beschikbaar”. We verzinnen nooit cijfers om een rapport voller te laten lijken. Liever een lege plek dan een verzonnen getal.",
  },
];

// SEO-fix: dit bestand had nog geen eigen metadata-export, dus draaide
// volledig op de defaults uit app/layout.tsx. Dat werkte prima voor
// title/description (die zijn hier ook echt goed als default), maar er
// ontbrak een expliciete canonical/og:url voor de belangrijkste pagina van de
// site — zonder die twee genereert Next.js hier geen <link rel="canonical">
// of og:url meta tag. RAPPORT_PRIJS_CENTEN/APP_BASE_URL blijven de enige bron
// voor de daadwerkelijke prijs/domein, hier alleen gebruikt om de metadata
// consistent te houden met wat er al op de pagina staat.
// BUGFIX: deze pagina overschreef eerder alleen alternates/openGraph.url --
// description werd dus stilzwijgend geërfd van de generieke root-metadata
// (app/layout.tsx), die maar 4 van de 9 rapportonderdelen noemt (BAG,
// energielabel, woningwaarde, buurtverkopen). Precies de belangrijkste
// pagina van de site verkocht zichzelf daardoor het minst volledig, zowel
// in Google-resultaten als bij het delen op social. Nu een eigen, volledige
// description. LET OP: title blijft bewust ONGEMOEID -- de root-metadata
// zet daar al de juiste, merk-vooraan titel ("Kooprapport · ...") als
// title.default; zelf een title-string zetten zou hier juist FOUT gaan,
// want elke title-string die een pagina zelf teruggeeft loopt automatisch
// door het title.template in layout.tsx heen ("%s · Kooprapport"), wat een
// dubbele/omgekeerde merknaam zou opleveren.
const HOMEPAGE_OMSCHRIJVING =
  "Vul een adres in en bekijk een gratis preview. Ontgrendel het volledige rapport met woningwaarde, energielabel, funderingsrisico, verduurzamingsadvies en buurtverkopen.";

export const metadata: Metadata = {
  description: HOMEPAGE_OMSCHRIJVING,
  alternates: { canonical: "/" },
  openGraph: {
    description: HOMEPAGE_OMSCHRIJVING,
    url: APP_BASE_URL,
    type: "website",
  },
  twitter: {
    description: HOMEPAGE_OMSCHRIJVING,
  },
};

// Eén REËEL, bestaand adres (hetzelfde grachtenpand als het losse PDF-
// voorbeeldrapport, zie lib/pdf/voorbeeldRapport.ts) dat hieronder als
// daadwerkelijke, crawlbare <a href> naar een /rapport/[slug]-pagina linkt.
// BELANGRIJK VOOR SEO (zie de audit): zonder deze link staat er nergens op de
// hele site een echte <a href>/<Link> naar een rapportpagina — de zoekbalk
// navigeert namelijk via router.push() (AddressSearchBar.tsx), niet via een
// link, en app/sitemap.ts bevat bewust geen rapportpagina's (er is geen
// database van eerder opgevraagde adressen om op te sommen). Zonder minstens
// één crawlbare link kan Google het rapport-sjabloon dus nooit bereiken, hoe
// compleet de metadata/JSON-LD op die pagina zelf ook is. Dit adres is geen
// verzinsel: getReport() haalt hier gewoon live data voor op, exact zoals
// voor elk ander, door een bezoeker zelf opgezocht adres.
//
// BUGFIX: de eerste versie miste locatieserverId/adresseerbaarObjectId — de
// twee velden die lib/services/bouwjaarLookup.ts nodig heeft om het BAG-
// object op te zoeken (zie resolveAdresseerbaarObjectId daar: zonder één van
// beide geeft die functie meteen null terug). Zonder bouwjaar cascadeert dat
// door naar oppervlakte/funderingsrisico, die daar allemaal van afhangen —
// deze pagina toonde daardoor overal "Onbekend" i.p.v. echte data, en werd om
// die reden (vermoedelijk: te weinig unieke inhoud) door Google's live-test
// geweigerd bij het aanvragen van indexering. Beide ID's hieronder zijn nu
// de ECHTE waarden, opgehaald via dezelfde live PDOK-zoekopdracht die de
// zoekbalk zelf ook gebruikt (bevestigd: dit adres heeft geen kaal huisnummer
// 88, PDOK matcht direct door naar 88A).
const VOORBEELD_ADRES: AddressMeta = {
  straat: "Prinsengracht",
  huisnummer: "88",
  huisletter: "A",
  postcode: "1015DZ",
  plaats: "Amsterdam",
  slug: slugify("Prinsengracht 88A, Amsterdam"),
  label: "Prinsengracht 88A, Amsterdam",
  locatieserverId: "adr-e6cae64043a6cc66b3865084d148d36f",
  adresseerbaarObjectId: "0363010000783842",
};

export default function HomePage() {

  // JSON-LD — rechtstreeks uit bestaande, op de pagina zichtbare content
  // opgebouwd (VEELGESTELDE_VRAGEN hierboven, dezelfde RAPPORT_PRIJS als de
  // rest van de app), niets extra verzonnen voor de structured data. Dit is
  // wat Google nodig heeft voor FAQ-rich-results en om de site als
  // organisatie te herkennen — puur beschrijvend, geen impact op de
  // gerenderde pagina zelf.
  // BUGFIX (SEO-audit): miste eerder logo/address/identifier -- zonder logo
  // kan Google er sowieso geen Kennisvenster-kandidaat van maken, en zonder
  // adres/KvK-nummer is dit een "kale" Organization met alleen naam/url.
  // Bewust GEEN sameAs (LinkedIn/Instagram/etc.) toegevoegd: die profielen
  // zijn niet geverifieerd, en een geraden/verzonnen sameAs-URL zou tegen
  // het "nooit iets verzinnen"-principe van deze app ingaan. Adres en
  // KvK-nummer hieronder staan al, ongewijzigd, op /contact.
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kooprapport",
    url: APP_BASE_URL,
    description:
      "Onafhankelijk woningrapport per adres: waarde-indicatie, buurtverkopen, energielabel, funderingsrisico en buurtprofiel, gebaseerd op officiële, erkende bronnen.",
    logo: `${APP_BASE_URL}/logo-email.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Pleinweg 66D",
      postalCode: "3083 EH",
      addressLocality: "Rotterdam",
      addressCountry: "NL",
    },
    identifier: {
      "@type": "PropertyValue",
      name: "KvK-nummer",
      value: "87451387",
    },
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kooprapport",
    url: APP_BASE_URL,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: VEELGESTELDE_VRAGEN.map((item) => ({
      "@type": "Question",
      name: item.vraag,
      acceptedAnswer: { "@type": "Answer", text: item.antwoord },
    })),
  };

  return (
    // BUGFIX (te wit/te leeg op brede schermen): de hele pagina stond
    // hiervoor op een vlak bg-white, met per sectie een wisselend bg-white/
    // bg-parchment (zebra-effect) — op een breed extern beeldscherm oogde
    // dat kaal en gaven de sectiegrenzen harde, blokkerige overgangen. De
    // pagina heeft nu één doorlopend parchment-canvas met een paar zachte,
    // laagopaciteit kleurvlekken (indigo/paars/groen) die over de
    // sectiegrenzen heen lopen — zie de visualize-afstemming hierover. De
    // vlekken zijn direct hier, als kinderen van <main>, gepositioneerd i.p.v.
    // per sectie, zodat ze doorlopen i.p.v. per sectie opnieuw beginnen.
    <main className="relative overflow-hidden bg-parchment">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-10 h-[280px] w-[280px] rounded-full"
        style={{ background: "radial-gradient(circle, #4F46E524 0%, rgba(79,70,229,0) 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-[420px] h-[320px] w-[320px] rounded-full"
        style={{ background: "radial-gradient(circle, #8B85EE20 0%, rgba(139,133,238,0) 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 top-[820px] h-[260px] w-[260px] rounded-full"
        style={{ background: "radial-gradient(circle, #3B6D111E 0%, rgba(59,109,17,0) 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-[1080px] h-[240px] w-[240px] rounded-full"
        style={{ background: "radial-gradient(circle, #4F46E51E 0%, rgba(79,70,229,0) 70%)" }}
      />

      {/* eslint-disable-next-line react/no-danger -- statische, vaste JSON-LD, geen user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {/* Donkere context-ribbon boven de header is verwijderd (feedback:
          de mobiele homepage voelde te druk aan) — de "Probeer gratis"-knop
          in de header hieronder dekt dezelfde functie (springen naar de
          zoekbalk) al af, dus die extra balk voegde alleen visueel gewicht
          toe zonder iets nieuws te doen. */}
      {/* Eigen, lichte header voor de homepage — geen zwarte masthead, geen
          crosshair-motief; alleen het wordmark, de Koopgids-link en één
          heldere CTA die naar de zoekbalk springt. */}
      <header className="border-b border-ink/10 bg-white">
        <Container className="flex items-center justify-between py-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-6">
            {/* Zelfde mobiele fix als SiteHeader.tsx: op smalle schermen
                verdrongen deze drie links + de CTA elkaar, met
                "Marktupdates" half buiten beeld. MobileNavMenu (het
                hamburgermenu) vangt dat onder sm nu op -- zie de toelichting
                in dat bestand voor waarom dat nodig is (de footer linkte
                niet naar deze pagina's). */}
            <div className="hidden items-center gap-6 sm:flex">
              <SiteNavLink href="/koopgids" label="Koopgids" />
              <SiteNavLink href="/werkwijze" label="Werkwijze" />
              <SiteNavLink href="/marktupdates" label="Marktupdates" />
            </div>
            <MobileNavMenu />
            <a
              href="#zoeken"
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              Probeer gratis
            </a>
          </div>
        </Container>
      </header>

      <section id="zoeken" className="relative">
        <Container className="py-16 sm:py-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Tekstkolom.
                BUGFIX (mobiel): CSS Grid-items krijgen, net als flex-items,
                standaard "min-width: auto" mee — dat betekent dat de
                grid-track niet kleiner mag worden dan het min-content van de
                inhoud. De zoekbalk-knop ("Bekijk rapport") heeft
                white-space:nowrap en telt dus met zijn volledige, niet-
                krimpbare tekstbreedte mee in dat min-content, ook al kon het
                invoerveld ernaast zelf al wel volledig krimpen (zie de
                eerdere min-w-0-fix in AddressSearchBar.tsx). Resultaat: deze
                hele kolom (en dus de zoekbalk erin) werd op smalle schermen
                breder geduwd dan de viewport. min-w-0 hier op de grid-track
                zelf lost dat definitief op. */}
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-[10.5px] font-bold text-accent">
                ✓ Onafhankelijk · gebaseerd op officiële bronnen
              </span>

              {/* Kop aangepast (was "Ken de feiten. Vóórdat u beslist.") naar
                  een variant die meteen de breedte van het rapport benoemt —
                  sloot beter aan bij de iconentegels + "37 meer"-tegel
                  hieronder dan de vorige, algemenere kop. */}
              <h1 className="mt-4 font-display text-[2.3rem] font-extrabold leading-[1.12] text-ink sm:text-[2.9rem]">
                Alles wat u moet weten over een woning, op één plek.
              </h1>
              <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink/70">
                Waarde, verkopen in de buurt, fundering en nog veel meer, per adres.
              </p>

              <div className="mt-6">
                <AddressSearchBar />
              </div>

              {/* Iconentegels i.p.v. de eerdere losse tekstpillen: compacter,
                  en de 4e tegel ("37 meer") maakt in één oogopslag duidelijk
                  dat het rapport verder gaat dan deze 3 onderwerpen, zonder
                  dat er een lange opsomming nodig is. */}
              <div className="mt-4 grid max-w-sm grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1 rounded-xl bg-mist px-1.5 py-2.5 text-center">
                  <TrendingUpIcon className="h-4 w-4 text-accent-dark" />
                  <span className="text-[9.5px] font-bold text-accent-dark">Waarde</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl bg-mist px-1.5 py-2.5 text-center">
                  <StoreIcon className="h-4 w-4 text-accent-dark" />
                  <span className="text-[9.5px] font-bold text-accent-dark">Verkopen</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl bg-mist px-1.5 py-2.5 text-center">
                  <AlertTriangleIcon className="h-4 w-4 text-accent-dark" />
                  <span className="text-[9.5px] font-bold text-accent-dark">Fundering</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-xl bg-accent-dark px-1.5 py-2.5 text-center">
                  <span className="text-[13px] font-extrabold leading-none text-white">+</span>
                  <span className="text-[9.5px] font-bold text-white">37 meer</span>
                </div>
              </div>

              {/* "Direct beschikbaar" en het voorbeeldrapport samen op één
                  regel — geen prijs genoemd, alleen dat het gratis en meteen
                  te bekijken is. De knop opent nu de doorklikbare
                  VoorbeeldrapportSlider (alle 10 pagina's, zelfde stijl als
                  het echte rapport) i.p.v. direct de PDF te openen; de PDF
                  blijft binnen die modal als aparte downloadlink bereikbaar. */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3DE] px-3 py-1.5 text-[11px] font-bold text-[#3B6D11]">
                  <BoltIcon className="h-3.5 w-3.5" />
                  Rapport direct beschikbaar
                </span>
                <VoorbeeldrapportSlider />
              </div>
              <p className="mt-2 text-[11px] text-ink/70">Gratis preview, geen abonnement, geen account nodig</p>
            </div>

            {/* Eén rustig browserscherm i.p.v. de eerdere 3 losse gestapelde
                paginakaartjes — na een reeks visualize-rondes bleek dat de
                gestapelde kaartjes naast alle andere elementen in de hero
                (zoekbalk, iconentegels, voorbeeldrapport-kaartje) samen
                iets te druk oogden. Dit ene kaartje toont letterlijk het
                product ("dit zie je"), met dezelfde cijfers als het echte
                voorbeeldrapport (lib/pdf/voorbeeldRapport.ts, Amsterdam
                Rijnkanaalkade 1) zodat dit en de daadwerkelijke voorbeeld-PDF
                elkaar niet tegenspreken.
                Twee losse, licht gekantelde badges (plaatsnaam + "direct
                beschikbaar") toegevoegd na feedback dat dit kaartje alleen
                wat leeg/statisch oogde — bewust een middenweg tussen "geen
                badges" en de eerdere, drukkere versie met 3 badges + sterkere
                kanteling, zie de visualize-afstemming hierover.
                Alleen vanaf lg zichtbaar (zelfde reden als voorheen: op
                mobiel voegde dit decoratieve blok vooral drukte toe). */}
            <div aria-hidden="true" className="relative mx-auto hidden h-[320px] w-full max-w-[420px] items-center justify-center lg:flex">
              <span className="absolute -top-2 right-2 z-10 rounded-full bg-gradient-to-br from-accent to-accent-dark px-3.5 py-1.5 text-[11px] font-bold text-white shadow-overlay">
                10 pagina&apos;s, écht volledig
              </span>

              <span className="absolute left-6 top-14 -rotate-3 rounded-full border border-line bg-white px-2.5 py-1.5 text-[10px] font-bold text-ink shadow-flat">
                <MapPinIcon className="mr-1 inline h-3 w-3 text-accent-dark" />
                Amsterdam
              </span>
              <span className="absolute bottom-14 right-2 rotate-3 rounded-full bg-[#EAF3DE] px-2.5 py-1.5 text-[10px] font-bold text-[#173404] shadow-flat">
                <CheckIcon className="mr-1 inline h-3 w-3 text-[#3B6D11]" />
                Direct beschikbaar
              </span>

              <div className="w-[280px] -rotate-[1.5deg] overflow-hidden rounded-2xl border border-line bg-white shadow-overlay">
                <div className="flex h-5 items-center gap-1 border-b border-line bg-parchment px-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-line" />
                  <span className="h-1.5 w-1.5 rounded-full bg-line" />
                  <span className="h-1.5 w-1.5 rounded-full bg-line" />
                </div>
                <div className="p-4">
                  <div className="text-[7px] font-bold uppercase tracking-wide text-ink/45">Premium Kooprapport</div>
                  <div className="mt-1 text-[13px] font-extrabold text-ink">Rijnkanaalkade 1</div>
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 rounded-lg bg-gradient-to-br from-accent to-accent-dark p-2">
                      <div className="text-[6px] text-white/70">WAARDE-INDICATIE</div>
                      <div className="mt-1 text-[10px] font-extrabold text-white">€1.264.239</div>
                    </div>
                    <div className="flex-1 rounded-lg bg-parchment p-2">
                      <div className="text-[6px] text-ink/45">FUNDERING</div>
                      <div className="mt-1 text-[9.5px] font-extrabold text-[#3B6D11]">Laag risico</div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <span className="flex-1 rounded-md bg-mist py-1.5 text-center text-[9px] font-extrabold text-accent-dark">
                      A+
                    </span>
                    <span className="flex-1 rounded-md bg-mist py-1.5 text-center text-[7px] font-bold text-accent-dark">
                      154 m²
                    </span>
                    <span className="flex-1 rounded-md bg-mist py-1.5 text-center text-[7px] font-bold text-accent-dark">
                      2021
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="relative">
        <Container className="py-20">
          {/* h2 i.p.v. eerder een <p> — visueel identiek (zelfde classes),
              maar dit is inhoudelijk een sectiekop (opent een nieuwe sectie
              met 3 stappen), en hoort dus ook semantisch als kop gemarkeerd
              te zijn i.p.v. als gewone tekst. Zelfde reden bij "Veelgestelde
              vragen" verderop. */}
          <h2 className="text-center text-[11px] font-bold uppercase tracking-wider3 text-ink/70">Zo werkt het</h2>

          {/* Horizontaal op tablet/desktop (sm en groter) — de eerder
              gebouwde verticale tijdlijn oogde op grotere schermen te klein,
              dus vanaf sm nu een brede horizontale variant (3 kolommen, lijn
              achter de badges) i.p.v. één smalle kolom. Onder sm (mobiel)
              blijft de al goedgekeurde verticale tijdlijn staan, zie
              verderop — die werkte daar juist wel goed. */}
          <div className="relative mx-auto mt-10 hidden max-w-4xl sm:grid sm:grid-cols-3 sm:gap-8">
            <div className="absolute left-[16.6%] right-[16.6%] top-[26px] h-0.5 bg-gradient-to-r from-accent via-[#8B85EE] to-[#3B6D11] opacity-20" />
            {STAPPEN.map((s, i) => {
              const Icon = s.icoon;
              return (
                <div key={s.titel} className="relative flex flex-col items-center text-center">
                  <span
                    className={`relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full ${s.badgeBg} ring-4 ring-white`}
                  >
                    <Icon className={`h-5 w-5 ${s.badgeKleur}`} />
                  </span>
                  <p className={`mt-3 text-[10.5px] font-bold uppercase tracking-wider3 ${s.labelKleur}`}>
                    Stap {i + 1}
                  </p>
                  <h3 className="mt-0.5 text-[14.5px] font-extrabold text-ink">{s.titel}</h3>
                  <p className="mt-1 max-w-[210px] text-xs leading-relaxed text-ink/70">{s.tekst}</p>
                </div>
              );
            })}
          </div>

          {/* Verticaal op mobiel (onder sm) — ongewijzigd t.o.v. de eerder
              goedgekeurde versie. */}
          <div className="relative mx-auto mt-8 max-w-xl sm:hidden">
            {/* Verbindingslijn achter de drie stap-badges, kleurverloop van
                indigo (stap 1) naar groen (stap 3, "voltooid/ontgrendeld") --
                zie de visualize-afstemming hierover. */}
            <div className="absolute bottom-6 left-6 top-6 w-0.5 bg-gradient-to-b from-accent via-[#8B85EE] to-[#3B6D11] opacity-20" />
            <div className="flex flex-col gap-4">
              {STAPPEN.map((s, i) => {
                const Icon = s.icoon;
                const laatste = i === STAPPEN.length - 1;
                return (
                  <div key={s.titel} className={`relative flex items-start gap-4 ${laatste ? "" : "pb-0"}`}>
                    <span
                      className={`relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full ${s.badgeBg} ring-4 ring-white`}
                    >
                      <Icon className={`h-5 w-5 ${s.badgeKleur}`} />
                    </span>
                    <div className="flex flex-1 items-center justify-between gap-3 rounded-2xl bg-parchment p-4">
                      <div>
                        <p className={`text-[10.5px] font-bold uppercase tracking-wider3 ${s.labelKleur}`}>
                          Stap {i + 1}
                        </p>
                        <h3 className="mt-0.5 text-[14.5px] font-extrabold text-ink">{s.titel}</h3>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink/70">{s.tekst}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* Vertrouwensregel — verplaatst uit de hero (stond daar eerder als
          losse statsrij onderaan de tekstkolom) naar een eigen, rustige
          sectie: één regel i.p.v. een blok tussen de andere hero-elementen. */}
      {/* BEWUST AANGEPAST: deze regel somde eerder alle vier bronnen los op,
          elk met een eigen backlink (zie git-historie voor de oude SEO-
          motivatie daarachter). Op uitdrukkelijk verzoek noemen we bronnen nu
          over de hele site minder vaak/minder gedetailleerd — dat volledige,
          verifieerbare rijtje (met links) staat al canoniek in de FAQ
          ("Is dit onafhankelijk of zit er een makelaar achter?"), dus hier
          volstaat de korte, generieke formulering. */}
      <section className="relative border-y border-ink/[0.06]">
        <Container className="py-6 text-center text-[11px] text-ink/70">
          <span className="font-bold text-ink">1.240+</span> rapporten gegenereerd ·{" "}
          <span className="font-bold text-ink">10</span> pagina&apos;s per rapport · gebaseerd op officiële, erkende
          bronnen
        </Container>
      </section>

      {/* Veelgestelde vragen — als <details>/<summary>: werkt zonder client-
          side state, blijft toegankelijk, en toont meteen meer inhoud zonder
          dat de pagina drukker oogt (alles behalve de eerste vraag staat
          dicht). */}
      <section className="relative">
        <Container className="py-16">
          <h2 className="text-center text-[11px] font-bold uppercase tracking-wider3 text-ink/70">Veelgestelde vragen</h2>
          <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-2">
            {VEELGESTELDE_VRAGEN.map((item) => (
              <details
                key={item.vraag}
                open={item.open}
                className={`group rounded-xl bg-white p-4 ${item.open ? "border-2 border-accent" : "border border-ink/10"}`}
              >
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden ${
                    item.open ? "text-[13.5px] font-bold text-ink" : "text-[13px] font-semibold text-ink"
                  }`}
                >
                  {item.vraag}
                  <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 transition-transform group-open:rotate-180 ${
                      item.open ? "text-accent" : "text-ink/30"
                    }`}
                  />
                </summary>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">{item.antwoord}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Lichte homepage-footer i.p.v. de zwarte SiteFooter, alleen in het
          lichte palet. "Privacy", "Voorwaarden" en "Contact" linken nu naar
          de echte pagina's. KvK-nummer blijft platte tekst (staat al op
          /contact).
          De "Mockdata ter illustratie"-disclaimer (voorheen automatisch
          bepaald, zie dezelfde toelichting in SiteFooter.tsx) is op
          uitdrukkelijk verzoek verwijderd: alle databronnen zijn inmiddels
          gekoppeld. */}
      <footer className="border-t border-ink/10 bg-white py-10">
        <Container className="flex flex-col items-start gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display font-semibold text-ink">© {new Date().getFullYear()} Kooprapport</span>
          <div className="flex flex-wrap gap-4 text-ink/70">
            <Link href={buildReportHref(VOORBEELD_ADRES)} className="underline underline-offset-2 hover:text-ink">
              Voorbeeldrapport
            </Link>
            {/* Koopgids/Werkwijze/Marktupdates toegevoegd -- zelfde reden
                als bij SiteFooter.tsx: dit zijn de eerste échte footer-links
                naar deze pagina's, nodig als extra pad naast het nieuwe
                mobiele hamburgermenu (MobileNavMenu). */}
            <Link href="/koopgids" className="underline underline-offset-2 hover:text-ink">
              Koopgids
            </Link>
            <Link href="/werkwijze" className="underline underline-offset-2 hover:text-ink">
              Werkwijze
            </Link>
            <Link href="/marktupdates" className="underline underline-offset-2 hover:text-ink">
              Marktupdates
            </Link>
            <Link href="/woningmarkt" className="underline underline-offset-2 hover:text-ink">
              Woningmarkt per stad
            </Link>
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy
            </Link>
            <Link href="/voorwaarden" className="underline underline-offset-2 hover:text-ink">
              Voorwaarden
            </Link>
            <Link href="/contact" className="underline underline-offset-2 hover:text-ink">
              Contact
            </Link>
          </div>
        </Container>
      </footer>
    </main>
  );
}
