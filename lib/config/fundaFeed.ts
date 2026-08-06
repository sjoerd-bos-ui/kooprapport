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
export const FUNDA_SEARCH_TIMEOUT_MS = 10000;
export const FUNDA_DETAIL_TIMEOUT_MS = 6000;
