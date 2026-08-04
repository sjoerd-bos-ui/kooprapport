"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import type { AddressMeta, Report } from "@/types/report";
import { fetchLiveAddressSuggestions, searchAddressSuggestions } from "@/lib/services/addressLookup";
import { resolveFundaUrl, type FundaLinkParseResult } from "@/lib/services/fundaLink";
import { berekenBiedscenarios, formatOverbiedPercentage, type Biedscenarios } from "@/lib/services/biedadvies";
import { buildReportHref } from "@/lib/utils/slug";
import { RAPPORT_PRIJS } from "@/lib/utils/prijs";
import {
  LinkIcon,
  HomeIcon,
  ShieldCheckIcon,
  ScaleIcon,
  TrendingDownIcon,
  BulbIcon,
  TrendingUpIcon,
  HistoryIcon,
  BuildingIcon,
  BoltIcon,
  LeafIcon,
  AlertTriangleIcon,
  FlagIcon,
} from "@/components/report/icons";

// -----------------------------------------------------------------------------
// Twee manieren om aan een adres te komen (link plakken of zelf zoeken)
// leiden hierna ALTIJD naar hetzelfde: een AL BEVESTIGD AddressMeta, nooit
// een geraden adres (zelfde regel als AddressSearchBar.tsx/addressLookup.ts).
// Een Funda-link levert bovendien nooit een waarde of vraagprijs -- alleen
// het adres (+ eventueel woningtype, rechtstreeks uit de URL, zie
// fundaLink.ts). De AVM-schatting kost credits per aanroep en wordt daarom,
// net als in het betaalde rapport zelf, hier nooit opgehaald: de bezoeker
// vult de waarde altijd zelf in.
//
// Zodra een adres bekend is, halen we via POST /api/rapport (bestaande,
// server-side route) de GRATIS onderdelen op (BAG/EP-Online/funderings-
// indicatie) -- market/nearbySales/verduurzaming staan daar standaard
// "uitgesteld" in (zie reportService.ts), dus deze aanroep raakt Altum nooit.
// -----------------------------------------------------------------------------

const ONDERDELEN = [
  { icon: TrendingUpIcon, titel: "Waarde-indicatie" },
  { icon: HistoryIcon, titel: "Verkopen in de buurt" },
  { icon: BuildingIcon, titel: "Objectgegevens" },
  { icon: BoltIcon, titel: "Energielabel" },
  { icon: LeafIcon, titel: "Verduurzaming" },
  { icon: AlertTriangleIcon, titel: "Funderingsrisico" },
  { icon: ShieldCheckIcon, titel: "Buurtprofiel" },
  { icon: FlagIcon, titel: "Samenvatting" },
];

const SCENARIO_ICOON: Record<Biedscenarios["scenarios"][number]["key"], ComponentType<{ className?: string }>> = {
  laag: ShieldCheckIcon,
  gemiddeld: ScaleIcon,
  hoog: TrendingDownIcon,
};
const SCENARIO_KLEUR: Record<Biedscenarios["scenarios"][number]["key"], { tekst: string; bg: string }> = {
  laag: { tekst: "text-[#3B6D11]", bg: "bg-[#EAF3DE]" },
  gemiddeld: { tekst: "text-sun", bg: "bg-sun/10" },
  hoog: { tekst: "text-rust", bg: "bg-rust/10" },
};

interface Feiten {
  bouwjaar: number | null;
  oppervlakteM2: number | null;
  energielabel: string | null;
  funderingNiveau: string | null;
}

function euro(n: number): string {
  return "€ " + Math.round(n).toLocaleString("nl-NL");
}
const pct = formatOverbiedPercentage;

export default function BiedadviesTool() {
  const [mode, setMode] = useState<"link" | "manual">("link");

  // Funda-link invoer
  const [linkValue, setLinkValue] = useState("");
  const [linkStatus, setLinkStatus] = useState<"idle" | "loading" | "error" | "multiple">("idle");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkCandidates, setLinkCandidates] = useState<AddressMeta[]>([]);
  const linkSeq = useRef(0);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handmatige adreszoekbalk (zelfde bron als AddressSearchBar, maar
  // navigeert niet weg -- een gekozen suggestie wordt hier direct het
  // bevestigde adres van de tool).
  const [manualQuery, setManualQuery] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSuggestions, setManualSuggestions] = useState<AddressMeta[]>([]);
  const manualSeq = useRef(0);
  const manualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [resolvedAddress, setResolvedAddress] = useState<AddressMeta | null>(null);
  const [woningtype, setWoningtype] = useState<FundaLinkParseResult["woningtype"]>(undefined);

  const [feiten, setFeiten] = useState<Feiten | null>(null);
  const [feitenStatus, setFeitenStatus] = useState<"idle" | "loading" | "error">("idle");

  const [waardeInput, setWaardeInput] = useState("");
  const [scenarios, setScenarios] = useState<Biedscenarios | null>(null);

  // Funda-link resoluteren, gedebounced -- geeft nooit stilzwijgend één
  // "meest waarschijnlijke" adres terug, zie resolveFundaUrl().
  useEffect(() => {
    if (mode !== "link") return;
    if (linkTimer.current) clearTimeout(linkTimer.current);
    const seq = ++linkSeq.current;
    const trimmed = linkValue.trim();
    if (!trimmed) {
      setLinkStatus("idle");
      setLinkError(null);
      setLinkCandidates([]);
      return;
    }
    linkTimer.current = setTimeout(async () => {
      setLinkStatus("loading");
      const result = await resolveFundaUrl(trimmed);
      if (seq !== linkSeq.current) return;
      if (result.status === "match" && result.address) {
        kiesAdres(result.address, result.woningtype);
        setLinkStatus("idle");
      } else if (result.status === "multiple" && result.candidates) {
        setLinkCandidates(result.candidates);
        setLinkStatus("multiple");
        setResolvedAddress(null);
      } else {
        setLinkError(result.reden ?? "Kon dit adres niet herkennen.");
        setLinkStatus("error");
        setResolvedAddress(null);
      }
    }, 500);
    return () => {
      if (linkTimer.current) clearTimeout(linkTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkValue, mode]);

  // Handmatige suggesties, zelfde live PDOK-bron + offline-fallback als
  // AddressSearchBar.tsx.
  useEffect(() => {
    if (mode !== "manual") return;
    if (manualTimer.current) clearTimeout(manualTimer.current);
    const seq = ++manualSeq.current;
    const trimmed = manualQuery.trim();
    if (trimmed.length < 2) {
      setManualSuggestions([]);
      return;
    }
    manualTimer.current = setTimeout(async () => {
      try {
        const live = await fetchLiveAddressSuggestions(trimmed);
        if (seq !== manualSeq.current) return;
        setManualSuggestions(live);
      } catch {
        if (seq !== manualSeq.current) return;
        setManualSuggestions(searchAddressSuggestions(trimmed));
      }
    }, 250);
    return () => {
      if (manualTimer.current) clearTimeout(manualTimer.current);
    };
  }, [manualQuery, mode]);

  // Gratis feiten (BAG/EP-Online/funderingsindicatie) ophalen zodra een
  // adres bevestigd is -- via de bestaande, server-side /api/rapport-route
  // (die zelf market/nearbySales/verduurzaming standaard uitstelt, dus dit
  // raakt Altum nooit).
  useEffect(() => {
    if (!resolvedAddress) {
      setFeiten(null);
      return;
    }
    let cancelled = false;
    setFeitenStatus("loading");
    fetch("/api/rapport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resolvedAddress),
    })
      .then((res) => {
        if (!res.ok) throw new Error("rapport-aanvraag mislukt");
        return res.json() as Promise<Report>;
      })
      .then((report) => {
        if (cancelled) return;
        setFeiten({
          bouwjaar: report.building?.data?.bouwjaar ?? null,
          oppervlakteM2: report.building?.data?.oppervlakteM2 ?? null,
          energielabel: report.energy?.data?.klasse ?? null,
          funderingNiveau: report.fundering?.data?.niveau ?? null,
        });
        setFeitenStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setFeitenStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedAddress]);

  // Scenario's zijn pure berekening (regio-/landelijke data + wat de
  // bezoeker intikte) -- geen netwerkaanroep nodig.
  useEffect(() => {
    if (!resolvedAddress) {
      setScenarios(null);
      return;
    }
    const waarde = Number(waardeInput.replace(/[^0-9]/g, ""));
    if (!waarde) {
      setScenarios(null);
      return;
    }
    setScenarios(berekenBiedscenarios(waarde, resolvedAddress.plaats));
  }, [waardeInput, resolvedAddress]);

  function kiesAdres(addr: AddressMeta, type?: FundaLinkParseResult["woningtype"]) {
    setResolvedAddress(addr);
    setWoningtype(type);
    setLinkCandidates([]);
    setLinkStatus("idle");
    setManualSuggestions([]);
    setManualOpen(false);
    setWaardeInput("");
  }

  return (
    <div className="rounded-3xl bg-white p-7 shadow-overlay sm:p-8">
      <div className="text-[11px] font-bold uppercase tracking-wider2 text-accent">Biedadvies</div>

      <div className="mt-4 flex rounded-full bg-parchment p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex-1 rounded-full py-2 transition-colors ${mode === "link" ? "bg-white text-ink shadow-flat" : "text-ink/50"}`}
        >
          Link plakken
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-full py-2 transition-colors ${mode === "manual" ? "bg-white text-ink shadow-flat" : "text-ink/50"}`}
        >
          Zelf adres zoeken
        </button>
      </div>

      {mode === "link" ? (
        <div className="relative mt-4">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35">
            <LinkIcon className="h-4 w-4" />
          </span>
          <input
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="Plak de link naar de woning, bv. Funda"
            className="w-full rounded-xl border border-line bg-[#FBFBFD] py-3 pl-10 pr-3 text-[13.5px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-mist"
          />
          {linkStatus === "loading" && <p className="mt-2 text-xs text-ink/45">Adres zoeken via PDOK…</p>}
          {linkStatus === "error" && linkError && <p className="mt-2 text-xs text-rust">{linkError}</p>}
          {linkStatus === "multiple" && linkCandidates.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-line">
              <p className="bg-sun/10 px-3.5 py-2 text-[10.5px] font-bold text-sun">
                Dit adres is niet eenduidig. Welke bedoel je?
              </p>
              {linkCandidates.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => kiesAdres(c)}
                  className="block w-full border-t border-line px-3.5 py-2.5 text-left text-[12.5px] text-ink hover:bg-mist/60"
                >
                  {c.straat} {c.huisnummer}
                  {c.huisletter ?? ""} <span className="text-ink/45">· {c.postcode} {c.plaats}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative mt-4">
          <input
            value={manualQuery}
            onChange={(e) => {
              setManualQuery(e.target.value);
              setManualOpen(true);
            }}
            onFocus={() => setManualOpen(true)}
            onBlur={() => setTimeout(() => setManualOpen(false), 150)}
            placeholder="Typ een adres…"
            className="w-full rounded-xl border border-line bg-[#FBFBFD] px-3.5 py-3 text-[13.5px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-mist"
          />
          {manualOpen && manualSuggestions.length > 0 && (
            <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-white shadow-overlay">
              {manualSuggestions.map((addr) => (
                <li key={addr.slug}>
                  <button
                    type="button"
                    onMouseDown={() => kiesAdres(addr)}
                    className="block w-full px-3.5 py-2.5 text-left text-[12.5px] text-ink hover:bg-mist/60"
                  >
                    <span className="font-medium">
                      {addr.straat} {addr.huisnummer}
                      {addr.huisletter ?? ""}
                    </span>
                    <span className="text-ink/45"> · {addr.postcode} {addr.plaats}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {resolvedAddress && (
        <>
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist">
                <HomeIcon className="h-5 w-5 text-accent-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-extrabold text-ink">
                  {resolvedAddress.straat} {resolvedAddress.huisnummer}
                  {resolvedAddress.huisletter ?? ""}
                </p>
                <p className="text-[11.5px] text-ink/55">{resolvedAddress.plaats}</p>
              </div>
              {woningtype && (
                <span className="shrink-0 rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold text-accent-dark">
                  {woningtype}
                </span>
              )}
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-ink/55">
              {feitenStatus === "loading" && "Gratis gegevens ophalen (BAG, EP-Online)…"}
              {feitenStatus === "error" && "Kon de gratis objectgegevens nu niet ophalen."}
              {feitenStatus === "idle" && feiten && (
                <>
                  {feiten.bouwjaar != null && <>Bouwjaar {feiten.bouwjaar} · </>}
                  {feiten.oppervlakteM2 != null && <>{feiten.oppervlakteM2} m² · </>}
                  {feiten.energielabel && <>label {feiten.energielabel} · </>}
                  {feiten.funderingNiveau && <>funderingsrisico {feiten.funderingNiveau}</>}
                  {" (gratis)"}
                </>
              )}
            </p>

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-ink/55">
              Geschatte waarde
            </label>
            <input
              value={waardeInput}
              onChange={(e) => setWaardeInput(e.target.value)}
              inputMode="numeric"
              placeholder="bv. de vraagprijs, of je eigen inschatting"
              className="mt-1.5 w-full rounded-xl border border-line bg-[#FBFBFD] px-3.5 py-3 text-[13.5px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-mist"
            />
          </div>

          {scenarios && (
            <div className="mt-6">
              <p className="text-[14px] font-extrabold text-ink">Wat is een goed bod in deze regio?</p>
              <p className="mt-0.5 text-[11.5px] text-ink/55">
                {scenarios.percentageBovenVraagprijs != null && (
                  <>{scenarios.percentageBovenVraagprijs}% verkocht boven vraagprijs</>
                )}
                {scenarios.regioNaam ? ` in regio ${scenarios.regioNaam}` : " landelijk"}
                {" · gemiddeld "}
                {pct(scenarios.scenarios.find((s) => s.key === "gemiddeld")!.overbiedPercentage)} overboden
              </p>

              <div className="mt-3.5 flex flex-col gap-2.5">
                {scenarios.scenarios.map((s) => {
                  const Icon = SCENARIO_ICOON[s.key];
                  const kleur = SCENARIO_KLEUR[s.key];
                  return (
                    <div key={s.key} className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ${kleur.bg}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white">
                        <Icon className={`h-[18px] w-[18px] ${kleur.tekst}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12.5px] font-extrabold ${kleur.tekst}`}>{s.titel}</p>
                        <p className="mt-0.5 text-[11px] text-ink/60">{s.toelichting}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[15px] font-extrabold text-ink">{euro(s.bod)}</p>
                        <p className={`text-[10.5px] font-bold ${kleur.tekst}`}>{pct(s.overbiedPercentage)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-ink/35">
                Scenario&apos;s o.b.v. {scenarios.niveau === "regio" ? "regiogemiddelde" : "landelijk gemiddelde"}{" "}
                overbod ± indicatieve marge. Geen garantie voor deze specifieke woning.
              </p>

              <div className="relative mt-5 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-dark px-[18px] py-4">
                <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" aria-hidden="true" />
                <BulbIcon className="h-5 w-5 shrink-0 text-white" />
                <p className="relative text-[12px] leading-relaxed text-white">
                  <strong>Binnenkort:</strong> een kant-en-klare biedstrategie, automatisch berekend voor deze
                  woning.
                </p>
              </div>

              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px] font-extrabold text-ink">Het volledige rapport</span>
                  <span className="text-[11px] font-bold text-ink/45">8 onderdelen</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3.5 gap-y-2.5">
                  {ONDERDELEN.map(({ icon: Icon, titel }) => (
                    <div key={titel} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-accent-dark" />
                      <span className="text-[11.5px] font-semibold text-ink">{titel}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={buildReportHref(resolvedAddress)}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-[13.5px] font-extrabold text-white transition-colors hover:bg-ink/90"
              >
                Ontgrendel het rapport
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs">{RAPPORT_PRIJS}</span>
              </Link>
              <p className="mt-2.5 text-center text-[10.5px] text-ink/35">
                Bron overbiedcijfer: NVM Marktoverzicht per regio · {scenarios.periodeLabel}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
