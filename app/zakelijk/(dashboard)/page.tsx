import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2bSessieUitCookies } from "@/lib/services/b2bAuth";
import {
  huidigVerbruik,
  listRapportenVoorOrg,
  listKlantdossiersVoorOrg,
  listMatchenVoorKlant,
} from "@/lib/services/b2bStore";
import { getMarktMeldingen } from "@/lib/services/marktAlert";
import type { B2bKlantdossier } from "@/types/b2b";
import { FileCheckIcon, UsersIcon, TrendingUpIcon, MailIcon, SparklesIcon } from "@/components/report/icons";

export const metadata = { title: "Dashboard · Kooprapport Zakelijk", robots: { index: false, follow: false } };

const ZEVEN_DAGEN_MS = 7 * 24 * 60 * 60 * 1000;

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

export default async function ZakelijkDashboardHome() {
  const context = await getB2bSessieUitCookies();
  if (!context) redirect("/zakelijk/login");
  const { gebruiker, organisatie } = context;

  const [verbruikt, rapporten, klanten] = await Promise.all([
    huidigVerbruik(organisatie.id),
    listRapportenVoorOrg(organisatie.id),
    listKlantdossiersVoorOrg(organisatie.id),
  ]);
  const meldingen = getMarktMeldingen(organisatie.werkgebiedRegios);
  const lopendeKlanten = klanten.filter((k) => k.status === "lopend");
  const lopendeDossiers = lopendeKlanten.length;

  // Matches per lopend dossier ophalen om "nieuwe matches deze week" en de
  // "vraagt om aandacht"-sectie te vullen -- er is bewust geen org-brede
  // matchlijst (zie listMatchenVoorKlant in b2bStore.ts), dus per klant
  // parallel ophalen. Bij een normaal kantoor (hooguit enkele tientallen
  // lopende dossiers) is dat prima voor een server component die eenmalig
  // per paginabezoek rendert.
  const matchesPerKlant = await Promise.all(
    lopendeKlanten.map(async (klant) => ({ klant, matches: await listMatchenVoorKlant(klant.id) })),
  );

  const nu = Date.now();
  let nieuweMatchesDezeWeek = 0;
  const dossiersMetNieuweMatches: { klant: B2bKlantdossier; aantal: number; laatste: string }[] = [];
  for (const { klant, matches } of matchesPerKlant) {
    const recent = matches.filter((m) => nu - new Date(m.gevondenOp).getTime() < ZEVEN_DAGEN_MS);
    nieuweMatchesDezeWeek += recent.length;
    if (recent.length > 0) {
      const laatste = recent.reduce((max, m) => (m.gevondenOp > max ? m.gevondenOp : max), recent[0].gevondenOp);
      dossiersMetNieuweMatches.push({ klant, aantal: recent.length, laatste });
    }
  }
  dossiersMetNieuweMatches.sort((a, b) => b.laatste.localeCompare(a.laatste));

  const wachtOpKoperbevestiging = lopendeKlanten.filter(
    (k) => k.zoekopdracht?.emailKoper && k.zoekopdracht.mailBijNieuweMatches && !k.zoekopdracht.emailKoperBevestigd,
  );

  const aandachtItems = [
    ...wachtOpKoperbevestiging.map((klant) => ({ soort: "koper" as const, klant })),
    ...dossiersMetNieuweMatches.map(({ klant, aantal, laatste }) => ({ soort: "match" as const, klant, aantal, laatste })),
  ].slice(0, 4);

  // Werkgebied-ranglijst: gebaseerd op de plaatsen van daadwerkelijk
  // aangevraagde rapporten (echte data, geen aanname) -- niet op
  // organisatie.werkgebiedRegios, want dat zijn de geconfigureerde regio's
  // voor marktmeldingen, niet waar de activiteit daadwerkelijk zit.
  const plaatsTelling = new Map<string, number>();
  for (const r of rapporten) {
    const plaats = r.adres.plaats || "Onbekend";
    plaatsTelling.set(plaats, (plaatsTelling.get(plaats) ?? 0) + 1);
  }
  const topPlaatsen = [...plaatsTelling.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxPlaatsAantal = topPlaatsen[0]?.[1] ?? 1;

  const quotum = organisatie.quotumPerMaand;
  const quotumPercentage = quotum > 0 ? Math.min(100, Math.round((verbruikt / quotum) * 100)) : 0;
  const ringR = 52;
  const ringOmtrek = 2 * Math.PI * ringR;
  const ringOffset = ringOmtrek * (1 - quotumPercentage / 100);

  const vandaag = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:p-7">
        <div>
          <p className="text-[12.5px] text-ink/55">
            {organisatie.naam} · {vandaag}
          </p>
          <p className="mt-1.5 font-display text-2xl font-extrabold text-ink sm:text-[26px]">
            Goedemorgen, {gebruiker.naam.split(" ")[0]}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href="/zakelijk/rapporten/nieuw" className="rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-accent-dark">
              + Nieuw rapport aanvragen
            </Link>
            <Link href="/zakelijk/vergelijken" className="rounded-lg bg-white px-4 py-2.5 text-[12px] font-semibold text-ink shadow-sm hover:bg-mist">
              Panden vergelijken
            </Link>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-center text-center">
          <svg width="112" height="112" viewBox="0 0 128 128" role="img" aria-label={`Quotum: ${verbruikt} van ${quotum} rapporten gebruikt deze maand`}>
            <circle cx="64" cy="64" r={ringR} fill="none" stroke="#E4E4EC" strokeWidth="11" />
            <circle
              cx="64"
              cy="64"
              r={ringR}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={ringOmtrek.toFixed(1)}
              strokeDashoffset={ringOffset.toFixed(1)}
              transform="rotate(-90 64 64)"
            />
            <text x="64" y="60" textAnchor="middle" fontSize="24" fontWeight="800" fill="#1F1F2E">
              {quotumPercentage}%
            </text>
            <text x="64" y="80" textAnchor="middle" fontSize="12" fill="#1F1F2E99">
              {verbruikt} van {quotum}
            </text>
          </svg>
          <p className="mt-2 text-[11.5px] text-ink/55">Quotum deze maand</p>
        </div>
      </div>

      {meldingen.length > 0 && (
        <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)" }}
          />
          <p className="relative flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-white/65">
            <TrendingUpIcon className="h-3 w-3" /> Marktmelding
            {organisatie.werkgebiedRegios && organisatie.werkgebiedRegios.length > 0 && (
              <span className="font-normal normal-case text-white/50">· voor uw werkgebied</span>
            )}
          </p>
          <div className="relative mt-2.5 flex flex-col gap-1.5">
            {meldingen.slice(0, 2).map((m) => (
              <p key={m.regio.naam} className="text-[12.5px] text-white">
                <span className="font-bold">{m.regio.naam}:</span> {m.regio.jaarVergelijking} ({m.regio.extra}) —{" "}
                <Link href={`/marktupdates/${m.marktupdateSlug}`} className="underline underline-offset-2">
                  bekijk {m.periodeLabel}
                </Link>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-mist p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-accent">
            <FileCheckIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-accent">{verbruikt}</p>
          <p className="mt-0.5 text-[10.5px] text-accent/70">rapporten deze maand</p>
        </div>
        <div className="rounded-2xl bg-[#EAF3DE] p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#3B6D11]">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-[#3B6D11]">{nieuweMatchesDezeWeek}</p>
          <p className="mt-0.5 text-[10.5px] text-[#3B6D11]/70">nieuwe matches deze week</p>
        </div>
        <div className="rounded-2xl bg-ink/5 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink">
            <UsersIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-ink">{lopendeDossiers}</p>
          <p className="mt-0.5 text-[10.5px] text-ink/50">actieve klantdossiers</p>
        </div>
        <div className="rounded-2xl bg-sun/10 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sun">
            <MailIcon className="h-4 w-4" />
          </span>
          <p className="mt-2.5 font-display text-xl font-extrabold text-sun">{wachtOpKoperbevestiging.length}</p>
          <p className="mt-0.5 text-[10.5px] text-sun/80">wachten op koper</p>
        </div>
      </div>

      <p className="mt-7 text-[11px] font-bold uppercase tracking-wide text-ink/40">Vraagt om aandacht</p>
      <div className="mt-2.5 flex flex-col gap-2">
        {aandachtItems.length === 0 ? (
          <div className="rounded-2xl bg-white px-5 py-4 text-[12.5px] text-ink/50 shadow-sm">
            Niets dat om actie vraagt — alle koperbevestigingen zijn binnen en er zijn geen nieuwe matches sinds vorige week.
          </div>
        ) : (
          aandachtItems.map((item) =>
            item.soort === "koper" ? (
              <div key={`koper-${item.klant.id}`} className="flex items-start gap-3 rounded-2xl border-l-[3px] border-sun bg-white py-3 pl-4 pr-3.5 shadow-sm">
                <MailIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-sun" />
                <div className="flex-1">
                  <p className="text-[12.5px] font-semibold text-ink">
                    Koperbevestiging nog niet ontvangen — dossier {item.klant.klantnaam}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink/40">Wacht nog op een reactie van de koper</p>
                </div>
                <Link
                  href={`/zakelijk/klanten/${item.klant.id}`}
                  className="mt-0.5 flex-shrink-0 rounded-lg bg-mist px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent hover:text-white"
                >
                  Openen
                </Link>
              </div>
            ) : (
              <div key={`match-${item.klant.id}`} className="flex items-start gap-3 rounded-2xl border-l-[3px] border-[#3B6D11] bg-white py-3 pl-4 pr-3.5 shadow-sm">
                <SparklesIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#3B6D11]" />
                <div className="flex-1">
                  <p className="text-[12.5px] font-semibold text-ink">
                    {item.aantal} nieuwe {item.aantal === 1 ? "match" : "matches"} voor dossier {item.klant.klantnaam}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink/40">Laatste match: {relatieveTijd(item.laatste)}</p>
                </div>
                <Link
                  href={`/zakelijk/klanten/${item.klant.id}`}
                  className="mt-0.5 flex-shrink-0 rounded-lg bg-mist px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent hover:text-white"
                >
                  Bekijken
                </Link>
              </div>
            ),
          )
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Recente rapporten</p>
          {rapporten.length === 0 ? (
            <div className="mt-2.5 flex flex-col items-center gap-3 rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mist text-accent">
                <FileCheckIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-ink">Nog geen rapporten aangevraagd</p>
                <p className="mt-1 text-[11.5px] text-ink/50">Vul een adres in en het eerste rapport staat binnen enkele seconden klaar.</p>
              </div>
              <Link href="/zakelijk/rapporten/nieuw" className="mt-1 rounded-lg bg-accent px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-accent-dark">
                + Eerste rapport aanvragen
              </Link>
            </div>
          ) : (
            <div className="relative mt-4 pl-5">
              <div className="absolute bottom-1 left-[3px] top-1 w-px bg-line" aria-hidden="true" />
              {rapporten.slice(0, 6).map((r, i) => (
                <div key={r.id} className={`relative ${i === Math.min(rapporten.length, 6) - 1 ? "" : "pb-4"}`}>
                  <span className="absolute -left-5 top-1 h-2 w-2 rounded-full border-2 border-parchment bg-accent" aria-hidden="true" />
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/zakelijk/rapporten/${r.id}`} className="text-[13px] font-semibold text-ink hover:text-accent">
                      {r.adres.label}
                    </Link>
                    <span className="flex-shrink-0 text-[11px] text-ink/40">{new Date(r.aangemaaktOp).toLocaleDateString("nl-NL")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Werkgebied</p>
          {topPlaatsen.length === 0 ? (
            <p className="mt-3 text-[12px] text-ink/40">Nog geen rapporten om een werkgebied uit af te leiden.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {topPlaatsen.map(([plaats, aantal]) => (
                <div key={plaats}>
                  <div className="flex items-baseline justify-between text-[12.5px]">
                    <span className="font-semibold text-ink">{plaats}</span>
                    <span className="text-ink/40">
                      {aantal} {aantal === 1 ? "rapport" : "rapporten"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(8, Math.round((aantal / maxPlaatsAantal) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-7 text-[11px] font-bold uppercase tracking-wide text-ink/40">Snelkoppelingen</p>
          <div className="mt-2.5 flex flex-col gap-1.5">
            <Link href="/zakelijk/klanten" className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-sm hover:bg-mist">
              <UsersIcon className="h-4 w-4 text-ink/40" /> Klanten beheren
            </Link>
            <Link href="/zakelijk/werkgebied" className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-sm hover:bg-mist">
              <TrendingUpIcon className="h-4 w-4 text-ink/40" /> Werkgebied bekijken
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
