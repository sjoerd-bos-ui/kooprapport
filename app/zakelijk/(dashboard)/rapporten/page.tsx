import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { listRapportenVoorOrg } from "@/lib/services/b2bStore";

export const metadata = { title: "Rapporten · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkRapportenPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const rapporten = await listRapportenVoorOrg(context.organisatie.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-extrabold text-ink">Rapporten</p>
        <Link href="/zakelijk/rapporten/nieuw" className="rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-accent-dark">
          + Nieuw rapport aanvragen
        </Link>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">
        {rapporten.length === 0 ? (
          <p className="px-5 py-6 text-[12.5px] text-ink/50">Nog geen rapporten aangevraagd.</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-ink/[0.06] text-[9.5px] font-bold uppercase tracking-wide text-ink/40">
                <th className="px-5 py-2.5 font-bold">Adres</th>
                <th className="px-5 py-2.5 font-bold">Waarde-indicatie</th>
                <th className="px-5 py-2.5 font-bold">Energielabel</th>
                <th className="px-5 py-2.5 font-bold">Aangevraagd</th>
              </tr>
            </thead>
            <tbody>
              {rapporten.map((r) => (
                <tr key={r.id} className="border-b border-ink/[0.06] last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/zakelijk/rapporten/${r.id}`} className="font-semibold text-ink hover:text-accent">
                      {r.adres.label}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink/60">
                    {r.report.market.data
                      ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
                          r.report.market.data.geschatteWaarde
                        )
                      : "onbekend"}
                  </td>
                  <td className="px-5 py-3 text-ink/60">{r.report.energy.data?.klasse ?? "onbekend"}</td>
                  <td className="px-5 py-3 text-ink/50">{new Date(r.aangemaaktOp).toLocaleDateString("nl-NL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
