import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { getRapportAanvraag, getKlantdossier } from "@/lib/services/b2bStore";
import B2bRapportSamenvatting from "@/components/zakelijk/B2bRapportSamenvatting";

export const metadata = { title: "Rapport · Kooprapport Zakelijk", robots: { index: false, follow: false } };

export default async function ZakelijkRapportDetailPagina({ params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const { id } = await params;
  const aanvraag = await getRapportAanvraag(id);
  if (!aanvraag || aanvraag.orgId !== context.organisatie.id) notFound();

  const klant = aanvraag.klantId ? await getKlantdossier(aanvraag.klantId) : null;

  return (
    <div>
      <Link href="/zakelijk/rapporten" className="text-[11px] font-semibold text-ink/50 hover:text-ink">
        ← Terug naar rapporten
      </Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <p className="font-display text-xl font-extrabold text-ink">{aanvraag.adres.label}</p>
          <p className="mt-1 text-[12px] text-ink/50">
            Aangevraagd op {new Date(aanvraag.aangemaaktOp).toLocaleDateString("nl-NL")}
            {klant && (
              <>
                {" "}
                · Klantdossier:{" "}
                <Link href={`/zakelijk/klanten/${klant.id}`} className="font-semibold text-accent hover:underline">
                  {klant.klantnaam}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <B2bRapportSamenvatting report={aanvraag.report} />
      </div>
    </div>
  );
}
