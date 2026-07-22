"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// -----------------------------------------------------------------------------
// Laatste redmiddel: vangt een crash in de ROOT layout zelf op (dus zelfs als
// app/layout.tsx faalt) — Next.js vereist daarom een eigen, volledig
// zelfstandige <html>/<body>, kan niet leunen op de normale SiteHeader/
// SiteFooter/Container-opmaak (die verondersstelt dat de root layout zelf wél
// werkt). Bewust kaal gehouden, exact zoals Sentry's eigen aanbevolen patroon
// voorschrijft — dit scherm hoort men vrijwel nooit te zien. Voor gewone
// pagina-fouten (de veelvoorkomende situatie) vangt app/error.tsx op, dat wél
// de normale huisstijl gebruikt.
// -----------------------------------------------------------------------------
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="nl">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4F46E5" }}>
          Kooprapport
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginTop: "8px" }}>Er ging iets mis</h1>
        <p style={{ marginTop: "12px", color: "#6B6B7A", fontSize: "14px" }}>
          Deze pagina kon niet worden geladen. Probeer het opnieuw, of ga terug naar de homepage.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: "24px",
            padding: "12px 24px",
            borderRadius: "9999px",
            backgroundColor: "#4F46E5",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Naar de homepage
        </a>
      </body>
    </html>
  );
}
