import type { MetadataRoute } from "next";
import { APP_BASE_URL } from "@/lib/config/payment";
import { ARTIKELEN } from "@/lib/content/koopgids";
import { MARKTUPDATES } from "@/lib/content/marktupdates";
import { STEDEN } from "@/lib/content/steden";

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
//
// BUGFIX (lastModified): stond hier eerder overal op new Date() -- dat geeft
// niet de laatste keer dat de INHOUD veranderde, maar simpelweg het moment
// waarop de sitemap gegenereerd wordt (elke build/request). Elke pagina leek
// daardoor bij elke deploy "zojuist gewijzigd", ook /privacy (changeFrequency
// "yearly") die al maanden ongewijzigd kan zijn -- een dooddoener van een
// signaal dat Google juist gebruikt om te bepalen hoe vaak een pagina
// hercrawld moet worden. Koopgids-artikelen en Marktupdates hebben nu een
// echt bijgewerkt/gepubliceerdISO-veld in hun eigen content-bestand (zie
// lib/content/koopgids.ts / marktupdates.ts) dat hier wordt uitgelezen; de
// vaste pagina's hieronder hebben een losse constante die je zelf bijwerkt
// zodra je de inhoud van die pagina daadwerkelijk aanpast.
const HOMEPAGE_BIJGEWERKT = new Date("2026-08-03");
const PRIVACY_BIJGEWERKT = new Date("2026-08-03");
const VOORWAARDEN_BIJGEWERKT = new Date("2026-08-03");
const CONTACT_BIJGEWERKT = new Date("2026-08-03");
const KOOPGIDS_HUB_BIJGEWERKT = new Date("2026-08-03");
const WERKWIJZE_BIJGEWERKT = new Date("2026-08-03");
const MARKTUPDATES_HUB_BIJGEWERKT = new Date("2026-08-03");
const WONINGMARKT_HUB_BIJGEWERKT = new Date("2026-08-03");
const WAAROM_KOOPRAPPORT_BIJGEWERKT = new Date("2026-08-03");
const BIEDADVIES_BIJGEWERKT = new Date("2026-08-04");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_BASE_URL,
      lastModified: HOMEPAGE_BIJGEWERKT,
      changeFrequency: "weekly",
      priority: 1,
    },
    // /privacy bestaat, net als de homepage, altijd identiek voor iedereen
    // (geen adresafhankelijke content) — hoort dus wel in de sitemap, in
    // tegenstelling tot rapportpagina's hierboven.
    {
      url: `${APP_BASE_URL}/privacy`,
      lastModified: PRIVACY_BIJGEWERKT,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_BASE_URL}/voorwaarden`,
      lastModified: VOORWAARDEN_BIJGEWERKT,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${APP_BASE_URL}/contact`,
      lastModified: CONTACT_BIJGEWERKT,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Waarom Kooprapport: zelfde categorie als Werkwijze (statisch, voor
    // iedereen identiek, gericht op vertrouwen/conversie), hogere prioriteit
    // omdat dit de kernpositionering van het product uitlegt.
    {
      url: `${APP_BASE_URL}/waarom-kooprapport`,
      lastModified: WAAROM_KOOPRAPPORT_BIJGEWERKT,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    // Biedadvies: interactieve marketingtool (net als de AddressSearchBar-
    // CTA's bedoeld om bezoekers naar het volledige rapport te leiden),
    // vergelijkbare prioriteit als Waarom Kooprapport.
    {
      url: `${APP_BASE_URL}/biedadvies`,
      lastModified: BIEDADVIES_BIJGEWERKT,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    // Koopgids: net als privacy/voorwaarden/contact statisch en voor
    // iedereen identiek, dus hoort hier wel in, in tegenstelling tot de
    // rapportpagina's hierboven. Hogere prioriteit dan de losse
    // voorwaardenpagina's: dit is bewust bedoeld om organisch verkeer aan te
    // trekken (zie het gesprek in Cowork over deze SEO-contentsectie).
    {
      url: `${APP_BASE_URL}/koopgids`,
      lastModified: KOOPGIDS_HUB_BIJGEWERKT,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...ARTIKELEN.map((artikel) => ({
      url: `${APP_BASE_URL}/koopgids/${artikel.slug}`,
      lastModified: new Date(artikel.bijgewerkt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    // Werkwijze: zelfde categorie als Koopgids (statisch, voor iedereen
    // identiek, gericht op vertrouwen/SEO), dus ook hier in de sitemap.
    {
      url: `${APP_BASE_URL}/werkwijze`,
      lastModified: WERKWIJZE_BIJGEWERKT,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Marktupdates: zelfde categorie qua SEO-behandeling, maar wel elk
    // kwartaal een nieuwe URL (zie ARTIKELEN.map hierboven voor het
    // vergelijkbare patroon bij de Koopgids). changeFrequency hoger dan de
    // vaste pagina's omdat er elk kwartaal daadwerkelijk iets verandert.
    {
      url: `${APP_BASE_URL}/marktupdates`,
      lastModified: MARKTUPDATES_HUB_BIJGEWERKT,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...MARKTUPDATES.map((update) => ({
      url: `${APP_BASE_URL}/marktupdates/${update.slug}`,
      lastModified: new Date(update.gepubliceerdISO),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    // Woningmarkt per stad: programmatic-SEO pagina's (zie de audit), leest
    // dezelfde MARKTUPDATES-array uit als hierboven -- verandert dus mee
    // zodra er een nieuw kwartaal bijkomt.
    {
      url: `${APP_BASE_URL}/woningmarkt`,
      lastModified: WONINGMARKT_HUB_BIJGEWERKT,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...STEDEN.map((stad) => ({
      url: `${APP_BASE_URL}/woningmarkt/${stad.slug}`,
      lastModified: MARKTUPDATES.length > 0 ? new Date(MARKTUPDATES[MARKTUPDATES.length - 1].gepubliceerdISO) : WONINGMARKT_HUB_BIJGEWERKT,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
