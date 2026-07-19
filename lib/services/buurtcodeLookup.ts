import type { AddressMeta } from "@/types/report";
import { cached } from "@/lib/utils/ttlCache";

// -----------------------------------------------------------------------------
// Vertaalt een adres naar de officiële CBS-buurtcode (bv. "BU05990000") én het
// RD-coördinaat (EPSG:28992) van het adrespunt, zodat andere modules op basis
// van hetzelfde adres kunnen bevragen: lib/data-sources/buurtprofiel.ts en
// fundering.ts gebruiken de buurtcode (CBS/PDOK-bodemkaart per postcodegebied),
// lib/data-sources/kavel.ts gebruikt het coördinaat (PDOK Kadastrale Kaart, om
// het perceel te vinden dat dit punt bevat). Gebruikt dezelfde gratis, keyless
// PDOK Locatieserver lookup-service als lib/services/bouwjaarLookup.ts (zelfde
// "id"-parameter), maar leest hier de regio-/coördinaatvelden uit i.p.v. het
// BAG-object-ID — dit is een eigen, kleine bevraging zodat deze module
// onafhankelijk blijft van bouwjaarLookup.ts.
//
// Lukt de opzoeking niet (geen locatieserverId, HTTP-fout, veld ontbreekt)?
// Dan null — de aanroepende adapter valt dan terug op de eerlijke
// "niet beschikbaar"-status, nooit een gegokte buurtcode of coördinaat.
//
// `centroide_rd` én `centroide_ll` zijn allebei standaardvelden van de PDOK
// Locatieserver-respons (WKT "POINT(x y)", respectievelijk in RD en in
// WGS84/lon-lat), we vragen er geen apart veld voor op om de bestaande, al
// werkende bevraging niet aan te passen — we lezen ze gewoon mee uit hetzelfde
// document. `centroide_ll` is bedoeld voor de locatiekaart (zie
// ReportHero.tsx/MapPlaceholder.tsx): een precies adrespunt i.p.v. Google
// zelf de adrestekst laten geocoderen. LET OP: dit veld is nog niet tegen een
// live respons geverifieerd (dezelfde discipline als bij bag.ts/kavel.ts) —
// parseCentroideLl() geeft gewoon null terug als het veld ontbreekt of een
// andere vorm heeft, waarna de aanroepende UI terugvalt op de bestaande
// adrestekst-query. Geen enkel risico op een verkeerde/gegokte pin.
// -----------------------------------------------------------------------------

const PDOK_LOOKUP_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup";

export interface RdCoordinaat {
  x: number;
  y: number;
}

export interface LonLatCoordinaat {
  lon: number;
  lat: number;
}

export interface BuurtcodeResult {
  buurtcode: string; // bv. "BU05990000"
  buurtnaam: string | null;
  wijkcode: string | null;
  gemeentecode: string | null;
  gemeentenaam: string | null;
  rd: RdCoordinaat | null;
  lonLat: LonLatCoordinaat | null;
}

interface PdokLookupDoc {
  buurtcode?: string;
  buurtnaam?: string;
  wijkcode?: string;
  gemeentecode?: string;
  gemeentenaam?: string;
  centroide_rd?: string;
  centroide_ll?: string;
}

function parseCentroideRd(wkt: string | undefined): RdCoordinaat | null {
  if (!wkt) return null;
  const match = /POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/.exec(wkt);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function parseCentroideLl(wkt: string | undefined): LonLatCoordinaat | null {
  if (!wkt) return null;
  const match = /POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/.exec(wkt);
  if (!match) return null;
  const lon = Number(match[1]);
  const lat = Number(match[2]);
  return Number.isFinite(lon) && Number.isFinite(lat) ? { lon, lat } : null;
}

// Elk rapport riep dit tot voor kort VIJF keer apart aan voor hetzelfde
// adres (buurtprofiel/fundering/kavel/bestemming + de locatiekaart-stap in
// reportService.ts) — lang bekend, nooit opgelost inefficiëntie. Nu
// gededupliceerd via lib/utils/ttlCache.ts: gelijktijdige aanroepen met
// dezelfde locatieserverId delen dezelfde onderliggende PDOK-aanroep, en
// latere rapportaanvragen voor hetzelfde adres binnen de TTL slaan de
// aanroep helemaal over. 24 uur TTL: een RD-/WGS84-coördinaat voor een vast
// adrespunt verandert praktisch nooit.
const BUURTCODE_TTL_MS = 24 * 60 * 60 * 1000;

export async function resolveBuurtcode(addr: AddressMeta | null | undefined): Promise<BuurtcodeResult | null> {
  if (!addr?.locatieserverId) {
    console.warn("[buurtprofiel] geen locatieserverId beschikbaar voor dit adres — kan buurtcode niet opzoeken.");
    return null;
  }
  const locatieserverId = addr.locatieserverId;
  return cached(`buurtcode:${locatieserverId}`, BUURTCODE_TTL_MS, () => resolveBuurtcodeUncached(locatieserverId));
}

async function resolveBuurtcodeUncached(locatieserverId: string): Promise<BuurtcodeResult | null> {
  try {
    const url = `${PDOK_LOOKUP_URL}?id=${encodeURIComponent(locatieserverId)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[buurtprofiel] PDOK lookup gaf HTTP ${res.status} voor id ${locatieserverId}`);
      return null;
    }
    const data = await res.json();
    const doc: PdokLookupDoc | undefined = data?.response?.docs?.[0];
    if (!doc?.buurtcode) {
      console.warn(`[buurtprofiel] PDOK lookup leverde geen buurtcode op voor id ${locatieserverId}`, doc);
      return null;
    }
    return {
      buurtcode: doc.buurtcode,
      buurtnaam: doc.buurtnaam ?? null,
      wijkcode: doc.wijkcode ?? null,
      gemeentecode: doc.gemeentecode ?? null,
      gemeentenaam: doc.gemeentenaam ?? null,
      rd: parseCentroideRd(doc.centroide_rd),
      lonLat: parseCentroideLl(doc.centroide_ll),
    };
  } catch (err) {
    console.warn("[buurtprofiel] onverwachte fout tijdens buurtcode-opzoeking:", err instanceof Error ? err.message : err);
    return null;
  }
}
