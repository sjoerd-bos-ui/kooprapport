import type { B2bWoningMatch } from "@/types/b2b";
import { BoltIcon, ArrowRightIcon } from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Toont de opgeslagen matches (#2) voor een klantdossier -- puur
// presentationeel, geen client-state nodig (de matches zelf worden server-
// side opgehaald via listMatchenVoorKlant, zie klanten/[id]/page.tsx). Zonder
// echte foto uit de feed (meestal het geval, zie fundaFeed.ts) valt dit terug
// op een neutrale, flat huisillustratie i.p.v. een kapot afbeeldingsicoon.
// -----------------------------------------------------------------------------

const HUIS_KLEUREN = [
  { lucht: "#D7E6F2", dak: "#8B5E3C", muur: "#EFE3CE" },
  { lucht: "#E3D9EC", dak: "#6B5544", muur: "#F2EAD8" },
  { lucht: "#DDE7EF", dak: "#7A4A34", muur: "#E9DFC9" },
];

function HuisIllustratie({ index }: { index: number }) {
  const k = HUIS_KLEUREN[index % HUIS_KLEUREN.length];
  return (
    <svg width="88" height="72" viewBox="0 0 104 88" style={{ borderRadius: 10, flexShrink: 0 }}>
      <rect width="104" height="88" fill={k.lucht} />
      <rect y="58" width="104" height="30" fill="#D9E4C9" />
      <polygon points="14,58 52,30 90,58" fill={k.dak} />
      <rect x="20" y="58" width="64" height="30" fill={k.muur} />
      <rect x="46" y="70" width="12" height="18" fill="#6B4A32" />
      <rect x="26" y="64" width="10" height="10" fill="#4A5A6B" />
      <rect x="68" y="64" width="10" height="10" fill="#4A5A6B" />
    </svg>
  );
}

function relatieveTijd(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minuten = Math.floor(ms / 60000);
  if (minuten < 60) return `${Math.max(1, minuten)} min. geleden`;
  const uren = Math.floor(minuten / 60);
  if (uren < 24) return `${uren} uur geleden`;
  const dagen = Math.floor(uren / 24);
  if (dagen === 1) return "gisteren";
  return `${dagen} dagen geleden`;
}

const BRON_LABEL: Record<string, string> = { funda: "Funda" };

export default function MatchesKaart({ matches }: { matches: B2bWoningMatch[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">
          <BoltIcon className="h-3 w-3 text-accent" /> Nieuwe matches
        </p>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-white">{matches.length}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        {matches.map((m, i) => (
          <a
            key={m.id}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 rounded-xl border border-ink/[0.06] p-2.5 hover:bg-mist/40"
          >
            {m.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.fotoUrl} alt="" className="h-[72px] w-[88px] shrink-0 rounded-[10px] object-cover" />
            ) : (
              <HuisIllustratie index={i} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#EAF3DE] px-1.5 py-0.5 text-[9px] font-bold text-[#3B6D11]">
                  {BRON_LABEL[m.bron] ?? m.bron}
                </span>
                <span className="text-[10px] text-ink/40">{relatieveTijd(m.gevondenOp)}</span>
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold text-ink">{m.titel}</p>
              {m.prijsLabel && <p className="text-[11px] text-ink/50">{m.prijsLabel}</p>}
            </div>
            <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 self-center text-ink/25" />
          </a>
        ))}
      </div>
    </div>
  );
}
