import type { AddressMeta, Report, ReportProgressStep } from "@/types/report";
import type { SourceMeta, SourceResult } from "@/types/dataSource";
import { fetchBuilding } from "@/lib/data-sources/bag";
import { fetchEnergy } from "@/lib/data-sources/energielabel";
import { fetchMarket } from "@/lib/data-sources/woningwaarde";
import { fetchNearbySales } from "@/lib/data-sources/buurtverkopen";
import { fetchBuurtprofiel } from "@/lib/data-sources/buurtprofiel";
import { fetchFundering } from "@/lib/data-sources/fundering";
import { fetchKavel } from "@/lib/data-sources/kavel";
import { fetchBestemming } from "@/lib/data-sources/bestemming";
import { resolveBuurtcode } from "@/lib/services/buurtcodeLookup";
import { buildCore, buildDataQuality, buildInsights, enrichNearbySales } from "@/lib/services/insights";
import { cached } from "@/lib/utils/ttlCache";
import { canonicalAddressKey } from "@/lib/utils/slug";
import type { BestemmingData, BuildingData, BuurtprofielData, EnergyData, FunderingData, KavelData, MarketData, NearbySalesData, NearbySalesDataRaw } from "@/types/report";

// Placeholder-resultaat voor de geschatte woningwaarde vóórdat het rapport is
// ontgrendeld. BELANGRIJK (kostenbeheersing): de Altum AI Woningwaarde API
// kost per aanroep geld/credits — dat mag dus niet bij elke paginaweergave
// gebeuren, alleen zodra iemand daadwerkelijk betaalt/ontgrendelt. Dit is
// géén foutstatus ("we probeerden het en het lukte niet"), maar een bewust
// "nog niet opgevraagd" — vandaar geen errorMessage. De UI (ReportSection's
// `deferred`-prop, gestuurd door isUnlocked) toont hierdoor gewoon de
// normale ontgrendel-teaser i.p.v. een "niet beschikbaar"-melding, zolang er
// nog niet ontgrendeld is. Zie fetchPremiumOnUnlock() voor de daadwerkelijke,
// wél kostenveroorzakende aanroep, en app/api/rapport/premium/route.ts
// voor de route die dat pas bij ontgrendelen aanroept.
function deferredMarketResult(): SourceResult<MarketData> {
  return {
    data: null,
    meta: {
      source: "market",
      label: "Geschatte woningwaarde (model)",
      mode: "live",
      status: "premium",
      state: "unavailable",
      fetchedAt: new Date().toISOString(),
    },
  };
}

// Zelfde uitstel-redenering als deferredMarketResult(), maar dan voor
// buurtverkopen (Altum AI Woningreferentie API) — die kost namelijk
// PRECIES zo goed credits per aanroep als de woningwaarde-AVM, en gebruikt
// dezelfde ALTUM_API_KEY. Vóór deze fix werd fetchNearbySales() altijd
// direct aangeroepen (ook bij een gewone, nog niet betaalde paginaweergave)
// — dat was een gat: alle Altum-data hoort pas bij ontgrendelen te worden
// opgehaald, niet alleen de woningwaarde. Zie fetchNearbySalesOnUnlock()
// (via fetchPremiumOnUnlock) voor de daadwerkelijke, wél kostenveroorzakende
// aanroep.
function deferredNearbySalesResult(): SourceResult<NearbySalesDataRaw> {
  return {
    data: null,
    meta: {
      source: "nearbySales",
      label: "Buurtverkopen (Altum AI Woningreferentie, bron: Kadaster)",
      mode: "live",
      status: "premium",
      state: "unavailable",
      fetchedAt: new Date().toISOString(),
    },
  };
}

// Eén aggregatiepunt voor de UI. Roept alle databron-adapters PARALLEL aan
// (een trage of falende bron mag de andere niet blokkeren — dat is ook hoe
// dit straks server-side tegen echte APIs zou draaien), mapt elk resultaat
// naar het canonieke Report-model, verrijkt buurtverkopen t.o.v. de eigen
// woning, berekent inzichten en een datakwaliteit-samenvatting — en meldt
// voortgang via onProgress zodra een bron daadwerkelijk klaar is (niet in
// een nepvaste volgorde).
//
// deferMarket / deferNearbySales (beide default true): woningwaarde én
// buurtverkopen kosten allebei geld per aanroep bij Altum (zelfde
// ALTUM_API_KEY), dus geen van beide wordt bij een gewone paginaweergave
// opgehaald — alleen bij het ontgrendelen (zie fetchPremiumOnUnlock()). Zet
// dit alleen op false voor gevallen waar je écht het volledige rapport in
// één keer nodig hebt (bv. een toekomstige "genereer PDF"-actie ná betaling).
//
// Faalt er toch iets onverwacht hard (bug, niet een gewone SourceResult-
// fout), dan vangt de buitenste try/catch dat op: getReport wijst nooit een
// promise af en levert altijd een bruikbaar Report terug, desnoods met alle
// onderdelen in "unavailable"-status.
// TTL voor de gratis, zelden-wijzigende bronnen (BAG/EP-Online/CBS/PDOK) —
// bouwjaar, energielabel, buurtcijfers, kavelgrootte en bestemming
// veranderen praktisch nooit binnen 24 uur. Bewust NIET toegepast op
// market/nearbySales (Altum, betaald per aanroep, blijft altijd vers) — die
// twee blijven ongecachet, zie de toelichting bij ttlCache.ts.
const GRATIS_BRON_TTL_MS = 24 * 60 * 60 * 1000;

export async function getReport(
  address: AddressMeta,
  onProgress?: (step: ReportProgressStep) => void,
  options?: { deferMarket?: boolean; deferNearbySales?: boolean }
): Promise<Report> {
  const deferMarket = options?.deferMarket ?? true;
  const deferNearbySales = options?.deferNearbySales ?? true;
  // BEVEILIGING (zie de audit): cache-sleutels op basis van postcode/
  // huisnummer i.p.v. het (door de aanroeper vrij te kiezen) address.slug —
  // anders zou een verzoek met een verzonnen adres maar een bestaand slug-
  // veld de gecachete data van een echt adres kunnen overschrijven/uitlezen.
  // Valt terug op address.slug als de velden zelf niet valide blijken (zou
  // hier niet meer moeten voorkomen na validatie in de aanroepende routes,
  // maar dan liever een minder strikte cache-key dan een crash).
  const cacheKey = canonicalAddressKey(address) ?? address.slug;
  try {
    // Funderingsrisico steunt op het BAG-bouwjaar (zie fundering.ts), dus die
    // aanroep start pas zodra buildingPromise binnen is — niet pas ná de HELE
    // Promise.all, zodat de andere bronnen (energie, markt, buurtverkopen,
    // buurtprofiel) daar niet op hoeven te wachten.
    const buildingPromise = cached(
      `building:${cacheKey}`,
      GRATIS_BRON_TTL_MS,
      () => fetchBuilding(address),
      // Alleen 24u bevriezen als de live BAG-keten daadwerkelijk een
      // bouwjaar opleverde — anders bevriest een toevallige, tijdelijke
      // hik (bv. PDOK even traag/onbereikbaar) een lege uitkomst voor de
      // rest van de dag, terwijl een volgende poging het prima had gedaan.
      (r) => r.data?.bouwjaar != null
    ).then((r) => {
      onProgress?.("building");
      return r;
    });
    const funderingPromise = buildingPromise.then((r) =>
      cached(
        `fundering:${cacheKey}`,
        GRATIS_BRON_TTL_MS,
        () => fetchFundering(address, r.data?.bouwjaar),
        (f) => f.data?.niveau != null
      ).then((f) => {
        onProgress?.("fundering");
        return f;
      })
    );

    const [building, energy, market, nearbySalesRaw, buurtprofiel, fundering, kavel, bestemming, locatie] = await Promise.all([
      buildingPromise,
      cached(`energy:${cacheKey}`, GRATIS_BRON_TTL_MS, () => fetchEnergy(address)).then((r) => {
        onProgress?.("energy");
        return r;
      }),
      deferMarket
        ? Promise.resolve(deferredMarketResult()).then((r) => {
            onProgress?.("market");
            return r;
          })
        : fetchMarket(address).then((r) => {
            onProgress?.("market");
            return r;
          }),
      deferNearbySales
        ? Promise.resolve(deferredNearbySalesResult()).then((r) => {
            onProgress?.("nearbySales");
            return r;
          })
        : fetchNearbySales(address).then((r) => {
            onProgress?.("nearbySales");
            return r;
          }),
      cached(
        `buurtprofiel:${cacheKey}`,
        GRATIS_BRON_TTL_MS,
        () => fetchBuurtprofiel(address),
        (r) => r.data?.buurtnaam != null
      ).then((r) => {
        onProgress?.("buurtprofiel");
        return r;
      }),
      funderingPromise,
      cached(
        `kavel:${cacheKey}`,
        GRATIS_BRON_TTL_MS,
        () => fetchKavel(address),
        (r) => r.data?.oppervlakteM2 != null
      ).then((r) => {
        onProgress?.("kavel");
        return r;
      }),
      cached(`bestemming:${cacheKey}`, GRATIS_BRON_TTL_MS, () => fetchBestemming(address)).then((r) => {
        onProgress?.("bestemming");
        return r;
      }),
      // Alleen voor het precieze adrespunt op de locatiekaart (ReportHero.tsx)
      // — geen eigen SourceResult/voortgangsstap/"niet beschikbaar"-kaart,
      // want dit is een verbetering van een bestaand kenmerk (de kaart-link),
      // geen nieuw rapportonderdeel. resolveBuurtcode() cachet zichzelf nu al
      // (zie buurtcodeLookup.ts) — dit was de VIJFDE aparte aanroep, nu dus
      // gedeeld met de andere vier i.p.v. een eigen verse aanroep.
      resolveBuurtcode(address),
    ]);

    // Verrijking: vergelijkbaarheid/prijsverschil van buurtverkopen t.o.v.
    // de eigen woning kan pas ná het parallel ophalen berekend worden — de
    // bron zelf kent onze woning niet. subjectPrijsPerM2 wordt alleen gezet
    // als zowel de geschatte woningwaarde als de oppervlakte bekend zijn;
    // anders blijft deltaPct per verkoop bewust undefined i.p.v. een gegokt
    // cijfer.
    const subjectPrijsPerM2 =
      market.data?.geschatteWaarde != null && building.data?.oppervlakteM2 != null
        ? market.data.geschatteWaarde / building.data.oppervlakteM2
        : undefined;

    const nearbySalesData = enrichNearbySales(nearbySalesRaw.data, {
      oppervlakteM2: building.data?.oppervlakteM2,
      prijsPerM2: subjectPrijsPerM2,
    });
    const nearbySales: SourceResult<NearbySalesData> = {
      data: nearbySalesData,
      meta: nearbySalesRaw.meta,
    };

    const insights = buildInsights({
      building: building.data,
      energy: energy.data,
      market: market.data,
      nearbySales: nearbySalesData,
    });

    const dataQuality = buildDataQuality([
      building.meta,
      energy.meta,
      market.meta,
      nearbySales.meta,
      buurtprofiel.meta,
      fundering.meta,
      kavel.meta,
      bestemming.meta,
    ]);
    const core = buildCore(address, building.data, energy.data, locatie?.lonLat ?? null);

    onProgress?.("done");

    return {
      core,
      building,
      energy,
      market,
      nearbySales,
      buurtprofiel,
      fundering,
      kavel,
      bestemming,
      insights,
      dataQuality,
      gegenereerdOp: new Date().toISOString(),
    };
  } catch (err) {
    return buildFailedReport(address, err);
  }
}

// De ENIGE plek die daadwerkelijk credits/geld kost bij Altum — wordt
// uitsluitend aangeroepen vanuit app/api/rapport/premium/route.ts, op het
// moment dat iemand het rapport ontgrendelt (betaalt). Los van getReport()
// zodat er geen enkele twijfel kan bestaan over wanneer deze aanroep
// wel/niet gebeurt. Haalt woningwaarde ÉN buurtverkopen in één keer op
// (zelfde ALTUM_API_KEY, zelfde ontgrendel-moment) i.p.v. losse
// unlock-aanroepen per bron, zodat er geen risico is dat de ene premium-
// bron per ongeluk wél en de andere niet aan de ontgrendel-gate hangt.
//
// oppervlakteM2 komt van de al bekende (gratis) BAG-data uit het bestaande
// rapport — nodig om buurtverkopen t.o.v. de eigen woning te verrijken
// (vergelijkbaarheid/prijsverschil per m²), zie enrichNearbySales().
//
// MIN_VERGELIJKBAAR / ZOEKPOGINGEN: we willen het liefst minstens 5
// vergelijkbare verkopen (oppervlakte binnen ±22%) tonen. Standaard zoeken
// we strikt in de buurt, laatste 12 maanden — is dat te weinig, dan
// verruimen we automatisch stap voor stap (langer terug, dan ook buiten de
// buurt), tot aan Altum's eigen maximum van 60 maanden. Bestaan er in
// werkelijkheid geen 5 vergelijkbare verkopen (bv. een rustige buurt), dan
// stoppen we bij de laatste, breedste poging — er wordt nooit iets
// verzonnen om aan het aantal te komen. NearbySalesData.verruimd geeft aan
// of dit is gebeurd, zodat de UI dat eerlijk kan melden i.p.v. stilzwijgend
// "in de buurt"/"12 maanden" te blijven beweren terwijl er breder is gezocht.
const MIN_VERGELIJKBAAR = 5;
const ZOEKPOGINGEN: { strictBuurt: boolean; dateLimitMonths: number }[] = [
  { strictBuurt: true, dateLimitMonths: 12 },
  { strictBuurt: true, dateLimitMonths: 36 },
  { strictBuurt: false, dateLimitMonths: 36 },
  { strictBuurt: false, dateLimitMonths: 60 },
];

export async function fetchPremiumOnUnlock(
  address: AddressMeta,
  oppervlakteM2?: number
): Promise<{ market: SourceResult<MarketData>; nearbySales: SourceResult<NearbySalesData> }> {
  // Los van de verruim-lus hieronder, zodat de woningwaarde-aanroep niet op
  // buurtverkopen hoeft te wachten (en andersom).
  const marketPromise = fetchMarket(address);

  let nearbySalesRaw = await fetchNearbySales(address, ZOEKPOGINGEN[0]);
  let nearbySalesData = enrichNearbySales(nearbySalesRaw.data, { oppervlakteM2 });

  for (let i = 1; i < ZOEKPOGINGEN.length; i++) {
    const aantalVergelijkbaar = nearbySalesData?.verkopen.filter((v) => v.vergelijkbaar).length ?? 0;
    if (aantalVergelijkbaar >= MIN_VERGELIJKBAAR) break;
    nearbySalesRaw = await fetchNearbySales(address, ZOEKPOGINGEN[i]);
    nearbySalesData = enrichNearbySales(nearbySalesRaw.data, { oppervlakteM2 });
  }

  const market = await marketPromise;
  const subjectPrijsPerM2 =
    market.data?.geschatteWaarde != null && oppervlakteM2 != null
      ? market.data.geschatteWaarde / oppervlakteM2
      : undefined;
  // Vergelijkbaar-telling verandert hier niet meer (hangt alleen af van
  // oppervlakte) — deze tweede enrich-pas voegt alleen deltaPct per verkoop
  // toe, nu de woningwaarde ook bekend is.
  const finalNearbySalesData = enrichNearbySales(nearbySalesRaw.data, {
    oppervlakteM2,
    prijsPerM2: subjectPrijsPerM2,
  });

  return {
    market,
    nearbySales: { data: finalNearbySalesData, meta: nearbySalesRaw.meta },
  };
}

function buildFailedReport(address: AddressMeta, err: unknown): Report {
  const now = new Date().toISOString();
  const message =
    err instanceof Error ? err.message : "Onbekende fout bij het samenstellen van het rapport.";

  function failed<T>(source: string, label: string): SourceResult<T> {
    const meta: SourceMeta = {
      source,
      label,
      mode: "mock",
      status: "unavailable",
      state: "error",
      fetchedAt: now,
      errorMessage: message,
    };
    return { data: null, meta };
  }

  const building = failed<BuildingData>("building", "Kadaster BAG");
  const energy = failed<EnergyData>("energy", "RVO Energielabel (EP-Online)");
  const market = failed<MarketData>("market", "Geschatte woningwaarde (model)");
  const nearbySales = failed<NearbySalesData>("nearbySales", "Buurtverkopen (Altum AI Woningreferentie, bron: Kadaster)");
  const buurtprofiel = failed<BuurtprofielData>("buurtprofiel", "CBS wijk- en buurtcijfers");
  const fundering = failed<FunderingData>("fundering", "Funderingsrisico-indicatie (bouwjaar + KCAF/RVO bodemgesteldheid)");
  const kavel = failed<KavelData>("kavel", "Kavelgrootte (Kadaster, PDOK Kadastrale Kaart)");
  const bestemming = failed<BestemmingData>("bestemming", "Bestemming (Ruimtelijke Plannen / Omgevingsplan)");

  return {
    core: buildCore(address, null, null),
    building,
    energy,
    market,
    nearbySales,
    buurtprofiel,
    fundering,
    kavel,
    bestemming,
    insights: [],
    dataQuality: buildDataQuality([
      building.meta,
      energy.meta,
      market.meta,
      nearbySales.meta,
      buurtprofiel.meta,
      fundering.meta,
      kavel.meta,
      bestemming.meta,
    ]),
    gegenereerdOp: now,
  };
}
