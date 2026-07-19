import type { MetadataRoute } from "next";
import { APP_BASE_URL } from "@/lib/config/payment";

// Bewust ALLEEN de homepage. Rapportpagina's (/rapport/[slug]) bestaan pas
// zodra iemand daadwerkelijk een adres opzoekt — er is geen database met
// eerder opgevraagde adressen om hier statisch op te sommen (zie de audit).
// Een sitemap vullen met verzonnen of geraden adres-URL's zou tegen het
// "nooit iets verzinnen"-principe van deze app ingaan én crawl-budget
// verspillen aan pagina's die mogelijk niemand ooit bezoekt. Echte
// rapportpagina's worden gevonden via interne links (zie de homepage-ribbon)
// en via gedeelde links zelf.
//
// Wil je in de toekomst wél eerder-gegenereerde rapportpagina's laten
// indexeren, dan hoort daar een simpele opslag van "welke adressen zijn al
// eens opgevraagd" bij (bv. een tabel/KV-store) waar deze functie uit kan
// lezen — dat is een bewuste, aparte uitbreiding, geen onderdeel van deze
// SEO-fix.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    // /privacy bestaat, net als de homepage, altijd identiek voor iedereen
    // (geen adresafhankelijke content) — hoort dus wel in de sitemap, in
    // tegenstelling tot rapportpagina's hierboven.
    {
      url: `${APP_BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_BASE_URL}/voorwaarden`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
