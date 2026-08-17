import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import Container from "@/components/ui/Container";
import AccountDashboard, { type AccountRapportItem } from "@/components/account/AccountDashboard";
import ConsumentZoekopdracht from "@/components/account/ConsumentZoekopdracht";
import { getIngelogdeEmailUitCookies } from "@/lib/services/consumentAuth";
import { listBestellingenVoorEmail } from "@/lib/payments/bestellingen";
import { buildReportHref } from "@/lib/utils/slug";
import { getConsumentVoorkeuren, consumentKlantId } from "@/lib/services/consumentZoekopdracht";
import { listMatchenVoorKlant } from "@/lib/services/b2bStore";

export const metadata: Metadata = {
  title: "Mijn rapporten",
  robots: { index: false, follow: false },
};

// -----------------------------------------------------------------------------
// "Mijn rapporten"-dashboard (zie het Cowork-gesprek "zelfstandig
// koperportaal" / "b2c-dashboard"). Server component: leest de sessiecookie,
// haalt alle betaalde bestellingen op voor dat e-mailadres, en bouwt per
// bestelling alvast de "Bekijk rapport"-link (buildReportHref vereist het
// volledige AddressMeta, zie lib/utils/slug.ts -- vandaar hier, niet in de
// client component). noindex: dit is een persoonlijk overzicht, geen
// publieke content.
// -----------------------------------------------------------------------------
export default async function AccountPagina() {
  const email = await getIngelogdeEmailUitCookies();
  if (!email) redirect("/account/inloggen");

  const alleBestellingen = await listBestellingenVoorEmail(email);
  const rapporten: AccountRapportItem[] = alleBestellingen
    .filter((b) => b.status === "paid" && b.address)
    .map((b) => ({
      id: b.id,
      label: b.address!.label,
      plaats: b.address!.plaats,
      bekijkUrl: `${buildReportHref(b.address!)}&bestellingId=${b.id}`,
      datumLabel: new Date(b.betaaldOp ?? b.aangemaaktOp).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      bedragLabel: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(b.bedragCenten / 100),
      favoriet: b.favoriet ?? false,
      gearchiveerd: b.gearchiveerd ?? false,
    }));

  // Zoektool (zie het Cowork-gesprek "visualize de zoektool ... hierin
  // precies zoals in zakelijk"): dezelfde Funda-zoekopdracht/matches als
  // Zakelijk, hier gekoppeld aan de ingelogde consument i.p.v. een
  // klantdossier. Zie lib/services/consumentZoekopdracht.ts.
  const voorkeuren = await getConsumentVoorkeuren(email);
  const matches = await listMatchenVoorKlant(consumentKlantId(email));

  return (
    <main className="min-h-screen bg-parchment">
      <SiteHeader />
      <Container className="py-10">
        <p className="font-display text-2xl font-extrabold text-ink">Mijn rapporten</p>
        <div className="mt-6">
          <AccountDashboard email={email} rapporten={rapporten} />
        </div>
        <div className="mt-8">
          <p className="mb-3 font-display text-lg font-extrabold text-ink">Zoeken naar een nieuwe woning</p>
          <ConsumentZoekopdracht voorkeuren={voorkeuren} matches={matches} />
        </div>
      </Container>
      <SiteFooter />
    </main>
  );
}
