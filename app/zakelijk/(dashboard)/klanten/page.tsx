import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { listKlantdossiersVoorOrg, listRapportenVoorKlant } from "@/lib/services/b2bStore";
import { heeftNieuweMarktcijfersSinds, laatsteMarktupdateSlug } from "@/lib/services/marktAlert";
import NieuwKlantForm from "@/components/zakelijk/NieuwKlantForm";
import { UsersIcon, TrendingUpIcon } from "@/components/report/icons";

export const metadata = { title: "Klanten · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkKlantenPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const dossiers = await listKlantdossiersVoorOrg(context.organisatie.id);

  // Monitoring (#5): voor lopende dossiers checken of er sinds het laatst
  // opgevraagde rapport nieuwe marktcijfers zijn gepubliceerd. Alleen voor
  // lopende dossiers -- bij een afgerond dossier is dit niet meer relevant.
  const nieuweCijfersPerDossier = new Map<string, boolean>();
  const laatsteSlug = laatsteMarktupdateSlug();
  await Promise.all(
    dossiers
      .filter((d) => d.status === "lopend")
      .map(async (d) => {
        const rapporten = await listRapportenVoorKlant(d.id);
        const laatsteRapport = rapporten[0];
        const referentieDatum = laatsteRapport?.aangemaaktOp ?? d.aangemaaktOp;
        nieuweCijfersPerDossier.set(d.id, heeftNieuweMarktcijfersSinds(referentieDatum));
      })
  );

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Klanten</p>
      <p className="mt-1 text-[12px] text-ink/50">{dossiers.length} dossiers, {dossiers.filter((d) => d.status === "lopend").length} lopend</p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {dossiers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
                <UsersIcon className="h-5 w-5" />
              </span>
              <p className="text-[13px] font-bold text-ink">Nog geen klantdossiers</p>
              <p className="text-[11.5px] text-ink/50">Maak er hiernaast één aan om rapporten aan te koppelen.</p>
            </div>
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
                      <Link href={`/zakelijk/klanten/${d.id}`} className="flex items-center gap-1.5 font-semibold text-ink hover:text-accent">
                        {d.klantnaam}
                        {nieuweCijfersPerDossier.get(d.id) && (
                          <span title={laatsteSlug ? `Nieuwe marktcijfers beschikbaar (${laatsteSlug})` : "Nieuwe marktcijfers beschikbaar"}>
                            <TrendingUpIcon className="h-3 w-3 text-[#3B6D11]" />
                          </span>
                        )}
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
