import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { overbiedenVoorWerkgebied, editorialeNamenVoorRegio } from "@/lib/content/regioOverbieden";
import { regioContextZin } from "@/lib/content/woningmarktRegios";
import { alleGebruikteRegioNamen, laatsteMarktupdateSlug } from "@/lib/services/marktAlert";
import { getMarktupdateBySlug } from "@/lib/content/marktupdates";
import { MapPinIcon, TrendingUpIcon, ShieldCheckIcon } from "@/components/report/icons";
import RegiosBeherenPaneel from "@/components/zakelijk/RegiosBeherenPaneel";
import WerkgebiedRegioGrid, { type WerkgebiedRegioWeergave } from "@/components/zakelijk/WerkgebiedRegioGrid";

export const metadata = { title: "Werkgebied · Kooprapport Zakelijk", robots: { index: false, follow: false } };

// -----------------------------------------------------------------------------
// Dedicated, visueel blok met de officiële NVM-kwartaalcijfers voor het
// werkgebied van de organisatie -- herbouwd (variant 1, "rustig paneel") om
// meer van de al beschikbare data te tonen, i.p.v. alleen % boven vraagprijs
// en gemiddeld overbod:
//   - jaarvergelijking + richting (MarktupdateRegioRij, alleen beschikbaar
//     voor de handjevol regio's die in de nieuwste Marktupdate genoemd
//     worden -- editorialeNamenVoorRegio() koppelt dit aan de juiste
//     COROP-kaart, ontbreekt gewoon stilzwijgend bij de rest, geen
//     verzonnen cijfers).
//   - regioContextZin(): een al bestaande, uit de cijfers zelf afgeleide
//     zin die de regio vergelijkt met het landelijk gemiddelde (was tot nu
//     toe alleen op de publieke regiopagina's gebruikt).
//   - een sorteerbaar raster + een rustig "warmste regio"-paneel i.p.v. de
//     eerdere platte kaartengrid.
//   - regio's beheren kan nu ook direct op deze pagina (RegiosBeherenPaneel,
//     hergebruikt WerkgebiedForm), niet meer alleen via Instellingen.
//
// BEWUST NIET toegevoegd: een gemiddelde verkoopprijs of NHG-status per
// regio -- die data bestaat niet op regioniveau (REGIO_OVERBIEDEN heeft
// alleen % boven vraagprijs en gemiddeld overbod), alleen landelijk
// (marktupdate.betaalbaarheid). Die landelijke cijfers staan hieronder wél,
// duidelijk gelabeld als landelijk, i.p.v. ze onterecht als regiospecifiek
// te presenteren.
// -----------------------------------------------------------------------------

export default async function WerkgebiedPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");
  const { organisatie } = context;

  const werkgebied = organisatie.werkgebiedRegios ?? [];
  const ruweCijfers = overbiedenVoorWerkgebied(werkgebied);
  const laatsteSlug = laatsteMarktupdateSlug();
  const laatsteUpdate = laatsteSlug ? getMarktupdateBySlug(laatsteSlug) : undefined;
  const landelijkOverbodStat = laatsteUpdate?.landelijkeCijfers.stats.find((s) => s.label === "overboden")?.waarde;
  const landelijkGemiddeldOverbod = landelijkOverbodStat ? Number(landelijkOverbodStat.replace("%", "").replace(",", ".")) : null;

  const cijfers: WerkgebiedRegioWeergave[] = ruweCijfers.map((regio) => {
    const editorialeNamen = editorialeNamenVoorRegio(regio.regio);
    const rij = laatsteUpdate?.perRegio.rijen.find((r) => editorialeNamen.includes(r.naam));
    return {
      regio: regio.regio,
      provincie: regio.provincie,
      gemeenten: regio.gemeenten,
      percentageBovenVraagprijs: regio.percentageBovenVraagprijs,
      gemiddeldOverbod: regio.gemiddeldOverbod,
      periodeLabel: regio.periodeLabel,
      bron: regio.bron,
      bronUrl: regio.bronUrl,
      contextZin: regioContextZin(regio, landelijkGemiddeldOverbod),
      trend: rij ? { jaarVergelijking: rij.jaarVergelijking, richting: rij.richting } : null,
    };
  });

  const gemWerkgebiedOverbod =
    cijfers.length > 0 ? cijfers.reduce((som, r) => som + r.gemiddeldOverbod, 0) / cijfers.length : null;
  const verschilMetLandelijk =
    gemWerkgebiedOverbod != null && landelijkGemiddeldOverbod != null ? gemWerkgebiedOverbod - landelijkGemiddeldOverbod : null;
  const warmsteRegio = cijfers.length > 0 ? [...cijfers].sort((a, b) => b.percentageBovenVraagprijs - a.percentageBovenVraagprijs)[0] : null;

  const nhgGrens = laatsteUpdate?.betaalbaarheid.nhgGrens;
  const landelijkGemPrijs = laatsteUpdate?.betaalbaarheid.gemPrijs;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl font-extrabold text-ink">Werkgebied</p>
          <p className="mt-1 text-[12px] text-ink/50">
            {werkgebied.length > 0 ? (
              <>
                Officiële NVM-kwartaalcijfers voor {cijfers.length} regio{cijfers.length === 1 ? "" : "'s"}
                {laatsteUpdate ? ` · ${laatsteUpdate.periodeLabel}` : ""}
              </>
            ) : (
              <>Nog geen werkgebied ingesteld</>
            )}
          </p>
        </div>
        <Link
          href="/zakelijk/instellingen"
          className="shrink-0 text-[11px] font-semibold text-ink/40 hover:text-ink/60"
        >
          Branding &amp; abonnement →
        </Link>
      </div>

      <div className="mt-4">
        <RegiosBeherenPaneel alleRegioNamen={alleGebruikteRegioNamen()} huidig={werkgebied} startOpen={werkgebied.length === 0} />
      </div>

      {werkgebied.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
            <MapPinIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-ink">Stel eerst uw werkgebied in</p>
            <p className="mt-1 max-w-sm text-[11.5px] text-ink/50">
              Kies hierboven bij &quot;Regio&apos;s beheren&quot; één of meer regio&apos;s. Hier verschijnen dan direct de
              officiële NVM-kwartaalcijfers (% boven vraagprijs, gemiddeld overbod, jaarvergelijking) voor precies die
              regio&apos;s.
            </p>
          </div>
        </div>
      )}

      {werkgebied.length > 0 && cijfers.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-ink/15 bg-white px-5 py-6 text-[11.5px] text-ink/50">
          Voor uw huidige werkgebied ({werkgebied.join(", ")}) zijn nog geen gedetailleerde regio-kwartaalcijfers
          beschikbaar. Zodra dit bijgewerkt is, verschijnen hier de cijfers automatisch.
        </div>
      )}

      {cijfers.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Regio&apos;s actief</p>
              <p className="font-display mt-1.5 text-[22px] font-extrabold text-ink">{cijfers.length}</p>
              <p className="mt-0.5 text-[10.5px] text-ink/40">van de 37 met officiële cijfers</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Gem. overbod (uw werkgebied)</p>
              <p className="font-display mt-1.5 text-[22px] font-extrabold text-ink">
                {gemWerkgebiedOverbod != null ? `${gemWerkgebiedOverbod > 0 ? "+" : ""}${gemWerkgebiedOverbod.toFixed(1).replace(".", ",")}%` : "—"}
              </p>
              {verschilMetLandelijk != null && (
                <p className={`mt-0.5 text-[10.5px] font-semibold ${verschilMetLandelijk > 0 ? "text-[#B3410C]" : "text-[#3B6D11]"}`}>
                  {verschilMetLandelijk > 0 ? "▲" : "▼"} {Math.abs(verschilMetLandelijk).toFixed(1).replace(".", ",")}pt{" "}
                  {verschilMetLandelijk > 0 ? "boven" : "onder"} landelijk
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Warmste regio</p>
              <p className="font-display mt-1.5 text-[18px] font-extrabold text-ink">{warmsteRegio?.regio}</p>
              <p className="mt-0.5 text-[10.5px] text-ink/40">{warmsteRegio?.percentageBovenVraagprijs}% boven vraagprijs</p>
            </div>
          </div>

          {nhgGrens != null && landelijkGemPrijs != null && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-[11.5px] text-ink/55 shadow-sm">
              <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
              Landelijk (niet regiospecifiek): de gemiddelde verkoopprijs dit kwartaal is{" "}
              <span className="font-bold text-ink">
                {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
                  landelijkGemPrijs
                )}
              </span>
              , tegenover een NHG-grens van{" "}
              <span className="font-bold text-ink">
                {new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(nhgGrens)}
              </span>
              {landelijkGemPrijs > nhgGrens ? " — het gemiddelde huis valt daar dus al buiten." : "."}
            </div>
          )}

          {landelijkGemiddeldOverbod != null && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-[11.5px] text-ink/55 shadow-sm">
              <TrendingUpIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
              Landelijk werd dit kwartaal gemiddeld{" "}
              <span className="font-bold text-ink">{landelijkGemiddeldOverbod.toFixed(1).replace(".", ",")}%</span> boven de
              vraagprijs betaald — ter vergelijking met de cijfers hieronder.
            </div>
          )}

          <div className="mt-5">
            <WerkgebiedRegioGrid cijfers={cijfers} />
          </div>
        </>
      )}
    </div>
  );
}
