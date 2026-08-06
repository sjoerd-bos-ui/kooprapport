"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AddressMeta } from "@/types/report";
import { searchAddressSuggestions, fetchLiveAddressSuggestions } from "@/lib/services/addressLookup";
import type { B2bKlantdossier } from "@/types/b2b";

interface KlantenApiResponse {
  dossiers: B2bKlantdossier[];
}

function NieuwRapportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const voorafGeselecteerdKlantId = searchParams.get("klantId");
  // Prefill vanuit een matchkaart (zie MatchesKaart.tsx "Rapport genereren
  // voor dit adres"): de titel van de Funda-advertentie komt hier binnen als
  // startzoekterm, zodat de makelaar alleen nog het juiste PDOK-adres uit de
  // suggesties hoeft te kiezen i.p.v. opnieuw te moeten typen.
  const vooringevuldAdres = searchParams.get("adres");

  const [query, setQuery] = useState(vooringevuldAdres ?? "");
  const [suggesties, setSuggesties] = useState<AddressMeta[]>([]);
  const [gekozenAdres, setGekozenAdres] = useState<AddressMeta | null>(null);
  const [klanten, setKlanten] = useState<B2bKlantdossier[]>([]);
  const [klantId, setKlantId] = useState<string>(voorafGeselecteerdKlantId ?? "");
  const [nieuweKlantnaam, setNieuweKlantnaam] = useState("");
  const [toonNieuweKlant, setToonNieuweKlant] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/zakelijk/klanten")
      .then((r) => r.json())
      .then((body: KlantenApiResponse) => setKlanten(body.dossiers ?? []))
      .catch(() => setKlanten([]));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggesties([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const live = await fetchLiveAddressSuggestions(trimmed);
        setSuggesties(live);
      } catch {
        setSuggesties(searchAddressSuggestions(trimmed));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function maakNieuweKlant(): Promise<string | null> {
    const naam = nieuweKlantnaam.trim();
    if (!naam) return null;
    const res = await fetch("/api/zakelijk/klanten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ klantnaam: naam, type: "aankoop" }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Klant aanmaken is niet gelukt.");
    return body.dossier.id as string;
  }

  async function handleSubmit() {
    if (!gekozenAdres) {
      setFout("Kies eerst een adres uit de suggesties.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      let uiteindelijkeKlantId = klantId || null;
      if (toonNieuweKlant && nieuweKlantnaam.trim()) {
        uiteindelijkeKlantId = await maakNieuweKlant();
      }

      const res = await fetch("/api/zakelijk/rapporten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          straat: gekozenAdres.straat,
          huisnummerRuw: `${gekozenAdres.huisnummer}${gekozenAdres.huisletter ?? ""}${gekozenAdres.toevoeging ? `-${gekozenAdres.toevoeging}` : ""}`,
          postcode: gekozenAdres.postcode,
          plaats: gekozenAdres.plaats,
          label: gekozenAdres.label,
          locatieserverId: gekozenAdres.locatieserverId,
          adresseerbaarObjectId: gekozenAdres.adresseerbaarObjectId,
          klantId: uiteindelijkeKlantId,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setFout(body.error ?? "Rapport aanvragen is niet gelukt.");
        setBezig(false);
        return;
      }
      router.push(`/zakelijk/rapporten/${body.id}`);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
      setBezig(false);
    }
  }

  return (
    <div>
      <p className="font-display text-xl font-extrabold text-ink">Nieuw rapport aanvragen</p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="text-[11px] font-bold text-ink/60">Adres</label>
          <div className="relative mt-1.5">
            <input
              value={gekozenAdres ? gekozenAdres.label : query}
              onChange={(e) => {
                setGekozenAdres(null);
                setQuery(e.target.value);
              }}
              placeholder="Typ een adres..."
              className="w-full rounded-lg border border-ink/15 px-3 py-2.5 text-[13px] text-ink focus:border-accent focus:outline-none"
            />
            {!gekozenAdres && suggesties.length > 0 && (
              <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-ink/10 bg-white shadow-overlay">
                {suggesties.map((addr) => (
                  <li key={addr.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setGekozenAdres(addr);
                        setSuggesties([]);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-[12.5px] text-ink hover:bg-mist"
                    >
                      {addr.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="mt-4 block text-[11px] font-bold text-ink/60">Klantdossier koppelen</label>
          {!toonNieuweKlant ? (
            <>
              <select
                value={klantId}
                onChange={(e) => setKlantId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 px-3 py-2.5 text-[12.5px] text-ink focus:border-accent focus:outline-none"
              >
                <option value="">Geen dossier</option>
                {klanten.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.klantnaam} — {k.type === "aankoop" ? "Aankoop" : "Verkoop"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setToonNieuweKlant(true)}
                className="mt-2 text-[11.5px] font-semibold text-accent hover:underline"
              >
                + Nieuw klantdossier aanmaken
              </button>
            </>
          ) : (
            <div className="mt-1.5 flex gap-2">
              <input
                value={nieuweKlantnaam}
                onChange={(e) => setNieuweKlantnaam(e.target.value)}
                placeholder="Naam klant"
                className="flex-1 rounded-lg border border-ink/15 px-3 py-2.5 text-[12.5px] text-ink focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setToonNieuweKlant(false)}
                className="rounded-lg border border-ink/15 px-3 py-2.5 text-[11.5px] font-semibold text-ink/60 hover:bg-mist"
              >
                Annuleren
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#F8F8FF] px-3.5 py-2.5">
            <span className="text-[10.5px] text-ink/55">Dit telt mee als 1 rapport binnen uw maandelijkse quotum.</span>
          </div>

          {fout && <p className="mt-3 text-[12px] font-medium text-rust">{fout}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={bezig}
            className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {bezig ? "Rapport wordt samengesteld…" : "Rapport genereren"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ZakelijkNieuwRapportPagina() {
  return (
    <Suspense fallback={null}>
      <NieuwRapportForm />
    </Suspense>
  );
}
