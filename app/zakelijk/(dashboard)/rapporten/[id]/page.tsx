import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { getRapportAanvraag, getKlantdossier } from "@/lib/services/b2bStore";
import { APP_BASE_URL } from "@/lib/config/payment";
import B2bReportView from "@/components/zakelijk/B2bReportView";
import DeelKnop from "@/components/zakelijk/DeelKnop";

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
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[12px] text-ink/50">
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
        <div className="max-w-[380px] shrink-0">
          <DeelKnop rapportId={aanvraag.id} initieleDeelUrl={aanvraag.deelToken ? `${APP_BASE_URL}/deelrapport/${aanvraag.deelToken}` : null} />
        </div>
      </div>

      {/* Vanaf hier het ECHTE rapport-component, exact hetzelfde als de
          consumentenkant en de PDF (zie B2bReportView.tsx) -- geen los,
          dunner B2B-samenvattingscomponent meer. */}
      <div className="-mx-8 mt-2">
        <B2bReportView report={aanvraag.report} />
      </div>
    </div>
  );
}
