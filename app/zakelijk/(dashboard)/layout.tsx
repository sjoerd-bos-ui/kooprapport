import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { huidigVerbruik } from "@/lib/services/b2bStore";
import { getTierInfo } from "@/types/b2b";
import B2bSidebar from "@/components/zakelijk/B2bSidebar";
import B2bTopbar from "@/components/zakelijk/B2bTopbar";

// -----------------------------------------------------------------------------
// Auth-gate voor het hele geauthenticeerde deel van "Kooprapport Zakelijk".
// Route group "(dashboard)" i.p.v. gewoon app/zakelijk/layout.tsx, zodat
// app/zakelijk/(auth)/login/page.tsx BUITEN deze gate valt (anders zou de
// inlogpagina zelf ook doorverwezen worden naar... de inlogpagina).
// -----------------------------------------------------------------------------
export default async function ZakelijkDashboardLayout({ children }: { children: ReactNode }) {
  const context = await getB2bSessieUitCookies();
  if (!context) {
    redirect("/zakelijk/login");
  }

  const { gebruiker, organisatie } = context;
  const verbruikt = await huidigVerbruik(organisatie.id);
  const tierInfo = getTierInfo(organisatie.tier);

  return (
    <div className="flex min-h-screen bg-parchment">
      <B2bSidebar orgNaam={organisatie.naam} tierLabel={`${tierInfo.label} · ${organisatie.quotumPerMaand} rapporten/mnd`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <B2bTopbar
          gebruikerNaam={gebruiker.naam}
          orgNaam={organisatie.naam}
          verbruikt={verbruikt}
          quotum={organisatie.quotumPerMaand}
        />
        <div className="flex-1 overflow-auto px-8 py-7">{children}</div>
      </div>
    </div>
  );
}
