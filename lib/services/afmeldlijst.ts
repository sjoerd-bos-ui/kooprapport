import { kvGet, kvSet } from "@/lib/services/kvStore";

// -----------------------------------------------------------------------------
// Afmeldlijst voor de herinneringsmail (zie app/api/cron/reminder-email/route.ts
// en app/api/rapport/preview-email/route.tsx) — een e-mailadres dat hier in
// staat, krijgt nooit meer een herinnering, ook niet voor een nieuwe preview-
// aanvraag op een ander adres. Bewust GEEN vervaltermijn (kvSet zonder TTL):
// een afmelding moet blijven staan totdat iemand 'm zelf weer ongedaan maakt
// (nieuw verzoek indienen kan alsnog, dit blokkeert alleen de automatische
// herinnering, niet de direct-aangevraagde preview-mail zelf).
// -----------------------------------------------------------------------------

function sleutel(email: string): string {
  return `afmelding:${email.trim().toLowerCase()}`;
}

export async function isAfgemeldVoorHerinnering(email: string): Promise<boolean> {
  return (await kvGet(sleutel(email))) !== null;
}

export async function meldAfVoorHerinnering(email: string): Promise<void> {
  await kvSet(sleutel(email), "1");
}
