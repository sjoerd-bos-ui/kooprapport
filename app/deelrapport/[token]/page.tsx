import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRapportAanvraagDoorDeelToken, getOrganisatie } from "@/lib/services/b2bStore";
import B2bRapportSamenvatting from "@/components/zakelijk/B2bRapportSamenvatting";
import { HomeIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Publieke, niet-ingelogde weergave van een gedeeld B2B-rapport (#4) --
// bereikbaar via een lang, willekeurig token (zie maakOfVernieuwDeelToken in
// lib/services/b2bStore.ts), geen sessie/login nodig. BEWUST noindex: dit is
// een privé-link voor één specifieke klant, geen publieke contentpagina.
//
// Toont, als de organisatie dat heeft ingesteld (#6, zie types/b2b.ts:
// B2bBranding), het eigen kantoorlogo/-naam en accentkleur in de kopbalk
// i.p.v. "Kooprapport" -- de rest van de pagina (B2bRapportSamenvatting)
// hergebruikt bewust dezelfde, al geteste component als het interne
// dashboard, dus zonder een tweede parallelle weergave te hoeven bouwen.
// -----------------------------------------------------------------------------

export const metadata: Metadata = { title: "Gedeeld rapport", robots: { index: false, follow: false } };

export default async function DeelrapportPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rapport = await getRapportAanvraagDoorDeelToken(token);
  if (!rapport) notFound();

  const organisatie = await getOrganisatie(rapport.orgId);
  const branding = organisatie?.branding;
  const accentKleur = branding?.accentKleur ?? "#4F46E5";
  const weergaveNaam = branding?.weergaveNaam ?? "Kooprapport";

  return (
    <main className="min-h-screen bg-parchment">
      <div className="px-6 py-5" style={{ backgroundColor: "#1F1F2E" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={weergaveNaam} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: accentKleur }}>
              <HomeIcon className="h-4 w-4 text-white" />
            </span>
          )}
          <span className="text-[15px] font-extrabold text-white">{weergaveNaam}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="font-display text-xl font-extrabold text-ink">{rapport.adres.label}</p>
        <p className="mt-1 text-[12px] text-ink/50">Met u gedeeld door {weergaveNaam}</p>

        <div className="mt-5">
          <B2bRapportSamenvatting report={rapport.report} />
        </div>

        <p className="mt-8 text-center text-[10.5px] text-ink/35">
          Dit rapport is gemaakt met Kooprapport en met u gedeeld door {weergaveNaam}.
        </p>
      </div>
    </main>
  );
}
