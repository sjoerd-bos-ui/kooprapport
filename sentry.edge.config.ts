import * as Sentry from "@sentry/nextjs";

// Edge-runtime Sentry-initialisatie — alleen relevant als een route/middleware
// op de Edge runtime draait. Kooprapport heeft momenteel geen middleware.ts en
// geen routes die expliciet runtime = "edge" zetten, maar dit bestand hoort
// er per Sentry's eigen Next.js-instrumentatiepatroon toch bij (zie
// instrumentation.ts) zodat een toekomstige Edge-route automatisch meegenomen
// wordt zonder dat er dan nog aan Sentry gedacht hoeft te worden.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
