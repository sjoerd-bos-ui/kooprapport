import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { getRapportAanvraag, getKlantdossier } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";
import B2bRapportSamenvatting from "@/components/zakelijk/B2bRapportSamenvatting";
import DeelKnop from "@/components/zakelijk/DeelKnop";
import { HomeIcon } from "@/components/report/icons";

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
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-dark shadow-sm">
            <HomeIcon className="h-5 w-5 text-white" />
          </span>
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
        <DeelKnop rapportId={aanvraag.id} initieleDeelUrl={aanvraag.deelToken ? `${APP_BASE_URL}/deelrapport/${aanvraag.deelToken}` : null} />
      </div>

      <div className="mt-5">
        <B2bRapportSamenvatting report={aanvraag.report} />
      </div>
    </div>
  );
}
