import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getKlantdossierDoorKoperVoorkeurenToken, getOrganisatie } from "@/lib/services/b2bStore";
import KoperVoorkeurenForm from "@/components/zakelijk/KoperVoorkeurenForm";
import { HomeIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Publieke, niet-ingelogde koper-voorkeuren-vragenlijst (matching-model, zie
// het Cowork-gesprek hierover) -- bereikbaar via een lang, willekeurig token
// (zie maakOfVernieuwKoperVoorkeurenToken in lib/services/b2bStore.ts), geen
// sessie/login nodig. BEWUST noindex: privé-link voor één specifieke klant,
// geen publieke contentpagina. Zelfde opzet als app/deelrapport/[token].
// -----------------------------------------------------------------------------

export const metadata: Metadata = { title: "Jouw voorkeuren", robots: { index: false, follow: false } };

export default async function KoperVoorkeurenPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dossier = await getKlantdossierDoorKoperVoorkeurenToken(token);
  if (!dossier) notFound();

  const organisatie = await getOrganisatie(dossier.orgId);
  const branding = organisatie?.branding;
  const accentKleur = branding?.accentKleur ?? "#4F46E5";
  const weergaveNaam = branding?.weergaveNaam ?? "Kooprapport";

  return (
    <div className="min-h-screen bg-parchment">
      <div className="px-6 py-5" style={{ backgroundColor: "#1F1F2E" }}>
        <div className="mx-auto flex max-w-md items-center gap-2.5">
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

      <div className="px-6 py-8 sm:py-12">
        <KoperVoorkeurenForm token={token} klantnaam={dossier.klantnaam} bestaand={dossier.zoekopdracht?.koperVoorkeuren ?? null} />
      </div>
    </div>
  );
}
