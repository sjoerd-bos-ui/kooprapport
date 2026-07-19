import type { AddressMeta, BestemmingData } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { withResilience } from "@/lib/adapters/withResilience";
import { resolveBuurtcode, type RdCoordinaat } from "@/lib/services/buurtcodeLookup";
import { DATA_SOURCE_CONFIG, getApiKey } from "@/lib/config/dataSources";

// -----------------------------------------------------------------------------
// Bestemming/gebruiksfunctie van het perceel — TWEE aparte, opeenvolgende
// bronnen, omdat Nederland midden in een jarenlange overgang zit:
//
// 1) Bestemmingsplan (Ruimtelijke Plannen API, Kadaster/Informatiehuis
//    Ruimte) — het "oude" systeem. Eén schone REST-call op een puntcoördinaat
//    geeft direct het/de geldende ("leidende") plan(nen) voor dat punt terug,
//    inclusief de naam van elk bestemmingsvlak (bv. "Enkelbestemming Wonen")
//    zonder een tweede aanroep nodig te hebben.
//    Endpoint: POST https://data.informatiehuisruimte.nl/api/ruimtelijke-plannen/v1/leidende-plannen/_zoek
//    Docs: https://developer.omgevingswet.overheid.nl/dso/gegevens-gebruiken/ruimtelijke-plannen/
//    Live-respons/veldnamen NOG NIET geverifieerd — deze mapping is gebaseerd
//    op de officiële OpenAPI-spec (PDOK/open-api-specs, alleplannen.yaml).
//    Verifieer tegen een echte respons voordat dit op "live" gezet wordt,
//    zelfde discipline als bij bag.ts/kavel.ts.
//
// 2) Omgevingsplan (Omgevingsdocumenten-API's, DSO-LV zelf) — het "nieuwe"
//    systeem sinds de Omgevingswet (1 jan 2024). Gemeentes stappen hier
//    geleidelijk naartoe over, uiterlijk 2032. Alleen als FALLBACK aangeroepen
//    wanneer (1) niets vond — een gemeente draait op het ene óf het andere
//    systeem, nooit allebei tegelijk voor hetzelfde adres.
//    Dit is een substantieel zwaardere, object-georiënteerde API (aparte
//    resources voor activiteiten/locaties/regelteksten die gecombineerd
//    moeten worden) waarvan de exacte respons-vorm voor "wat is hier
//    toegestaan" nog niet is uitgezocht tegen een live endpoint. fetchLive()
//    hieronder is daarom bewust een expliciete, herkenbare stub — geen
//    gok-mapping — die een duidelijke fout geeft totdat dit stuk apart is
//    uitgezocht en geverifieerd. withResilience zet dat om in een eerlijke
//    "niet beschikbaar", nooit een gefabriceerde bestemming.
//
// Beide bronnen leveren een EIGEN sleutel op, maar via ÉÉN gratis aanvraag-
// formulier: developer.omgevingswet.overheid.nl/formulieren/api-key-dso-prod-
// omgeving-rp-aanvragen/ — daar staan twee aanvinkbare opties ("DSO" en
// "Ruimtelijke plannen"), allebei aanvinken geeft in één keer beide sleutels.
// Zonder sleutel: mock-modus, met bewust LEGE data (geen gegokte bestemming)
// — zie generateMock() hieronder, zelfde terughoudendheid als bag.ts bij
// bouwjaar/oppervlakte.
//
// Coördinaat: hergebruikt resolveBuurtcode() (lib/services/buurtcodeLookup.ts)
// voor het RD-coördinaat van het adrespunt — dezelfde lookup die kavel.ts en
// fundering.ts ook al doen. Bekend, nog niet opgelost verbeterpunt: dit is nu
// de VIERDE aparte aanroep van diezelfde lookup binnen één rapport (naast
// buurtprofiel/fundering/kavel) — zie de toelichting in kavel.ts, een
// caching-ronde zou dit voor alle vier in één keer kunnen oplossen.
// -----------------------------------------------------------------------------

const SOURCE_KEY = "bestemming";
const SOURCE_LABEL = "Bestemming (Ruimtelijke Plannen / Omgevingsplan)";

const RUIMTELIJKE_PLANNEN_ZOEK_PAD = "/leidende-plannen/_zoek";

interface BestemmingsvlakLink {
  href?: string;
  title?: string; // bv. "Enkelbestemming Wonen"
}

interface PlanLinks {
  self?: { href?: string; title?: string };
  bestemmingsvlakken?: BestemmingsvlakLink[];
}

interface RuimtelijkPlan {
  id?: string;
  type?: string;
  naam?: string;
  planstatusInfo?: { planstatus?: string; datum?: string };
  beleidsmatigVerantwoordelijkeOverheid?: { type?: string; naam?: string[] };
  _links?: PlanLinks;
}

interface RuimtelijkePlannenResponse {
  _embedded?: { plannen?: RuimtelijkPlan[] };
}

// "Enkelbestemming Wonen" -> "Wonen". Alleen de twee gedocumenteerde,
// officiële IMRO-voorvoegsels strippen (zie de voorbeeldwaarde in de
// OpenAPI-spec) — bij een onbekend voorvoegsel de titel gewoon ongewijzigd
// laten staan, nooit zelf verder interpreteren.
function opschonenBestemmingslabel(titel: string): string {
  return titel.replace(/^(Enkelbestemming|Dubbelbestemming)\s+/i, "").trim();
}

async function fetchBestemmingsplan(rd: RdCoordinaat): Promise<BestemmingData | null> {
  const config = DATA_SOURCE_CONFIG.bestemmingsplan;
  const apiKey = getApiKey(config);
  if (!apiKey) return null; // geen sleutel geconfigureerd -> deze bron overslaan, geen fout

  const res = await fetch(`${config.baseUrl}${RUIMTELIJKE_PLANNEN_ZOEK_PAD}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Crs": "epsg:28992", // RD, zelfde stelsel als resolveBuurtcode() teruggeeft
      Accept: "application/hal+json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      _geo: { contains: { type: "Point", coordinates: [rd.x, rd.y] } },
    }),
  });
  if (!res.ok) throw new Error(`Ruimtelijke Plannen API gaf HTTP ${res.status}`);

  const body: RuimtelijkePlannenResponse = await res.json();
  const plan = body._embedded?.plannen?.[0];
  if (!plan) return null; // geen leidend plan op dit punt -> laat de fallback (omgevingsplan) het proberen

  const bestemmingen = (plan._links?.bestemmingsvlakken ?? [])
    .map((v) => v.title)
    .filter((t): t is string => Boolean(t))
    .map(opschonenBestemmingslabel);

  return {
    bestemmingen,
    planNaam: plan.naam ?? null,
    planStatus: plan.planstatusInfo?.planstatus ?? null,
    planDatum: plan.planstatusInfo?.datum ?? null,
    bevoegdGezag: plan.beleidsmatigVerantwoordelijkeOverheid?.naam?.[0] ?? null,
    bron: "bestemmingsplan",
  };
}

// Zie de toelichting bovenaan dit bestand: bewust nog geen live-mapping.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchOmgevingsplan(rd: RdCoordinaat): Promise<BestemmingData | null> {
  const config = DATA_SOURCE_CONFIG.omgevingsplan;
  const apiKey = getApiKey(config);
  if (!apiKey) return null; // geen sleutel geconfigureerd -> geen fallback mogelijk, eerlijk niets

  throw new Error(
    "Omgevingsplan-koppeling is nog niet geïmplementeerd: de exacte respons-vorm van de Omgevingsdocumenten-API " +
      "(activiteiten/locaties/regelteksten combineren tot één bestemmingslabel) is nog niet geverifieerd tegen een " +
      "live endpoint. Voeg de mapping toe in fetchOmgevingsplan() zodra dat is uitgezocht."
  );
}

async function fetchLive(address: AddressMeta): Promise<BestemmingData> {
  const leeg: BestemmingData = {
    bestemmingen: [],
    planNaam: null,
    planStatus: null,
    planDatum: null,
    bevoegdGezag: null,
    bron: null,
  };

  const buurt = await resolveBuurtcode(address).catch(() => null);
  if (!buurt?.rd) return leeg;

  const viaBestemmingsplan = await fetchBestemmingsplan(buurt.rd);
  if (viaBestemmingsplan) return viaBestemmingsplan;

  const viaOmgevingsplan = await fetchOmgevingsplan(buurt.rd).catch(() => null);
  if (viaOmgevingsplan) return viaOmgevingsplan;

  return leeg;
}

// Mock: bewust GEEN gegokte bestemming (net als bag.ts bij bouwjaar/
// oppervlakte) — dit is een feitelijke, mogelijk juridisch relevante claim
// over wat op dit perceel is toegestaan, niet iets om te verzinnen voor de
// demo-modus.
function generateMock(): BestemmingData {
  return {
    bestemmingen: [],
    planNaam: null,
    planStatus: null,
    planDatum: null,
    bevoegdGezag: null,
    bron: null,
  };
}

function isEmpty(data: BestemmingData): boolean {
  return data.bestemmingen.length === 0;
}

function missingFields(data: BestemmingData): string[] {
  return data.bestemmingen.length === 0 ? ["bestemmingen"] : [];
}

export async function fetchBestemming(address: AddressMeta): Promise<SourceResult<BestemmingData>> {
  const bestemmingsplanKey = getApiKey(DATA_SOURCE_CONFIG.bestemmingsplan);
  const omgevingsplanKey = getApiKey(DATA_SOURCE_CONFIG.omgevingsplan);
  const live = Boolean(bestemmingsplanKey || omgevingsplanKey);

  return withResilience(() => (live ? fetchLive(address) : Promise.resolve(generateMock())), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: live ? "live" : "mock",
    status: "confirmed",
    timeoutMs: 8000,
    isEmpty,
    missingFields,
  });
}
