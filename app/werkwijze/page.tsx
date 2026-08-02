import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AddressSearchBar from "@/components/address/AddressSearchBar";
import { ArrowRightIcon } from "@/components/report/icons";
import { WERKWIJZE_ONDERDELEN } from "@/lib/content/werkwijze";
import { KLEUR_STIJL } from "@/lib/content/koopgids";
import { APP_BASE_URL } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// /werkwijze — één statische pagina (zelfde opzet als /contact, /privacy,
// /voorwaarden en de Koopgids-hub) die in het kort en luchtig uitlegt waar elk
// onderdeel van het rapport vandaan komt. Bewust los van de Koopgids: dit is
// de korte, overkoepelende versie ("hoe werkt dit allemaal") met per
// onderdeel een link door naar het bijbehorende Koopgids-artikel voor wie de
// volledige diepgang wil — geen dubbele content, wel een tweede interne link
// naar elk artikel.
// -----------------------------------------------------------------------------

const CANONICAL_PATH = "/werkwijze";

export const metadata: Metadata = {
  title: "Werkwijze",
  description:
    "Hoe Kooprapport tot stand komt: per onderdeel van het rapport in het kort uitgelegd waar de gegevens vandaan komen en hoe actueel ze zijn.",
  alternates: { canonical: CANONICAL_PATH },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Werkwijze · Kooprapport",
    description:
      "Hoe Kooprapport tot stand komt: per onderdeel van het rapport in het kort uitgelegd waar de gegevens vandaan komen en hoe actueel ze zijn.",
    url: `${APP_BASE_URL}${CANONICAL_PATH}`,
    type: "website",
  },
};

export default function WerkwijzePagina() {
  return (
    <>
      <SiteHeader />
      {/* Zelfde parchment-canvas + zachte kleurvlekken als de homepage
          (na de "hele site voelt te wit"-ronde) i.p.v. het eerdere vlakke
          wit -- deze pagina was de enige die nog niet meegenomen was. */}
      <main className="relative overflow-hidden bg-parchment">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, #4F46E524 0%, rgba(79,70,229,0) 70%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-[380px] h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, #8B85EE20 0%, rgba(139,133,238,0) 70%)" }}
        />
        <Container width="narrow" className="relative py-12 sm:py-16">
          <span className="inline-flex items-center rounded-full bg-[#EEF0FF] px-3.5 py-1.5 text-xs font-bold text-accent">
            Werkwijze
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Hoe Kooprapport tot stand komt
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink/65">
            Elk cijfer in uw rapport komt ergens vandaan, nooit uit de lucht gegrepen. Hieronder vertellen we in
            gewone taal hoe we eraan komen en hoe vers het is.
          </p>

          <div className="mt-9 rounded-[20px] bg-white px-6 shadow-sm sm:px-8">
            {WERKWIJZE_ONDERDELEN.map((onderdeel, i) => {
              const Icon = onderdeel.icoon;
              const stijl = KLEUR_STIJL[onderdeel.kleur];
              const laatste = i === WERKWIJZE_ONDERDELEN.length - 1;
              return (
                <div key={onderdeel.titel} className={`flex gap-3.5 py-6 sm:gap-4 ${laatste ? "" : "border-b border-ink/[0.06]"}`}>
                  <span
                    className={`mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${stijl.bg} ${stijl.tekst}`}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-ink">{onderdeel.titel}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/60">{onderdeel.tekst}</p>
                    <p className="mt-2.5 text-[11.5px] font-semibold text-accent">
                      {onderdeel.bijgewerkt} <span className="mx-1.5 text-ink/20">·</span>
                      <Link
                        href={`/koopgids/${onderdeel.koopgidsSlug}`}
                        className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-accent-dark"
                      >
                        Meer lezen <ArrowRightIcon className="h-2.5 w-2.5" />
                      </Link>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[13px] font-bold text-ink">Onafhankelijk en eerlijk over wat we niet weten</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink/60">
              Geen makelaar die meekijkt, dus geen belang bij een hoog of laag getal, alleen bij een kloppend getal.
              En weten we iets niet zeker over uw adres? Dan zeggen we gewoon eerlijk &ldquo;niet beschikbaar&rdquo;.
              We verzinnen nooit een getal om een rapport voller te laten lijken.
            </p>
          </div>

          {/* CTA -- deze pagina eindigde eerder gewoon, zonder vervolgstap.
              Precies op het moment dat iemand net overtuigd is hoe alles tot
              stand komt, hoort er een directe manier te zijn om het te
              proberen, i.p.v. terug naar de header of de homepage. */}
          <div className="mt-5 rounded-2xl bg-[#EEF0FF] p-6">
            <p className="text-sm font-bold text-ink">Benieuwd wat dit voor uw eigen adres oplevert?</p>
            <p className="mt-1 text-xs text-ink/55">Typ een adres en bekijk in enkele seconden een gratis preview.</p>
            <div className="mt-4">
              <AddressSearchBar />
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
