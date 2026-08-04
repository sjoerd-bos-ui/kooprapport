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
const PAGINA_OMSCHRIJVING =
  "Plak de link naar een woning of zoek zelf een adres en zie in drie scenario's wat een goed bod is, op basis van het echte NVM-overbiedcijfer voor die regio.";

export const metadata: Metadata = {
  title: "Biedadvies",
  description: PAGINA_OMSCHRIJVING,
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Biedadvies · Kooprapport",
    description: PAGINA_OMSCHRIJVING,
    url: `${APP_BASE_URL}${CANONICAL_PATH}`,
    type: "website",
  },
};

const PUNTEN = [
  {
    icon: MapPinIcon,
    titel: "Adres via PDOK",
    tekst: "Plak een link of zoek zelf — geen giswerk, hetzelfde adresregister als de rest van de site.",
  },
  {
    icon: HistoryIcon,
    titel: "Echte regiocijfers",
    tekst: "Overbiedpercentage per COROP-regio, uit het NVM Marktoverzicht van dit kwartaal.",
  },
  {
    icon: ShieldCheckIcon,
    titel: "Jouw waarde, geen giswerk van ons",
    tekst: "Wij rekenen op wat jij intikt — vraagprijs of eigen inschatting. Geen kostenverhogende schattingen zonder dat je ervoor kiest.",
  },
];

export default function BiedadviesPagina() {
  return (
    <>
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
                Wat is in deze regio een goed bod?
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/65">
                Plak de link naar een woning (bijvoorbeeld Funda) of zoek zelf een adres. Op basis van het echte
                overbiedpercentage in die regio laten we drie scenario&apos;s zien — van een veilig bod tot een
                scherpe gok.
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
            </div>

            <div className="lg:sticky lg:top-24">
              <BiedadviesTool />
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
