import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getKoperDossierIdUitCookies } from "@/lib/services/koperPortaalAuth";
import { getKlantdossier, getOrganisatie, listMatchenVoorKlant } from "@/lib/services/b2bStore";
import KoperPortaalDashboard from "@/components/koper-portaal/KoperPortaalDashboard";
import { HomeIcon, MailIcon, ChatIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Koperportaal-dashboard (zie het Cowork-gesprek "Koperportaal voor
// Zakelijk-klanten") -- de zelfbedieningspagina die de makelaar met zijn
// koper deelt (zie components/zakelijk/ZoekopdrachtForm.tsx: "Nodig koper uit
// voor portaal"). Header met kantoorbranding (naam/logo, hetzelfde
// B2bBranding-veld als de publieke koper-voorkeurenpagina,
// app/koper-voorkeuren/[token]/page.tsx) zodat dit voor de koper voelt als
// "de portal van mijn makelaar", niet als een los Kooprapport-product.
// -----------------------------------------------------------------------------

export const metadata: Metadata = { title: "Mijn woningportaal", robots: { index: false, follow: false } };

export default async function KoperPortaalPagina() {
  const dossierId = await getKoperDossierIdUitCookies();
  if (!dossierId) redirect("/koper-portaal/inloggen");

  const dossier = await getKlantdossier(dossierId);
  if (!dossier) redirect("/koper-portaal/inloggen");

  const [organisatie, matches] = await Promise.all([getOrganisatie(dossier.orgId), listMatchenVoorKlant(dossierId)]);
  const branding = organisatie?.branding;
  const accentKleur = branding?.accentKleur ?? "#4F46E5";
  const weergaveNaam = branding?.weergaveNaam ?? organisatie?.naam ?? "Kooprapport";

  return (
    <div className="min-h-screen bg-parchment">
      <div className="px-6 py-5" style={{ backgroundColor: "#1F1F2E" }}>
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={weergaveNaam} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: accentKleur }}>
              <HomeIcon className="h-4 w-4 text-white" />
            </span>
          )}
          <span className="text-[15px] font-extrabold text-white">{weergaveNaam}</span>
          <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[9.5px] font-semibold text-white/60">Woningportaal</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8 sm:py-10">
        <KoperPortaalDashboard klantnaam={dossier.klantnaam} voorkeuren={dossier.zoekopdracht?.koperVoorkeuren ?? null} matches={matches} />

        {(organisatie?.werkgebiedRegios || organisatie?.naam) && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-accent">
              <HomeIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold text-ink">Uw makelaar: {weergaveNaam}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-ink/50">
                <span className="flex items-center gap-1">
                  <MailIcon className="h-3 w-3 shrink-0" /> Vragen? Antwoord op de uitnodigingsmail
                </span>
                <span className="flex items-center gap-1">
                  <ChatIcon className="h-3 w-3 shrink-0" /> of neem telefonisch contact op
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
