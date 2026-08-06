import type { Report } from "@/types/report";
import {
  VRAAG_ASSISTENT_MODE,
  ANTHROPIC_API_KEY,
  VRAAG_ASSISTENT_MODEL,
  VRAAG_ASSISTENT_MAX_TOKENS,
  VRAAG_ASSISTENT_TIMEOUT_MS,
} from "@/lib/config/vraagAssistent";
import { duidEnergielabel } from "@/lib/utils/energielabel";
import { berekenBiedadvies } from "@/lib/services/biedadvies";

// -----------------------------------------------------------------------------
// "Vraag het aan uw rapport" -- beantwoordt een korte, feitelijke vraag over
// een SPECIFIEK, AL OPGEHAALD rapport. Precies dezelfde vertrouwensbasis als
// /api/rapport/pdf en /api/rapport/email: geen nieuwe, kostenveroorzakende
// databron-aanroep (geen tweede Altum-call etc.), alleen tekst genereren over
// data die al in het rapport staat.
//
// MOCK-modus (standaard, geen kosten): geen LLM-aanroep, gewoon een
// keyword-gestuurd antwoord dat rechtstreeks uit de al aanwezige
// rapportvelden wordt samengesteld -- dus ook in mock-modus een écht,
// inhoudelijk kloppend antwoord (geen "lorem ipsum"-stub), alleen zonder
// vrije-vorm taalbegrip.
// LIVE-modus: één Anthropic Messages API-aanroep (claude-haiku, zie
// lib/config/vraagAssistent.ts) met een compacte context uit het rapport als
// system-prompt, zodat het antwoord uitsluitend op die gegevens gegrond is.
// -----------------------------------------------------------------------------

export interface VraagAntwoord {
  antwoord: string;
  bron: "ai" | "rapportgegevens";
}

function euro(bedrag: number | null | undefined): string {
  if (bedrag == null) return "onbekend";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

// Compacte, platte samenvatting van de voor deze functie relevante
// rapportvelden -- bewust NIET het hele Report-object (dat zou de prompt
// onnodig groot en dus duurder maken, en risico geven dat het model op een
// ongebruikt/premium veld gaat speculeren). Alleen wat een koper/makelaar
// redelijkerwijs zou vragen.
function bouwContext(report: Report): string {
  const regels: string[] = [];
  regels.push(`Adres: ${report.core.address.label}.`);

  const market = report.market.data;
  if (market) {
    regels.push(
      `Geschatte marktwaarde: ${euro(market.geschatteWaarde)}` +
        (market.bandbreedteMin && market.bandbreedteMax ? ` (bandbreedte ${euro(market.bandbreedteMin)} - ${euro(market.bandbreedteMax)})` : "") +
        "."
    );
    const biedadvies = berekenBiedadvies(market.geschatteWaarde, report.core.address.plaats);
    if (biedadvies) {
      regels.push(
        `Indicatief biedadvies: ${euro(biedadvies.ondergrens)} - ${euro(biedadvies.bovengrens)}, gebaseerd op ${
          biedadvies.niveau === "regio" ? `regio ${biedadvies.regioNaam}` : "het landelijk gemiddelde"
        } (${biedadvies.periodeLabel}).`
      );
    }
  }

  const energy = report.energy.data;
  if (energy?.klasse) {
    const duiding = duidEnergielabel(energy.klasse);
    regels.push(`Energielabel: ${energy.klasse}${duiding ? ` (${duiding.kwartTekst}, ${duiding.stookkostenTekst})` : ""}.`);
  }

  const fundering = report.fundering.data;
  if (fundering?.niveau) {
    regels.push(`Funderingsrisico: ${fundering.niveau}. ${fundering.toelichting ?? ""}`.trim());
  }

  const buurt = report.buurtprofiel.data;
  if (buurt?.samenvatting) {
    regels.push(`Buurtprofiel: ${buurt.samenvatting}`);
  }

  const building = report.building.data;
  if (building?.bouwjaar) {
    regels.push(`Bouwjaar: ${building.bouwjaar}.` + (building.oppervlakteM2 ? ` Oppervlakte: ${building.oppervlakteM2} m².` : ""));
  }

  if (report.insights.length > 0) {
    regels.push("Overige bevindingen: " + report.insights.slice(0, 5).map((i) => i.tekst).join(" "));
  }

  return regels.join("\n");
}

const SYSTEEMPROMPT_PREFIX = `Je bent de assistent van Kooprapport en beantwoordt vragen van een koper of makelaar over ÉÉN specifiek woningrapport. Beantwoord de vraag UITSLUITEND op basis van de onderstaande rapportgegevens. Als het antwoord niet uit deze gegevens is af te leiden, zeg dat eerlijk -- verzin nooit cijfers of feiten die er niet in staan. Geef geen persoonlijk financieel, juridisch of koopadvies, alleen een feitelijke duiding van de rapportgegevens. Antwoord kort (maximaal 3-4 zinnen), in het Nederlands.

Rapportgegevens:
`;

// Eenvoudige keyword-classificatie voor de kosteloze mock-modus -- geen
// taalmodel nodig om de meestgestelde soorten vragen (prijs, energie,
// fundering, buurt) te herkennen en met de al beschikbare rapportvelden te
// beantwoorden.
function mockAntwoord(report: Report, vraag: string): string {
  const v = vraag.toLowerCase();
  const market = report.market.data;
  const energy = report.energy.data;
  const fundering = report.fundering.data;
  const buurt = report.buurtprofiel.data;

  if (/prijs|waarde|bod|bieden|duur|goedkoop/.test(v) && market) {
    const biedadvies = berekenBiedadvies(market.geschatteWaarde, report.core.address.plaats);
    return (
      `De modelgeschatte waarde van dit pand is ${euro(market.geschatteWaarde)}` +
      (market.bandbreedteMin && market.bandbreedteMax ? ` (bandbreedte ${euro(market.bandbreedteMin)} - ${euro(market.bandbreedteMax)})` : "") +
      ". " +
      (biedadvies
        ? `Op basis van ${biedadvies.niveau === "regio" ? `regio ${biedadvies.regioNaam}` : "het landelijk gemiddelde"} (${biedadvies.periodeLabel}) ligt een indicatief bod tussen ${euro(biedadvies.ondergrens)} en ${euro(biedadvies.bovengrens)}.`
        : "")
    );
  }
  if (/energie|label|isolatie|stook/.test(v) && energy?.klasse) {
    const duiding = duidEnergielabel(energy.klasse);
    return `Dit pand heeft energielabel ${energy.klasse}${duiding ? `, in de ${duiding.kwartTekst}. ${duiding.stookkostenTekst}` : "."}`;
  }
  if (/fundering|scheur|risico|zakking/.test(v) && fundering?.niveau) {
    return `Het funderingsrisico voor dit adres is ingeschat als ${fundering.niveau}. ${fundering.toelichting ?? ""}`.trim();
  }
  if (/buurt|omgeving|veilig|school|voorzien/.test(v) && buurt?.samenvatting) {
    return buurt.samenvatting;
  }

  return "Op basis van de gegevens in dit rapport kan ik die vraag niet met zekerheid beantwoorden. Bekijk de tabbladen hierboven voor alle beschikbare details, of stel een specifiekere vraag over de waarde, het energielabel, de fundering of de buurt.";
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

export async function beantwoordVraag(report: Report, vraag: string): Promise<VraagAntwoord | { error: string }> {
  const schoneVraag = vraag.trim().slice(0, 500);
  if (!schoneVraag) return { error: "Vul een vraag in." };

  if (VRAAG_ASSISTENT_MODE !== "live" || !ANTHROPIC_API_KEY) {
    return { antwoord: mockAntwoord(report, schoneVraag), bron: "rapportgegevens" };
  }

  try {
    const res = await fetchMetTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: VRAAG_ASSISTENT_MODEL,
          max_tokens: VRAAG_ASSISTENT_MAX_TOKENS,
          system: SYSTEEMPROMPT_PREFIX + bouwContext(report),
          messages: [{ role: "user", content: schoneVraag }],
        }),
      },
      VRAAG_ASSISTENT_TIMEOUT_MS
    );

    const body = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      console.error("[vraagAssistent] Anthropic API-fout:", body.error?.message ?? res.status);
      return { antwoord: mockAntwoord(report, schoneVraag), bron: "rapportgegevens" };
    }

    const tekst = body.content?.find((c) => c.type === "text")?.text?.trim();
    if (!tekst) return { antwoord: mockAntwoord(report, schoneVraag), bron: "rapportgegevens" };

    return { antwoord: tekst, bron: "ai" };
  } catch (err) {
    // Nooit de gebruiker laten wachten op een kapotte/tragere LLM-aanroep --
    // val terug op het kosteloze, altijd-beschikbare rapportgegevens-antwoord
    // i.p.v. een foutmelding te tonen voor iets dat maar een bijkomstige
    // functie is (het echte rapport blijft gewoon werken).
    console.error("[vraagAssistent] live-aanroep mislukt, val terug op mock:", err);
    return { antwoord: mockAntwoord(report, schoneVraag), bron: "rapportgegevens" };
  }
}
