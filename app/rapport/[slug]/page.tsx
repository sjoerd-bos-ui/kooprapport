import { cache } from "react";
import { Suspense } from "react";
import type { Metadata } from "next";
import ReportPageClient from "@/components/ReportPageClient";
import AddressLookupFeedback from "@/components/address/AddressLookupFeedback";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import { confirmedAddressParamsFromSearchParams, buildCanonicalReportPath } from "@/lib/utils/slug";
import { resolveConfirmedAddress, type AddressLookupResult } from "@/lib/services/addressLookup";
import { getReport } from "@/lib/services/reportService";
import { RAPPORT_PRIJS, RAPPORT_PRIJS_CENTEN } from "@/lib/utils/prijs";
import type { Report } from "@/types/report";
import { APP_BASE_URL } from "@/lib/config/payment";

type SearchParams = { [key: string]: string | string[] | undefined };

// Knipt op een woordgrens af (nooit midden in een woord) en voegt "…" toe
// als er daadwerkelijk iets wegvalt — puur voor de meta-description hieronder.
function kortAf(tekst: string, max: number): string {
  if (tekst.length <= max) return tekst;
  const afgekapt = tekst.slice(0, max);
  const laatsteSpatie = afgekapt.lastIndexOf(" ");
  return `${afgekapt.slice(0, laatsteSpatie > 0 ? laatsteSpatie : max)}…`;
}

// -----------------------------------------------------------------------------
// SEO-fix (zie de audit): deze pagina toonde eerder ALLEEN een client-side
// laadscherm in de server-gerenderde HTML — het echte rapport (bouwjaar,
// energielabel, oppervlakte, funderingsrisico-indicatie: de vier gratis-
// preview-velden) werd pas na mounten in de browser opgehaald via
// ReportPageClient's useEffect. Voor een crawler die geen/beperkt JavaScript
// uitvoert (en zelfs voor Googlebot, dat wél JS rendert maar dat in een
// tweede, vertraagde pas doet) betekende dit dat de daadwerkelijke inhoud van
// elke rapportpagina nooit betrouwbaar geïndexeerd werd.
//
// Fix: dezelfde getReport() die de API-route (app/api/rapport/route.ts) al
// gebruikt, wordt hier RECHTSTREEKS server-side aangeroepen (Server
// Component, geen 'use client') — het resultaat komt zo al in de eerste HTML
// mee. deferMarket/deferNearbySales blijven op hun default (true): dit blijft
// dus exact zo kostenveilig als voorheen, er wordt geen Altum-data
// opgehaald die niet al gratis was.
//
// cache() dedupliceert het resolve+fetch-werk tussen generateMetadata() en
// de pagina zelf (Next.js roept beide apart aan) — zonder deze wrapper zou
// getReport() twee keer per paginabezoek draaien.
const getResolvedReportData = cache(async function getResolvedReportData(
  searchParams: SearchParams
): Promise<{ result: AddressLookupResult; report: Report | null }> {
  const raw = confirmedAddressParamsFromSearchParams(searchParams);
  const result = resolveConfirmedAddress(raw);
  if (result.status !== "match" || !result.address) {
    return { result, report: null };
  }
  const report = await getReport(result.address);
  return { result, report };
});

// Next.js 16: params/searchParams zijn nu Promises (async request-API's,
// zie de migratienotitie in OVERDRACHT-kooprapport.md bij de 16.2.10-
// upgrade) — hier dus ge-await'ed vóór gebruik. params zelf wordt nergens
// gebruikt (de slug in de URL is puur cosmetisch/SEO, het echte adres komt
// uit searchParams via confirmedAddressParamsFromSearchParams), maar blijft
// getypeerd zodat de functiesignatuur overeenkomt met wat Next.js voor deze
// route genereert.
export async function generateMetadata({
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { result, report } = await getResolvedReportData(await searchParams);

  if (result.status !== "match" || !result.address) {
    // Geen (geldig) adres in de URL — dit is de "Rapport niet gevonden"-
    // weergave (zie de component hieronder). Nuttig voor een bezoeker, maar
    // een lege/foutieve pagina met steeds dezelfde tekst is precies het
    // soort "soft 404" dat Google afraadt om te indexeren.
    return {
      title: "Rapport niet gevonden",
      description: "We konden geen rapport bij dit adres vinden. Zoek opnieuw op de homepage van Kooprapport.",
      robots: { index: false, follow: true },
    };
  }

  const address = result.address;
  const building = report?.building.data;
  const energy = report?.energy.data;
  const fundering = report?.fundering.data;

  // Alleen ECHT opgehaalde, gratis velden gebruiken — nooit iets schatten of
  // verzinnen voor de meta-description (zelfde principe als de rest van de
  // app). Ontbreekt een veld, dan valt die zin er gewoon uit i.p.v. een
  // "Onbekend" in een meta-tag te zetten.
  const feiten: string[] = [];
  if (building?.bouwjaar != null) feiten.push(`bouwjaar ${building.bouwjaar}`);
  if (energy?.klasse) feiten.push(`energielabel ${energy.klasse}`);
  if (building?.oppervlakteM2 != null) feiten.push(`${building.oppervlakteM2} m² woonoppervlak`);
  if (fundering?.label) feiten.push(`funderingsrisico ${fundering.label.toLowerCase()}`);

  const title = address.label;
  const ruweDescription =
    feiten.length > 0
      ? `Gratis preview voor ${address.label}: ${feiten.join(", ")}. Ontgrendel het volledige rapport met waarde-indicatie, buurtverkopen en funderingsrisico voor ${RAPPORT_PRIJS}.`
      : `Bekijk de gratis preview voor ${address.label} en ontgrendel het volledige woningrapport met waarde-indicatie, buurtverkopen en funderingsrisico voor ${RAPPORT_PRIJS}.`;
  // SEO-fix: bij een lang adreslabel + alle 4 gevonden feiten kan deze zin
  // ruim boven de ±155-160 tekens komen die Google doorgaans in het
  // zoekresultaat toont — geen indexatiefout, maar Google knipt 'm dan zelf
  // ergens midden in een woord af, wat er rommelig uitziet. Hier expliciet
  // en voorspelbaar afkappen op een woordgrens i.p.v. dat aan Google over te
  // laten.
  const description = kortAf(ruweDescription, 157);

  const canonicalPath = buildCanonicalReportPath(address);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${title} · Kooprapport`,
      description,
      url: canonicalPath,
      type: "website",
    },
    twitter: {
      title: `${title} · Kooprapport`,
      description,
    },
  };
}

export default async function RapportPage({
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { result, report } = await getResolvedReportData(await searchParams);

  // "|| !report" is hier puur voor TypeScript-narrowing: report kan alleen
  // null zijn wanneer status niet "match" is (zie getResolvedReportData), dus
  // dit verandert het gedrag niet, maar laat TS wel weten dat report vanaf
  // hier gegarandeerd een Report is.
  if (result.status !== "match" || !result.address || !report) {
    return (
      <main className="min-h-screen bg-parchment">
        <SiteHeader />
        <Container width="narrow">
          <AddressLookupFeedback result={result} variant="page" />
        </Container>
        <SiteFooter />
      </main>
    );
  }

  const address = result.address;
  const canonicalUrl = new URL(buildCanonicalReportPath(address), APP_BASE_URL).toString();

  // Product-schema: dit IS een reëel, direct koopbaar product (het rapport
  // voor dit specifieke adres, tegen de echte prijs — RAPPORT_PRIJS_CENTEN
  // is dezelfde bron als de PaywallModal en Mollie zelf gebruiken, dus dit
  // kan nooit uit de pas lopen met wat iemand daadwerkelijk betaalt).
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Kooprapport voor ${address.label}`,
    description: `Volledig woningrapport voor ${address.label}: waarde-indicatie, buurtverkopen, energieprestatie, funderingsrisico en buurtprofiel.`,
    // SEO-fix: image is een VEREIST veld voor Google's Product-rich-results
    // (merchant listing/shopping), dat ontbrak volledig. Er is geen los
    // productfoto per adres (dit is een rapport, geen fysiek product) — de
    // site-brede OG-afbeelding (app/opengraph-image.tsx) is hier een
    // eerlijke, bestaande afbeelding om naar te verwijzen, geen verzonnen URL.
    image: `${APP_BASE_URL}/opengraph-image`,
    brand: { "@type": "Brand", name: "Kooprapport" },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: (RAPPORT_PRIJS_CENTEN / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: canonicalUrl,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Kooprapport", item: APP_BASE_URL },
      { "@type": "ListItem", position: 2, name: address.label, item: canonicalUrl },
    ],
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- gestructureerde JSON-LD, geen user input (address komt uit resolveConfirmedAddress, niet ongefilterd uit de URL) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* Suspense-boundary blijft nodig: ReportPageClient gebruikt zelf ook
          nog useSearchParams() (om een bestellingId te herkennen na een
          Mollie-redirect) — Next.js staat dat buiten een Suspense-boundary
          niet toe. report is nu al server-side opgehaald en gaat als
          initialReport mee, dus dit lost in de praktijk altijd meteen op. */}
      <Suspense fallback={null}>
        <ReportPageClient address={address} initialReport={report} />
      </Suspense>
    </>
  );
}
