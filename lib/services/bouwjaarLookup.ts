import type { AddressMeta } from "@/types/report";
import { classifyGrondgebondenType, type GrondgebondenType } from "@/lib/services/grondgebondenType";

// -----------------------------------------------------------------------------
// Bouwjaar: uitsluitend de officiële BAG-bron (via de gratis, keyless PDOK BAG
// OGC API), nooit geschat of afgeleid — dit is de enige plek in de app die
// een bouwjaar mag opleveren. Ketting:
//
//   1. adresseerbaarObjectId resolven — als de gekozen suggestie dat al
//      meegaf, gebruik dat (snelle route). Anders: het "id" van die
//      suggestie (locatieserverId, bv. "adr-xxxx") is GEGARANDEERD aanwezig
//      in elke suggest-respons, en kan via de PDOK Locatieserver
//      lookup-service betrouwbaar naar adresseerbaarobject_id vertaald
//      worden — dat veld zit altijd in een lookup-respons. Dit is de
//      robuuste route, niet afhankelijk van of het snellere fl-veld op het
//      suggest-endpoint toevallig werkte.
//   2. verblijfsobject opzoeken (BAG OGC API) met dat adresseerbaarObjectId.
//   3. het gekoppelde pand volgen (verblijfsobject.pand[0].href).
//   4. pand.bouwjaar uitlezen.
//
// Op elk punt waar dit niet lukt (geen ID, geen HTTP 200, geen koppeling,
// geen bouwjaar-veld, netwerkfout/CORS) geeft dit gewoon null terug — de UI
// toont dan expliciet "onbekend", nooit een placeholder die op een jaartal
// lijkt. Elke afwijking wordt met console.warn gelogd zodat een aanhoudend
// probleem meteen herleidbaar is via de browser-/servercconsole, in plaats
// van blind verder te gokken naar de oorzaak.
// -----------------------------------------------------------------------------

const PDOK_LOOKUP_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup";
const BAG_OGC_BASE = "https://api.pdok.nl/kadaster/bag/ogc/v2";

export interface BouwjaarResult {
  bouwjaar: number | null;
  pandStatus: string | null;
  // Het officiële, geregistreerde BAG-gebruiksdoel (bv. "woonfunctie") —
  // rechtstreeks uit dezelfde verblijfsobject-bevraging als bouwjaar, dus
  // beschikbaar zodra dat object gevonden is, ook als de pand/bouwjaar-stap
  // daarna faalt. Nooit afgeleid of geraden.
  gebruiksdoel: string | null;
  // Officiële gebruiksoppervlakte (m²) van het verblijfsobject — rechtstreeks
  // uit dezelfde bevraging als bouwjaar, nooit geschat.
  oppervlakte: number | null;
  // Geteld aantal verblijfsobjecten in het gekoppelde pand — alleen gezet
  // als de pand-stap is gelukt (anders null, niet aanwezig/undefined).
  aantalVerblijfsobjectenPand?: number | null;
  // Grondgebonden subtype (Vrijstaand/Twee-onder-een-kap/Hoekwoning/
  // Tussenwoning) via echte pandgeometrie — alleen geprobeerd bij een
  // zelfstandig pand met woonfunctie (zie fetchBouwjaar). Null = niet
  // gelukt/niet van toepassing, nooit een gok.
  grondgebondenType?: GrondgebondenType | null;
}

interface PdokLookupDoc {
  adresseerbaarobject_id?: string;
}

async function resolveAdresseerbaarObjectId(addr: AddressMeta): Promise<string | null> {
  if (addr.adresseerbaarObjectId) return addr.adresseerbaarObjectId;
  if (!addr.locatieserverId) {
    console.warn("[bouwjaar] geen locatieserverId beschikbaar voor dit adres — kan BAG-object niet opzoeken.");
    return null;
  }
  // Bewust GEEN fl-parameter: de gedocumenteerde standaardrespons van de
  // lookup-service bevat adresseerbaarobject_id altijd al, en een
  // aangepaste fl-selectie bleek eerder juist een bron van stille fouten.
  const url = `${PDOK_LOOKUP_URL}?id=${encodeURIComponent(addr.locatieserverId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[bouwjaar] PDOK lookup gaf HTTP ${res.status} voor id ${addr.locatieserverId}`);
    return null;
  }
  const data = await res.json();
  const doc: PdokLookupDoc | undefined = data?.response?.docs?.[0];
  if (!doc?.adresseerbaarobject_id) {
    console.warn(`[bouwjaar] PDOK lookup leverde geen adresseerbaarobject_id op voor id ${addr.locatieserverId}`, doc);
    return null;
  }
  return doc.adresseerbaarobject_id;
}

export async function fetchBouwjaar(addr: AddressMeta | null | undefined): Promise<BouwjaarResult | null> {
  if (!addr) return null;
  try {
    const objectId = await resolveAdresseerbaarObjectId(addr);
    if (!objectId) return null; // reden is al gelogd in resolveAdresseerbaarObjectId

    const voUrl = `${BAG_OGC_BASE}/collections/verblijfsobject/items?identificatie=${encodeURIComponent(objectId)}&f=json&limit=1`;
    const voRes = await fetch(voUrl);
    if (!voRes.ok) {
      console.warn(`[bouwjaar] BAG verblijfsobject-opzoeking gaf HTTP ${voRes.status} voor ${objectId}`);
      return null;
    }
    const voData = await voRes.json();
    const voFeature = voData?.features?.[0];
    if (!voFeature) {
      console.warn(`[bouwjaar] geen verblijfsobject gevonden voor adresseerbaarobject_id ${objectId}`);
      return null;
    }
    // Gebruiksdoel: rechtstreeks uit dezelfde BAG-bevraging als bouwjaar,
    // geen aparte aanroep of gok nodig. Blijft beschikbaar ongeacht of de
    // pand/bouwjaar-opzoeking hierna lukt.
    const gebruiksdoelRaw: unknown = voFeature.properties?.gebruiksdoel;
    const gebruiksdoel: string | null =
      typeof gebruiksdoelRaw === "string" && gebruiksdoelRaw.trim() ? gebruiksdoelRaw.trim() : null;
    // Officiële gebruiksoppervlakte (m²) van dit verblijfsobject — zelfde
    // BAG-bevraging, geen aparte aanroep of gok nodig.
    const oppervlakteRaw: unknown = voFeature.properties?.oppervlakte;
    const oppervlakte: number | null = typeof oppervlakteRaw === "number" ? oppervlakteRaw : null;

    // BEVESTIGD via een live opgevangen respons (op een echt adres getest):
    // de BAG OGC API v2 zet de pand-koppeling niet in een geneste
    // "pand":{href} of "pand":[{href}], maar als een PLATTE eigenschap met
    // een letterlijke punt in de sleutelnaam: properties["pand.href"], met
    // als waarde een ARRAY van URL-strings. Dit is de eerste, primaire route.
    const pandHrefArr: unknown = (voFeature.properties as Record<string, unknown> | undefined)?.["pand.href"];
    let pandHref: string | undefined = Array.isArray(pandHrefArr)
      ? (pandHrefArr[0] as string | undefined)
      : typeof pandHrefArr === "string"
        ? pandHrefArr
        : undefined;

    // Defensieve fallbacks, voor het geval de vorm ooit verschilt of wijzigt:
    // geneste "pand"-vorm (object/array/string)...
    let pandRel: unknown = voFeature.properties?.pand;
    if (!pandHref) {
      if (Array.isArray(pandRel)) pandRel = pandRel[0];
      pandHref = typeof pandRel === "string" ? pandRel : (pandRel as { href?: string } | undefined)?.href;
    }

    if (!pandHref && Array.isArray(voFeature.links)) {
      const linkEntry = (voFeature.links as Array<{ rel?: string; href?: string }>).find(
        (l) => typeof l?.rel === "string" && l.rel.toLowerCase().includes("pand")
      );
      if (linkEntry?.href) pandHref = linkEntry.href;
    }

    if (!pandHref) {
      const pandId: string | undefined =
        voFeature.properties?.pandidentificatie ?? voFeature.properties?.pand_identificatie;
      if (pandId) {
        pandHref = `${BAG_OGC_BASE}/collections/pand/items?identificatie=${encodeURIComponent(pandId)}&limit=1`;
      }
    }

    if (!pandHref) {
      console.warn(`[bouwjaar] verblijfsobject ${objectId} heeft geen gekoppeld pand. Ruwe data:`, {
        "pand.href": pandHrefArr,
        pand: voFeature.properties?.pand,
        links: voFeature.links,
        pandidentificatie: voFeature.properties?.pandidentificatie,
      });
      return { bouwjaar: null, pandStatus: null, gebruiksdoel, oppervlakte };
    }

    const pandUrl = pandHref + (pandHref.includes("?") ? "&" : "?") + "f=json";
    const pandRes = await fetch(pandUrl);
    if (!pandRes.ok) {
      console.warn(`[bouwjaar] BAG pand-opzoeking gaf HTTP ${pandRes.status} (${pandUrl})`);
      return { bouwjaar: null, pandStatus: null, gebruiksdoel, oppervlakte };
    }
    const pandData = await pandRes.json();
    // pandHref is meestal een link naar één Feature (".properties" direct),
    // maar bij de identificatie-fallback hierboven is het een items-lijst
    // (FeatureCollection, ".features[0].properties"). Beide vormen afvangen.
    const props =
      pandData?.properties ??
      (Array.isArray(pandData?.features) ? pandData.features[0]?.properties : undefined);
    if (!props || props.bouwjaar == null) {
      console.warn(`[bouwjaar] pand heeft geen bouwjaar-veld (${pandUrl})`, props);
      return { bouwjaar: null, pandStatus: null, gebruiksdoel, oppervlakte };
    }
    // Aantal verblijfsobjecten IN HET PAND (geteld BAG-gegeven, geen gok) —
    // gebruikt om Appartement/Meergezinswoning/Eengezinswoning te onderscheiden
    // (zie mapping in lib/data-sources/bag.ts).
    const aantalVerblijfsobjectenPand: number | null =
      typeof props.aantal_verblijfsobjecten === "number" ? props.aantal_verblijfsobjecten : null;

    // Alleen bij een zelfstandig pand (1 verblijfsobject) mét woonfunctie is
    // een grondgebonden onderscheid zinvol — probeer dat confirmed erbij te
    // halen via de echte pandgeometrie, met een eigen, korte timeout zodat
    // een trage buren-analyse nooit bouwjaar/gebruiksdoel zelf blokkeert.
    let grondgebondenType: GrondgebondenType | null = null;
    if (gebruiksdoel?.toLowerCase() === "woonfunctie" && aantalVerblijfsobjectenPand === 1 && props.identificatie) {
      const pandGeometry =
        pandData?.geometry ??
        (Array.isArray(pandData?.features) ? pandData.features[0]?.geometry : undefined);
      if (pandGeometry) {
        try {
          grondgebondenType = await Promise.race([
            classifyGrondgebondenType(props.identificatie, pandGeometry),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
        } catch {
          grondgebondenType = null;
        }
      }
    }

    return {
      bouwjaar: props.bouwjaar,
      pandStatus: props.status ?? null,
      gebruiksdoel,
      oppervlakte,
      aantalVerblijfsobjectenPand,
      grondgebondenType,
    };
  } catch (err) {
    // Netwerkfout of (bv.) een CORS-blokkade — nooit een gok, wel loggen
    // zodat dit precies te herleiden is via de console.
    console.warn("[bouwjaar] onverwachte fout tijdens BAG-opzoeking:", err instanceof Error ? err.message : err);
    return null;
  }
}
