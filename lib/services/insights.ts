import type { SourceMeta, SourceStatus } from "@/types/dataSource";
import type {
  AddressMeta,
  BuildingData,
  DataQualitySummary,
  EnergyData,
  Insight,
  MarketData,
  NearbySale,
  NearbySalesData,
  NearbySalesDataRaw,
  PropertyCore,
} from "@/types/report";

// -----------------------------------------------------------------------------
// Cross-domein logica die NA het parallel ophalen van alle bronnen draait:
// - enrichNearbySales: vergelijkt buurtverkopen met de eigen woning
//   (vergelijkbaarheid, prijsverschil) — geen brongegeven, dus hoort hier
//   thuis en niet in de adapter.
// - buildInsights: leest uitsluitend uit wat daadwerkelijk is opgehaald.
//   Een inzicht wordt overgeslagen zodra de onderbouwing ontbreekt, in
//   plaats van met een halve of gegokte waarde te vullen.
// - buildDataQuality: telt bronstatussen op tot één samenvattend oordeel.
// - buildCore: menselijke titel/ondertitel, ook alleen uit bekende velden.
// -----------------------------------------------------------------------------

const OPPERVLAKTE_TOLERANTIE = 0.22; // ±22% oppervlakte telt als "vergelijkbaar"

export function enrichNearbySales(
  raw: NearbySalesDataRaw | null,
  subject: { oppervlakteM2?: number; prijsPerM2?: number }
): NearbySalesData | null {
  if (!raw) return null;

  const verkopen: NearbySale[] = raw.verkopen.map((v) => {
    const vergelijkbaar =
      subject.oppervlakteM2 != null
        ? Math.abs(v.oppervlakteM2 - subject.oppervlakteM2) <= subject.oppervlakteM2 * OPPERVLAKTE_TOLERANTIE
        : false;
    const deltaPct =
      subject.prijsPerM2 != null
        ? Math.round(((v.prijsPerM2 - subject.prijsPerM2) / subject.prijsPerM2) * 100)
        : undefined;
    return { ...v, vergelijkbaar, deltaPct };
  });

  return {
    aantalLaatste12Maanden: raw.aantalLaatste12Maanden,
    gemiddeldePrijsPerM2: raw.gemiddeldePrijsPerM2,
    verkopen,
    zoekvensterMaanden: raw.zoekvensterMaanden,
    verruimd: raw.verruimd,
  };
}

export function buildCore(
  address: AddressMeta,
  building: BuildingData | null,
  energy: EnergyData | null,
  lonLat?: { lon: number; lat: number } | null
): PropertyCore {
  const titel = `${address.straat} ${address.huisnummer}${address.toevoeging ?? ""}`;
  const delen: string[] = [];
  if (building?.woningtype) delen.push(building.woningtype);
  if (building?.bouwjaar != null) delen.push(`bouwjaar ${building.bouwjaar}`);
  if (energy?.klasse) delen.push(`energielabel ${energy.klasse}`);
  const ondertitel = delen.length > 0 ? delen.join(" · ") : "Kenmerken nog niet beschikbaar";
  return { address, titel, ondertitel, lonLat: lonLat ?? null };
}

export function buildInsights(input: {
  building: BuildingData | null;
  energy: EnergyData | null;
  market: MarketData | null;
  nearbySales: NearbySalesData | null;
}): Insight[] {
  const { building, energy, market, nearbySales } = input;
  const insights: Insight[] = [];
  const ENERGIE_SCHAAL = ["G", "F", "E", "D", "C", "B", "A", "A+", "A++", "A+++"];

  // 1) Energieprestatie t.o.v. de bouwperiode — vereist zowel bouwjaar als label.
  if (building?.bouwjaar != null && energy?.klasse) {
    const labelIdx = ENERGIE_SCHAAL.indexOf(energy.klasse);
    if (labelIdx >= 0) {
      const typicalIdx = Math.max(
        0,
        Math.min(9, Math.round(((building.bouwjaar - 1905) / (2022 - 1905)) * 9))
      );
      const diff = labelIdx - typicalIdx;
      const toon: Insight["toon"] = diff >= 2 ? "positief" : diff <= -2 ? "negatief" : "neutraal";
      const tekst =
        diff >= 2
          ? "boven gemiddeld voor de bouwperiode"
          : diff <= -2
          ? "onder gemiddeld voor de bouwperiode"
          : "gemiddeld voor de bouwperiode";
      insights.push({ key: "energie-vs-bouwjaar", label: "Energieprestatie", tekst, toon });
    }
  }

  // 2) Positie t.o.v. buurtverkopen — vereist market ÉN nearbySales ÉN
  //    oppervlakte, en gebruikt voor "buurtniveau" bewust dezelfde
  //    gemiddeldePrijsPerM2 die ook in de buurtverkopen-tabel staat, zodat
  //    dit inzicht nooit kan tegenspreken wat er in die tabel te zien is.
  //    Let op: de Altum AVM-schatting geeft geen jaar-op-jaar-historie (geen
  //    tijdreeks in de API), dus een "waardeontwikkeling"-inzicht zoals bij
  //    de eerdere WOZ-opzet is hier bewust niet mogelijk — dat zou een
  //    trend suggereren die deze bron simpelweg niet levert.
  if (
    market?.geschatteWaarde != null &&
    nearbySales?.gemiddeldePrijsPerM2 != null &&
    building?.oppervlakteM2 != null
  ) {
    const referentieWaarde = nearbySales.gemiddeldePrijsPerM2 * building.oppervlakteM2;
    const deltaPct = Math.round(((market.geschatteWaarde - referentieWaarde) / referentieWaarde) * 100);
    const toon: Insight["toon"] = deltaPct >= 5 ? "positief" : deltaPct <= -5 ? "negatief" : "neutraal";
    const tekst =
      deltaPct >= 5
        ? `${deltaPct}% boven het prijsniveau van recente buurtverkopen`
        : deltaPct <= -5
        ? `${Math.abs(deltaPct)}% onder het prijsniveau van recente buurtverkopen`
        : "vergelijkbaar met het prijsniveau van recente buurtverkopen";
    insights.push({ key: "woningwaarde-vs-buurtverkopen", label: "Positionering", tekst, toon });
  }

  // 3) Marktactiviteit — puur uit het aantal buurtverkopen, geen prijsclaim.
  if (nearbySales?.aantalLaatste12Maanden != null) {
    const n = nearbySales.aantalLaatste12Maanden;
    const tekst =
      n >= 11 ? "een actieve markt in de buurt" : n >= 6 ? "een gemiddelde marktactiviteit in de buurt" : "een rustige markt in de buurt";
    insights.push({ key: "marktactiviteit", label: "Marktactiviteit", tekst, toon: "neutraal" });
  }

  return insights;
}

const STATUS_ORDE: SourceStatus[] = ["confirmed", "public", "premium", "mock", "unavailable"];

export function buildDataQuality(metas: SourceMeta[]): DataQualitySummary {
  const tellingen: Record<SourceStatus, number> = {
    confirmed: 0,
    public: 0,
    premium: 0,
    mock: 0,
    unavailable: 0,
  };
  for (const m of metas) {
    // een bron telt ook als "onbeschikbaar" als de laatste bevraging faalde/
    // leeg was, ongeacht de normale status van die bron
    if (m.state === "error" || m.state === "timeout" || m.state === "unavailable" || m.state === "empty") {
      tellingen.unavailable += 1;
    } else {
      tellingen[m.status] += 1;
    }
  }

  const totaal = metas.length;
  const nietBeschikbaar = tellingen.unavailable;
  const zekerBeschikbaar = tellingen.confirmed + tellingen.public + tellingen.premium;

  let compleetheid: DataQualitySummary["compleetheid"];
  let toelichting: string;
  if (nietBeschikbaar === 0 && tellingen.mock === 0) {
    compleetheid = "volledig";
    toelichting = "Alle onderdelen van dit rapport zijn succesvol opgehaald.";
  } else if (nietBeschikbaar === 0) {
    compleetheid = "grotendeels-compleet";
    toelichting = "Alle onderdelen zijn beschikbaar; een deel draait nog op voorbeelddata.";
  } else if (nietBeschikbaar < totaal) {
    compleetheid = "beperkt";
    toelichting = `${nietBeschikbaar} van de ${totaal} onderdelen kon nu niet worden opgehaald.`;
  } else {
    compleetheid = "beperkt";
    toelichting = "Er kon op dit moment geen enkel onderdeel worden opgehaald.";
  }

  return {
    compleetheid,
    totaalBronnen: totaal,
    bevestigd: tellingen.confirmed,
    publiek: tellingen.public,
    premium: tellingen.premium,
    mock: tellingen.mock,
    nietBeschikbaar,
    toelichting,
  };
}

// Kleine helper zodat reportService niet zelf STATUS_ORDE hoeft te kennen —
// gebruikt om badges eventueel consistent te sorteren in de UI.
export function sorteerOpBetrouwbaarheid(a: SourceStatus, b: SourceStatus): number {
  return STATUS_ORDE.indexOf(a) - STATUS_ORDE.indexOf(b);
}
