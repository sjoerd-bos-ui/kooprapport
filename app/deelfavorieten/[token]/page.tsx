import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getKlantdossierDoorFavorietenDeelToken, getOrganisatie, listMatchenVoorKlant } from "@/lib/services/b2bStore";
import FavorietenVergelijkTabel from "@/components/zakelijk/FavorietenVergelijkTabel";
import { HomeIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Publieke, niet-ingelogde weergave van een gedeelde favorieten-vergelijking
// (zie het Cowork-gesprek "maak de deellink") -- bereikbaar via een lang,
// willekeurig token (maakOfVernieuwFavorietenDeelToken in b2bStore.ts), geen
// sessie nodig. Zelfde branding-kopbalk/footer-opzet als app/deelrapport/
// [token]/page.tsx, zodat een gedeelde link er altijd hetzelfde "van het
// kantoor" uitziet, ongeacht wélke B2B-inhoud er gedeeld wordt.
//
// BEWUST live: de favorieten worden bij elk bezoek opnieuw opgehaald (geen
// bevroren momentopname, zie de toelichting bij favorietenDeelToken in
// types/b2b.ts) -- exact dezelfde FavorietenVergelijkTabel als in de
// ingelogde tab, zonder interne acties (rapport aanvragen, delen) die een
// koper hier niets te zoeken heeft.
// -----------------------------------------------------------------------------

export const metadata: Metadata = { title: "Gedeelde vergelijking", robots: { index: false, follow: false } };

export default async function DeelFavorietenPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dossier = await getKlantdossierDoorFavorietenDeelToken(token);
  if (!dossier) notFound();

  const organisatie = await getOrganisatie(dossier.orgId);
  if (!organisatie) notFound();

  const matches = await listMatchenVoorKlant(dossier.id);
  const favorieten = matches.filter((m) => m.interessant === true);

  const branding = organisatie.branding;
  const accentKleur = branding?.accentKleur ?? "#4F46E5";
  const weergaveNaam = branding?.weergaveNaam ?? "Kooprapport";

  return (
    <div className="min-h-screen bg-parchment">
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

      <div className="mx-auto max-w-3xl px-6 pt-6 sm:px-8 lg:px-10">
        <p className="text-[12px] text-ink/50">Met u gedeeld door {weergaveNaam}</p>
        <p className="mt-1 font-display text-xl font-extrabold text-ink">Vergelijking voor {dossier.klantnaam}</p>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-6 sm:px-8 lg:px-10">
        <FavorietenVergelijkTabel favorieten={favorieten} />
      </div>

      <p className="mx-auto max-w-3xl px-6 pb-8 pt-2 text-center text-[10.5px] text-ink/35 sm:px-8 lg:px-10">
        Deze vergelijking is gemaakt met Kooprapport en met u gedeeld door {weergaveNaam}.
      </p>
    </div>
  );
}
