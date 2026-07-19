// -----------------------------------------------------------------------------
// Generieke, kleine in-memory TTL-cache — per serverproces (zelfde soort
// beperking als de in-memory fallback van lib/services/kvStore.ts: gaat niet
// mee tussen meerdere serverinstanties of na een herstart; bij een cache-miss
// gebeurt gewoon een verse aanroep, nooit een fout of een te lang verouderd
// antwoord — een miss is functioneel altijd veilig, alleen iets trager).
//
// Cachet de PROMISE zelf, niet pas het opgeloste resultaat: cruciaal voor het
// dedupliceren van meerdere, (bijna) gelijktijdige aanroepen met dezelfde
// key — bv. de 5 aparte resolveBuurtcode()-aanroepen voor hetzelfde adres in
// reportService.ts's Promise.all. Bij een simpele "cache pas het resultaat"-
// aanpak zouden al die aanroepen ondanks elkaar toch allemaal een eigen,
// verse aanroep doen (ze starten synchroon, vóórdat de eerste al is
// opgelost). Door de Promise meteen (synchroon) in de cache te zetten, delen
// gelijktijdige aanroepen dezelfde onderliggende aanroep.
//
// Gebruikt voor: het RD/WGS84-coördinaat per adres (buurtcodeLookup.ts) en de
// gratis, zelden-wijzigende rapportbronnen (BAG/EP-Online/CBS/PDOK — zie
// reportService.ts). NIET gebruikt voor de betaalde Altum-bronnen
// (woningwaarde/buurtverkopen): die blijven bewust altijd vers, dat is een
// aparte, business-kritische beslissing (zie reportService.ts) die hier niet
// stilzwijgend meegepakt mag worden.
// -----------------------------------------------------------------------------

interface CacheEntry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
  // BUGFIX (zie de livegang-test): onze bronnen gooien bij een mislukte
  // opzoeking meestal geen fout — ze geven gewoon een SourceResult terug met
  // (bijna) alle velden leeg (zie withResilience.ts/types/dataSource.ts).
  // Zonder deze predicate werd zo'n toevallig-lege uitkomst, bv. door een
  // tijdelijke hik in de PDOK/BAG-keten, gewoon 24 uur lang "bevroren" als
  // resultaat — een kortstondige storing kreeg zo een dagenlang zichtbaar
  // effect. Retourneert shouldCache(value) === false, dan wordt de entry
  // direct na het ophalen weer verwijderd (net als bij een echte fout),
  // zodat de eerstvolgende aanroep het gewoon opnieuw probeert.
  shouldCache?: (value: T) => boolean
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.promise as Promise<T>;
  }

  const promise = compute()
    .then((value) => {
      if (shouldCache && !shouldCache(value)) {
        store.delete(key);
      }
      return value;
    })
    .catch((err) => {
      // Bij een fout de entry meteen weer verwijderen — anders blijft een
      // mislukte aanroep voor de hele TTL "vastzitten" als resultaat, en zou
      // een tijdelijke storing bij een bron veel langer effect hebben dan
      // nodig.
      store.delete(key);
      throw err;
    });

  store.set(key, { promise: promise as Promise<unknown>, expiresAt: Date.now() + ttlMs });
  return promise;
}
