"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/Button";

// -----------------------------------------------------------------------------
// Google Analytics (GA4) — in tegenstelling tot Vercel Analytics (zie
// app/layout.tsx) gebruikt GA4 wél cookies om bezoekers/sessies te
// onderscheiden. Onder de Nederlandse Telecommunicatiewet/AVG mag dat niet
// zonder voorafgaande, actieve toestemming ("opt-in") — dus GEEN GA-script
// laden voordat de bezoeker zelf op "Accepteren" heeft geklikt. Bij
// "Weigeren" (of nog geen keuze) wordt er niets van Google geladen: geen
// script, geen cookie, geen enkel netwerkverzoek naar Google.
//
// De keuze zelf (geaccepteerd/geweigerd) wordt in localStorage bewaard, NIET
// in een cookie — dat is bewust: localStorage is hier pure functionele opslag
// (onthouden wat de bezoeker zelf koos) en valt niet onder de
// toestemmingsplicht, in tegenstelling tot een trackingcookie.
//
// NEXT_PUBLIC_GA_MEASUREMENT_ID ontbreekt? Dan wordt er nergens een banner of
// script getoond — precies zoals de overige MODE-vars in dit project altijd
// stil terugvallen op "nog niet gekoppeld" i.p.v. kapot te gaan.
// -----------------------------------------------------------------------------

const CONSENT_KEY = "kooprapport-cookie-consent";
type Consent = "onbekend" | "granted" | "denied";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent>("onbekend");
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    const opgeslagen = window.localStorage.getItem(CONSENT_KEY);
    setConsent(opgeslagen === "granted" || opgeslagen === "denied" ? opgeslagen : "onbekend");
    setGeladen(true);
  }, []);

  function kies(waarde: Exclude<Consent, "onbekend">) {
    window.localStorage.setItem(CONSENT_KEY, waarde);
    setConsent(waarde);
  }

  if (!GA_ID || !geladen) return null;

  return (
    <>
      {consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {consent === "onbekend" && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-ink/70">
              We gebruiken Google Analytics om te begrijpen hoe bezoekers Kooprapport gebruiken, zodat we de site
              kunnen verbeteren. Dit gebeurt alleen met uw toestemming.{" "}
              <a href="/privacy#cookies" className="underline underline-offset-2 hover:text-ink">
                Meer info
              </a>
              .
            </p>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" className="px-4 py-2 text-[13px]" onClick={() => kies("denied")}>
                Weigeren
              </Button>
              <Button variant="primary" className="px-4 py-2 text-[13px]" onClick={() => kies("granted")}>
                Accepteren
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
