import type { Report } from "@/types/report";
import { berekenBiedadvies, checkNhg } from "@/lib/services/biedadvies";
import {
  TrendingUpIcon,
  BoltIcon,
  AlertTriangleIcon,
  BuildingIcon,
  MapPinIcon,
  LeafIcon,
  KavelIcon,
  BestemmingIcon,
  CheckIcon,
  InfoIcon,
} from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Volledige, merkeigen weergave van een Report binnen "Kooprapport Zakelijk".
// Eerdere versie liet insights/dataQuality/kavel/bestemming volledig weg —
// precies de onderdelen die het rapport voor een vakprofessional inhoudelijk
// waardevol maken (waarom is dit een goede/slechte situatie, hoe compleet is
// deze data). Deze versie toont alles wat het Report-model te bieden heeft,
// in dezelfde visuele taal (gradients, icoon-badges, mist/parchment-tinten)
// als de rest van kooprapport.nl, i.p.v. een generieke grijze SaaS-tabel.
// -----------------------------------------------------------------------------

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

const FUNDERING_STIJL: Record<string, { tekst: string; bg: string }> = {
  laag: { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]" },
  midden: { tekst: "text-[#B4562E]", bg: "bg-[#FDEFE3]" },
  hoog: { tekst: "text-rust", bg: "bg-[#FBEAEA]" },
};

const INSIGHT_STIJL: Record<string, { icoon: typeof CheckIcon; tekst: string; bg: string }> = {
  positief: { icoon: CheckIcon, tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]" },
  negatief: { icoon: AlertTriangleIcon, tekst: "text-rust", bg: "bg-[#FBEAEA]" },
  neutraal: { icoon: InfoIcon, tekst: "text-ink/60", bg: "bg-ink/5" },
};

function StatKaart({
  icoon: Icon,
  label,
  waarde,
  waardeKleur,
}: {
  icoon: typeof TrendingUpIcon;
  label: string;
  waarde: string;
  waardeKleur?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EEF0FF] text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2.5 text-[10px] font-bold text-ink/45">{label}</p>
      <p className={`mt-0.5 font-display text-[15px] font-extrabold ${waardeKleur ?? "text-ink"}`}>{waarde}</p>
    </div>
  );
}

export default function B2bRapportSamenvatting({ report }: { report: Report }) {
  const { core, building, energy, market, nearbySales, fundering, buurtprofiel, verduurzaming, kavel, bestemming, insights, dataQuality } = report;
  const biedadvies = berekenBiedadvies(market.data?.geschatteWaarde, core?.address?.plaats);
  const nhg = checkNhg(market.data?.geschatteWaarde);
  const funderingStijl = fundering.data?.niveau ? FUNDERING_STIJL[fundering.data.niveau] : { tekst: "text-ink/40", bg: "bg-ink/5" };

  return (
    <div className="flex flex-col gap-4">
      {/* Kernwaarden -- meteen zichtbaar, met echte iconen i.p.v. losse cijfers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatKaart
          icoon={TrendingUpIcon}
          label="Waarde-indicatie"
          waarde={
            market.data
              ? `${euro(market.data.bandbreedteMin ?? market.data.geschatteWaarde)}${market.data.bandbreedteMax ? ` – ${euro(market.data.bandbreedteMax)}` : ""}`
              : "niet beschikbaar"
          }
        />
        <StatKaart icoon={BoltIcon} label="Energielabel" waarde={energy.data?.klasse ?? "onbekend"} />
        <StatKaart
          icoon={AlertTriangleIcon}
          label="Funderingsrisico"
          waarde={fundering.data?.niveau ? fundering.data.niveau[0].toUpperCase() + fundering.data.niveau.slice(1) : "onbekend"}
          waardeKleur={funderingStijl.tekst}
        />
        <StatKaart icoon={BuildingIcon} label="Bouwjaar / m²" waarde={`${building.data?.bouwjaar ?? "?"} · ${building.data?.oppervlakteM2 ?? "?"} m²`} />
      </div>

      {/* Datakwaliteit -- eerlijke transparantie i.p.v. te doen alsof alles altijd compleet is */}
      {dataQuality && (
        <div className="flex items-center gap-3 rounded-2xl border border-ink/[0.06] bg-white px-4 py-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              dataQuality.compleetheid === "volledig"
                ? "bg-[#EAF3DE] text-[#3B6D11]"
                : dataQuality.compleetheid === "grotendeels-compleet"
                  ? "bg-[#FDEFE3] text-[#B4562E]"
                  : "bg-[#FBEAEA] text-rust"
            }`}
          >
            {dataQuality.compleetheid === "volledig"
              ? "Volledige data"
              : dataQuality.compleetheid === "grotendeels-compleet"
                ? "Grotendeels compleet"
                : "Beperkte data"}
          </span>
          <p className="text-[11px] text-ink/55">{dataQuality.toelichting}</p>
        </div>
      )}

      {/* Inzichten -- de eigenlijke duiding, niet alleen losse cijfers */}
      {insights.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[11px] font-bold text-ink/60">Inzichten</p>
          <div className="mt-2.5 flex flex-col gap-2">
            {insights.map((insight) => {
              const stijl = INSIGHT_STIJL[insight.toon] ?? INSIGHT_STIJL.neutraal;
              const Icon = stijl.icoon;
              return (
                <div key={insight.key} className={`flex items-start gap-2.5 rounded-xl ${stijl.bg} px-3.5 py-2.5`}>
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${stijl.tekst}`} />
                  <div>
                    <p className={`text-[11.5px] font-bold ${stijl.tekst}`}>{insight.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-ink/60">{insight.tekst}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Biedadvies + NHG -- indigo gradient, zelfde stijl als de CTA-balken elders op de site */}
      {(biedadvies || nhg) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {biedadvies && (
            <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-white/60">Indicatief biedadvies</p>
              <p className="mt-1.5 font-display text-lg font-extrabold text-white">
                {euro(biedadvies.ondergrens)} – {euro(biedadvies.bovengrens)}
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/70">
                Gebaseerd op de waarde-indicatie plus{" "}
                {biedadvies.niveau === "regio"
                  ? `het gemiddelde overbiedpercentage in regio ${biedadvies.regioNaam} van`
                  : "het landelijk gemiddelde overbiedpercentage van"}{" "}
                {biedadvies.overbiedPercentage.toString().replace(".", ",")}% uit {biedadvies.periodeLabel} ({biedadvies.bron}).{" "}
                {biedadvies.niveau === "regio" ? "Een regionaal" : "Een landelijk"} gemiddelde, geen garantie voor deze
                specifieke woning.
              </p>
            </div>
          )}
          {nhg && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink/45">NHG-check</p>
              <p className={`mt-1.5 font-display text-lg font-extrabold ${nhg.onderGrens ? "text-[#3B6D11]" : "text-rust"}`}>
                {nhg.onderGrens ? "Onder de NHG-grens" : "Boven de NHG-grens"}
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink/55">
                {nhg.grensLabel}: {euro(nhg.grens)} ({nhg.periodeLabel}), op basis van de geschatte waarde.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Buurtprofiel */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
            <MapPinIcon className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11.5px] font-bold text-ink">Buurtprofiel</p>
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-ink/70">
          {buurtprofiel.data?.samenvatting ?? "Geen buurtsamenvatting beschikbaar voor dit adres."}
        </p>
        {buurtprofiel.data?.duiding && <p className="mt-2 text-[11.5px] leading-relaxed text-ink/55">{buurtprofiel.data.duiding}</p>}
      </div>

      {/* Verduurzaming */}
      {verduurzaming.data && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EAF3DE] text-[#3B6D11]">
              <LeafIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11.5px] font-bold text-ink">Verduurzamingsadvies</p>
          </div>
          <p className="mt-2.5 text-[12px] text-ink/70">
            Huidig label {verduurzaming.data.huidigLabel ?? "onbekend"} → haalbaar label {verduurzaming.data.haalbaarLabel ?? "onbekend"}
            {verduurzaming.data.investering != null && <> · investering {euro(verduurzaming.data.investering)}</>}
            {verduurzaming.data.terugverdientijdMaanden != null && (
              <> · terugverdientijd {Math.round(verduurzaming.data.terugverdientijdMaanden / 12)} jaar</>
            )}
          </p>
          {verduurzaming.data.maatregelen.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {verduurzaming.data.maatregelen.map((m) => (
                <div key={m.key} className="flex items-center justify-between rounded-lg bg-[#F8F8FF] px-3 py-2 text-[11px]">
                  <span className="font-semibold text-ink">
                    {m.label} <span className="font-normal text-ink/45">({m.van} → {m.naar})</span>
                  </span>
                  <span className="text-ink/55">{euro(m.investering)} · bespaart {euro(m.besparingPerJaar)}/jr</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kavel + bestemming -- naast elkaar, kleiner detail maar wel echte info */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/5 text-ink">
              <KavelIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11.5px] font-bold text-ink">Kavel</p>
          </div>
          <p className="mt-2.5 text-[12px] text-ink/70">
            {kavel.data?.oppervlakteM2 != null ? `${kavel.data.oppervlakteM2} m²` : "onbekend"}
            {kavel.data?.soortGrootte && <span className="text-ink/45"> ({kavel.data.soortGrootte})</span>}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/5 text-ink">
              <BestemmingIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11.5px] font-bold text-ink">Bestemming</p>
          </div>
          <p className="mt-2.5 text-[12px] text-ink/70">
            {bestemming.data?.bestemmingen && bestemming.data.bestemmingen.length > 0
              ? bestemming.data.bestemmingen.join(", ")
              : "onbekend"}
          </p>
        </div>
      </div>

      {/* Vergelijkbare verkopen */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-[11.5px] font-bold text-ink">Vergelijkbare verkopen in de buurt</p>
        {nearbySales.data && nearbySales.data.verkopen.length > 0 ? (
          <div className="mt-2.5 flex flex-col gap-1">
            {nearbySales.data.verkopen.slice(0, 6).map((v) => (
              <div key={`${v.adres}-${v.verkoopdatum}`} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11.5px] odd:bg-[#F8F8FF]">
                <span className="text-ink/70">{v.adres}</span>
                <span className="flex items-center gap-2">
                  {v.vergelijkbaar && <span className="rounded-full bg-[#EEF0FF] px-1.5 py-0.5 text-[9px] font-bold text-accent">vergelijkbaar</span>}
                  <span className="font-semibold text-ink">{euro(v.verkoopprijs)}</span>
                </span>
              </div>
            ))}
            {nearbySales.data.verruimd && (
              <p className="mt-1.5 text-[10px] text-ink/40">Zoekgebied/periode verruimd om genoeg vergelijkbare verkopen te vinden.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-ink/50">Geen vergelijkbare verkopen gevonden.</p>
        )}
      </div>
    </div>
  );
}
