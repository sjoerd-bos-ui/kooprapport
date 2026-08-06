import type { DataMode } from "@/types/dataSource";

// -----------------------------------------------------------------------------
// Config voor "Vraag het aan uw rapport" -- zelfde mock/live-patroon als
// lib/config/dataSources.ts en lib/config/payment.ts: zonder VRAAG_ASSISTENT_
// MODE=live (of zonder ANTHROPIC_API_KEY) blijft dit veilig op "mock" staan,
// dus NOOIT per ongeluk een kostenveroorzakende aanroep naar de Anthropic
// API, ook niet als iemand vergeet de env var te zetten. Eigen, losse
// ANTHROPIC_API_KEY (geen hergebruik van een andere sleutel) zodat dit
// onafhankelijk van andere features aan/uit gezet kan worden.
// -----------------------------------------------------------------------------

function readMode(envVar: string): DataMode {
  return process.env[envVar] === "live" ? "live" : "mock";
}

export const VRAAG_ASSISTENT_MODE: DataMode = readMode("VRAAG_ASSISTENT_MODE");
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// claude-haiku-4-5: bewust het goedkoopste/snelste model in de Claude-familie
// -- dit is een kort, feitelijk antwoord gegrond in data die al in het
// rapport staat, geen zware redenering nodig. Los, overschrijfbaar via env
// var zodat het model later te wijzigen is zonder een code-deploy.
export const VRAAG_ASSISTENT_MODEL = process.env.VRAAG_ASSISTENT_MODEL ?? "claude-haiku-4-5";
export const VRAAG_ASSISTENT_MAX_TOKENS = 400;
export const VRAAG_ASSISTENT_TIMEOUT_MS = 15000;
