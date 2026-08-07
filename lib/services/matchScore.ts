import { ENERGIELABEL_VOLGORDE_FUNDA, ENERGIELABEL_AANTAL_FUNDA_WAARDEN } from "@/lib/data-sources/fundaFeed";
import type { B2bWoningMatch, B2bZoekopdracht, B2bKenmerken, B2bMatchVerificatie } from "@/types/b2b";

// -----------------------------------------------------------------------------
// Matching-scoremodel (zie het Cowork-gesprek hierover) -- rangschikt
// GEVERIFIEERDE matches (die dus al door voldoetAanKenmerken() zijn gekomen,
// zie fundaFeed.ts) op hoe goed ze passen, i.p.v. simpelweg op vindmoment.
// Puur een pure functie over al aanwezige, al gescrapete data -- niets hierin
// doet een netwerkaanroep of gokt naar informatie die niet op de
// detailpagina stond.
//
// Basisverdeling, altijd optellend tot 100 punten, ONGEACHT welke koper-
// voorkeuren wel/niet zijn ingevuld:
//   - Prijs t.o.v. buurtgemiddelde   30 (40 of 20 als de koper prijs resp.
//                                        kenmerken nadrukkelijk zwaarder liet
//                                        wegen, zie B2bKoperVoorkeuren.prioriteit)
//   - Overtroffen kenmerken          30 (of 20/40, spiegelbeeld van hierboven)
//   - Versheid (eigen vindmoment)    15 (altijd vast -- geen koperVoorkeuren-
//                                        vraag hiervoor, puur ons eigen
//                                        ontdekkingsmoment, niet Funda's
//                                        plaatsingsdatum, want die staat
//                                        achter een login-muur)
//   - Bouwjaar                       10
//   - Kavelgrootte                   10 (alleen relevant bij huizen)
//   - Volledigheid van de gegevens    5
//
// Als een onderdeel niet te beoordelen is (voorkeur nog niet bekend, data
// ontbreekt, kenmerk hoort niet bij dit woningtype) krijgt het onderdeel
// NOOIT 0 en ook nooit een gegokte waarde -- het levert de neutrale helft van
// zijn maximum op, zodat het de match nooit bevoordeelt of benadeelt t.o.v.
// een match waarvoor we het wél weten.
//
// Bovenop die 0-100 basisscore komen twee losse AFTREKPOSTEN (geen eigen
// "max", puur een straf) voor de twee dingen die de koper desgevraagd
// bespreekbaar heeft gemaakt (zie B2bKoperVoorkeuren): boven het
// maximumbudget, en een ontbrekend gevraagd kenmerk. Zonder die twee vragen
// beantwoord zou zo'n match sowieso al hard afgewezen zijn (zie
// voldoetAanKenmerken in fundaFeed.ts en de budgetcontrole in b2bStore.ts),
// dus deze aftrek is puur voor de matches die daardoor juist WEL zijn
// doorgelaten -- zonder aftrek zouden ze onterecht even hoog kunnen scoren
// als een match die volledig voldoet.
// -----------------------------------------------------------------------------

export interface MatchScoreOnderdeel {
  label: string;
  behaald: number;
  maximum: number;
  toelichting: string;
}

export interface MatchScore {
  totaal: number; // 0-100, na aftrekposten
  onderdelen: MatchScoreOnderdeel[];
}

function clamp(waarde: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, waarde));
}

function euro(bedrag: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function scorePrijs(v: B2bMatchVerificatie, maximum: number): MatchScoreOnderdeel {
  if (v.vraagprijsPerM2 == null || v.buurtgemiddeldePrijsPerM2 == null || v.buurtgemiddeldePrijsPerM2 <= 0) {
    return { label: "Prijs t.o.v. buurtgemiddelde", behaald: Math.round(maximum / 2), maximum, toelichting: "Buurtgemiddelde niet beschikbaar op de advertentie." };
  }
  const kortingFractie = (v.buurtgemiddeldePrijsPerM2 - v.vraagprijsPerM2) / v.buurtgemiddeldePrijsPerM2;
  // 20%+ onder het buurtgemiddelde = volle punten, duurder dan gemiddeld
  // levert nooit een aftrek op (zie de uitleg in het gesprek hierover: de
  // woning voldeed al aan het budget, dat is een bonus-signaal, geen straf).
  const fractie = clamp(kortingFractie / 0.2, 0, 1);
  const behaald = Math.round(fractie * maximum);
  const kortingPct = Math.round(kortingFractie * 100);
  const toelichting =
    kortingPct > 0
      ? `${kortingPct}% onder de gemiddelde vraagprijs/m² in de buurt (${euro(v.vraagprijsPerM2)} vs. ${euro(v.buurtgemiddeldePrijsPerM2)} gemiddeld).`
      : `Rond of boven het buurtgemiddelde (${euro(v.vraagprijsPerM2)} vs. ${euro(v.buurtgemiddeldePrijsPerM2)} gemiddeld).`;
  return { label: "Prijs t.o.v. buurtgemiddelde", behaald, maximum, toelichting };
}

function scoreKenmerken(v: B2bMatchVerificatie, kenmerken: B2bKenmerken | undefined, maximum: number): MatchScoreOnderdeel {
  if (!kenmerken) return { label: "Overtroffen kenmerken", behaald: Math.round(maximum / 2), maximum, toelichting: "Geen kenmerken-eisen ingesteld." };

  let pluspunten = 0;
  const redenen: string[] = [];

  if (kenmerken.minSlaapkamers && v.slaapkamers != null && v.slaapkamers > kenmerken.minSlaapkamers) {
    pluspunten++;
    redenen.push(`${v.slaapkamers} i.p.v. minimaal ${kenmerken.minSlaapkamers} slaapkamers`);
  }
  if (kenmerken.minWoonoppervlak && v.woonoppervlak != null && v.woonoppervlak > kenmerken.minWoonoppervlak) {
    pluspunten++;
    redenen.push(`${v.woonoppervlak} i.p.v. minimaal ${kenmerken.minWoonoppervlak} m²`);
  }
  if (kenmerken.minEnergielabel && v.energielabel) {
    const rang = ENERGIELABEL_VOLGORDE_FUNDA.indexOf(v.energielabel);
    const drempel = ENERGIELABEL_AANTAL_FUNDA_WAARDEN[kenmerken.minEnergielabel] - 1;
    if (rang !== -1 && rang < drempel) {
      pluspunten++;
      redenen.push(`energielabel ${v.energielabel}, beter dan gevraagd`);
    }
  }
  if (!kenmerken.tuin && v.heeftTuin) { pluspunten++; redenen.push("extra tuin, niet gevraagd"); }
  if (!kenmerken.balkon && v.heeftBalkon) { pluspunten++; redenen.push("extra balkon, niet gevraagd"); }
  if (!kenmerken.dakterras && v.heeftDakterras) { pluspunten++; redenen.push("extra dakterras, niet gevraagd"); }

  const MAX_PLUSPUNTEN = 5;
  const behaald = Math.round((Math.min(pluspunten, MAX_PLUSPUNTEN) / MAX_PLUSPUNTEN) * maximum);
  const toelichting = redenen.length > 0 ? redenen.join(", ") + "." : "Voldoet aan de gevraagde kenmerken, zonder extra's.";
  return { label: "Overtroffen kenmerken", behaald, maximum, toelichting };
}

const VERSHEID_MAX = 15;
function scoreVersheid(match: B2bWoningMatch): MatchScoreOnderdeel {
  const dagenGeleden = (Date.now() - new Date(match.gevondenOp).getTime()) / (24 * 60 * 60 * 1000);
  const fractie = clamp(1 - dagenGeleden / 14, 0, 1);
  const behaald = Math.round(fractie * VERSHEID_MAX);
  const toelichting = dagenGeleden < 1 ? "Vandaag gevonden." : `${Math.round(dagenGeleden)} dag(en) geleden gevonden.`;
  return { label: "Versheid", behaald, maximum: VERSHEID_MAX, toelichting };
}

const BOUWJAAR_MAX = 10;
function scoreBouwjaar(v: B2bMatchVerificatie, zoekopdracht: B2bZoekopdracht | undefined): MatchScoreOnderdeel {
  const voorkeur = zoekopdracht?.koperVoorkeuren?.bouwstijl;
  if (!voorkeur || voorkeur === "geen_voorkeur" || v.bouwjaar == null) {
    return {
      label: "Bouwjaar",
      behaald: Math.round(BOUWJAAR_MAX / 2),
      maximum: BOUWJAAR_MAX,
      toelichting: v.bouwjaar == null ? "Bouwjaar niet gevonden op de advertentie." : "Geen voorkeur voor bouwjaar opgegeven.",
    };
  }
  // Simpele, bewust gedocumenteerde schaal (geen aanname over wat "normaal"
  // is per regio/type): 1900-2015, lineair. Bij "nieuw" telt 2015+ als vol,
  // bij "karakter" is die schaal precies omgekeerd.
  const fractieNieuw = clamp((v.bouwjaar - 1900) / (2015 - 1900), 0, 1);
  const fractie = voorkeur === "nieuw" ? fractieNieuw : 1 - fractieNieuw;
  const behaald = Math.round(fractie * BOUWJAAR_MAX);
  return { label: "Bouwjaar", behaald, maximum: BOUWJAAR_MAX, toelichting: `Gebouwd in ${v.bouwjaar}.` };
}

const KAVEL_MAX = 10;
// Vaste referentieschaal (0-300 m²) i.p.v. een écht buurtgemiddelde -- dat
// laatste hebben we voor kavels niet beschikbaar (in tegenstelling tot
// prijs/m², waar Funda zelf een buurtgemiddelde toont). Bewust als
// vereenvoudiging benoemd, net als eerdere bekende-beperkingen in dit
// project (zie VOORTGANG.md).
function scoreKavel(v: B2bMatchVerificatie, maximum: number): MatchScoreOnderdeel {
  if (v.woningtypeFamilie !== "huis") {
    return { label: "Kavelgrootte", behaald: Math.round(maximum / 2), maximum, toelichting: "Niet van toepassing bij een appartement." };
  }
  if (v.perceeloppervlak == null) {
    return { label: "Kavelgrootte", behaald: Math.round(maximum / 2), maximum, toelichting: "Perceeloppervlakte niet gevonden op de advertentie." };
  }
  const fractie = clamp(v.perceeloppervlak / 300, 0, 1);
  return { label: "Kavelgrootte", behaald: Math.round(fractie * maximum), maximum, toelichting: `${v.perceeloppervlak} m² perceel.` };
}

const VOLLEDIGHEID_MAX = 5;
function scoreVolledigheid(v: B2bMatchVerificatie): MatchScoreOnderdeel {
  const velden: (unknown | null)[] = [v.slaapkamers, v.woonoppervlak, v.energielabel, v.bouwjaar, v.vraagprijsPerM2];
  if (v.woningtypeFamilie === "huis") velden.push(v.perceeloppervlak);
  const bekend = velden.filter((x) => x != null).length;
  const fractie = velden.length > 0 ? bekend / velden.length : 0;
  return {
    label: "Volledigheid van de gegevens",
    behaald: Math.round(fractie * VOLLEDIGHEID_MAX),
    maximum: VOLLEDIGHEID_MAX,
    toelichting: `${bekend} van de ${velden.length} kenmerken bevestigd op de advertentie.`,
  };
}

// Aftrekpost 1: boven het maximumbudget. Komt normaal alleen voor als de
// koper bij "budgetFlexibel" heeft aangegeven dat dit bespreekbaar is (zie
// B2bKoperVoorkeuren) -- zonder dat antwoord wordt zo'n match al hard
// geweigerd voordat hij hier ooit terechtkomt (zie b2bStore.ts). Deze functie
// rekent de straf sowieso uit als de prijs toch boven budget blijkt, ongeacht
// de vlag, zodat scoring nooit afhankelijk is van waar de filtering wel/niet
// al is toegepast.
function aftrekBudgetOverschrijding(match: B2bWoningMatch, zoekopdracht: B2bZoekopdracht | undefined): { punten: number; toelichting: string | null } {
  const budgetMax = zoekopdracht?.budgetMax;
  if (!budgetMax || budgetMax <= 0 || match.prijs == null || match.prijs <= budgetMax) return { punten: 0, toelichting: null };
  const overschrijdingPct = ((match.prijs - budgetMax) / budgetMax) * 100;
  const punten = Math.min(40, Math.round(overschrijdingPct * 4));
  return { punten, toelichting: `${Math.round(overschrijdingPct)}% boven het maximumbudget.` };
}

// Aftrekpost 2: een gevraagd (zacht) kenmerk dat toch ontbreekt. Alleen
// zinvol te beoordelen voor tuin/balkon/dakterras -- garage/lift worden nog
// niet lokaal geverifieerd (zie het bekende, nog niet opgepakte punt in
// fundaFeed.ts), dus die tellen hier bewust niet mee om nooit een woning af
// te straffen op basis van data die we niet kunnen bevestigen.
function aftrekOntbrekendKenmerk(v: B2bMatchVerificatie, kenmerken: B2bKenmerken | undefined): { punten: number; toelichting: string | null } {
  if (!kenmerken) return { punten: 0, toelichting: null };
  const ontbrekend: string[] = [];
  if (kenmerken.tuin && !v.heeftTuin) ontbrekend.push("tuin");
  if (kenmerken.balkon && !v.heeftBalkon) ontbrekend.push("balkon");
  if (kenmerken.dakterras && !v.heeftDakterras) ontbrekend.push("dakterras");
  if (ontbrekend.length === 0) return { punten: 0, toelichting: null };
  const punten = Math.min(24, ontbrekend.length * 8);
  return { punten, toelichting: `Mist ${ontbrekend.join(" en ")}, was wel gevraagd.` };
}

export function berekenMatchScore(match: B2bWoningMatch, zoekopdracht: B2bZoekopdracht | undefined): MatchScore {
  const v = match.verificatie;
  const kenmerken = zoekopdracht?.kenmerken;
  const prioriteit = zoekopdracht?.koperVoorkeuren?.prioriteit;
  const maxPrijs = prioriteit === "prijs" ? 40 : prioriteit === "kenmerken" ? 20 : 30;
  const maxKenmerken = prioriteit === "prijs" ? 20 : prioriteit === "kenmerken" ? 40 : 30;

  // Geen verificatie-snapshot (kan bij oudere matches van vóór dit model
  // voorkomen) -- neutraal 50 van de 100 in plaats van gokken naar de
  // onderliggende kenmerken.
  if (!v) {
    return {
      totaal: 50,
      onderdelen: [{ label: "Score", behaald: 50, maximum: 100, toelichting: "Geen verificatiegegevens beschikbaar voor deze (oudere) match." }],
    };
  }

  const onderdelen = [
    scorePrijs(v, maxPrijs),
    scoreKenmerken(v, kenmerken, maxKenmerken),
    scoreVersheid(match),
    scoreBouwjaar(v, zoekopdracht),
    scoreKavel(v, KAVEL_MAX),
    scoreVolledigheid(v),
  ];

  const basisScore = onderdelen.reduce((som, o) => som + o.behaald, 0);
  const budgetAftrek = aftrekBudgetOverschrijding(match, zoekopdracht);
  const kenmerkAftrek = aftrekOntbrekendKenmerk(v, kenmerken);

  if (budgetAftrek.toelichting) onderdelen.push({ label: "Budgetoverschrijding", behaald: -budgetAftrek.punten, maximum: 0, toelichting: budgetAftrek.toelichting });
  if (kenmerkAftrek.toelichting) onderdelen.push({ label: "Ontbrekend kenmerk", behaald: -kenmerkAftrek.punten, maximum: 0, toelichting: kenmerkAftrek.toelichting });

  const totaal = clamp(Math.round(basisScore - budgetAftrek.punten - kenmerkAftrek.punten), 0, 100);
  return { totaal, onderdelen };
}
