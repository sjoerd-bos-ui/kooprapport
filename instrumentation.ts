import * as Sentry from "@sentry/nextjs";

// Next.js' eigen instrumentatie-hook (https://nextjs.org/docs/app/guides/instrumentation)
// -- register() laadt de juiste Sentry-config afhankelijk van de runtime, en
// onRequestError vangt fouten uit server components, route handlers en
// middleware/proxies op die anders nergens zichtbaar zouden worden.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
