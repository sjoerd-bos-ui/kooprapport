"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TrendingUpIcon, BoltIcon, HistoryIcon, AlertTriangleIcon, BuildingIcon, ShieldCheckIcon, FileCheckIcon, FlagIcon } from "./icons";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";
import type { AddressMeta } from "@/types/report";

// Alle acht onderdelen van het ontgrendelde rapport (zelfde namen en
// volgorde als de tabbladen in ReportView.tsx/PreviewSummary.tsx — niet
// alleen een selectie), plus de downloadbare PDF als losse extra erna.
// "Met isolatiedetails" staat hier bewust niet bij: die gegevens zijn per
// pand vaak niet apart geregistreerd (zie Energieprestatie-tab), dus dat als
// vaste belofte noemen zou niet feitelijk zijn.
const ONDERDELEN = [
  { icon: TrendingUpIcon, titel: "Waarde-indicatie", tekst: "Met bandbreedte" },
  { icon: HistoryIcon, titel: "Verkopen in de buurt", tekst: "Laatste 12 maanden" },
  { icon: BuildingIcon, titel: "Objectgegevens", tekst: "Volledig" },
  { icon: BoltIcon, titel: "Energieprestatie en label", tekst: "Met duiding voor dit pand" },
  { icon: AlertTriangleIcon, titel: "Funderingsrisico", tekst: "Met lokale context" },
  { icon: ShieldCheckIcon, titel: "Buurtprofiel", tekst: "Volledig" },
  { icon: FlagIcon, titel: "Samenvatting", tekst: "Pluspunten, aandachtspunten en eindconclusie" },
];

// Wit modaalpaneel met indigo accenten — vervangt het eerdere zwarte paneel
// met mosterd prijscijfer, consistent met het nieuwe indigo/wit-systeem.
//
// BETAALFLOW (echte bestelling, geen nepvertraging meer):
// 1) POST /api/betaling/aanmaken maakt een bestelling aan (server-side, zie
//    lib/payments/bestellingen.ts) en — afhankelijk van PAYMENT_MODE —
//    ofwel meteen een "paid"-status (mock) ofwel een echte Mollie-betaling
//    met een checkout-URL (live).
// 2) Mock-modus: de bestelling is al betaald, dus we gaan direct door naar
//    onConfirm(bestellingId) — dat roept ReportPageClient.handleUnlock aan,
//    die op zijn beurt /api/rapport/premium aanroept MET die bestellingId
//    (die route controleert zelf, server-side, of er écht betaald is —
//    zie de uitleg daar).
// 3) Live-modus: we navigeren de hele pagina weg naar Mollie's
//    checkout-URL (de klant kiest daar zijn eigen bank). Na betalen stuurt
//    Mollie de klant terug naar deze rapportpagina — ReportPageClient pikt
//    dat zelf op (zie useEffect daar) en rondt het ontgrendelen af, zonder
//    dat deze modal daar nog iets voor hoeft te doen.
export default function PaywallModal({
  open,
  onClose,
  onConfirm,
  address,
  price = RAPPORT_PRIJS,
}: {
  open: boolean;
  onClose: () => void;
  // Async: onConfirm ontgrendelt niet alleen, maar doet nu ook de échte
  // (kostenveroorzakende) Altum-aanroep — zie ReportPageClient.handleUnlock.
  // Krijgt de bestellingId mee zodat die aanroep server-side geverifieerd
  // kan worden als "echt betaald".
  onConfirm: (bestellingId: string) => void | Promise<void>;
  address: AddressMeta;
  price?: string;
}) {
  const [paying, setPaying] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  // Verplichte bevestiging vóór betalen — algemene "akkoord met de
  // voorwaarden"-checkbox, met de herroepingsrecht-melding er expliciet in
  // verwerkt (niet alleen een link): dat laatste operationaliseert artikel 7
  // van de voorwaarden — de wettelijke uitzondering voor direct geleverde
  // digitale inhoud (art. 6:230p BW) geldt alleen als de klant hier vooraf
  // expliciet mee instemt, niet als dat alleen ergens in de voorwaarden
  // staat. Zie app/voorwaarden/page.tsx, artikel 7.
  const [akkoord, setAkkoord] = useState(false);
  if (!open) return null;

  async function handlePay() {
    if (!akkoord) return; // defensief: de knop hieronder is al disabled zonder akkoord
    setPaying(true);
    setFout(null);
    try {
      const res = await fetch("/api/betaling/aanmaken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Betaling kon niet worden gestart.");
      }
      const { bestellingId, status, checkoutUrl } = (await res.json()) as {
        bestellingId: string;
        status: "open" | "paid" | "failed" | "expired";
        checkoutUrl: string | null;
      };

      if (checkoutUrl) {
        // Live-modus: de klant verlaat deze pagina om bij Mollie/zijn eigen
        // bank in te loggen. Er is hier verder niets meer te doen — geen
        // setPaying(false), de pagina navigeert toch weg.
        window.location.href = checkoutUrl;
        return;
      }

      if (status !== "paid") {
        // Zou in mock-modus niet moeten gebeuren (die zet altijd meteen op
        // "paid"), maar defensief: geen checkout-URL én niet betaald is een
        // onverwachte toestand, geen stille doorgang.
        throw new Error("Betaling kon niet worden bevestigd.");
      }

      await onConfirm(bestellingId);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis bij het betalen. Probeer het opnieuw.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div
        // max-h + overflow-y-auto toegevoegd: de inhoud (prijs, alle 7
        // onderdelen, betaalknop, foutmelding, footer-tekst) is samen hoger
        // dan het zichtbare scherm op een kort mobiel scherm (bv. liggend, of
        // een klein toestel) — zonder dit kon de "Betaal met iDEAL"-knop
        // buiten beeld vallen zonder scrolmogelijkheid. rounded-2xl blijft
        // de achtergrond gewoon afronden, ook zonder overflow-hidden.
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-overlay"
        style={{ backgroundImage: "radial-gradient(#4F46E51A 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      >
        <div className="relative flex items-start justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider3 text-accent">Volledig woningrapport</p>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/30 transition-colors hover:text-ink"
            aria-label="Sluiten"
          >
            ✕
          </button>
        </div>
        <p className="relative mt-3 font-display text-5xl font-extrabold text-ink">{price}</p>
        <p className="relative mt-1 text-sm text-ink/45">Eenmalig, geen abonnement · direct toegang</p>

        <div className="relative mt-6 border-t border-ink/10 pt-6">
          <p className="mb-2.5 text-[11px] font-semibold text-ink/45">Alle 7 onderdelen, volledig</p>
          <div className="grid grid-cols-2 gap-2">
            {ONDERDELEN.map(({ icon: Icon, titel, tekst }) => (
              <div key={titel} className="flex items-start gap-2 rounded-xl bg-parchment p-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-accent">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">{titel}</p>
                  <p className="text-[10.5px] text-ink/50">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-parchment p-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-accent">
              <FileCheckIcon className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">Downloadbare PDF</p>
              <p className="text-[10.5px] text-ink/50">Voor eigen gebruik</p>
            </div>
          </div>
        </div>

        <label className="relative mt-6 flex cursor-pointer items-start gap-2.5 text-xs text-ink/60">
          <input
            type="checkbox"
            checked={akkoord}
            onChange={(e) => setAkkoord(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
          />
          <span>
            Ik ga akkoord met de{" "}
            <a href="/voorwaarden" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
              voorwaarden
            </a>
            . Het rapport wordt direct na betalen geleverd, waardoor ik mijn herroepingsrecht verlies.
          </span>
        </label>

        <Button variant="primary" className="relative mt-3 w-full" onClick={handlePay} disabled={paying || !akkoord}>
          {paying ? "Bezig met betalen…" : "Betaal met iDEAL"}
        </Button>
        {fout && <p className="relative mt-3 text-center text-xs text-rust">{fout}</p>}
        <p className="relative mt-3 text-center text-xs text-ink/35">
          {/* NEXT_PUBLIC_PAYMENT_MODE is puur voor deze tekst — de échte,
              beveiligingsrelevante controle staat server-side in
              PAYMENT_MODE (lib/config/payment.ts) en /api/rapport/premium;
              deze losse client-zichtbare variabele bepaalt nooit zelf iets. */}
          {process.env.NEXT_PUBLIC_PAYMENT_MODE === "live"
            ? "Veilig betalen via Mollie (iDEAL)."
            : "Mockbetaling. Er wordt geen echte transactie uitgevoerd."}
        </p>
      </div>
    </div>
  );
}
