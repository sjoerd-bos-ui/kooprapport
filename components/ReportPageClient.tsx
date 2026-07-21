"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AddressMeta, MarketData, NearbySalesData, Report, ReportProgressStep } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import LoadingAnalysis from "@/components/report/LoadingAnalysis";
import ReportView from "@/components/report/ReportView";

// Volgorde waarin de stappen in LoadingAnalysis oplichten. Dit is bewust een
// getimede animatie (geen live per-bron voortgang meer): het echte werk
// gebeurt nu in één server-side aanroep (/api/rapport, zie hieronder) zodat
// API-sleutels nooit in de browserbundel belanden. Alle bronnen komen dus
// feitelijk gelijktijdig terug in één respons — deze animatie is puur
// cosmetisch, geen (onterechte) claim over welke bron als eerste klaar was.
const STEP_ORDER: ReportProgressStep[] = ["building", "energy", "market", "nearbySales"];

// Hoe vaak/lang we pollen op de betaalstatus nadat de klant terugkomt van
// Mollie's checkout-pagina (zie de useEffect hieronder). 10x om de 1,5s =
// max. 15s wachten — ruim genoeg voor de webhook of de fallback-verificatie
// in /api/betaling/status om aan te komen, zonder de klant bij een echt
// probleem eindeloos te laten hangen.
const MAX_STATUS_POGINGEN = 10;
const STATUS_POLL_INTERVAL_MS = 1500;

export default function ReportPageClient({
  address,
  initialReport = null,
}: {
  address: AddressMeta;
  // SEO-fix: de rapportpagina (app/rapport/[slug]/page.tsx) haalt het gratis
  // rapport nu al server-side op (getReport(), zelfde functie als hieronder
  // via /api/rapport werd aangeroepen) zodat de inhoud in de eerste HTML
  // staat voor crawlers. Die data komt hier binnen als initialReport, en de
  // useEffect hieronder slaat zijn eigen client-fetch dan gewoon over — geen
  // dubbele aanroep, geen ander gedrag voor de bezoeker (het rapport stond
  // toch al klaar). Optioneel/standaard null gehouden zodat dit component
  // ook zonder server-data blijft werken zoals voorheen (bv. als een
  // toekomstige aanroeper geen server-fetch doet).
  initialReport?: Report | null;
}) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready">(initialReport ? "ready" : "loading");
  const [completedSteps, setCompletedSteps] = useState<ReportProgressStep[]>(initialReport ? STEP_ORDER : []);
  const [report, setReport] = useState<Report | null>(initialReport);
  const [isUnlocked, setIsUnlocked] = useState(false);
  // Alleen relevant net na een terugkeer van Mollie (live-modus): laat zien
  // dat we de betaling nog aan het bevestigen zijn, i.p.v. stil niets te
  // doen totdat het rapport plotseling ontgrendelt (of, bij een probleem,
  // helemaal niets zichtbaar verandert).
  const [betalingTerugkeer, setBetalingTerugkeer] = useState<"controleren" | "mislukt" | null>(null);

  // Onthoudt voor WELK adres initialReport gold, puur om de fetch hieronder
  // precies één keer te mogen overslaan (bij mount, voor dit ene adres).
  // Navigeert de bezoeker client-side door naar een ANDER adres (zelfde
  // component-instance, address.slug wijzigt), dan is initialReport niet
  // meer geldig en moet er, exact als voorheen, gewoon opnieuw gefetcht
  // worden — vandaar de vergelijking met address.slug i.p.v. simpelweg "was
  // er ooit een initialReport".
  const initialReportAddressSlug = useRef(initialReport ? address.slug : null);

  useEffect(() => {
    if (initialReportAddressSlug.current === address.slug) {
      initialReportAddressSlug.current = null;
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setStatus("loading");
    setReport(null);
    setCompletedSteps([]);

    STEP_ORDER.forEach((step, i) => {
      timers.push(
        setTimeout(
          () => {
            if (!cancelled) setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
          },
          400 + i * 450
        )
      );
    });

    // Server-side route, zodat process.env-sleutels (EP-Online, straks BAG/
    // overheid.io) nooit in deze "use client"-component (en dus in de
    // browser-JavaScript) terechtkomen — zie app/api/rapport/route.ts.
    fetch("/api/rapport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(address),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Rapport-aanvraag gaf HTTP " + res.status);
        return res.json() as Promise<Report>;
      })
      .then((r) => {
        if (!cancelled) {
          setReport(r);
          setCompletedSteps(STEP_ORDER);
          setStatus("ready");
        }
      })
      .catch(() => {
        // Onverwachte netwerk-/serverfout: reportService zelf faalt al nooit
        // hard (zie buildFailedReport), dus dit pad is puur een defensieve
        // laatste vangnet. Geen rapport tonen i.p.v. vastlopen op "loading".
        if (!cancelled) setStatus("loading");
      });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [address.slug]);

  // BELANGRIJK (kostenbeheersing): dit is het ENIGE moment waarop de echte
  // Altum-API's (Woningwaarde/AVM én Woningreferentie/buurtverkopen) worden
  // aangeroepen (via /api/rapport/premium, die op zijn beurt
  // fetchPremiumOnUnlock() aanroept) — niet bij het gewoon bekijken van de
  // pagina. Dat gebeurt hier, bij het daadwerkelijk ontgrendelen/betalen
  // (zie PaywallModal -> ReportView.onUnlock, en de redirect-terugkeer
  // hieronder). Zolang dit nog niet is aangeroepen, blijven report.market
  // én report.nearbySales de placeholders uit
  // reportService.ts#deferredMarketResult / #deferredNearbySalesResult
  // (geen kosten gemaakt). building.oppervlakteM2 (al bekend, gratis BAG-
  // data) gaat mee zodat de server buurtverkopen t.o.v. de eigen woning kan
  // verrijken zonder een tweede rapport-opbouw nodig te hebben.
  //
  // bestellingId wordt hier meegestuurd en is niet optioneel: /api/rapport/
  // premium weigert zonder een geldige, betaalde bestelling voor dit adres
  // (zie de uitleg in die route) — dit is dus ook meteen de plek waar een
  // kapotte/vervalste bestellingId gewoon een 402 teruggeeft i.p.v. alsnog
  // te ontgrendelen.
  async function handleUnlock(bestellingId: string) {
    try {
      const res = await fetch("/api/rapport/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, oppervlakteM2: report?.building.data?.oppervlakteM2, bestellingId }),
      });
      if (res.ok) {
        const { market, nearbySales } = (await res.json()) as {
          market: SourceResult<MarketData>;
          nearbySales: SourceResult<NearbySalesData>;
        };
        setReport((prev) => (prev ? { ...prev, market, nearbySales } : prev));
        setIsUnlocked(true);
      }
      // Een falende aanvraag (bv. 402: geen geldige betaalde bestelling)
      // ontgrendelt bewust NIET — dat is precies het verschil met vroeger,
      // toen isUnlocked altijd in de finally-tak werd gezet ongeacht wat
      // deze aanroep teruggaf.
    } catch {
      // Netwerkfout — ook dan niet ontgrendelen; de klant kan het opnieuw
      // proberen (PaywallModal toont dan een foutmelding).
    }
  }

  // Terugkeer van Mollie's checkout-pagina (live-modus): de redirectUrl die
  // we bij het aanmaken van de betaling meegaven (zie mollie.ts) bevat
  // ?bestellingId=... Zodra het rapport geladen is en dat kenmerk in de URL
  // staat, pollen we hier de betaalstatus totdat 'ie bevestigd is — de klant
  // hoeft de PaywallModal niet opnieuw te zien of iets te klikken.
  useEffect(() => {
    const bestellingId = searchParams.get("bestellingId");
    if (!bestellingId || !report || isUnlocked) return;

    let cancelled = false;
    let pogingen = 0;
    setBetalingTerugkeer("controleren");

    async function poll() {
      pogingen++;
      try {
        const res = await fetch(`/api/betaling/status?bestellingId=${encodeURIComponent(bestellingId!)}`);
        if (res.ok) {
          const { status: betaalStatus } = (await res.json()) as { status: string };
          if (betaalStatus === "paid") {
            await handleUnlock(bestellingId!);
            if (!cancelled) setBetalingTerugkeer(null);
            return;
          }
          if (betaalStatus === "failed" || betaalStatus === "expired") {
            if (!cancelled) setBetalingTerugkeer("mislukt");
            return;
          }
        }
      } catch {
        // Netwerkfout — gewoon opnieuw proberen tot het maximum.
      }
      if (cancelled) return;
      if (pogingen >= MAX_STATUS_POGINGEN) {
        setBetalingTerugkeer("mislukt");
        return;
      }
      setTimeout(poll, STATUS_POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
    // report/isUnlocked bewust niet in de dependency-array om herhaald
    // pollen bij elke report-update te voorkomen — searchParams (de
    // bestellingId zelf) is de enige trigger die hier toe doet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (status === "loading" || !report) {
    return <LoadingAnalysis completedSteps={completedSteps} address={address} />;
  }

  return (
    <>
      {betalingTerugkeer === "controleren" && (
        <div className="fixed inset-x-0 top-0 z-40 bg-accent px-4 py-2 text-center text-xs font-semibold text-white">
          Betaling wordt bevestigd…
        </div>
      )}
      {betalingTerugkeer === "mislukt" && (
        <div className="fixed inset-x-0 top-0 z-40 bg-rust px-4 py-2 text-center text-xs font-semibold text-white">
          We konden de betaling nog niet bevestigen. Vernieuw de pagina, of neem contact op als dit blijft gebeuren.
        </div>
      )}
      <ReportView
        report={report}
        isUnlocked={isUnlocked}
        isConfirmingPayment={betalingTerugkeer === "controleren"}
        onUnlock={handleUnlock}
        kortingToken={searchParams.get("korting") ?? undefined}
      />
    </>
  );
}
