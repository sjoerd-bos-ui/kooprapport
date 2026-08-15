import type { Metadata } from "next";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import BiedadviesTool from "@/components/biedadvies/BiedadviesTool";
import { MapPinIcon, HistoryIcon, ShieldCheckIcon } from "@/components/report/icons";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// /biedadvies — publieke marketingtool: plak een woninglink (of zoek zelf een
// adres) en krijg drie biedscenario's op basis van het echte NVM-overbied-
// cijfer voor die regio (lib/content/regioOverbieden.ts). Bewust GEEN Altum-
// aanroep hier (kost credits per bezoeker) -- de waarde komt altijd van de
// bezoeker zelf, precies zoals in BiedadviesTool.tsx toegelicht. Twee-koloms
// lg-layout (zelfde grid-patroon als de homepage-hero) zodat de pagina op
// desktop niet als een smal, verdwaald kaartje oogt.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/biedadvies";
// SEO-audit (Cowork-gesprek "check de SEO"): "Biedadvies" alleen is een
// productnaam, geen zoekvraag -- reële zoektermen zijn "hoeveel bieden op
// een huis"/"hoeveel overbieden"/"overbieden huis 2026" (geverifieerd via
// live zoekresultaten: concurrenten als Hypotheek.nl en SlimBieden titelen
// exact zo, vaak met jaartal voor actualiteit). Title/description hieronder
// leiden nu met die vraag i.p.v. met de UI-instructie ("plak de link").
const PAGINA_OMSCHRIJVING =
  "Bereken direct hoeveel je moet bieden op een huis, op basis van het actuele NVM-overbiedcijfer voor jouw regio. Plak de Funda-link of typ het adres en zie drie scenario's.";

export const metadata: Metadata = {
  title: "Hoeveel bieden op een huis? Bereken je bod (2026)",
  description: PAGINA_OMSCHRIJVING,
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Hoeveel bieden op een huis? Bereken je bod (2026) · Kooprapport",
    description: PAGINA_OMSCHRIJVING,
    url: `${APP_BASE_URL}${CANONICAL_PATH}`,
    type: "website",
  },
};

// SEO-audit: dit was de enige pagina in de hoofdnavigatie zonder eigen
// BreadcrumbList JSON-LD (koopgids/marktupdates/woningmarkt/homepage hebben
// dit allemaal al) -- zelfde patroon hier toegevoegd, geen nieuw systeem.
const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
    { "@type": "ListItem", position: 2, name: "Biedadvies", item: `${APP_BASE_URL}${CANONICAL_PATH}` },
  ],
};

const PUNTEN = [
  {
    icon: MapPinIcon,
    titel: "Adres, in één keer goed",
    tekst: "Plak een link of typ het adres. Geen giswerk, geen verdwaald huisnummer.",
  },
  {
    icon: HistoryIcon,
    titel: "Cijfers in plaats van buikgevoel",
    tekst: "Hoeveel wordt er in jouw regio gemiddeld overboden? Wij weten het, jij hoeft het niet te raden.",
  },
  {
    icon: ShieldCheckIcon,
    titel: "Wij gokken niet met jouw geld",
    tekst: "Jij vult zelf een waarde in: vraagprijs of eigen inschatting. Kost ons (en jou) niks extra.",
  },
];

export default function BiedadviesPagina() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SiteHeader />
      <main className="relative overflow-hidden bg-parchment">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, #4F46E524 0%, rgba(79,70,229,0) 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-[420px] h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, #8B85EE20 0%, rgba(139,133,238,0) 70%)" }}
        />
        <Container className="relative py-12 sm:py-16">
          <div className="grid items-start gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center rounded-full bg-mist px-3.5 py-1.5 text-xs font-bold text-accent">
                Biedadvies
              </span>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
                Hoeveel moet je bieden op dit huis?
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/65">
                Plak de link van een huis (Funda mag) of typ een adres. Wij zoeken uit wat er in die regio
                écht wordt geboden: van veilig bod tot &quot;ik doe een gok&quot;.
              </p>

              <div className="mt-9 flex flex-col gap-5">
                {PUNTEN.map(({ icon: Icon, titel, tekst }) => (
                  <div key={titel} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white text-accent-dark shadow-flat">
                      <Icon className="h-[17px] w-[17px]" />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-bold text-ink">{titel}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-ink/55">{tekst}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 max-w-md border-t border-ink/10 pt-4">
                <p className="text-[14px] font-extrabold text-ink">Meer zekerheid nodig?</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink/60">
                  Het volledige rapport heeft de complete biedstrategie, op basis van onze eigen berekening
                  voor dit huis.
                </p>
              </div>
            </div>

            <div className="lg:sticky lg:top-24">
              <BiedadviesTool />
            </div>
          </div>

          {/* SEO-audit: feitelijke alinea die de "hoeveel wordt er gemiddeld
              overboden in Nederland"-zoekvraag direct beantwoordt, met de
              eigen NVM-regiocijfers (lib/content/regioOverbieden.ts) i.p.v.
              een verzonnen landelijk gemiddelde -- dat bestaat niet als veld
              in de data, dus citeren we de geverifieerde regionale uitersten
              uit de NVM-persrapportage 2e kwartaal 2026 zelf. */}
          <div className="mt-16 max-w-2xl border-t border-ink/10 pt-10">
            <h2 className="font-display text-xl font-extrabold text-ink">
              Hoeveel wordt er gemiddeld overboden in Nederland?
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink/65">
              Dat verschilt sterk per regio. Volgens de NVM-marktcijfers over het tweede kwartaal van 2026 ging
              in de duurste regio&apos;s -- Overig Groningen, Flevoland, Utrecht en Oost-Zuid-Holland -- meer dan
              80% van de verkochte woningen boven de vraagprijs weg. In Zeeuws-Vlaanderen was dat nog geen 30%.
              Die spreiding is precies waarom een landelijk gemiddelde weinig zegt: het overbiedpercentage voor
              jouw eigen regio, hierboven ingevuld, geeft een veel eerlijker beeld dan een nationaal cijfer.
            </p>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
