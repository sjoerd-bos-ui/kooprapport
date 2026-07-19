import type { AddressMeta, KavelData } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { withResilience } from "@/lib/adapters/withResilience";
import { resolveBuurtcode, type RdCoordinaat } from "@/lib/services/buurtcodeLookup";

// -----------------------------------------------------------------------------
// Kavelgrootte (perceeloppervlakte) — via de officiële, gratis en keyless PDOK
// Kadastrale Kaart OGC API (bron: Kadaster, CC BY 4.0):
// https://api.pdok.nl/kadaster/brk-kadastrale-kaart/ogc/v1
//
// Deze API ondersteunt GEEN exacte punt-in-polygoon-bevraging (alleen de OGC
// "core"-conformance, dus enkel bbox-filtering) — zie live verificatie: een
// kleine 100x100m bbox rond een adrespunt bevatte al 5 losse percelen. We
// vragen daarom een kleine bbox rond het RD-coördinaat van het adres op, en
// bepalen zelf met een ray-casting punt-in-polygoon-check welk perceel het
// adrespunt daadwerkelijk bevat — nooit "het eerste resultaat" aannemen.
//
// status_historie_waarde: alleen "Geldig" meetellen (geen vervallen/
// historische percelen).
//
// soort_grootte_waarde: het Kadaster kent grootte een van twee statussen toe
// ("voorlopig" of "definitief/vastgesteld" — zie catalogus.kadaster.nl/brk).
// Bij een voorlopige grootte kan de kavelgrens nog wijzigen; we geven dit door
// zodat de UI dat eerlijk kan tonen i.p.v. de maat als absoluut definitief te
// presenteren.
//
// Hergebruikt resolveBuurtcode() (lib/services/buurtcodeLookup.ts) voor het
// RD-coördinaat — dezelfde PDOK Locatieserver-aanroep die buurtprofiel.ts en
// fundering.ts al doen voor de buurtcode. Dat betekent nu een derde aanroep
// van dezelfde lookup voor hetzelfde adres binnen één rapport; bewust niet nu
// al samengevoegd/gecachet (dat zou verder gaan dan deze losse feature-vraag),
// maar wel een bekend verbeterpunt voor een latere caching-ronde.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "kavel";
const SOURCE_LABEL = "Kavelgrootte (Kadaster, PDOK Kadastrale Kaart)";

const PDOK_PERCEEL_URL = "https://api.pdok.nl/kadaster/brk-kadastrale-kaart/ogc/v1/collections/perceel/items";

// Marge rond het adrespunt waarbinnen we naar percelen zoeken. Percelen in
// NL zijn vrijwel altijd ruim binnen 25m van het adrespunt te vinden; groot
// genoeg om het eigen perceel te vangen, klein genoeg om niet te veel
// buurpercelen te hoeven doorzoeken.
const BBOX_MARGE_METER = 25;

type RingCoord = [number, number];
type LinearRing = RingCoord[];

interface PerceelGeometry {
  type: "Polygon" | "MultiPolygon";
  // Polygon: LinearRing[] (eerste ring = buitenrand, rest = gaten)
  // MultiPolygon: LinearRing[][] (array van Polygon-ringenlijsten)
  coordinates: LinearRing[] | LinearRing[][];
}

interface PerceelFeature {
  geometry?: PerceelGeometry;
  properties?: {
    kadastrale_grootte_waarde?: number;
    soort_grootte_waarde?: string; // "Vastgesteld" | "Voorlopig" (Kadaster-codelijst)
    kadastrale_gemeente_waarde?: string;
    sectie?: string;
    perceelnummer?: number;
    status_historie_waarde?: string; // alleen "Geldig" gebruiken
  };
}

interface PerceelResponse {
  features?: PerceelFeature[];
}

// Ray-casting (even-odd rule): telt hoe vaak een horizontale straal vanuit het
// punt de rand van de ring kruist. Oneven aantal kruisingen = punt ligt
// binnen de ring. Werkt voor elke enkelvoudige (niet-zelfoverlappende) ring,
// wat kadastrale perceelgrenzen altijd zijn.
function puntInRing(punt: RdCoordinaat, ring: LinearRing): boolean {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const snijdt =
      yi > punt.y !== yj > punt.y && punt.x < ((xj - xi) * (punt.y - yi)) / (yj - yi) + xi;
    if (snijdt) binnen = !binnen;
  }
  return binnen;
}

// Een punt ligt in een polygoon als het in de buitenrand (ring 0) ligt, en
// NIET in een van de gaten (ring 1+). Kadastrale percelen hebben zelden
// gaten, maar we behandelen die netjes voor het geval van een enclave
// (bv. een perceel met een ander perceel er middenin uitgesneden).
function puntInPolygoonRingen(punt: RdCoordinaat, ringen: LinearRing[]): boolean {
  if (ringen.length === 0) return false;
  if (!puntInRing(punt, ringen[0])) return false;
  for (let i = 1; i < ringen.length; i++) {
    if (puntInRing(punt, ringen[i])) return false; // in een gat -> niet in het perceel
  }
  return true;
}

function puntInGeometrie(punt: RdCoordinaat, geometry: PerceelGeometry | undefined): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    return puntInPolygoonRingen(punt, geometry.coordinates as LinearRing[]);
  }
  // MultiPolygon: punt hoeft maar in één van de deelpolygonen te liggen.
  return (geometry.coordinates as LinearRing[][]).some((ringen) => puntInPolygoonRingen(punt, ringen));
}

function buildBbox(rd: RdCoordinaat): string {
  const minX = rd.x - BBOX_MARGE_METER;
  const minY = rd.y - BBOX_MARGE_METER;
  const maxX = rd.x + BBOX_MARGE_METER;
  const maxY = rd.y + BBOX_MARGE_METER;
  return `${minX},${minY},${maxX},${maxY}`;
}

async function fetchPercelenRondPunt(rd: RdCoordinaat): Promise<PerceelFeature[]> {
  const crs = "http://www.opengis.net/def/crs/EPSG/0/28992";
  const url =
    `${PDOK_PERCEEL_URL}?f=json&limit=25` +
    `&bbox=${encodeURIComponent(buildBbox(rd))}` +
    `&bbox-crs=${encodeURIComponent(crs)}` +
    `&crs=${encodeURIComponent(crs)}`;
  const res = await fetch(url, { headers: { Accept: "application/geo+json" } });
  if (!res.ok) throw new Error(`PDOK Kadastrale Kaart gaf HTTP ${res.status}`);
  const body: PerceelResponse = await res.json();
  return (body.features ?? []).filter((f) => f.properties?.status_historie_waarde === "Geldig");
}

function buildKadastraleAanduiding(props: PerceelFeature["properties"]): string | null {
  if (!props?.kadastrale_gemeente_waarde || !props.sectie || props.perceelnummer == null) return null;
  return `${props.kadastrale_gemeente_waarde} ${props.sectie} ${props.perceelnummer}`;
}

function buildSoortGrootteLabel(waarde: string | undefined): "voorlopig" | "vastgesteld" | null {
  if (!waarde) return null;
  const tekst = waarde.toLowerCase();
  if (tekst.startsWith("voorlopig")) return "voorlopig";
  if (tekst.startsWith("vastgesteld") || tekst.startsWith("definitief")) return "vastgesteld";
  return null;
}

async function fetchLive(address: AddressMeta): Promise<KavelData> {
  const leeg: KavelData = {
    oppervlakteM2: null,
    soortGrootte: null,
    kadastraleAanduiding: null,
  };

  const buurt = await resolveBuurtcode(address).catch(() => null);
  if (!buurt?.rd) {
    // Geen coördinaat beschikbaar (bv. geen locatieserverId of PDOK-fout) —
    // eerlijk leeg, nooit een gegokte kavelgrootte.
    return leeg;
  }

  const percelen = await fetchPercelenRondPunt(buurt.rd);
  const perceel = percelen.find((f) => puntInGeometrie(buurt.rd!, f.geometry));
  if (!perceel?.properties?.kadastrale_grootte_waarde) {
    return leeg;
  }

  return {
    oppervlakteM2: Math.round(perceel.properties.kadastrale_grootte_waarde),
    soortGrootte: buildSoortGrootteLabel(perceel.properties.soort_grootte_waarde),
    kadastraleAanduiding: buildKadastraleAanduiding(perceel.properties),
  };
}

function isEmpty(data: KavelData): boolean {
  return data.oppervlakteM2 == null;
}

function missingFields(data: KavelData): string[] {
  return data.oppervlakteM2 == null ? ["oppervlakteM2"] : [];
}

// Publiek adapter-entrypunt. "confirmed": de kavelgrootte is een officiële,
// geregistreerde Kadaster-waarde (net als de BAG-gegevens), geen model-
// schatting. Altijd "live" en gratis/keyless, dus geen aparte mock-modus
// nodig — withResilience geeft bij elke fout/leeg resultaat een eerlijke
// "niet beschikbaar"-status terug.
export async function fetchKavel(address: AddressMeta): Promise<SourceResult<KavelData>> {
  return withResilience(() => fetchLive(address), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "confirmed",
    timeoutMs: 8000,
    isEmpty,
    missingFields,
  });
}
