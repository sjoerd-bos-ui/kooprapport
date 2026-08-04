import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { getTierInfo } from "@/types/b2b";

export const metadata = { title: "Instellingen · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkInstellingenPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");
  const { organisatie } = context;
  const tierInfo = getTierInfo(organisatie.tier);

  const widgetSnippet = `<script src="https://kooprapport.nl/widget.js" data-kantoor="${organisatie.slug}" async></script>`;

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Instellingen</p>

      <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold text-ink/60">Abonnement</p>
        <p className="mt-1 text-[14px] font-extrabold text-ink">
          {tierInfo.label} · {organisatie.quotumPerMaand} rapporten per maand
        </p>
        <p className="mt-1 text-[11px] text-ink/45">
          Wilt u van tier wisselen? Neem contact op via{" "}
          <a href="mailto:info@kooprapport.nl" className="font-semibold text-accent underline underline-offset-2">
            info@kooprapport.nl
          </a>
          .
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-[12px] font-bold text-ink">Widget voor uw website</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink/55">
            Een knop met uw kantoorherkenning die bezoekers doorlinkt naar een gratis waardepreview op Kooprapport.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg bg-ink px-3.5 py-3 font-mono text-[10.5px] text-[#EAF3DE]">
            {widgetSnippet}
          </div>
          <p className="mt-2 text-[10.5px] text-ink/40">Plak dit stukje code op uw eigen website.</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-[12px] font-bold text-ink">&quot;Werkt met Kooprapport&quot;-badge</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink/55">Voor op uw eigen website of social media.</p>
          <div className="mt-3">
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
