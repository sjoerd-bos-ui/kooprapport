import type { DataMode } from "@/types/dataSource";

// -----------------------------------------------------------------------------
// Config voor de verkoperspresentatie-generator -- zelfde mock/live-patroon als
// lib/config/vraagAssistent.ts: zonder VERKOPERSPRESENTATIE_MODE=live blijft
// dit altijd op "mock" staan, dus nooit per ongeluk een kostenveroorzakende
// Anthropic-aanroep. Eigen MODE-toggle (los van VRAAG_ASSISTENT_MODE) zodat
// deze twee AI-features onafhankelijk van elkaar aan/uit gezet kunnen worden
// -- WEL dezelfde ANTHROPIC_API_KEY hergebruikt (zelfde Anthropic-account,
// geen reden voor een tweede sleutel voor exact dezelfde API).
// -----------------------------------------------------------------------------

function readMode(envVar: string): DataMode {
  return process.env[envVar] === "live" ? "live" : "mock";
}

export const VERKOPERSPRESENTATIE_MODE: DataMode = readMode("VERKOPERSPRESENTATIE_MODE");
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// claude-haiku-4-5: zelfde afweging als vraagAssistent.ts -- vijf korte,
// feitelijke dia-teksten gegrond in data die al in het rapport staat, geen
// zware redenering nodig.
export const VERKOPERSPRESENTATIE_MODEL = process.env.VERKOPERSPRESENTATIE_MODEL ?? "claude-haiku-4-5";
export const VERKOPERSPRESENTATIE_MAX_TOKENS = 1200;
export const VERKOPERSPRESENTATIE_TIMEOUT_MS = 20000;
