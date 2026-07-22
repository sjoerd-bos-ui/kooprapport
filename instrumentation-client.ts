import * as Sentry from "@sentry/nextjs";

// -----------------------------------------------------------------------------
// Sentry — error-monitoring (audit-punt: tot nu toe zag je een productiefout
// alleen als je zelf toevallig de Vercel-logs opende). Bewust MINIMAAL
// gehouden, zelfde terughoudendheidsprincipe als de rest van dit project:
// alleen foutmeldingen + een lage steekproef performance-tracing, GEEN
// Session Replay en GEEN User Feedback-widget (dat zijn losse features die
// hier niet gevraagd zijn en een aparte privacy-afweging verdienen — Session
// Replay neemt schermopnames op, dat past niet zomaar bij de bestaande
// "we bewaren zo min mogelijk"-houding zonder daar expliciet over na te
// denken).
//
// Zonder NEXT_PUBLIC_SENTRY_DSN (bv. lokaal, of vóórdat je een Sentry-project
// hebt aangemaakt) initialiseert Sentry.init() zichzelf gewoon niet er
// gebeurt dan niets — geen crash, geen foutmelding, zelfde "stil wegvallen
// zonder sleutel"-patroon als de andere MODE-vars in dit project.
// -----------------------------------------------------------------------------

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
