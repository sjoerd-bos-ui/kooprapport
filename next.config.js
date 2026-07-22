const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
// -----------------------------------------------------------------------------
// Security headers — er was voorheen helemaal geen next.config.js, dus draaide
// alles op Next.js-kale-defaults (geen extra headers). Dit voegt een
// praktische basis toe voor een site die een betaalflow heeft (Mollie-
// redirect) en gevoelige rapportdata toont.
//
// CSP-kanttekening, eerlijk: dit is een praktische basis-CSP, geen strikte
// nonce-CSP. 'unsafe-inline' staat aan voor script-src/style-src omdat (a)
// Next.js' eigen hydratie-/RSC-bootstrap-scripts en (b) de vele inline
// style={{ backgroundImage: ... }}-toepassingen door dit hele project heen
// dat vereisen. Een volledig nonce-gebaseerde CSP (geen 'unsafe-inline' meer)
// kan wel, maar vraagt een aparte middleware.ts die een nonce genereert en
// door elke pagina/inline-script heen doorgeeft (ook de JSON-LD
// dangerouslySetInnerHTML-blokken in app/page.tsx) — een grotere, apart te
// plannen refactor, hier bewust niet stilzwijgend "opgelost".
//
// connect-src bevat api.pdok.nl omdat AddressSearchBar.tsx (via
// lib/services/addressLookup.ts#fetchLiveAddressSuggestions) rechtstreeks
// vanuit de browser naar de PDOK Locatieserver fetcht, geen server-proxy.
// form-action bevat api.mollie.com voor de betaalredirect.
// frame-src staat op 'none': de locatiekaart is een uitgaande link
// (ReportHero.tsx, target="_blank"), geen ingesloten iframe in het huidige
// live pad — zie ook de toelichting in app/privacy/page.tsx, sectie 3.
//
// BUGFIX: deze CSP brak lokaal `npm run dev` volledig — Next.js' eigen
// dev-mode/HMR-runtime (Fast Refresh, webpack) gebruikt `eval()` om
// gebundelde modules te draaien, en verbindt via een WebSocket
// (`ws://localhost:PORT`) voor live-reload. Zonder 'unsafe-eval' in
// script-src en zonder de ws(s)-origins in connect-src weigert de browser
// dat allemaal stil (CSP-meldingen in de devtools-console) — met als
// zichtbaar gevolg dat de hele pagina niet meer hydrateert/interactief
// wordt, dus ook de adressuggesties (die client-side fetch-JS nodig hebben)
// leken "kapot", terwijl het adres-lookup-endpoint zelf niets mankeerde.
// Fix: alleen in productie (next build/start) de strikte CSP toepassen; in
// development draait de dev-server zonder CSP-header, precies zoals vóór
// deze security-headers-toevoeging.
// -----------------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== "production";

// Google Analytics (GA4, zie components/analytics/CookieConsent.tsx) laadt
// pas na actieve toestemming, maar de CSP zelf is statisch per response —
// die kan niet pas ná een klik van de bezoeker aangepast worden. Google's
// domeinen staan hier daarom altijd toegestaan; of het script daadwerkelijk
// laadt/verzendt hangt uitsluitend af van de toestemmingskeuze in
// CookieConsent.tsx, niet van deze CSP.
//
// BUGFIX: gtag.js stuurt de daadwerkelijke meting NIET naar het kale
// www.google-analytics.com, maar (afhankelijk van de regio van de bezoeker)
// naar een specifiek subdomein zoals region1/region2/region3.google-
// analytics.com, of naar analytics.google.com/g/collect. Met alleen
// www.google-analytics.com in connect-src werd dat regionale verzoek door de
// browser zelf geblokkeerd — GA4 liet daardoor "nog geen gegevens ontvangen"
// zien, op elk apparaat/netwerk, want de blokkade zat in onze eigen CSP, niet
// bij de bezoeker. Zie https://developers.google.com/tag-platform/security/guides/csp.
const GOOGLE_ANALYTICS_SCRIPT_SRC = "https://www.googletagmanager.com";
const GOOGLE_ANALYTICS_CONNECT_SRC =
  "https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com";
const GOOGLE_ANALYTICS_IMG_SRC =
  "https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com";

// Sentry (zie instrumentation-client.ts) stuurt fouten/traces naar een
// org-specifiek ingest-subdomein (bv. o123456.ingest.us.sentry.io) — een
// wildcard-hostbron (*.sentry.io) in CSP matcht in browsers ELK subdomeinniveau
// hieronder, dus dekt dat automatisch, ongeacht regio/org-id. Geleerde les van
// de GA4-CSP-bug hierboven: dit nu meteen goed zetten i.p.v. achteraf
// ontdekken dat de eigen CSP ook Sentry's eigen meldingen blokkeert.
const SENTRY_CONNECT_SRC = "https://*.sentry.io";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GOOGLE_ANALYTICS_SCRIPT_SRC}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${GOOGLE_ANALYTICS_IMG_SRC}`,
  "font-src 'self' data:",
  `connect-src 'self' https://api.pdok.nl ${GOOGLE_ANALYTICS_CONNECT_SRC} ${SENTRY_CONNECT_SRC}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.mollie.com",
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // alleen relevant over HTTPS (productie) — onschadelijk in lokale http-ontwikkeling.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // SEO-fix: een SEO-check signaleerde dat kooprapport.nl zowel via www als
  // non-www bereikbaar was zonder redirect -- twee volledig werkende URLs
  // voor dezelfde inhoud, wat crawlers als duplicate content kunnen zien en
  // de ranking-waarde over twee varianten versnippert i.p.v. op één canonieke
  // URL te bundelen. Canoniek is non-www (zie APP_BASE_URL in
  // lib/config/payment.ts en alle metadata/sitemap-code), dus www wordt hier
  // permanent (308) doorgestuurd naar non-www, met behoud van het pad.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.kooprapport.nl" }],
        destination: "https://kooprapport.nl/:path*",
        permanent: true,
      },
    ];
  },
};

// withSentryConfig voegt build-time source-map-upload en request-tracing toe.
// org/project zijn de slugs uit je Sentry.io-project-URL
// (sentry.io/organizations/<org>/projects/<project>/) — vul die na het
// aanmaken van je Sentry-account/project hieronder in. Zonder een geldig
// SENTRY_AUTH_TOKEN (env var, alleen nodig in Vercel voor source maps) slaat
// de build de upload-stap gewoon over — de app blijft dan gewoon werken,
// alleen zie je in Sentry geen leesbare stack traces (wel gewoon de fouten).
module.exports = withSentryConfig(nextConfig, {
  org: "<jouw-sentry-org-slug>",
  project: "<jouw-sentry-project-slug>",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
