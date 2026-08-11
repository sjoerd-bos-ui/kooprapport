import type { Report } from "@/types/report";
import type { Verkoperspresentatie, VerkoperspresentatieDia, PresentatieToon } from "@/types/verkoperspresentatie";
import {
  VERKOPERSPRESENTATIE_MODE,
  ANTHROPIC_API_KEY,
  VERKOPERSPRESENTATIE_MODEL,
  VERKOPERSPRESENTATIE_MAX_TOKENS,
  VERKOPERSPRESENTATIE_TIMEOUT_MS,
} from "@/lib/config/verkoperspresentatie";
import { berekenBiedadvies } from "@/lib/services/biedadvies";

// -----------------------------------------------------------------------------
// Verkoperspresentatie -- content-laag (Fase 1, zie types/verkoperspresentatie.ts
// voor de volledige toelichting). Zelfde vertrouwensbasis als vraagAssistent.ts:
// geen nieuwe, kostenveroorzakende databron-aanroep -- alleen tekst
// samenstellen/personaliseren over data die al in het rapport staat
// (market.geschatteWaarde, nearbySales, buurtprofiel) plus het bestaande
// biedadvies (herbruikt, nu geframed als verwachte verkoopopbrengst i.p.v.
// een koper-biedbandbreedte -- dezelfde bandbreedte is voor een verkoper
// namelijk precies zo relevant: ondergrens = modelschatting, bovengrens =
// modelschatting + gebruikelijk overbiedpercentage).
//
// MOCK-modus (standaard, geen kosten): vijf dia's rechtstreeks uit de
// rapportvelden samengesteld -- ook dan al een inhoudelijk kloppende, bruikbare
// presentatie, alleen zonder vrije-vorm herformulering.
// LIVE-modus: één Anthropic-aanroep die diezelfde vijf dia's herschrijft in de
// gekozen toon (persoonlijk/zakelijk) -- valt bij elke fout terug op de
// mock-tekst, nooit een kapotte/lege dia tonen.
// -----------------------------------------------------------------------------

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function datumLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

function bouwTitelDia(adres: string, verkoperNaam: string, organisatieNaam: string | null, toon: PresentatieToon): VerkoperspresentatieDia {
  const kantoor = organisatieNaam ?? "ons kantoor";
  const tekst =
    toon === "persoonlijk"
      ? `Beste ${verkoperNaam}, hierbij een persoonlijke toelichting op wat ${kantoor} voor u kan betekenen bij de verkoop van ${adres}.`
      : `Verkoopvoorstel van ${kantoor} voor ${adres}, opgesteld voor ${verkoperNaam}.`;
  return { key: "titel", titel: "Verkoopadvies voor uw woning", tekst, kerncijfer: null };
}

function bouwMarktanalyseDia(report: Report, toon: PresentatieToon): VerkoperspresentatieDia {
  const nearby = report.nearbySales.data;
  const buurt = report.buurtprofiel.data;
  const zinnen: string[] = [];
  if (buurt?.samenvatting) zinnen.push(buurt.samenvatting);
  if (nearby && nearby.aantalLaatste12Maanden > 0) {
    zinnen.push(
      `In de afgelopen ${nearby.zoekvensterMaanden} maanden zijn er ${nearby.aantalLaatste12Maanden} vergelijkbare woningen verkocht in de buurt` +
        (nearby.gemiddeldePrijsPerM2 ? `, tegen gemiddeld ${euro(nearby.gemiddeldePrijsPerM2)} per m².` : ".")
    );
  }
  if (zinnen.length === 0) {
    zinnen.push(toon === "persoonlijk" ? "Voor deze buurt hebben we op dit moment nog geen volledig cijferbeeld." : "Onvoldoende marktdata beschikbaar voor deze buurt.");
  }
  return {
    key: "marktanalyse",
    titel: "Uw buurt in cijfers",
    tekst: zinnen.join(" "),
    kerncijfer: nearby?.gemiddeldePrijsPerM2 ? `${euro(nearby.gemiddeldePrijsPerM2)} / m²` : null,
  };
}

function bouwVraagprijsadviesDia(report: Report, toon: PresentatieToon): VerkoperspresentatieDia {
  const market = report.market.data;
  const biedadvies = market ? berekenBiedadvies(market.geschatteWaarde, report.core.address.plaats) : null;
  if (!market || !biedadvies) {
    return {
      key: "vraagprijsadvies",
      titel: "Ons vraagprijsadvies",
      tekst: "Voor een onderbouwd vraagprijsadvies hebben we een volledig rapport voor dit adres nodig.",
      kerncijfer: null,
    };
  }
  const tekst =
    toon === "persoonlijk"
      ? `Op basis van de modelgeschatte waarde van uw woning (${euro(market.geschatteWaarde)}) en de gebruikelijke overbieding in ${
          biedadvies.niveau === "regio" ? `regio ${biedadvies.regioNaam}` : "Nederland"
        } (${biedadvies.periodeLabel}) verwachten we een verkoopopbrengst tussen ${euro(biedadvies.ondergrens)} en ${euro(biedadvies.bovengrens)}.`
      : `Modelgeschatte waarde: ${euro(market.geschatteWaarde)}. Verwachte verkoopopbrengst, rekening houdend met ${
          biedadvies.niveau === "regio" ? `het regiogemiddelde (${biedadvies.regioNaam})` : "het landelijk gemiddelde"
        } overbiedpercentage (${biedadvies.periodeLabel}): ${euro(biedadvies.ondergrens)} - ${euro(biedadvies.bovengrens)}.`;
  return { key: "vraagprijsadvies", titel: "Ons vraagprijsadvies", tekst, kerncijfer: `${euro(biedadvies.ondergrens)} – ${euro(biedadvies.bovengrens)}` };
}

function bouwVergelijkbareWoningenDia(report: Report, toon: PresentatieToon): VerkoperspresentatieDia {
  const verkopen = report.nearbySales.data?.verkopen ?? [];
  if (verkopen.length === 0) {
    return {
      key: "vergelijkbare_woningen",
      titel: "Vergelijkbare woningen in de buurt",
      tekst: "Er zijn op dit moment geen vergelijkbare recente verkopen bekend in deze buurt.",
      kerncijfer: null,
    };
  }
  const top = verkopen.slice(0, 3);
  const regels = top.map((v) => `${v.adres} (${euro(v.prijsPerM2)}/m², verkocht ${datumLabel(v.verkoopdatum)})`);
  const intro = toon === "persoonlijk" ? "Recent verkocht bij u in de buurt:" : "Recente vergelijkbare transacties:";
  return {
    key: "vergelijkbare_woningen",
    titel: "Vergelijkbare woningen in de buurt",
    tekst: `${intro} ${regels.join(", ")}.`,
    kerncijfer: null,
  };
}

function bouwAanpakDia(organisatieNaam: string | null, toon: PresentatieToon): VerkoperspresentatieDia {
  const kantoor = organisatieNaam ?? "ons kantoor";
  const tekst =
    toon === "persoonlijk"
      ? `Bij ${kantoor} begeleiden we u persoonlijk van waardebepaling tot sleuteloverdracht: professionele fotografie, een brede zichtbaarheid op Funda en heldere, regelmatige updates.`
      : `${kantoor} verzorgt de volledige verkoop: professionele presentatie (fotografie, plattegrond), promotie op Funda en de gangbare kanalen, en onderhandeling tot en met de overdracht.`;
  return { key: "aanpak", titel: "Onze aanpak", tekst, kerncijfer: null };
}

function bouwMockPresentatie(
  report: Report,
  verkoperNaam: string,
  organisatieNaam: string | null,
  toon: PresentatieToon
): VerkoperspresentatieDia[] {
  return [
    bouwTitelDia(report.core.address.label, verkoperNaam, organisatieNaam, toon),
    bouwMarktanalyseDia(report, toon),
    bouwVraagprijsadviesDia(report, toon),
    bouwVergelijkbareWoningenDia(report, toon),
    bouwAanpakDia(organisatieNaam, toon),
  ];
}

async function fetchMetTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface AnthropicMessageResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

const SYSTEEMPROMPT = `Je herschrijft vijf dia-teksten voor een verkoperspresentatie van een makelaar, in het Nederlands. Elke dia heeft al een feitelijk kloppende basistekst -- verzin NOOIT nieuwe cijfers of feiten, herschrijf alleen de FORMULERING zodat hij vloeiender en persoonlijker/zakelijker klinkt volgens de gevraagde toon. Antwoord UITSLUITEND met geldige JSON: een array van vijf objecten met de velden "key" en "tekst" (exact dezelfde keys en volgorde als de invoer), zonder omliggende tekst.`;

async function herschrijfMetAi(dias: VerkoperspresentatieDia[], toon: PresentatieToon): Promise<VerkoperspresentatieDia[] | null> {
  try {
    const invoer = dias.map((d) => ({ key: d.key, titel: d.titel, tekst: d.tekst }));
    const res = await fetchMetTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: VERKOPERSPRESENTATIE_MODEL,
          max_tokens: VERKOPERSPRESENTATIE_MAX_TOKENS,
          system: SYSTEEMPROMPT,
          messages: [{ role: "user", content: `Gewenste toon: ${toon}.\n\nDia's:\n${JSON.stringify(invoer)}` }],
        }),
      },
      VERKOPERSPRESENTATIE_TIMEOUT_MS
    );

    const body = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      console.error("[verkoperspresentatie] Anthropic API-fout:", body.error?.message ?? res.status);
      return null;
    }
    const tekst = body.content?.find((c) => c.type === "text")?.text?.trim();
    if (!tekst) return null;

    const herschreven = JSON.parse(tekst) as { key: string; tekst: string }[];
    return dias.map((dia) => {
      const match = herschreven.find((h) => h.key === dia.key);
      return match?.tekst ? { ...dia, tekst: match.tekst } : dia;
    });
  } catch (err) {
    // Zelfde discipline als vraagAssistent.ts: nooit laten wachten op/breken
    // door een kapotte LLM-aanroep -- val terug op de al kloppende mock-tekst.
    console.error("[verkoperspresentatie] live-herschrijving mislukt, val terug op mock:", err);
    return null;
  }
}

export async function genereerVerkoperspresentatie(
  report: Report,
  verkoperNaam: string,
  organisatieNaam: string | null,
  toon: PresentatieToon
): Promise<Verkoperspresentatie> {
  const mockDias = bouwMockPresentatie(report, verkoperNaam, organisatieNaam, toon);

  let dias = mockDias;
  let bron: "ai" | "rapportgegevens" = "rapportgegevens";
  if (VERKOPERSPRESENTATIE_MODE === "live" && ANTHROPIC_API_KEY) {
    const herschreven = await herschrijfMetAi(mockDias, toon);
    if (herschreven) {
      dias = herschreven;
      bron = "ai";
    }
  }

  return {
    adres: report.core.address.label,
    verkoperNaam,
    toon,
    organisatieNaam,
    dias,
    gegenereerdOp: new Date().toISOString(),
    bron,
  };
}
