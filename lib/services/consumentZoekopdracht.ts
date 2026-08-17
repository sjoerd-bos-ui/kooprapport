import { kvGet, kvSet } from "@/lib/services/kvStore";
import type { B2bKoperVoorkeuren } from "@/types/b2b";

// -----------------------------------------------------------------------------
// B2C-tegenhanger van het koperVoorkeuren-deel van B2bKlantdossier
// (b2bStore.ts) -- "Mijn rapporten" krijgt hiermee dezelfde Funda-zoektool
// als Zakelijk (zie het Cowork-gesprek "visualize de zoektool ... hierin
// precies zoals in zakelijk"), maar dan zonder het makelaar/org-dossierconcept
// eromheen: hier is de koper zelf de eigenaar, geen apart klantdossier nodig.
//
// De matches zelf (B2bWoningMatch) en de bijbehorende opslag-/opruim-/
// weergavelimietfuncties (maakMatch, ruimVerouderdeMatchenOp, kapMatchenOpMax,
// listMatchenVoorKlant, zetMatchInteressant in b2bStore.ts) zijn BEWUST
// rechtstreeks hergebruikt i.p.v. gedupliceerd -- `klantId` daar is intern
// gewoon een opake string-sleutel voor de KV-index, geen verplichte koppeling
// aan een echt B2bKlantdossier. `consumentKlantId` hieronder geeft elke
// consument zo'n eigen, namespaced sleutel (nooit botsend met een echte
// makelaar-dossier-UUID) zodat die functies ook hier gewoon werken.
export function consumentKlantId(email: string): string {
  return `consument:${email.trim().toLowerCase()}`;
}

function voorkeurenKey(email: string): string {
  return `consument-voorkeuren:${email.trim().toLowerCase()}`;
}

// Zelfde bewaartermijn als een aan e-mail gekoppelde Bestelling
// (GEKOPPELDE_BESTELLING_TTL_SECONDEN in bestellingen.ts) -- een
// zoekopdracht die bij een account hoort mag niet stilzwijgend verlopen
// zolang het account zelf nog bestaat.
const VOORKEUREN_TTL_SECONDEN = 5 * 365 * 24 * 60 * 60; // 5 jaar

export async function getConsumentVoorkeuren(email: string): Promise<B2bKoperVoorkeuren | null> {
  const raw = await kvGet(voorkeurenKey(email));
  return raw ? (JSON.parse(raw) as B2bKoperVoorkeuren) : null;
}

export async function zetConsumentVoorkeuren(email: string, voorkeuren: B2bKoperVoorkeuren): Promise<void> {
  await kvSet(voorkeurenKey(email), JSON.stringify(voorkeuren), VOORKEUREN_TTL_SECONDEN);
}
