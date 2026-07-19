import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";
import { APP_BASE_URL } from "@/lib/config/payment";
import { isVolledigLive } from "@/lib/config/launchStatus";
import { buildReportHref, slugify } from "@/lib/utils/slug";
import { Logo } from "@/components/ui/Logo";
import type { AddressMeta } from "@/types/report";
import {
  FileCheckIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  StoreIcon,
  RulerIcon,
  CalendarIcon,
  DoorIcon,
  FlagIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  BoltIcon,
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
  { titel: "Vul een adres in", tekst: "Typ een adres, of kies er een uit de suggesties.", kleur: "bg-accent" },
  {
    titel: "Bekijk de gratis preview",
    tekst: "Bouwjaar, energielabel, oppervlakte en een eerste inschatting van het funderingsrisico, gratis en zonder account.",
    kleur: "bg-[#8B85EE]",
  },
  {
    titel: "Ontgrendel het volledige rapport",
    tekst: "Waarde-indicatie, buurtverkopen, funderingsrisico en nog 5 andere onderdelen, eenmalig en zonder abonnement.",
    kleur: "bg-ink",
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
      "Die geven meestal één getal en daarna stilte. Kooprapport zet waarde-indicatie, vergelijkbare verkopen, funderingsrisico, energielabel en buurtprofiel naast elkaar in één rapport van 8 pagina's, zodat u niet alleen een cijfer heeft, maar ook weet wat dat cijfer eigenlijk betekent.",
    open: true,
  },
  {
    vraag: "Wat zit er precies in het volledige rapport?",
    antwoord:
      "Acht onderdelen, geen opvulling: rapportoverzicht, waarde-indicatie met bandbreedte, vergelijkbare verkopen met adressen en prijzen, objectgegevens, energieprestatie en label, funderingsrisico met volledige duiding en advies, een buurtprofiel (veiligheid, voorzieningen, samenstelling) en een compacte samenvatting met eindconclusie. Ook gewoon te downloaden als PDF, of direct naar uw e-mail te sturen, voor als u het liever rustig doorleest, met koffie erbij.",
  },
  {
    vraag: "Voor wie is dit rapport bedoeld?",
    antwoord:
      "Voor kopers die een bod voorbereiden, verkopers die hun vraagprijs willen onderbouwen, en huiseigenaren die gewoon willen weten waar ze wonen, zonder daar meteen een makelaar of taxateur bij te halen.",
  },
  {
    vraag: "Wat is het verschil tussen de gratis preview en het volledige rapport?",
    antwoord:
      "Gratis ziet u al bouwjaar, energielabel, oppervlakte en een eerste indicatie van het funderingsrisico. Na het ontgrendelen krijgt u de exacte waarde-indicatie met bandbreedte, alle vergelijkbare verkopen met adressen en prijzen, de volledige funderingsduiding met advies, het complete buurtprofiel én de samenvatting, plus het geheel als PDF, direct beschikbaar om te downloaden of naar uw mail te sturen.",
  },
  {
    vraag: "Is dit onafhankelijk, of zit er een makelaar achter?",
    antwoord:
      "Geen makelaar in zicht. Kooprapport gebruikt uitsluitend officiële, erkende bronnen: Kadaster (BAG), RVO/EP-Online (energielabel), CBS (buurtcijfers), KCAF (funderingsrisico) en Altum AI (waardebepaling en verkoopdata). Wij hebben geen belang bij een hoge of lage uitkomst. Alleen bij een kloppende.",
  },
  {
    vraag: "Is de geschatte waarde hetzelfde als een officiële taxatie?",
    antwoord:
      "Nee, en dat beloven we ook niet. De waarde-indicatie is een modelmatige schatting op basis van kenmerken en vergelijkbare verkopen, een prima onderhandelingsbasis en eerste oriëntatie, maar geen vervanging voor een officieel taxatierapport van een erkend taxateur.",
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
    vraag: "Kan ik dit gebruiken bij een hypotheekaanvraag?",
    antwoord:
      "Als oriëntatie en onderhandelingsbasis zeker. Voor de officiële taxatie die uw hypotheekverstrekker wil zien, blijft een erkend taxateur helaas verplichte kost.",
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
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: APP_BASE_URL },
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
  const volledigLive = isVolledigLive();

  // JSON-LD — rechtstreeks uit bestaande, op de pagina zichtbare content
  // opgebouwd (VEELGESTELDE_VRAGEN hierboven, dezelfde RAPPORT_PRIJS als de
  // rest van de app), niets extra verzonnen voor de structured data. Dit is
  // wat Google nodig heeft voor FAQ-rich-results en om de site als
  // organisatie te herkennen — puur beschrijvend, geen impact op de
  // gerenderde pagina zelf.
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kooprapport",
    url: APP_BASE_URL,
    description:
      "Onafhankelijk woningrapport per adres: waarde-indicatie, buurtverkopen, energielabel, funderingsrisico en buurtprofiel, gebaseerd op Kadaster (BAG), RVO/EP-Online, CBS, KCAF en Altum AI.",
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
    <main className="bg-white">
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
          crosshair-motief; alleen het wordmark en één heldere CTA die naar
          de zoekbalk springt. Er zijn nog geen andere pagina's (alleen het
          rapport zelf), dus er is bewust geen navigatie naar niet-bestaande
          pagina's toegevoegd. */}
      <header className="border-b border-ink/10 bg-white">
        <Container className="flex items-center justify-between py-4">
          <Link href="/">
            <Logo />
          </Link>
          <a
            href="#zoeken"
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Probeer gratis
          </a>
        </Container>
      </header>

      <section
        id="zoeken"
        className="relative overflow-hidden bg-white"
        style={{ backgroundImage: "radial-gradient(#4F46E51A 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
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
              <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink/60">
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
                  te bekijken is. */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3DE] px-3 py-1.5 text-[11px] font-bold text-[#3B6D11]">
                  <BoltIcon className="h-3.5 w-3.5" />
                  Rapport direct beschikbaar
                </span>
                <a
                  href="/api/rapport/voorbeeld-pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-ink hover:text-accent"
                >
                  <FileCheckIcon className="h-3.5 w-3.5 text-accent" />
                  Bekijk het echte voorbeeldrapport
                  <ArrowRightIcon className="h-3 w-3 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
                </a>
              </div>
              <p className="mt-2 text-[11px] text-ink/55">Gratis preview, geen abonnement, geen account nodig</p>
            </div>

            {/* Drie gestapelde paginakaartjes i.p.v. één vlakke statskaart —
                laat direct zien dat dit een écht meerpagina-rapport is.
                Cijfers zijn bewust dezelfde als in het voorbeeldrapport
                (lib/pdf/voorbeeldRapport.ts, Prinsengracht 88) zodat deze
                preview en de daadwerkelijke voorbeeld-PDF elkaar niet
                tegenspreken.
                Alleen vanaf lg zichtbaar (feedback: op mobiel voegde dit
                puur decoratieve blok, dat toch al onder de tekst gestapeld
                werd getoond, vooral drukte toe zonder extra functie — op
                desktop, met de ruimte ernaast, blijft het staan). */}
            <div className="relative mx-auto hidden h-[300px] w-full max-w-[460px] lg:block lg:h-[320px]">
              <span className="absolute -top-1.5 right-2 z-10 rounded-full bg-gradient-to-br from-accent to-accent-dark px-3.5 py-1.5 text-[11px] font-bold text-white shadow-overlay">
                8 pagina&apos;s, écht volledig
              </span>

              {/* Kaart 1 — Verkopen in de buurt */}
              <div className="absolute left-0 top-[62px] flex h-[224px] w-[168px] -rotate-[9deg] flex-col rounded-xl border border-line bg-white p-2.5 shadow-overlay">
                <div className="flex items-center justify-between">
                  <span className="text-[6px] font-bold uppercase tracking-wide text-ink/45">Verkopen in de buurt</span>
                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#E6FBF7] text-[#0F766E]">
                    <StoreIcon className="h-2 w-2" />
                  </span>
                </div>
                <div className="mt-1.5 flex justify-between rounded-lg bg-gradient-to-br from-[#0F766E] to-[#0B5A54] px-1.5 py-1.5">
                  <div>
                    <div className="text-[4px] text-white/70">AANTAL</div>
                    <div className="text-[8px] font-extrabold text-white">14</div>
                  </div>
                  <div>
                    <div className="text-[4px] text-white/70">GEM. €/M²</div>
                    <div className="text-[8px] font-extrabold text-white">€8.200</div>
                  </div>
                </div>
                <div className="mt-1.5 text-[4.3px] font-bold text-[#0F766E]">VERGELIJKBAAR MET DEZE WONING</div>
                <div className="mt-1 flex flex-col gap-1">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[4.3px] font-bold text-ink">Herengracht 210</span>
                      <span className="text-[4.8px] font-extrabold text-ink">€ 907.200</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <div className="h-[3.5px] flex-[0.99] rounded-sm bg-[#0F766E]" />
                      <span className="text-[3.3px] text-ink/45">€8,1k/m²</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[4.3px] font-bold text-ink">Bloemgracht 45</span>
                      <span className="text-[4.8px] font-extrabold text-ink">€ 955.900</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <div className="h-[3.5px] flex-[0.96] rounded-sm bg-[#5FB3AA]" />
                      <span className="text-[3.3px] text-ink/45">€7,9k/m²</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[4.3px] font-bold text-ink">Egelantiersgr. 12</span>
                      <span className="text-[4.8px] font-extrabold text-ink">€ 882.000</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <div className="h-[3.5px] flex-[1.02] rounded-sm bg-[#0F766E]" />
                      <span className="text-[3.3px] text-ink/45">€8,4k/m²</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto rounded-md border-l-2 border-accent bg-mist px-1.5 py-1">
                  <div className="text-[4px] font-extrabold text-accent-dark">Wat betekent &quot;vergelijkbaar&quot;?</div>
                  <div className="mt-0.5 text-[3.3px] leading-tight text-ink">Oppervlakte binnen ±22% van deze woning.</div>
                </div>
              </div>

              {/* Kaart 2 — Waarde-indicatie.
                  Horizontale positie is responsive (was: vast left-[150px]).
                  Bij een vaste 150px werd dit kaartje op mobiel al met de
                  volle 168px breedte + 150px offset (dus 318px) buiten de
                  daadwerkelijke, veel smallere containerbreedte geduwd en
                  door de overflow-hidden op de sectie eromheen afgesneden.
                  Op mobiel schuiven de kaarten daarom dichter op elkaar
                  (nog steeds een gestapeld effect door de afwijkende
                  top-offset en rotatie per kaart), en vanaf sm/lg weer verder
                  uit elkaar zoals oorspronkelijk bedoeld. */}
              <div className="absolute left-[40px] top-10 flex h-[224px] w-[168px] rotate-[4deg] flex-col rounded-xl border border-line bg-white p-2.5 shadow-overlay sm:left-[120px] lg:left-[150px]">
                <div className="flex items-center justify-between">
                  <span className="text-[6px] font-bold uppercase tracking-wide text-ink/45">Waarde-indicatie</span>
                  <span className="rounded-full bg-[#FEF3E2] px-1.5 py-0.5 text-[4.5px] font-extrabold text-[#9A6A0C]">−10%</span>
                </div>
                <div className="mt-1.5 flex gap-[1.5px]">
                  <div className="flex-[1.2] rounded-l-md bg-gradient-to-br from-accent to-accent-dark p-1">
                    <div className="text-[4px] text-white/70">DEZE WONING</div>
                    <div className="text-[7px] font-extrabold text-white">€875.000</div>
                  </div>
                  <div className="flex-1 rounded-r-md bg-parchment p-1">
                    <div className="text-[4px] text-ink/45">BUURTGEM.</div>
                    <div className="text-[7px] font-extrabold text-ink">€8.200/m²</div>
                  </div>
                </div>
                <div className="relative mt-1.5 h-[5px] rounded-full bg-mist">
                  <div className="absolute -top-[1.5px] left-1/2 h-2 w-[1.5px] bg-ink" />
                </div>
                <div className="mt-0.5 flex justify-between text-[3.3px] text-ink/45">
                  <span>€810k</span>
                  <span>90% zeker</span>
                  <span>€940k</span>
                </div>
                <div className="mt-1.5 flex gap-1">
                  <div className="flex-1 text-center">
                    <div className="mx-auto flex h-2.5 w-2.5 items-center justify-center rounded-full bg-mist text-accent">
                      <RulerIcon className="h-1.5 w-1.5" />
                    </div>
                    <div className="mt-0.5 text-[3.3px] font-bold text-ink">118 m²</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="mx-auto flex h-2.5 w-2.5 items-center justify-center rounded-full bg-mist text-accent">
                      <CalendarIcon className="h-1.5 w-1.5" />
                    </div>
                    <div className="mt-0.5 text-[3.3px] font-bold text-ink">1904</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="mx-auto flex h-2.5 w-2.5 items-center justify-center rounded-full bg-mist text-accent">
                      <DoorIcon className="h-1.5 w-1.5" />
                    </div>
                    <div className="mt-0.5 text-[3.3px] font-bold text-ink">5 kmr</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="mx-auto flex h-2.5 w-2.5 items-center justify-center rounded-full bg-accent text-white">
                      <FlagIcon className="h-1.5 w-1.5" />
                    </div>
                    <div className="mt-0.5 text-[3.3px] font-bold text-accent">€875k</div>
                  </div>
                </div>
                <div className="mt-auto rounded-md bg-parchment px-1.5 py-1">
                  <div className="text-[4px] font-bold text-ink">Wat kun je hiermee?</div>
                  <div className="mt-0.5 text-[3.3px] leading-tight text-ink/45">Onderhandelingsbasis, hypotheek, verzekerde waarde.</div>
                </div>
              </div>

              {/* Kaart 3 — volledige inhoudsopgave (alle 8 onderdelen) i.p.v.
                  de eerdere cover-kaart die er met een quote + "+N" belofte
                  maar 5 met naam noemde. Sluit nu 1-op-1 aan bij de "8
                  pagina's, écht volledig"-badge hierboven i.p.v. die belofte
                  tegen te spreken. Volgorde/namen identiek aan de 8
                  tabbladen in ReportView.tsx; kleuren hergebruikt uit de
                  rest van deze pagina (geen nieuwe hexwaarden verzonnen). */}
              {/* Kaart 3 — zelfde reden als bij kaart 2 hierboven: was vast
                  left-[300px], waardoor de rechterrand (300+168=468px) zelfs
                  op een breed desktopscherm nooit paste binnen deze kolom
                  (die door de grid ernaast en Container's max-w-5xl nooit
                  breder dan ~422px wordt) en op mobiel bijna volledig
                  onzichtbaar/afgesneden was — precies de kaart die dit
                  onderdeel de volledige inhoudsopgave laat zien. */}
              <div className="absolute left-[84px] top-0 flex h-[250px] w-[168px] flex-col overflow-hidden rounded-xl border border-line shadow-lg sm:left-[240px] lg:left-[250px]">
                <div className="shrink-0 bg-gradient-to-br from-accent to-accent-dark p-2.5">
                  <div className="text-[5.5px] font-bold text-white/70">PREMIUM KOOPRAPPORT</div>
                  <div className="mt-1 text-[10px] font-extrabold text-white">Prinsengracht 88</div>
                  <div className="text-[5.5px] text-white/60">1015 DZ Amsterdam</div>
                </div>
                <div className="flex flex-1 flex-col bg-white p-2">
                  <div className="text-[5px] font-bold uppercase tracking-wide text-ink/45">
                    Volledige inhoudsopgave
                  </div>
                  <div className="mt-1.5 flex flex-col gap-[3.5px]">
                    {[
                      { kleur: "bg-accent", tekst: "Rapportoverzicht" },
                      { kleur: "bg-accent-dark", tekst: "Waarde-indicatie" },
                      { kleur: "bg-[#0F766E]", tekst: "Verkopen in de buurt" },
                      { kleur: "bg-sun", tekst: "Objectgegevens" },
                      { kleur: "bg-[#0D9488]", tekst: "Energieprestatie" },
                      { kleur: "bg-rust", tekst: "Funderingsrisico" },
                      { kleur: "bg-[#8B85EE]", tekst: "Buurtprofiel" },
                      { kleur: "bg-ink", tekst: "Samenvatting" },
                    ].map((item, i) => (
                      <div key={item.tekst} className="flex items-center gap-[5px]">
                        <span className={`flex h-[9px] w-[9px] shrink-0 items-center justify-center rounded-full text-[4.3px] font-extrabold text-white ${item.kleur}`}>
                          {i + 1}
                        </span>
                        <span className="text-[5px] text-ink">{item.tekst}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto flex justify-between border-t border-line pt-1.5 text-[3.8px] text-ink/45">
                    <span>Ook als PDF</span>
                    <span>Bronnen: Kadaster, RVO, CBS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-ink/10 bg-white">
        <Container className="py-20">
          {/* h2 i.p.v. eerder een <p> — visueel identiek (zelfde classes),
              maar dit is inhoudelijk een sectiekop (opent een nieuwe sectie
              met 3 stappen), en hoort dus ook semantisch als kop gemarkeerd
              te zijn i.p.v. als gewone tekst. Zelfde reden bij "Veelgestelde
              vragen" verderop. */}
          <h2 className="text-[11px] font-bold uppercase tracking-wider3 text-ink/45">Zo werkt het</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STAPPEN.map((s, i) => (
              <div key={s.titel}>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${s.kleur}`}
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold text-ink">{s.titel}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{s.tekst}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Vertrouwensregel — verplaatst uit de hero (stond daar eerder als
          losse statsrij onderaan de tekstkolom) naar een eigen, rustige
          sectie: één regel i.p.v. een blok tussen de andere hero-elementen. */}
      <section className="border-t border-ink/10 bg-white">
        <Container className="py-6 text-center text-[11px] text-ink/55">
          <span className="font-bold text-ink">1.240+</span> rapporten gegenereerd ·{" "}
          <span className="font-bold text-ink">8</span> pagina&apos;s per rapport · bronnen:{" "}
          <span className="font-semibold text-ink">Kadaster, RVO, CBS, KCAF</span>
        </Container>
      </section>

      {/* Veelgestelde vragen — als <details>/<summary>: werkt zonder client-
          side state, blijft toegankelijk, en toont meteen meer inhoud zonder
          dat de pagina drukker oogt (alles behalve de eerste vraag staat
          dicht). */}
      <section className="border-t border-ink/10 bg-parchment">
        <Container className="py-16">
          <h2 className="text-center text-[11px] font-bold uppercase tracking-wider3 text-ink/45">Veelgestelde vragen</h2>
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
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink/60">{item.antwoord}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Lichte homepage-footer i.p.v. de zwarte SiteFooter — zelfde
          feitelijke disclaimer over mockdata, alleen in het lichte palet.
          "Privacy", "Voorwaarden" en "Contact" linken nu naar de echte
          pagina's. KvK-nummer blijft platte tekst (staat al op /contact).
          De mockdata-disclaimer wordt nu bepaald door isVolledigLive()
          i.p.v. hardcoded tekst — zie lib/config/launchStatus.ts. */}
      <footer className="border-t border-ink/10 bg-white py-10">
        <Container className="flex flex-col items-start gap-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display font-semibold text-ink">© {new Date().getFullYear()} Kooprapport</span>
          <div className="flex flex-wrap gap-4 text-ink/55">
            <Link href={buildReportHref(VOORBEELD_ADRES)} className="underline underline-offset-2 hover:text-ink">
              Voorbeeldrapport
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
            <span>KvK-nummer</span>
          </div>
          {!volledigLive && (
            <span className="text-ink/40">Mockdata ter illustratie. Nog geen live databronnen gekoppeld.</span>
          )}
        </Container>
      </footer>
    </main>
  );
}
