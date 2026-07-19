import type { AddressMeta, BuildingData } from "@/types/report";
import type { SourceResult } from "@/types/dataSource";
import { delay } from "@/lib/utils/seed";
import { withResilience } from "@/lib/adapters/withResilience";
import { DATA_SOURCE_CONFIG, getApiKey } from "@/lib/config/dataSources";
import { fetchBouwjaar } from "@/lib/services/bouwjaarLookup";

// -----------------------------------------------------------------------------
// BAG / Kadaster / PDOK-adapter → levert BuildingData (het "building"-domein
// van het canonieke Report-model, zie types/report.ts)
//
// Doel-endpoint (individuele bevraging, verblijfsobject + pand):
//   GET https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/adressen
//   Header: X-Api-Key: <BAG_API_KEY>, Accept: application/hal+json
//   Docs: https://lvbag.github.io/BAG-API/Technische%20specificatie/
// Adres-autocomplete/geocoding loopt apart via PDOK Locatieserver (gratis,
// geen key nodig): https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest
// -----------------------------------------------------------------------------

const SOURCE_KEY = "building";
const SOURCE_LABEL = "Kadaster BAG";

// Verkorte, indicatieve vorm van een echt BAG-antwoord. Bewust een ANDERE
// vorm dan onze interne BuildingData — dat ontkoppelt de UI van de exacte
// vorm van de bron. Verifieer tegen de actuele OpenAPI-spec voor live gebruik.
interface BagApiVerblijfsobject {
  identificatie?: string;
  oppervlakte?: number;
  gebruiksdoelen?: string[];
  bouwjaar?: number;
}
interface BagApiPand {
  identificatie?: string;
  bouwjaar?: number;
  status?: string;
  aantalVerblijfsobjecten?: number;
}
export interface BagApiResponse {
  verblijfsobject?: BagApiVerblijfsobject;
  pand?: BagApiPand;
}

// Mapper: externe BAG-vorm -> interne BuildingData. Ontbrekende velden
// worden niet geraden — ze blijven undefined zodat de UI eerlijk "onbekend"
// kan tonen, en zodat andere onderdelen (zoals de vergelijkbaarheid van
// buurtverkopen) niet stilzwijgend op een gegokte waarde bouwen.
export function mapBagResponse(raw: BagApiResponse): Partial<BuildingData> {
  const vo = raw.verblijfsobject;
  const pand = raw.pand;
  return {
    bouwjaar: pand?.bouwjaar ?? vo?.bouwjaar,
    gebruiksdoel: vo?.gebruiksdoelen?.[0],
    oppervlakteM2: vo?.oppervlakte,
    aantalVerblijfsobjecten: pand?.aantalVerblijfsobjecten,
    pandStatus: pand?.status,
    // "woningtype" en "inhoudM3" staan niet standaard in de BAG-respons —
    // zie docs/DATA_ARCHITECTURE.md voor de aanpak (afgeleid/aparte bron).
  };
}

// BUGFIX (zie de livegang-test): aantalVerblijfsobjecten/pandStatus kregen
// hier voorheen een WILLEKEURIG getal/status mee (randomInt/randomChoice),
// puur als restant uit de tijd dat de hele sectie nog mock was. Bouwjaar en
// woningtype werden daarna al wel netjes op "onbekend" gelaten als de live
// BAG-keten (zie fetchBuilding hieronder) faalde — maar deze twee velden
// bleven dan een verzonnen waarde tonen die niet als "ontbrekend" werd
// gemarkeerd (missingFields() hieronder checkt alleen op null/leeg, en een
// willekeurig getal is nooit null). Resultaat: bij een falende BAG-opzoeking
// toonde het rapport bv. "6 eenheden in pand" alsof het een feit was. Nu
// hetzelfde principe als de rest van dit bestand: undefined totdat de live
// bron het bevestigt, nooit een gok.
function generateMock(): BuildingData {
  return {
    bouwjaar: undefined,
    gebruiksdoel: undefined,
    woningtype: undefined,
    oppervlakteM2: undefined,
    inhoudM3: undefined,
    aantalVerblijfsobjecten: undefined,
    pandStatus: undefined,
  };
}

async function fetchLive(address: AddressMeta): Promise<BuildingData> {
  const config = DATA_SOURCE_CONFIG.bag;
  const apiKey = getApiKey(config);
  if (!apiKey) {
    throw new Error("BAG_API_KEY ontbreekt. Kan geen live BAG-data ophalen.");
  }

  // TODO: implementeer zodra de sleutel beschikbaar is, bv.:
  //
  // const res = await fetch(
  //   `${config.baseUrl}/adressen?postcode=${address.postcode}&huisnummer=${address.huisnummer}`,
  //   { headers: { "X-Api-Key": apiKey, Accept: "application/hal+json" } }
  // );
  // if (!res.ok) throw new Error(`BAG-API gaf status ${res.status}`);
  // const raw: BagApiResponse = await res.json();
  // return mapBagResponse(raw) as BuildingData;

  throw new Error("Live BAG-koppeling is nog niet geïmplementeerd.");
}

function missingFields(data: BuildingData): string[] {
  const missing: string[] = [];
  if (data.bouwjaar == null) missing.push("bouwjaar");
  if (!data.gebruiksdoel) missing.push("gebruiksdoel");
  if (!data.woningtype) missing.push("woningtype");
  if (data.oppervlakteM2 == null) missing.push("oppervlakteM2");
  if (data.aantalVerblijfsobjecten == null) missing.push("aantalVerblijfsobjecten");
  if (!data.pandStatus) missing.push("pandStatus");
  return missing;
}

// Publiek adapter-entrypunt — enige functie die reportService aanroept.
// Schakelt zelf tussen mock/live op basis van config en levert altijd een
// SourceResult, nooit een kale throw.
export async function fetchBuilding(address: AddressMeta): Promise<SourceResult<BuildingData>> {
  const config = DATA_SOURCE_CONFIG.bag;

  if (config.mode === "mock") {
    return withResilience(
      async () => {
        await delay(450 + Math.random() * 250);
        const data = generateMock();
        // Bouwjaar én woningtype zijn de uitzondering: die velden worden, ook
        // terwijl de rest van deze sectie nog mockdata is, altijd bij de
        // echte BAG-bron opgehaald (zie lib/services/bouwjaarLookup.ts). Geen
        // resultaat -> beide blijven undefined ("onbekend" in de UI).
        // Eigen, kortere timeout hier: een trage/hangende BAG-opzoeking mag
        // nooit de rest van deze (verder instant beschikbare) mockdata
        // meeslepen naar een timeout-status voor de hele sectie.
        const bouwjaarResult = await Promise.race([
          fetchBouwjaar(address),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
        ]);
        if (bouwjaarResult) {
          if (bouwjaarResult.bouwjaar != null) data.bouwjaar = bouwjaarResult.bouwjaar;
          // Oppervlakte: uitsluitend de officiële BAG-gebruiksoppervlakte van
          // het verblijfsobject (zelfde bevraging als bouwjaar), nooit een
          // schatting. Inhoud blijft een afgeleide indicatie, maar alleen als
          // de oppervlakte waarop hij gebaseerd is ook echt bevestigd is.
          if (bouwjaarResult.oppervlakte != null) {
            data.oppervlakteM2 = bouwjaarResult.oppervlakte;
            data.inhoudM3 = Math.round(bouwjaarResult.oppervlakte * 2.9);
          }
          // aantalVerblijfsobjecten/pandStatus hergebruiken hetzelfde live
          // BAG-gegeven (geen extra aanroep) dat verderop ook het woningtype
          // bepaalt. Lukt de pand-stap niet, dan blijven beide undefined
          // (zie generateMock() hierboven) — dus zichtbaar "onbekend" in de
          // UI, nooit een verzonnen getal/status.
          if (bouwjaarResult.aantalVerblijfsobjectenPand != null) {
            data.aantalVerblijfsobjecten = bouwjaarResult.aantalVerblijfsobjectenPand;
          }
          if (bouwjaarResult.pandStatus) {
            data.pandStatus = bouwjaarResult.pandStatus;
          }
          if (bouwjaarResult.gebruiksdoel) {
            data.gebruiksdoel = bouwjaarResult.gebruiksdoel;
            // Woningtype, in aflopende voorkeur, elk niveau confirmed:
            //   1. Grondgebonden subtype (Vrijstaand/Twee-onder-een-kap/
            //      Hoekwoning/Tussenwoning) via echte BAG-pandgeometrie
            //      (buren-analyse), alleen bij een zelfstandig pand.
            //   2. Anders: geteld aantal verblijfsobjecten in het pand
            //      (zelfde BAG-bevraging, geen extra call): 1 =
            //      Eengezinswoning, 2-3 = Meergezinswoning, 4+ = Appartement.
            //   3. Niet-woonfunctie toont gewoon het geregistreerde
            //      gebruiksdoel zelf.
            const aantal = bouwjaarResult.aantalVerblijfsobjectenPand;
            if (bouwjaarResult.gebruiksdoel.toLowerCase() === "woonfunctie" && aantal != null) {
              if (aantal === 1 && bouwjaarResult.grondgebondenType) {
                data.woningtype = bouwjaarResult.grondgebondenType;
              } else {
                data.woningtype = aantal >= 4 ? "Appartement" : aantal >= 2 ? "Meergezinswoning" : "Eengezinswoning";
              }
            } else {
              data.woningtype =
                bouwjaarResult.gebruiksdoel.charAt(0).toUpperCase() + bouwjaarResult.gebruiksdoel.slice(1);
            }
          }
        }
        return data;
      },
      {
        source: SOURCE_KEY,
        label: SOURCE_LABEL,
        mode: "mock",
        status: "mock",
        timeoutMs: config.timeoutMs,
        missingFields,
      }
    );
  }

  return withResilience(() => fetchLive(address), {
    source: SOURCE_KEY,
    label: SOURCE_LABEL,
    mode: "live",
    status: "confirmed",
    timeoutMs: config.timeoutMs,
    missingFields,
  });
}
