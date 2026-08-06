import type { DataMode } from "@/types/dataSource";

// -----------------------------------------------------------------------------
// Config voor de matchfunctie (#2: "nieuwe woningen die aan de zoekopdracht
// voldoen"), zie lib/data-sources/fundaFeed.ts. Zelfde mock/live-patroon als
// de rest van dit project: zonder FUNDA_FEED_MODE=live blijft dit op "mock"
// staan, dus geen enkel verzoek naar Funda totdat dat bewust aangezet wordt.
//
// BELANGRIJK, in tegenstelling tot de andere databronnen in dit project: dit
// is GEEN officiële, door Funda ondersteunde API. Het is de oude, niet meer
// gedocumenteerde partner-RSS-feed (partnerapi.funda.nl) die nog wel
// bereikbaar blijkt, maar zonder enige garantie -- Funda kan dit zonder
// aankondiging aanpassen of blokkeren. Zie de toelichting in
// lib/data-sources/fundaFeed.ts voor hoe daar defensief mee wordt omgegaan
// (elke fout levert gewoon 0 matches op, nooit een crash van de cron).
// -----------------------------------------------------------------------------

function readMode(envVar: string): DataMode {
  return process.env[envVar] === "live" ? "live" : "mock";
}

export const FUNDA_FEED_MODE: DataMode = readMode("FUNDA_FEED_MODE");
export const FUNDA_FEED_BASE_URL = process.env.FUNDA_FEED_BASE_URL ?? "http://partnerapi.funda.nl/feeds/Aanbod.svc/rss";
export const FUNDA_FEED_TIMEOUT_MS = 10000;

// Timeout voor het los ophalen van de og:image-foto per listingpagina (zie
// haalOgAfbeelding in lib/data-sources/fundaFeed.ts) -- de RSS-feed zelf
// levert vrijwel nooit een foto, maar de listingpagina's op funda.nl doen dat
// wel via een standaard og:image-metatag (LIVE geverifieerd tegen een echte
// Funda-detailpagina). Kort gehouden: dit gebeurt per gevonden woning, dus
// een trage/hangende aanroep mag de rest van de batch niet vertragen.
export const OG_IMAGE_TIMEOUT_MS = 5000;
