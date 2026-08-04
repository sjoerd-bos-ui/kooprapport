import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { getKlantdossier, listRapportenVoorKlant } from "@/lib/services/b2bStore";

export const metadata = { title: "Klantdossier · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkKlantDetailPagina({ params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) notFound();

  const rapporten = await listRapportenVoorKlant(id);

  return (
    <div>
      <Link href="/zakelijk/klanten" className="text-[11px] font-semibold text-ink/50 hover:text-ink">
        ← Terug naar klanten
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <p className="font-display text-xl font-extrabold text-ink">{dossier.klantnaam}</p>
          <p className="mt-1 text-[12px] text-ink/50">
            {dossier.type === "aankoop" ? "Aankooptraject" : "Verkooptraject"} · gestart{" "}
            {new Date(dossier.aangemaaktOp).toLocaleDateString("nl-NL")}
          </p>
        </div>
        <Link
          href={`/zakelijk/rapporten/nieuw?klantId=${dossier.id}`}
          className="rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-accent-dark"
        >
          + Rapport toevoegen
        </Link>
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-wide text-ink/40">
        Rapporten in dit dossier ({rapporten.length})
      </p>
      <div className="mt-2.5 overflow-hidden rounded-2xl bg-white shadow-sm">
        {rapporten.length === 0 ? (
          <p className="px-5 py-6 text-[12.5px] text-ink/50">Nog geen rapporten in dit dossier.</p>
        ) : (
          <div className="divide-y divide-ink/[0.06]">
            {rapporten.map((r) => (
              <Link key={r.id} href={`/zakelijk/rapporten/${r.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-mist">
                <span className="text-[12.5px] font-semibold text-ink">{r.adres.label}</span>
                <span className="text-[10.5px] text-ink/45">{new Date(r.aangemaaktOp).toLocaleDateString("nl-NL")}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
