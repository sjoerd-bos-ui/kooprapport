import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { listRapportenVoorOrg, listKlantdossiersVoorOrg } from "@/lib/services/b2bStore";
import RapportenTabel, { type RapportRij } from "@/components/zakelijk/RapportenTabel";

export const metadata = { title: "Rapporten · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkRapportenPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const [rapporten, klanten] = await Promise.all([
    listRapportenVoorOrg(context.organisatie.id),
    listKlantdossiersVoorOrg(context.organisatie.id),
  ]);
  const klantnaamPerId = new Map(klanten.map((k) => [k.id, k.klantnaam]));

  const rijen: RapportRij[] = rapporten.map((r) => ({
    id: r.id,
    adres: r.adres,
    aangemaaktOp: r.aangemaaktOp,
    geschatteWaarde: r.report.market.data?.geschatteWaarde ?? null,
    energielabel: r.report.energy.data?.klasse ?? null,
    funderingsniveau: r.report.fundering.data?.niveau ?? null,
    klantId: r.klantId,
    klantnaam: r.klantId ? klantnaamPerId.get(r.klantId) ?? null : null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-xl font-extrabold text-ink">Rapporten</p>
          <p className="mt-1 text-[12px] text-ink/50">{rapporten.length} in totaal</p>
        </div>
        <Link href="/zakelijk/rapporten/nieuw" className="rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-accent-dark">
          + Nieuw rapport aanvragen
        </Link>
      </div>

      <div className="mt-5">
        <RapportenTabel rapporten={rijen} />
      </div>
    </div>
  );
}
