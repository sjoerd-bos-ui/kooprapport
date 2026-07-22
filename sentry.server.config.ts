import * as Sentry from "@sentry/nextjs";

// Server-side Sentry-initialisatie — zie instrumentation-client.ts voor de
// volledige toelichting (minimale opzet, geen Replay/Feedback). Vangt fouten
// uit API-routes, route handlers en server components op.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
