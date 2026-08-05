import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { huidigVerbruik, listRapportenVoorOrg, listKlantdossiersVoorOrg, listGebruikersVoorOrg } from "@/lib/services/b2bStore";
import { getMarktMeldingen } from "@/lib/services/marktAlert";
import { FileCheckIcon, UsersIcon, TrendingUpIcon, BoltIcon } from "@/components/report/icons";

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
  const meldingen = getMarktMeldingen(organisatie.werkgebiedRegios);
  const resterend = Math.max(0, organisatie.quotumPerMaand - verbruikt);
  const lopendeDossiers = klanten.filter((k) => k.status === "lopend").length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-xl font-extrabold text-ink">Goedemorgen, {gebruiker.naam.split(" ")[0]}</p>
          <p className="mt-1 text-[12.5px] text-ink/55">{organisatie.naam}</p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/zakelijk/rapporten/nieuw" className="rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-accent-dark">
            + Nieuw rapport aanvragen
          </Link>
          <Link href="/zakelijk/vergelijken" className="rounded-lg bg-white px-4 py-2.5 text-[12px] font-semibold text-ink shadow-sm hover:bg-mist">
            Panden vergelijken
          </Link>
        </div>
      </div>

      {meldingen.length > 0 && (
        <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)" }}
          />
          <p className="relative flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-white/65">
            <TrendingUpIcon className="h-3 w-3" /> Marktmelding
            {organisatie.werkgebiedRegios && organisatie.werkgebiedRegios.length > 0 && (
              <span className="font-normal normal-case text-white/50">· voor uw werkgebied</span>
            )}
          </p>
          <div className="relative mt-2.5 flex flex-col gap-1.5">
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

      {meldingen.length === 0 && organisatie.werkgebiedRegios && organisatie.werkgebiedRegios.length > 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-ink/15 bg-white px-4 py-3 text-[11.5px] text-ink/50">
          Uw werkgebied ({organisatie.werkgebiedRegios.join(", ")}) is opgeslagen, maar in de nieuwste Marktupdate
          staat voor deze regio&apos;s nu geen noemenswaardige beweging (of geen van deze regio&apos;s kwam erin
          voor). Zodra dat verandert, verschijnt hier weer een marktmelding.
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EEF0FF] text-accent">
            <FileCheckIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-ink">{verbruikt}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">rapporten deze maand</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EEF0FF] text-accent">
            <UsersIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-ink">{lopendeDossiers}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">actieve klantdossiers</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink/5 text-ink">
            <UsersIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-ink">{teamleden.length}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">teamleden</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#EAF3DE] text-[#3B6D11]">
            <BoltIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-[#3B6D11]">{resterend}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">resterend deze maand</p>
        </div>
      </div>

      <p className="mt-7 text-[11px] font-bold uppercase tracking-wide text-ink/40">Recente rapporten</p>
      <div className="mt-2.5 overflow-hidden rounded-2xl bg-white shadow-sm">
        {rapporten.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
              <FileCheckIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">Nog geen rapporten aangevraagd</p>
              <p className="mt-1 text-[11.5px] text-ink/50">Vul een adres in en het eerste rapport staat binnen enkele seconden klaar.</p>
            </div>
            <Link href="/zakelijk/rapporten/nieuw" className="mt-1 rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark">
              + Eerste rapport aanvragen
            </Link>
          </div>
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
