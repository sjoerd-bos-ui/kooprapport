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

// Geëxporteerd (i.p.v. lokaal gehouden) zodat WhatsAppFloatingButton.tsx
// dezelfde sleutel kan uitlezen -- die knop moet omhoog schuiven zolang deze
// banner nog in beeld is, zie de toelichting daar.
export const CONSENT_KEY = "kooprapport-cookie-consent";
type Consent = "onbekend" | "granted" | "denied";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
// Optioneel: pas ingevuld zodra er een Google Ads-account is (zie
// .env.example) -- zonder deze var wordt er hier verder niets aan
// toegevoegd, gtag blijft dan puur GA4. Zelfde gtag.js-lading wordt hergebruikt
// (Google's eigen aanbevolen patroon: één script, meerdere gtag('config', ...)
// aanroepen), dus geen los, tweede script-tag nodig.
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

// Meta Pixel — BEWUST hier ingebouwd i.p.v. de kant-en-klare "plak dit in
// <head>"-code van Facebook zelf letterlijk te volgen: die generieke
// instructie gaat ervan uit dat een site nog geen consent-beheer heeft. Deze
// site laadt GA4 hierboven al uitsluitend na actieve toestemming (AVG) — de
// Pixel is qua privacy-impact hetzelfde soort trackingcookie voor
// advertentiedoeleinden, dus verdient exact dezelfde behandeling: pas laden
// ná "Accepteren", nooit stilzwijgend voor elke bezoeker. De <noscript>-
// fallback die Facebook's documentatie ook aanbeveelt is bewust weggelaten:
// zonder JavaScript kan een bezoeker toch nooit op "Accepteren" klikken, dus
// die fallback zou de trackingpixel juist ONVOORWAARDELIJK laten vuren voor
// precies de bezoekers die geen toestemming hebben kunnen geven.
const META_PIXEL_ID = "1368098021943107";

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
    // Los custom event i.p.v. het standaard "storage"-event -- dat vuurt
    // alleen in ANDERE tabbladen, niet in hetzelfde tabblad waarin
    // localStorage.setItem() net is aangeroepen. WhatsAppFloatingButton.tsx
    // luistert hierop om meteen (zonder paginaherlaad) terug te zakken zodra
    // de bezoeker hier een keuze maakt.
    window.dispatchEvent(new Event("kooprapport-cookie-consent-gewijzigd"));
  }

  // BUGFIX: deze guard stond eerst op "!GA_ID" — zonder een gekoppelde GA4-
  // measurement-id werd toen het HELE component (dus ook de Meta Pixel en de
  // toestemmingsbanner zelf) niet gerenderd. META_PIXEL_ID is nu een vaste
  // waarde (niet van een env var afhankelijk), dus de banner moet sowieso
  // tonen; de aparte GA_ID-checks verderop bepalen nog steeds of GA4 zelf
  // wel/niet meegeladen wordt.
  if (!geladen) return null;

  return (
    <>
      {consent === "granted" && (
        <>
          {GA_ID && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
              <Script id="ga4-init" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', { anonymize_ip: true });
                  ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
                `}
              </Script>
            </>
          )}
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        </>
      )}

      {consent === "onbekend" && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink/10 bg-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-relaxed text-ink/70">
              We gebruiken Google Analytics en de Meta-pixel om te begrijpen hoe bezoekers Kooprapport gebruiken en om
              de effectiviteit van onze advertenties te meten. Dit gebeurt alleen met uw toestemming.{" "}
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
