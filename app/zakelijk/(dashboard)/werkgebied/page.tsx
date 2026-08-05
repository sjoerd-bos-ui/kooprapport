import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import { overbiedenVoorWerkgebied } from "@/lib/content/regioOverbieden";
import { laatsteMarktupdateSlug } from "@/lib/services/marktAlert";
import { getMarktupdateBySlug } from "@/lib/content/marktupdates";
import { MapPinIcon, TrendingUpIcon, ArrowRightIcon } from "@/components/report/icons";

export const metadata = { title: "Werkgebied · Kooprapport Zakelijk", robots: { index: false, follow: false } };

// -----------------------------------------------------------------------------
// Dedicated, visueel blok (#1) met de officiële NVM-kwartaalcijfers voor het
// al ingestelde werkgebied van de organisatie (zie WerkgebiedForm in
// instellingen) -- "onze gegevens" zijn hier bewust de brongegevens uit
// lib/content/regioOverbieden.ts (REGIO_OVERBIEDEN, met bron/bronUrl per
// regio), losstaand van en rijker dan de korte marktmelding-banner op het
// dashboard. Zie overbiedenVoorWerkgebied() voor hoe dit teruggekoppeld wordt
// aan het al gekozen werkgebied zonder een tweede, losse regioselectie nodig
// te hebben.
// -----------------------------------------------------------------------------

function overbiedKleur(pct: number): { tekst: string; bg: string; balk: string } {
  if (pct >= 75) return { tekst: "text-[#B3410C]", bg: "bg-[#FBEAE0]", balk: "bg-[#D9601F]" };
  if (pct >= 55) return { tekst: "text-[#8A6200]", bg: "bg-[#FBF2DC]", balk: "bg-[#C99A1E]" };
  return { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]", balk: "bg-[#5D9130]" };
}

export default async function WerkgebiedPagina() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");
  const { organisatie } = context;

  const werkgebied = organisatie.werkgebiedRegios ?? [];
  const cijfers = overbiedenVoorWerkgebied(werkgebied);
  const laatsteSlug = laatsteMarktupdateSlug();
  const laatsteUpdate = laatsteSlug ? getMarktupdateBySlug(laatsteSlug) : undefined;
  const landelijkOverboden = laatsteUpdate?.landelijkeCijfers.stats.find((s) => s.label === "overboden")?.waarde;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl font-extrabold text-ink">Werkgebied</p>
          <p className="mt-1 text-[12px] text-ink/50">
            {werkgebied.length > 0 ? (
              <>Officiële NVM-kwartaalcijfers voor {werkgebied.join(", ")}</>
            ) : (
              <>Nog geen werkgebied ingesteld</>
            )}
          </p>
        </div>
        <Link
          href="/zakelijk/instellingen"
          className="shrink-0 rounded-lg bg-white px-3.5 py-2 text-[11.5px] font-semibold text-ink shadow-sm hover:bg-mist"
        >
          Werkgebied wijzigen
        </Link>
      </div>

      {werkgebied.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF0FF] text-accent">
            <MapPinIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-ink">Stel eerst uw werkgebied in</p>
            <p className="mt-1 max-w-sm text-[11.5px] text-ink/50">
              Kies bij Instellingen één of meer regio&apos;s. Hier verschijnen dan direct de officiële NVM-kwartaalcijfers
              (% boven vraagprijs, gemiddeld overbod) voor precies die regio&apos;s.
            </p>
          </div>
          <Link
            href="/zakelijk/instellingen"
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark"
          >
            Werkgebied instellen <ArrowRightIcon className="h-3 w-3" />
          </Link>
        </div>
      )}

      {werkgebied.length > 0 && cijfers.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-white px-5 py-6 text-[11.5px] text-ink/50">
          Voor uw huidige werkgebied ({werkgebied.join(", ")}) zijn nog geen gedetailleerde regio-kwartaalcijfers
          beschikbaar. Zodra dit bijgewerkt is, verschijnen hier de cijfers automatisch.
        </div>
      )}

      {cijfers.length > 0 && (
        <>
          {landelijkOverboden && (
            <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-[11.5px] text-ink/55 shadow-sm">
              <TrendingUpIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
              Landelijk werd dit kwartaal gemiddeld in <span className="font-bold text-ink">{landelijkOverboden}</span> van
              de gevallen boven de vraagprijs verkocht — ter vergelijking met de cijfers hieronder.
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cijfers.map((regio) => {
              const kleur = overbiedKleur(regio.percentageBovenVraagprijs);
              const zichtbareGemeenten = regio.gemeenten.slice(0, 3);
              const restGemeenten = regio.gemeenten.length - zichtbareGemeenten.length;
              return (
                <div key={regio.regio} className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full"
                    style={{ background: "radial-gradient(circle, #4F46E512 0%, rgba(79,70,229,0) 70%)" }}
                  />
                  <div className="relative flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-extrabold text-ink">{regio.regio}</p>
                      <p className="text-[10.5px] text-ink/45">{regio.provincie}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${kleur.bg} ${kleur.tekst}`}>
                      {regio.periodeLabel}
                    </span>
                  </div>

                  <div className="relative mt-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-display text-[28px] font-extrabold leading-none ${kleur.tekst}`}>
                        {regio.percentageBovenVraagprijs}%
                      </span>
                      <span className="text-[10.5px] text-ink/45">boven vraagprijs verkocht</span>
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                      <div
                        className={`h-full rounded-full ${kleur.balk}`}
                        style={{ width: `${Math.min(100, Math.max(4, regio.percentageBovenVraagprijs))}%` }}
                      />
                    </div>
                  </div>

                  <p className="relative mt-3.5 text-[11.5px] text-ink/60">
                    Gemiddeld{" "}
                    <span className="font-bold text-ink">
                      {regio.gemiddeldOverbod > 0 ? "+" : ""}
                      {regio.gemiddeldOverbod.toLocaleString("nl-NL")}%
                    </span>{" "}
                    boven de vraagprijs verkocht.
                  </p>

                  <p className="relative mt-2 text-[10.5px] text-ink/40">
                    {zichtbareGemeenten.join(", ")}
                    {restGemeenten > 0 ? ` en ${restGemeenten} andere gemeenten` : ""}
                  </p>

                  <a
                    href={regio.bronUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative mt-3.5 block truncate text-[10px] font-semibold text-accent hover:underline"
                  >
                    Bron: {regio.bron} ↗
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
