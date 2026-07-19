// -----------------------------------------------------------------------------
// Grondgebonden woningtype (Vrijstaand/Twee-onder-een-kap/Hoekwoning/
// Tussenwoning): bepaald door de ECHTE BAG-pandgeometrie van buurpanden op te
// vragen (bbox-bevraging tegen de gratis, keyless PDOK BAG OGC API — zelfde
// bron als de rest) en te meten hoeveel buurpanden een pand daadwerkelijk
// raakt. Geen GIS-bibliotheek nodig: gewoon segment-afstand in meters,
// lokaal omgerekend uit graden (de BAG geeft standaard WGS84/CRS84 terug,
// dus geen aparte/ongeteste crs-queryparameter nodig). Lukt dit niet (geen
// geometrie, netwerkfout, timeout) dan geeft dit null terug — de aanroeper
// valt dan terug op de bredere, al werkende classificatie (Eengezinswoning)
// i.p.v. een gegokt subtype te tonen.
// -----------------------------------------------------------------------------

export type GrondgebondenType = "Vrijstaand" | "Twee-onder-een-kap" | "Hoekwoning" | "Tussenwoning";

type Ring = number[][];
type Geometry = { type?: string; coordinates?: unknown } | null | undefined;
type PandFeature = { properties?: { identificatie?: string }; geometry?: Geometry };

function ringsFromGeometry(geom: Geometry): Ring[] {
  if (!geom || !geom.coordinates) return [];
  if (geom.type === "Polygon") return geom.coordinates as Ring[];
  if (geom.type === "MultiPolygon") return (geom.coordinates as Ring[][]).reduce<Ring[]>((acc, poly) => acc.concat(poly), []);
  return [];
}

function edgesFromRings(rings: Ring[]): Array<[number[], number[]]> {
  const edges: Array<[number[], number[]]> = [];
  rings.forEach((ring) => {
    for (let i = 0; i < ring.length - 1; i++) edges.push([ring[i], ring[i + 1]]);
  });
  return edges;
}

function bboxFromGeometry(geom: Geometry, marginDeg: number): [number, number, number, number] | null {
  const rings = ringsFromGeometry(geom);
  let minx = Infinity,
    miny = Infinity,
    maxx = -Infinity,
    maxy = -Infinity;
  rings.forEach((ring) => {
    ring.forEach((pt) => {
      if (pt[0] < minx) minx = pt[0];
      if (pt[0] > maxx) maxx = pt[0];
      if (pt[1] < miny) miny = pt[1];
      if (pt[1] > maxy) maxy = pt[1];
    });
  });
  if (!isFinite(minx)) return null;
  return [minx - marginDeg, miny - marginDeg, maxx + marginDeg, maxy + marginDeg];
}

function orientation2d(p: number[], q: number[], r: number[]): number {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}
function onSegment2d(p: number[], q: number[], r: number[]): boolean {
  return (
    Math.min(p[0], r[0]) - 1e-9 <= q[0] &&
    q[0] <= Math.max(p[0], r[0]) + 1e-9 &&
    Math.min(p[1], r[1]) - 1e-9 <= q[1] &&
    q[1] <= Math.max(p[1], r[1]) + 1e-9
  );
}
function segmentsIntersect2d(p1: number[], p2: number[], p3: number[], p4: number[]): boolean {
  const o1 = orientation2d(p1, p2, p3),
    o2 = orientation2d(p1, p2, p4),
    o3 = orientation2d(p3, p4, p1),
    o4 = orientation2d(p3, p4, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment2d(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment2d(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment2d(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment2d(p3, p2, p4)) return true;
  return false;
}
// lonScale/latScale zetten graden lokaal om naar (bij benadering) meters,
// nauwkeurig genoeg voor korte-afstand buren-detectie.
function distPointToSegmentM(p: number[], a: number[], b: number[], lonScale: number, latScale: number): number {
  const px = p[0] * lonScale,
    py = p[1] * latScale,
    ax = a[0] * lonScale,
    ay = a[1] * latScale,
    bx = b[0] * lonScale,
    by = b[1] * latScale;
  const dx = bx - ax,
    dy = by - ay,
    lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distSegmentToSegmentM(
  p1: number[],
  p2: number[],
  p3: number[],
  p4: number[],
  lonScale: number,
  latScale: number
): number {
  if (segmentsIntersect2d(p1, p2, p3, p4)) return 0;
  return Math.min(
    distPointToSegmentM(p1, p3, p4, lonScale, latScale),
    distPointToSegmentM(p2, p3, p4, lonScale, latScale),
    distPointToSegmentM(p3, p1, p2, lonScale, latScale),
    distPointToSegmentM(p4, p1, p2, lonScale, latScale)
  );
}
function minDistanceMetersBetweenGeometries(geomA: Geometry, geomB: Geometry, lonScale: number, latScale: number): number {
  const edgesA = edgesFromRings(ringsFromGeometry(geomA));
  const edgesB = edgesFromRings(ringsFromGeometry(geomB));
  let min = Infinity;
  for (let i = 0; i < edgesA.length; i++) {
    for (let j = 0; j < edgesB.length; j++) {
      const d = distSegmentToSegmentM(edgesA[i][0], edgesA[i][1], edgesB[j][0], edgesB[j][1], lonScale, latScale);
      if (d < min) min = d;
      if (min === 0) return 0;
    }
  }
  return min;
}

const BAG_OGC_BASE = "https://api.pdok.nl/kadaster/bag/ogc/v2";

async function fetchNearbyPanden(bbox: [number, number, number, number]): Promise<PandFeature[]> {
  const url = `${BAG_OGC_BASE}/collections/pand/items?bbox=${bbox.join(",")}&f=json&limit=30`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bbox-opzoeking gaf HTTP ${res.status}`);
  const data = await res.json();
  return (data?.features as PandFeature[]) ?? [];
}

async function findTouchingPanden(pandId: string, geometry: Geometry): Promise<PandFeature[] | null> {
  const bbox = bboxFromGeometry(geometry, 0.0006);
  if (!bbox) return null;
  const centerLat = (bbox[1] + bbox[3]) / 2;
  const lonScale = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const latScale = 111320;
  const candidates = await fetchNearbyPanden(bbox);
  return candidates.filter((f) => {
    if (!f?.properties || !f.geometry) return false;
    if (f.properties.identificatie === pandId) return false;
    return minDistanceMetersBetweenGeometries(geometry, f.geometry, lonScale, latScale) <= 1.0;
  });
}

// Alleen zinvol bij een zelfstandig pand (1 verblijfsobject) met woonfunctie
// — zie aanroep in bouwjaarLookup.ts. Nooit een gok: elke faalroute geeft
// null terug, nooit een verzonnen subtype.
export async function classifyGrondgebondenType(pandId: string, geometry: Geometry): Promise<GrondgebondenType | null> {
  try {
    const touching = await findTouchingPanden(pandId, geometry);
    if (touching == null) return null;
    if (touching.length === 0) return "Vrijstaand";
    if (touching.length >= 2) return "Tussenwoning";
    // Precies 1 buurpand: Twee-onder-een-kap (rij van 2) vs. Hoekwoning
    // (uiteinde van een langere rij) — bepaald door de buren VAN de buur
    // na te gaan, exclusief onszelf.
    const neighbor = touching[0];
    const neighborId = neighbor.properties?.identificatie;
    if (!neighborId || !neighbor.geometry) return null;
    const neighborTouching = await findTouchingPanden(neighborId, neighbor.geometry);
    if (neighborTouching == null) return null;
    const others = neighborTouching.filter((f) => f.properties?.identificatie !== pandId);
    return others.length === 0 ? "Twee-onder-een-kap" : "Hoekwoning";
  } catch {
    return null;
  }
}
