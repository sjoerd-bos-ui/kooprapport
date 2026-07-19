import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { APP_BASE_URL } from "@/lib/config/payment";
import "./globals.css";

// Bricolage Grotesque draagt de volledige visuele identiteit (koppen,
// cijfers, kickers, wordmark) — een uitgesproken, architectonische grotesk
// i.p.v. een brave systeemserif of generieke SaaS-sans. Inter blijft puur
// voor lopende tekst/UI, bewust op de achtergrond. Beide via next/font
// (self-hosted, geen render-blocking <link>, geen layout shift) en als
// CSS-variabele doorgezet naar tailwind.config.ts.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

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
    default: "Kooprapport · Premium woningdata per adres",
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
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className={`${display.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-parchment font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
