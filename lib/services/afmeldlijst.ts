import { createHash } from "crypto";
import { kvGet, kvSet } from "@/lib/services/kvStore";

// -----------------------------------------------------------------------------
// Afmeldlijst voor de herinneringsmail (zie app/api/cron/reminder-email/route.ts
// en app/api/rapport/preview-email/route.tsx) — een e-mailadres dat hier in
// staat, krijgt nooit meer een herinnering, ook niet voor een nieuwe preview-
// aanvraag op een ander adres. Bewust GEEN vervaltermijn (kvSet zonder TTL):
// een afmelding moet blijven staan totdat iemand 'm zelf weer ongedaan maakt
// (nieuw verzoek indienen kan alsnog, dit blokkeert alleen de automatische
// herinnering, niet de direct-aangevraagde preview-mail zelf).
//
// BUGFIX (privacy-spanning uit de audit): dit was aanvankelijk het e-mailadres
// zelf, in platte tekst, voor onbepaalde tijd -- precies het adres van iemand
// die zei "stuur mij niets meer" bleef daardoor voor altijd ergens staan,
// zonder dat diegene dat zelf ooit kon laten verwijderen. Opgelost door
// uitsluitend een onomkeerbare hash van het e-mailadres te bewaren, nooit het
// adres zelf: Kooprapport kan hiermee nog steeds herkennen "dit e-mailadres
// heeft zich afgemeld", maar bewaart het adres zelf nergens meer. Bewust GEEN
// apart geheim/salt (zoals lib/utils/kortingToken.ts wel gebruikt) -- zelfde
// afweging als bij lib/utils/afmeldLink.ts: het ergste dat met een
// teruggerekende hash zou kunnen (iemand achterhaalt dat een geraden
// e-mailadres zich ooit afmeldde) is geen beveiligings- of financieel risico,
// dus een extra sleutel erbij beheren zou hier onnodige complexiteit
// toevoegen tegenover wat het risico rechtvaardigt.
// -----------------------------------------------------------------------------

function sleutel(email: string): string {
  const genormaliseerd = email.trim().toLowerCase();
  const hash = createHash("sha256").update(genormaliseerd).digest("hex");
  return `afmelding:${hash}`;
}

export async function isAfgemeldVoorHerinnering(email: string): Promise<boolean> {
  return (await kvGet(sleutel(email))) !== null;
}

export async function meldAfVoorHerinnering(email: string): Promise<void> {
  await kvSet(sleutel(email), "1");
}
