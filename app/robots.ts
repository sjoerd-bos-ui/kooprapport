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
        // /zakelijk/ is het besloten B2B-dashboard (inloggen vereist, geen
        // zelfregistratie) -- geen publieke content, hoort dus niet
        // geïndexeerd te worden. Elke pagina daaronder zet ook zelf al
        // robots: {index:false} (zie de metadata-exports in app/zakelijk/),
        // dit is de extra, crawler-brede laag daarbovenop. /deelrapport/ is
        // om dezelfde reden dicht: dat zijn privé, per-token gedeelde
        // rapportlinks voor één specifieke klant, geen content om te
        // indexeren (ook daar staat al robots: {index:false} op de pagina
        // zelf, zie app/deelrapport/[token]/page.tsx).
        disallow: ["/api/", "/zakelijk/", "/deelrapport/"],
      },
    ],
    sitemap: `${APP_BASE_URL}/sitemap.xml`,
  };
}
