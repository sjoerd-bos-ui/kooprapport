import { DATA_SOURCE_CONFIG } from "@/lib/config/dataSources";
import { BETAAL_MODE } from "@/lib/config/payment";

// -----------------------------------------------------------------------------
// Bepaalt of de site daadwerkelijk volledig op live data/livebetalingen
// draait, i.p.v. bij elke footer los losse MODE-vars te controleren.
//
// Gebruikt door de "Mockdata ter illustratie"-tekst in beide footers
// (app/page.tsx, SiteFooter.tsx). Die tekst was voorheen hardcoded — prima
// zolang alles daadwerkelijk mock was, maar zou na een gedeeltelijke of
// volledige livegang een VERZONNEN bewering worden ("nog geen live
// databronnen gekoppeld" terwijl dat inmiddels niet meer klopt), wat
// rechtstreeks tegen het kernprincipe van deze app ingaat. Deze functie
// zorgt dat de tekst vanzelf verdwijnt zodra dat daadwerkelijk zo is,
// zonder dat iemand er nog apart aan hoeft te denken bij livegang.
//
// BELANGRIJKE NUANCE: ALTUM_MODE=live/BUURTVERKOPEN_MODE=live betekent op
// zich alleen "er wordt een echte netwerkaanroep naar Altum gedaan" — bij
// ALTUM_SANDBOX=true gaat die aanroep naar Altum's sandbox-endpoint, dat
// vaste testdata teruggeeft (zie woningwaarde.ts/buurtverkopen.ts), NIET de
// echte woningwaarde/buurtverkopen voor het opgezochte adres. Dat is dus
// functioneel nog steeds demodata, ook al staat de MODE-var op "live" —
// zonder deze check zou de banner voortijdig verdwijnen terwijl de
// getoonde Altum-cijfers nog steeds nep zijn.
//
// BAG-NUANCE (andersom): BAG_MODE="mock" zegt NIET dat de getoonde
// bouwjaar/oppervlakte/gebruiksdoel/woningtype nep zijn. Zelfs in mock-modus
// haalt fetchBuilding() (lib/data-sources/bag.ts) die velden gewoon live op
// bij de gratis, keyless PDOK BAG-bron (fetchBouwjaar(), zie
// bouwjaarLookup.ts) — "mock" slaat hier alleen op de betaalde, sleutel-
// vereisende Kadaster-losse-bevragingen-route, die nog niet gebouwd is en
// ook niets aan de getoonde data zou toevoegen. BAG telt daarom bewust NIET
// mee in "alle bronnen live" hieronder: die check zou anders de banner laten
// staan (of, omgekeerd, verkeerd doen verdwijnen) op basis van een label dat
// niets zegt over of de getoonde data echt is.
//
// BESTEMMINGSPLAN/OMGEVINGSPLAN-NUANCE (zelfde soort uitzondering als BAG,
// andere reden): deze twee bronnen vereisen een losse, los aan te vragen
// DSO-sleutel (developer.omgevingswet.overheid.nl) die er bewust nog niet is
// — een keuze van de eigenaar, geen half afgebouwde koppeling. In mock-modus
// tonen ze GEEN verzonnen bestemming (zie generateMock() in
// lib/data-sources/bestemming.ts: "geen gegokte bestemming"), alleen eerlijk
// lege data. Dat is fundamenteel anders dan de Altum-sandbox hierboven (die
// wél een plausibel ogend, verzonnen cijfer teruggaf) — een bezoeker wordt
// hier dus niet iets neps voorgespiegeld, alleen een sectie die (nog) niets
// laat zien. Om die reden tellen deze twee bewust NIET mee in "alle bronnen
// live": anders zou de banner permanent blijven staan voor een losstaande,
// eerlijk-lege sectie, terwijl de rest van het rapport (energielabel,
// woningwaarde, buurtverkopen) allang op echte data draait.
const GEEN_NEP_DATA_BIJ_MOCK: readonly string[] = ["bag", "bestemmingsplan", "omgevingsplan"];

export function isVolledigLive(): boolean {
  const alleOverigeBronnenLive = Object.entries(DATA_SOURCE_CONFIG).every(
    ([key, config]) => GEEN_NEP_DATA_BIJ_MOCK.includes(key) || config.mode === "live"
  );
  const altumEchtNietSandbox = process.env.ALTUM_SANDBOX !== "true";
  return alleOverigeBronnenLive && altumEchtNietSandbox && BETAAL_MODE === "live";
}
