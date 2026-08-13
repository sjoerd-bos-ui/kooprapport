import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVergelijkingDoorDeelToken, getOrganisatie } from "@/lib/services/b2bStore";
import VergelijkTabel from "@/components/zakelijk/VergelijkTabel";
import { HomeIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Publieke, niet-ingelogde weergave van een gedeelde rapport-vergelijking
// (de diepe "Vergelijken"-tab, bouwtechnisch risico/leefbaarheid/biedadvies)
// -- zie het Cowork-gesprek "maak de deellink ook voor de rapport
// vergelijkpagina". Zelfde branding-opzet als app/deelrapport/[token] en
// app/deelfavorieten/[token]. BEWUST een momentopname (zie
// maakVergelijkingDeelToken in b2bStore.ts): dit toont exact de selectie die
// de makelaar had aangevinkt op het moment van delen, niet "de huidige
// rapporten van dit dossier" (die kunnen er intussen bij gekomen zijn).
// -----------------------------------------------------------------------------

export const metadata: Metadata = { title: "Gedeelde vergelijking", robots: { index: false, follow: false } };

export default async function DeelVergelijkingPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rapporten = await getVergelijkingDoorDeelToken(token);
  if (!rapporten) notFound();

  const organisatie = await getOrganisatie(rapporten[0].orgId);
  if (!organisatie) notFound();

  const branding = organisatie.branding;
  const accentKleur = branding?.accentKleur ?? "#4F46E5";
  const weergaveNaam = branding?.weergaveNaam ?? "Kooprapport";

  return (
    <div className="min-h-screen bg-parchment">
      <div className="px-6 py-5" style={{ backgroundColor: "#1F1F2E" }}>
        <div className="mx-auto flex max-w-4xl items-center gap-2.5">
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

      <div className="mx-auto max-w-4xl px-6 pt-6 sm:px-8 lg:px-10">
        <p className="text-[12px] text-ink/50">Met u gedeeld door {weergaveNaam}</p>
        <p className="mt-1 font-display text-xl font-extrabold text-ink">Vergelijking van {rapporten.length} panden</p>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6 sm:px-8 lg:px-10">
        <VergelijkTabel details={rapporten} publiek />
      </div>

      <p className="mx-auto max-w-4xl px-6 pb-8 pt-2 text-center text-[10.5px] text-ink/35 sm:px-8 lg:px-10">
        Deze vergelijking is gemaakt met Kooprapport en met u gedeeld door {weergaveNaam}.
      </p>
    </div>
  );
}
