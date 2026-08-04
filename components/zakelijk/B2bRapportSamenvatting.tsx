import type { Report } from "@/types/report";
import { berekenBiedadvies, checkNhg } from "@/lib/services/biedadvies";

// -----------------------------------------------------------------------------
// Eigen, compacte weergave van een Report voor het B2B-dashboard -- bewust
// GEEN hergebruik van components/report/ReportView.tsx: die is gebouwd rond
// de consumenten-paywallflow (verplichte onUnlock/isConfirmingPayment/
// kortingToken-props, Mollie-specifieke tekst) die hier niet van toepassing
// is. B2B-rapporten zijn per definitie al volledig ontgrendeld (het
// abonnement dekt de kosten, zie app/api/zakelijk/rapporten/route.ts) --
// deze component toont dus gewoon alles, in dashboard-stijl.
// -----------------------------------------------------------------------------

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

const FUNDERING_KLEUR: Record<string, string> = {
  laag: "text-[#3B6D11] bg-[#EAF3DE]",
  midden: "text-[#B4562E] bg-[#FBEAEA]",
  hoog: "text-rust bg-[#FBEAEA]",
};

export default function B2bRapportSamenvatting({ report }: { report: Report }) {
  const { building, energy, market, nearbySales, fundering, buurtprofiel, verduurzaming } = report;
  const biedadvies = berekenBiedadvies(market.data?.geschatteWaarde);
  const nhg = checkNhg(market.data?.geschatteWaarde);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold text-ink/45">Waarde-indicatie</p>
          <p className="mt-1 font-display text-base font-extrabold text-ink">
            {market.data ? (
              <>
                {euro(market.data.bandbreedteMin ?? market.data.geschatteWaarde)}
                {market.data.bandbreedteMax ? ` – ${euro(market.data.bandbreedteMax)}` : ""}
              </>
            ) : (
              "niet beschikbaar"
            )}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold text-ink/45">Energielabel</p>
          <p className="mt-1 font-display text-base font-extrabold text-ink">{energy.data?.klasse ?? "onbekend"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold text-ink/45">Funderingsrisico</p>
          <p className={`mt-1 inline-flex rounded-md px-2 py-0.5 font-display text-[13px] font-extrabold capitalize ${fundering.data?.niveau ? FUNDERING_KLEUR[fundering.data.niveau] : "text-ink/40 bg-ink/5"}`}>
            {fundering.data?.niveau ?? "onbekend"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold text-ink/45">Bouwjaar / m²</p>
          <p className="mt-1 font-display text-base font-extrabold text-ink">
            {building.data?.bouwjaar ?? "?"} · {building.data?.oppervlakteM2 ?? "?"} m²
          </p>
        </div>
      </div>

      {(biedadvies || nhg) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {biedadvies && (
            <div className="rounded-2xl border border-accent/30 bg-[#F8F8FF] p-4">
              <p className="text-[11px] font-bold text-accent">Indicatief biedadvies</p>
              <p className="mt-1 text-[13px] font-extrabold text-ink">
                {euro(biedadvies.ondergrens)} – {euro(biedadvies.bovengrens)}
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink/55">
                Gebaseerd op de waarde-indicatie plus het landelijk gemiddelde overbiedpercentage van{" "}
                {biedadvies.overbiedPercentage.toString().replace(".", ",")}% uit {biedadvies.periodeLabel}. Een landelijk
                gemiddelde, geen garantie voor deze specifieke woning of regio.
              </p>
            </div>
          )}
          {nhg && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-[11px] font-bold text-ink/60">NHG-check</p>
              <p className={`mt-1 text-[13px] font-extrabold ${nhg.onderGrens ? "text-[#3B6D11]" : "text-rust"}`}>
                {nhg.onderGrens ? "Onder de NHG-grens" : "Boven de NHG-grens"}
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink/55">
                {nhg.grensLabel}: {euro(nhg.grens)} ({nhg.periodeLabel}), op basis van de geschatte waarde.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold text-ink/60">Buurtprofiel</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink/70">
          {buurtprofiel.data?.samenvatting ?? "Geen buurtsamenvatting beschikbaar voor dit adres."}
        </p>
      </div>

      {verduurzaming.data && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-ink/60">Verduurzamingsadvies</p>
          <p className="mt-1.5 text-[12px] text-ink/70">
            Huidig label {verduurzaming.data.huidigLabel ?? "onbekend"} → haalbaar label{" "}
            {verduurzaming.data.haalbaarLabel ?? "onbekend"}
            {verduurzaming.data.investering != null && <> · investering {euro(verduurzaming.data.investering)}</>}
            {verduurzaming.data.terugverdientijdMaanden != null && (
              <> · terugverdientijd {Math.round(verduurzaming.data.terugverdientijdMaanden / 12)} jaar</>
            )}
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold text-ink/60">Vergelijkbare verkopen in de buurt</p>
        {nearbySales.data && nearbySales.data.verkopen.length > 0 ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {nearbySales.data.verkopen.slice(0, 5).map((v) => (
              <div key={`${v.adres}-${v.verkoopdatum}`} className="flex items-center justify-between text-[11.5px]">
                <span className="text-ink/70">{v.adres}</span>
                <span className="font-semibold text-ink">{euro(v.verkoopprijs)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[12px] text-ink/50">Geen vergelijkbare verkopen gevonden.</p>
        )}
      </div>
    </div>
  );
}
