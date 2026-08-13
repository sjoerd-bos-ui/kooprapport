import Link from "next/link";
import type { B2bWoningMatch, B2bRapportAanvraag } from "@/types/b2b";
import { vindGekoppeldRapport } from "@/lib/services/matchRapportKoppeling";
import { TrendingUpIcon } from "@/components/report/icons";
import FavorietenVergelijkTabel from "@/components/zakelijk/FavorietenVergelijkTabel";
import DeelFavorietenKnop from "@/components/zakelijk/DeelFavorietenKnop";

// -----------------------------------------------------------------------------
// "Favorieten vergelijken"-tab: wikkelt de zuivere FavorietenVergelijkTabel
// (foto's + kenmerken, zie dat bestand) in met de klantdossier-context die
// alleen hier relevant is -- de deelknop en de CTA om voor een favoriet
// zonder rapport er alsnog een aan te vragen. Bewust GEEN van die twee dingen
// in FavorietenVergelijkTabel zelf, want die wordt ook kaal hergebruikt op de
// publieke deelpagina (app/deelfavorieten/[token]), waar een koper niets te
// zoeken heeft bij interne acties als "rapport aanvragen".
// -----------------------------------------------------------------------------
export default function FavorietenVergelijken({
  favorieten,
  rapporten,
  dossierId,
  initieleDeelUrl,
}: {
  favorieten: B2bWoningMatch[];
  rapporten: B2bRapportAanvraag[];
  dossierId: string;
  initieleDeelUrl: string | null;
}) {
  const zonderRapport = favorieten.filter((m) => !vindGekoppeldRapport(m.titel, rapporten));

  return (
    <div>
      {favorieten.length >= 2 && (
        <div className="mb-3 flex justify-end">
          <DeelFavorietenKnop dossierId={dossierId} initieleDeelUrl={initieleDeelUrl} />
        </div>
      )}

      <FavorietenVergelijkTabel favorieten={favorieten} />

      {favorieten.length >= 2 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[#EEF0FF] px-4 py-3.5">
          <TrendingUpIcon className="h-4 w-4 shrink-0 text-accent" />
          <p className="min-w-[220px] flex-1 text-[12px] text-[#26215C]">
            Deze vergelijking is gebaseerd op Funda-advertentiegegevens. Vraag voor deze panden een rapport aan voor bouwtechnisch risico,
            leefbaarheid en biedadvies naast elkaar in de tab <span className="font-bold">Vergelijken</span>.
          </p>
          {zonderRapport.length > 0 && (
            <Link
              href={`/zakelijk/rapporten/nieuw?klantId=${dossierId}&adres=${encodeURIComponent(zonderRapport[0].titel)}`}
              className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-accent-dark"
            >
              Rapport aanvragen
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
