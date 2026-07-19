import type { MetadataRoute } from "next";
import { APP_BASE_URL } from "@/lib/config/payment";

// /api/ blijft volledig dicht voor crawlers: dat zijn functionele endpoints
// (rapportdata ophalen, PDF genereren, betaling starten/bevestigen), geen
// content bedoeld om te indexeren — en één ervan verwerkt betalingen. Verder
// staat alles open: rapportpagina's zijn de eigenlijke SEO-waarde van deze
// site. Pagina's die zelf niet gevonden/geldig zijn (zie generateMetadata in
// app/rapport/[slug]/page.tsx) sturen daar per pagina al robots: noindex
// mee — dat hoeft dus niet via een los pad-patroon hier.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${APP_BASE_URL}/sitemap.xml`,
  };
}
