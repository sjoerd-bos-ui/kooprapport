import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { getKlantdossier, listRapportenVoorKlant, listMatchenVoorKlant } from "@/lib/services/b2bStore";
import { berekenBiedadvies } from "@/lib/services/biedadvies";
import { heeftNieuweMarktcijfersSinds, laatsteMarktupdateSlug } from "@/lib/services/marktAlert";
import DossierStatusKnop from "@/components/zakelijk/DossierStatusKnop";
import DossierVergelijken from "@/components/zakelijk/DossierVergelijken";
import ZoekopdrachtForm from "@/components/zakelijk/ZoekopdrachtForm";
import VerwijderDossierKnop from "@/components/zakelijk/VerwijderDossierKnop";
import MatchesKaart from "@/components/zakelijk/MatchesKaart";
import KlantdossierTabs, { type KlantdossierTab } from "@/components/zakelijk/KlantdossierTabs";
import VerkoperspresentatieGenerator from "@/components/zakelijk/VerkoperspresentatieGenerator";
import RapportKaartActies from "@/components/zakelijk/RapportKaartActies";
import { FileCheckIcon, TrendingUpIcon, HomeIcon, ArrowRightIcon } from "@/components/report/icons";
import { APP_BASE_URL } from "@/lib/config/payment";

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export const metadata = { title: "Klantdossier · Kooprapport Zakelijk", robots: { index: false, follow: false } };

interface TijdlijnMoment {
  tekst: string;
  datum: string;
  href?: string;
}

export default async function ZakelijkKlantDetailPagina({ params }: { params: Promise<{ id: string }> }) {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");

  const { id } = await params;
  const dossier = await getKlantdossier(id);
  if (!dossier || dossier.orgId !== context.organisatie.id) notFound();

  const [rapporten, matches] = await Promise.all([listRapportenVoorKlant(id), listMatchenVoorKlant(id)]);
  // Nieuwste rapport in dit dossier -- meest relevante bandbreedte om te tonen
  // zolang er geen apart per-dossier "huidig bod"-veld bestaat.
  const laatsteBiedadvies = rapporten[0]
    ? berekenBiedadvies(rapporten[0].report.market.data?.geschatteWaarde, rapporten[0].adres.plaats)
    : null;
  const referentieDatum = rapporten[0]?.aangemaaktOp ?? dossier.aangemaaktOp;
  const nieuweCijfers = dossier.status === "lopend" && heeftNieuweMarktcijfersSinds(referentieDatum);
  const laatsteSlug = laatsteMarktupdateSlug();

  const tijdlijn: TijdlijnMoment[] = [
    { tekst: "Dossier aangemaakt", datum: dossier.aangemaaktOp },
    ...rapporten.map((r) => ({ tekst: `Rapport opgevraagd: ${r.adres.label}`, datum: r.aangemaaktOp, href: `/zakelijk/rapporten/${r.id}` })),
  ].sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());

  // Verkoperspresentatie: alleen relevant bij een verkoopdossier -- het is een
  // acquisitietool voor het waardebepalingsgesprek met een (potentiële)
  // verkoper, heeft geen functie bij een aankoopdossier (zie het
  // Cowork-gesprek "Verkoper-presentatie generator").
  const presentatieTab: KlantdossierTab[] =
    dossier.type === "verkoop"
      ? [
          {
            key: "presentatie",
            label: "Verkoperspresentatie",
            content: <VerkoperspresentatieGenerator dossierId={dossier.id} klantnaam={dossier.klantnaam} rapporten={rapporten} />,
          },
        ]
      : [];

  return (
    <div>
      <Link href="/zakelijk/klanten" className="text-[11px] font-semibold text-ink/50 hover:text-ink">
        ← Terug naar klanten
      </Link>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <p className="font-display text-xl font-extrabold text-ink">{dossier.klantnaam}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                dossier.status === "lopend" ? "bg-[#EEF0FF] text-accent" : "bg-ink/5 text-ink/50"
              }`}
            >
              {dossier.status === "lopend" ? "Lopend" : "Afgerond"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-ink/50">
            {dossier.type === "aankoop" ? "Aankooptraject" : "Verkooptraject"} · gestart {new Date(dossier.aangemaaktOp).toLocaleDateString("nl-NL")}
          </p>
        </div>
        <div className="flex gap-2">
          <DossierStatusKnop dossierId={dossier.id} status={dossier.status} />
          <Link
            href={`/zakelijk/rapporten/nieuw?klantId=${dossier.id}`}
            className="rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark"
          >
            + Rapport toevoegen
          </Link>
          <VerwijderDossierKnop dossierId={dossier.id} />
        </div>
      </div>

      {nieuweCijfers && laatsteSlug && (
        <Link
          href={`/marktupdates/${laatsteSlug}`}
          className="mt-4 flex items-center gap-2.5 rounded-2xl bg-[#EAF3DE] px-4 py-3 text-[12px] font-semibold text-[#3B6D11] hover:bg-[#DFEFCE]"
        >
          <TrendingUpIcon className="h-3.5 w-3.5 shrink-0" />
          Er zijn nieuwe marktcijfers gepubliceerd sinds het laatste rapport in dit dossier -- bekijk de update
        </Link>
      )}

      <KlantdossierTabs
        standaardTab="matches"
        tabs={[
          {
            key: "matches",
            label: "Zoekopdracht en matches",
            content: (
              <div className="flex flex-col gap-4">
                <ZoekopdrachtForm dossierId={dossier.id} huidig={dossier.zoekopdracht} />
                <MatchesKaart
                  matches={matches}
                  rapporten={rapporten}
                  dossierId={dossier.id}
                  matchenActief={dossier.zoekopdracht?.matchenActief ?? false}
                  zoekopdracht={dossier.zoekopdracht}
                />
                {laatsteBiedadvies && (
                  <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">Actueel biedadvies</p>
                    <p className="mt-1.5 font-display text-lg font-extrabold text-white">
                      {euro(laatsteBiedadvies.ondergrens)} – {euro(laatsteBiedadvies.bovengrens)}
                    </p>
                    <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/70">
                      Gebaseerd op het laatst opgevraagde rapport in dit dossier ({rapporten[0].adres.label}) en{" "}
                      {laatsteBiedadvies.niveau === "regio" ? `regio ${laatsteBiedadvies.regioNaam}` : "het landelijk gemiddelde"},{" "}
                      {laatsteBiedadvies.periodeLabel}.
                    </p>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "rapporten",
            label: `Rapporten (${rapporten.length})`,
            content: (
              // HERONTWERP (zie het Cowork-gesprek "Stuk mooier en duidelijker"):
              // was een kale, gedeelde lijst-kaart met alleen adres + datum per
              // rij (justify-between, geen context) -- nu losse kaarten per
              // rapport met een iconvlak en chips (type/geschatte waarde/datum)
              // zodat je zonder doorklikken al ziet wat erin zit, plus een
              // duidelijke CTA onderaan i.p.v. dat de tab na het laatste
              // rapport gewoon leeg lijkt op te houden.
              <div className="flex flex-col gap-2.5">
                {rapporten.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white px-5 py-9 text-center shadow-sm">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
                      <FileCheckIcon className="h-5 w-5" />
                    </span>
                    <p className="text-[12.5px] text-ink/50">Nog geen rapporten in dit dossier.</p>
                  </div>
                ) : (
                  rapporten.map((r) => {
                    const geschatteWaarde = r.report.market.data?.geschatteWaarde ?? null;
                    return (
                      // Geen <Link> meer om de HELE kaart (was zo bij de vorige
                      // versie) -- de download/deel-knoppen zijn echte <button>s
                      // (zie RapportKaartActies.tsx) en die mogen niet genest
                      // zitten in een <a>. De kaart-inhoud (icoon/titel/chips)
                      // en "Bekijk rapport" zijn nu allebei losse Links naar
                      // dezelfde rapportpagina, met de acties ertussenin.
                      <div key={r.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                        <Link href={`/zakelijk/rapporten/${r.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                            <HomeIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold text-ink">{r.adres.label}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-[#EEF0FF] px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                                {dossier.type === "aankoop" ? "Aankooprapport" : "Verkooprapport"}
                              </span>
                              {geschatteWaarde != null && (
                                <span className="rounded-full bg-mist px-2.5 py-0.5 text-[10px] font-semibold text-ink/60">
                                  Geschatte waarde {euro(geschatteWaarde)}
                                </span>
                              )}
                              <span className="rounded-full bg-mist px-2.5 py-0.5 text-[10px] font-semibold text-ink/60">
                                {new Date(r.aangemaaktOp).toLocaleDateString("nl-NL")}
                              </span>
                            </div>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-1">
                          <RapportKaartActies
                            rapportId={r.id}
                            report={r.report}
                            slug={r.report.core.address.slug}
                            initieleDeelUrl={r.deelToken ? `${APP_BASE_URL}/deelrapport/${r.deelToken}` : null}
                          />
                          <Link
                            href={`/zakelijk/rapporten/${r.id}`}
                            className="ml-1 flex items-center gap-1 rounded-lg bg-accent px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-accent-dark"
                          >
                            Bekijk rapport
                            <ArrowRightIcon className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
                <Link
                  href={`/zakelijk/rapporten/nieuw?klantId=${dossier.id}`}
                  className="flex items-center gap-2.5 rounded-2xl border border-dashed border-ink/15 px-5 py-3.5 text-[12px] font-semibold text-ink/40 hover:border-accent/40 hover:text-accent"
                >
                  + Nog een adres toevoegen aan dit dossier
                </Link>
              </div>
            ),
          },
          ...presentatieTab,
          {
            key: "vergelijken",
            label: "Vergelijken",
            content:
              rapporten.length < 2 ? (
                <p className="text-[12.5px] text-ink/40">Voeg minstens twee rapporten toe aan dit dossier om ze te kunnen vergelijken.</p>
              ) : (
                <DossierVergelijken rapporten={rapporten} />
              ),
          },
          {
            key: "tijdlijn",
            label: "Tijdlijn",
            content: (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                  {tijdlijn.map((moment, i) => (
                    <div key={`${moment.tekst}-${moment.datum}`} className="relative flex gap-3 pl-1">
                      <div className="flex flex-col items-center">
                        <span className={`h-2 w-2 rounded-full ${i === tijdlijn.length - 1 ? "bg-accent" : "bg-ink/20"}`} />
                        {i < tijdlijn.length - 1 && <span className="mt-1 w-px flex-1 bg-ink/10" />}
                      </div>
                      <div className="pb-1">
                        {moment.href ? (
                          <Link href={moment.href} className="text-[11.5px] font-semibold text-ink hover:text-accent">
                            {moment.tekst}
                          </Link>
                        ) : (
                          <p className="text-[11.5px] font-semibold text-ink">{moment.tekst}</p>
                        )}
                        <p className="text-[10px] text-ink/40">{new Date(moment.datum).toLocaleDateString("nl-NL")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
