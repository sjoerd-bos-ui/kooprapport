import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import CookieConsent from "@/components/analytics/CookieConsent";
import WhatsAppFloatingButton from "@/components/support/WhatsAppFloatingButton";
import { APP_BASE_URL } from "@/lib/config/payment";
// Bricolage Grotesque draagt de volledige visuele identiteit (koppen,
// cijfers, kickers, wordmark) — een uitgesproken, architectonische grotesk
// i.p.v. een brave systeemserif of generieke SaaS-sans. Inter blijft puur
// voor lopende tekst/UI, bewust op de achtergrond.
//
// Self-hosted via @fontsource i.p.v. next/font/google: next/font/google
// haalt de font-bestanden tijdens de Vercel-build live op bij
// fonts.googleapis.com/fonts.gstatic.com, en dat faalde meerdere keren met
// "Module not found: Can't resolve ... next/font/google" -- een transiënte
// netwerk-/CDN-fout tijdens het bouwen zelf, niet een codefout. @fontsource
// bundelt de .woff2-bestanden gewoon als npm-package (opgehaald via de
// package-registry, waar Vercel's build sowieso al van afhankelijk is voor
// elke andere dependency), dus geen aparte, extra netwerkafhankelijkheid
// meer tijdens het bouwen. De CSS-variabelen --font-display/--font-sans die
// tailwind.config.ts verwacht, staan nu handmatig in globals.css (:root)
// (next/font/google deed dat automatisch via de `variable`-optie).
import "@fontsource/bricolage-grotesque/latin-500.css";
import "@fontsource/bricolage-grotesque/latin-600.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./globals.css";

// metadataBase hergebruikt bewust dezelfde APP_BASE_URL als de betaalflow
// (lib/config/payment.ts, o.a. voor Mollie's redirect/webhook-URL) i.p.v.
// een tweede, losse domeinconstante — één bron voor "wat is de site zelf",
// zodat canonical/OG-URL's nooit uit de pas kunnen lopen met de echte
// productie-URL. Moet in productie via de APP_BASE_URL env-var op het
// echte domein staan (zie .env.example) — zonder die var valt dit terug op
// localhost, prima voor lokaal ontwikkelen, fout voor live.
//
// title als template: elke pagina die zelf geen metadata.title zet (of via
// generateMetadata een title teruggeeft) erft deze default; pagina's die wél
// een eigen title zetten (bv. de rapportpagina, per adres) krijgen die title
// + " · Kooprapport" aangeplakt i.p.v. een losstaande titel — herkenbaar in
// Google-resultaten en browsertabs, en voorkomt dat een rapportpagina per
// ongeluk zonder merknaam in de resultaten verschijnt.
export const metadata: Metadata = {
  metadataBase: new URL(APP_BASE_URL),
  title: {
    // SEO-audit (Cowork-gesprek "check de SEO"): "Premium woningdata" is
    // interne merktaal, geen zoekvraag -- niemand typt dat. Reële intentie
    // rond dit product is "woningwaarde checken"/"wat is mijn huis waard",
    // aangevuld met de bredere rapportinhoud die dit onderscheidt van pure
    // waardecheckers (biedadvies, funderingsrisico). Titel als template
    // (title.template hieronder) geeft dit automatisch mee aan elke pagina
    // die zelf geen title zet.
    default: "Wat is dit huis waard? Woningwaarde, biedadvies en funderingsrisico per adres · Kooprapport",
    template: "%s · Kooprapport",
  },
  description:
    "Vul een adres in, bekijk een gratis preview en ontgrendel het volledige rapport met BAG, energielabel, geschatte woningwaarde en buurtverkopen.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: "Kooprapport",
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  // Facebook Business Manager domeinverificatie — rendert server-side mee in
  // <head> (via Next.js' Metadata API, niet client-side/JS-geladen), precies
  // zoals Facebook vereist. Geen functionele invloed op de site zelf, puur
  // een bewijs-tag zodat Meta dit domein aan het bedrijfsaccount koppelt.
  verification: {
    other: {
      "facebook-domain-verification": "2zl4ard24px540k74x3ajh1myp5vvq",
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-parchment font-sans text-ink antialiased">
        {children}
        {/* Vercel Web Analytics — géén cookies, blijft altijd actief als
            cookievrije basismeting, ook als een bezoeker Google Analytics
            hieronder weigert. Script en meetpunten lopen via
            /_vercel/insights/* op het eigen domein, dus de bestaande strikte
            CSP in next.config.js (script-src/connect-src 'self') hoeft hier
            niet voor aangepast te worden. */}
        <Analytics />
        {/* Google Analytics (GA4) — ALLEEN na actieve toestemming, zie
            CookieConsent.tsx. Rijkere inzichten (custom events, trafficbronnen,
            funnels) dan Vercel Analytics, maar vereist daarom wél een
            toestemmingsbanner. */}
        <CookieConsent />
        {/* Site-breed zwevende WhatsApp-contactknop — rendert zichzelf weg
            zolang NEXT_PUBLIC_WHATSAPP_NUMMER nog niet gezet is, zie
            components/support/WhatsAppFloatingButton.tsx. */}
        <WhatsAppFloatingButton />
      </body>
    </html>
  );
}
