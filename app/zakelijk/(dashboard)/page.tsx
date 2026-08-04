import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { huidigVerbruik, listRapportenVoorOrg, listKlantdossiersVoorOrg, listGebruikersVoorOrg } from "@/lib/services/b2bStore";
import { getMarktMeldingen } from "@/lib/services/marktAlert";

export const metadata = { title: "Dashboard · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkDashboardHome() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");
  const { gebruiker, organisatie } = context;

  const [verbruikt, rapporten, klanten, teamleden] = await Promise.all([
    huidigVerbruik(organisatie.id),
    listRapportenVoorOrg(organisatie.id),
    listKlantdossiersVoorOrg(organisatie.id),
    listGebruikersVoorOrg(organisatie.id),
  ]);
  const meldingen = getMarktMeldingen();
  const resterend = Math.max(0, organisatie.quotumPerMaand - verbruikt);
  const lopendeDossiers = klanten.filter((k) => k.status === "lopend").length;

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Goedemorgen, {gebruiker.naam.split(" ")[0]}</p>
      <p className="mt-1 text-[12.5px] text-ink/55">{organisatie.naam}</p>

      {meldingen.length > 0 && (
        <div className="mt-5 rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">Marktmelding</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {meldingen.slice(0, 2).map((m) => (
              <p key={m.regio.naam} className="text-[12.5px] text-white">
                <span className="font-bold">{m.regio.naam}:</span> {m.regio.jaarVergelijking} ({m.regio.extra}) —{" "}
                <Link href={`/marktupdates/${m.marktupdateSlug}`} className="underline underline-offset-2">
                  bekijk {m.periodeLabel}
                </Link>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-xl font-extrabold text-ink">{verbruikt}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">rapporten deze maand</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-xl font-extrabold text-ink">{lopendeDossiers}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">actieve klantdossiers</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-xl font-extrabold text-ink">{teamleden.length}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">teamleden</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-display text-xl font-extrabold text-[#3B6D11]">{resterend}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">resterend deze maand</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link href="/zakelijk/rapporten/nieuw" className="rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-accent-dark">
          + Nieuw rapport aanvragen
        </Link>
        <Link href="/zakelijk/vergelijken" className="rounded-lg bg-white px-4 py-2.5 text-[12px] font-semibold text-ink shadow-sm hover:bg-mist">
          Panden vergelijken
        </Link>
      </div>

      <p className="mt-7 text-[11px] font-bold uppercase tracking-wide text-ink/40">Recente rapporten</p>
      <div className="mt-2.5 overflow-hidden rounded-2xl bg-white shadow-sm">
        {rapporten.length === 0 ? (
          <p className="px-5 py-6 text-[12.5px] text-ink/50">Nog geen rapporten aangevraagd.</p>
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-ink/[0.06] text-[9.5px] font-bold uppercase tracking-wide text-ink/40">
                <th className="px-5 py-2.5 font-bold">Adres</th>
                <th className="px-5 py-2.5 font-bold">Aangevraagd</th>
              </tr>
            </thead>
            <tbody>
              {rapporten.slice(0, 6).map((r) => (
                <tr key={r.id} className="border-b border-ink/[0.06] last:border-0">
                  <td className="px-5 py-3">
                    <Link href={`/zakelijk/rapporten/${r.id}`} className="font-semibold text-ink hover:text-accent">
                      {r.adres.label}
                    </Link>
                  </td>
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
