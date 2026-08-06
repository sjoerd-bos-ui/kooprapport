import type { DataMode } from "@/types/dataSource";

// -----------------------------------------------------------------------------
// Config voor de matchfunctie (#2: "nieuwe woningen die aan de zoekopdracht
// voldoen"), zie lib/data-sources/fundaFeed.ts. Zelfde mock/live-patroon als
// de rest van dit project: zonder FUNDA_FEED_MODE=live blijft dit op "mock"
// staan, dus geen enkel verzoek naar Funda totdat dat bewust aangezet wordt.
//
// GESCHIEDENIS: dit gebruikte eerst de oude, niet meer gedocumenteerde
// partner-RSS-feed (partnerapi.funda.nl) -- die geeft inmiddels HTTP 401
// (live geverifieerd) en is dus definitief dood. Vervolgens is een betaalde
// Apify-actor geprobeerd ($14,99/maand) -- die bleek het prijsveld structureel
// niet te vullen (live geverifieerd: overal "price": null). De huidige
// aanpak leest in plaats daarvan RECHTSTREEKS de publieke funda.nl-pagina's:
// de zoekresultatenpagina (voor woninglinks) en per woning de detailpagina
// (voor prijs/adres/foto, via de schema.org JSON-LD die daar al standaard
// in staat -- live geverifieerd, geen JavaScript-rendering nodig, gewone
// server-side fetch volstaat). Nog steeds GEEN officiële, ondersteunde
// koppeling: Funda kan de paginastructuur op elk moment wijzigen of
// verkeersblokkades instellen, dus alles hier blijft net zo defensief als
// eerder (elke fout levert gewoon minder/geen matches op, nooit een crash).
// -----------------------------------------------------------------------------

function readMode(envVar: string): DataMode {
  return process.env[envVar] === "live" ? "live" : "mock";
}

export const FUNDA_FEED_MODE: DataMode = readMode("FUNDA_FEED_MODE");

// Timeout voor het ophalen van de zoekresultatenpagina (levert de lijst met
// woninglinks) en, los daarvan, per gevonden woning de detailpagina (levert
// prijs/adres/foto). Twee aparte constanten omdat er per zoekopdracht 1
// zoekpagina-aanroep is maar tot ~15 detailpagina-aanroepen -- die laatste
// mogen individueel korter timeouten zodat één trage woning de rest van de
// batch niet ophoudt.
//
// OPGEHOOGD (diagnose-sessie): met SCRAPERAPI_KEY ingesteld loopt elke fetch
// via ScraperAPI's render=true-modus (nodig om langs Funda's botcheck te
// komen), en dat is een echte browserpagina die renderen kost merkbaar meer
// tijd dan een kale HTML-fetch -- ScraperAPI's eigen requests kunnen tot
// zo'n 60-70s duren voor ze zelf afbreken. 10s/6s was daarom veel te kort en
// zorgde ervoor dat elke live-poging altijd op de eigen AbortController
// afliep, nog vóór ScraperAPI kon antwoorden.
// Bewust onder de 60s maxDuration van de aanroepende routes gehouden (zie
// matches-verversen/route.ts en cron/matches-controleren/route.ts): in het
// ergste geval search(35s) + parallelle details(20s) ≈ 55s, met marge.
export const FUNDA_SEARCH_TIMEOUT_MS = 35000;
export const FUNDA_DETAIL_TIMEOUT_MS = 20000;
