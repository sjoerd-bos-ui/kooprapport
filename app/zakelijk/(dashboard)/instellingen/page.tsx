import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { huidigVerbruik } from "@/lib/services/b2bStore";
import { getTierInfo, B2B_ABONNEMENT_TIERS } from "@/types/b2b";
import { ShieldCheckIcon } from "@/components/report/icons";

export const metadata = { title: "Instellingen · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkInstellingenPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");
  const { organisatie } = context;
  const tierInfo = getTierInfo(organisatie.tier);
  const verbruikt = await huidigVerbruik(organisatie.id);
  const percentage = Math.min(100, Math.round((verbruikt / Math.max(1, organisatie.quotumPerMaand)) * 100));

  const widgetSnippet = `<script src="https://kooprapport.nl/widget.js" data-kantoor="${organisatie.slug}" async></script>`;

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Instellingen</p>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-white/60">Huidig abonnement</p>
        <p className="mt-1.5 font-display text-lg font-extrabold text-white">
          {tierInfo.label} · {organisatie.quotumPerMaand} rapporten per maand
        </p>
        <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white" style={{ width: `${percentage}%` }} />
        </div>
        <p className="mt-1.5 text-[10.5px] text-white/70">
          {verbruikt} van {organisatie.quotumPerMaand} rapporten gebruikt deze maand
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {B2B_ABONNEMENT_TIERS.map((tier) => (
          <div
            key={tier.tier}
            className={`rounded-2xl p-4 ${
              tier.tier === organisatie.tier ? "border-2 border-accent bg-white shadow-sm" : "bg-white/60 shadow-sm"
            }`}
          >
            <p className={`text-[12px] font-extrabold ${tier.tier === organisatie.tier ? "text-accent" : "text-ink"}`}>{tier.label}</p>
            <p className="mt-1 text-[11px] text-ink/55">{tier.quotumPerMaand} rapporten/maand</p>
            {tier.tier === organisatie.tier && (
              <span className="mt-2 inline-block rounded-full bg-[#EEF0FF] px-2 py-0.5 text-[9.5px] font-bold text-accent">Huidig</span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink/45">
        Wilt u van tier wisselen? Neem contact op via{" "}
        <a href="mailto:info@kooprapport.nl" className="font-semibold text-accent underline underline-offset-2">
          info@kooprapport.nl
        </a>
        .
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-[12px] font-bold text-ink">Widget voor uw website</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink/55">
            Een knop met uw kantoorherkenning die bezoekers doorlinkt naar een gratis waardepreview op Kooprapport.
          </p>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-ink/35">Voorbeeld</p>
          <div className="mt-1.5 flex items-center justify-center rounded-xl border border-dashed border-ink/15 bg-parchment px-4 py-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[12.5px] font-semibold text-white shadow-sm">
              Bereken de waarde van uw droomhuis
            </span>
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-ink/35">Embedcode</p>
          <div className="mt-1.5 overflow-x-auto rounded-lg bg-ink px-3.5 py-3 font-mono text-[10.5px] text-[#EAF3DE]">{widgetSnippet}</div>
          <p className="mt-2 text-[10.5px] text-ink/40">Plak dit stukje code op uw eigen website.</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF0FF] text-accent">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
            </span>
            <p className="text-[12px] font-bold text-ink">&quot;Werkt met Kooprapport&quot;-badge</p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink/55">Voor op uw eigen website of social media.</p>
          <div className="mt-3 flex justify-center rounded-xl border border-dashed border-ink/15 bg-parchment px-4 py-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/badge/werkt-met-kooprapport.svg" alt="Werkt met Kooprapport-badge" width={200} height={53} />
          </div>
          <a
            href="/badge/werkt-met-kooprapport.svg"
            download
            className="mt-3 inline-block text-[11px] font-semibold text-accent hover:underline"
          >
            Badge downloaden (SVG) →
          </a>
        </div>
      </div>
    </div>
  );
}
