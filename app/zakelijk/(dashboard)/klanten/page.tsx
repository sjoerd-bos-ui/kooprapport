import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { listKlantdossiersVoorOrg } from "@/lib/services/b2bStore";
import NieuwKlantForm from "@/components/zakelijk/NieuwKlantForm";

export const metadata = { title: "Klanten · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkKlantenPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const dossiers = await listKlantdossiersVoorOrg(context.organisatie.id);

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Klanten</p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {dossiers.length === 0 ? (
            <p className="px-5 py-6 text-[12.5px] text-ink/50">Nog geen klantdossiers.</p>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-ink/[0.06] text-[9.5px] font-bold uppercase tracking-wide text-ink/40">
                  <th className="px-5 py-2.5 font-bold">Klant</th>
                  <th className="px-5 py-2.5 font-bold">Type</th>
                  <th className="px-5 py-2.5 font-bold">Status</th>
                  <th className="px-5 py-2.5 font-bold">Aangemaakt</th>
                </tr>
              </thead>
              <tbody>
                {dossiers.map((d) => (
                  <tr key={d.id} className="border-b border-ink/[0.06] last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/zakelijk/klanten/${d.id}`} className="font-semibold text-ink hover:text-accent">
                        {d.klantnaam}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink/60">{d.type === "aankoop" ? "Aankoop" : "Verkoop"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.status === "lopend" ? "bg-[#EEF0FF] text-accent" : "bg-ink/5 text-ink/50"
                        }`}
                      >
                        {d.status === "lopend" ? "Lopend" : "Afgerond"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink/50">{new Date(d.aangemaaktOp).toLocaleDateString("nl-NL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <NieuwKlantForm />
      </div>
    </div>
  );
}
