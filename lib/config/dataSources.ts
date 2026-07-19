import type { DataMode } from "@/types/dataSource";

export interface SourceConfig {
  mode: DataMode;
  enabled: boolean;
  baseUrl?: string;
  apiKeyEnvVar?: string;
  timeoutMs: number;
}

// Alle live-koppelingen horen server-side te draaien (API route / server
// action), niet in de browser — anders zou een API-key in de client-bundle
// terechtkomen. Daarom lezen we hier gewone env vars, geen NEXT_PUBLIC_*.
// Ontbreekt de modus-var, dan is "mock" altijd de veilige default.
function readMode(envVar: string): DataMode {
  return process.env[envVar] === "live" ? "live" : "mock";
}

export type DataSourceKey = "bag" | "energielabel" | "woningwaarde" | "buurtverkopen" | "bestemmingsplan" | "omgevingsplan";

export const DATA_SOURCE_CONFIG: Record<DataSourceKey, SourceConfig> = {
  bag: {
    mode: readMode("BAG_MODE"),
    enabled: true,
    baseUrl: process.env.BAG_API_BASE_URL ?? "https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2",
    apiKeyEnvVar: "BAG_API_KEY",
    // Hoger dan de andere bronnen: het (mock-)bouwjaar wordt hier ook nog
    // live bij de PDOK/BAG-bron opgehaald (3 sequentiële cross-origin
    // requests, zie lib/data-sources/bag.ts). Te krap en een prima werkende,
    // maar iets tragere opzoeking zou de HELE bag-sectie onterecht op
    // "time-out" laten staan, i.p.v. alleen bouwjaar op "onbekend".
    timeoutMs: 12000,
  },
  energielabel: {
    mode: readMode("ENERGIELABEL_MODE"),
    enabled: true,
    baseUrl: process.env.EP_ONLINE_API_BASE_URL ?? "https://public.ep-online.nl/api/v5",
    apiKeyEnvVar: "EP_ONLINE_API_KEY",
    timeoutMs: 5000,
  },
  woningwaarde: {
    // Altum AI Woningwaarde API (AVM) — modelgeschatte marktwaarde. Geen
    // officiële/gratis WOZ-API bestaat, dus dit vervangt de eerdere
    // WOZ-aspiratie. ALTUM_SANDBOX=true stuurt naar Altum's gratis, credit-
    // loze sandbox-endpoint (mock-output, publieke gedeelde sleutel) i.p.v.
    // de productie-API — handig om te testen voordat er echte credits/een
    // eigen sleutel gemoeid zijn. Zie lib/data-sources/woningwaarde.ts.
    mode: readMode("ALTUM_MODE"),
    enabled: true,
    baseUrl: process.env.ALTUM_API_BASE_URL ?? "https://api.altum.ai",
    apiKeyEnvVar: "ALTUM_API_KEY",
    timeoutMs: 6000,
  },
  buurtverkopen: {
    // Altum AI's Interactieve Woningreferentie API (Interactive Reference
    // API) — vergelijkbare, recent verkochte woningen, met Kadaster als
    // onderliggende bron. Gebruikt dezelfde ALTUM_API_KEY en ALTUM_SANDBOX-
    // toggle als de Woningwaarde-adapter (één Altum-account/sleutel dekt
    // alle Altum-API's) — zie lib/data-sources/buurtverkopen.ts.
    mode: readMode("BUURTVERKOPEN_MODE"),
    enabled: true,
    baseUrl: process.env.ALTUM_API_BASE_URL ?? "https://api.altum.ai",
    apiKeyEnvVar: "ALTUM_API_KEY",
    timeoutMs: 8000,
  },
  bestemmingsplan: {
    // Ruimtelijke Plannen API (Kadaster / Informatiehuis Ruimte) — dekt de
    // "oude" bestemmingsplannen. Eigen, losse API-key (NIET dezelfde als de
    // omgevingsplan-sleutel hieronder, ook niet dezelfde als BAG_API_KEY),
    // gratis aan te vragen via developer.omgevingswet.overheid.nl. Zie
    // lib/data-sources/bestemming.ts voor de volledige toelichting.
    mode: readMode("BESTEMMINGSPLAN_MODE"),
    enabled: true,
    baseUrl: process.env.RUIMTELIJKE_PLANNEN_API_BASE_URL ?? "https://data.informatiehuisruimte.nl/api/ruimtelijke-plannen/v1",
    apiKeyEnvVar: "RUIMTELIJKE_PLANNEN_API_KEY",
    timeoutMs: 8000,
  },
  omgevingsplan: {
    // Omgevingsdocumenten-API's (DSO-LV) — dekt het "nieuwe" omgevingsplan,
    // voor gemeentes die al zijn overgestapt. Alleen als fallback aangeroepen
    // wanneer bestemmingsplan hierboven niets vond, zie bestemming.ts. Eigen,
    // losse API-key, apart aan te vragen (zelfde formulier, ander vinkje).
    mode: readMode("OMGEVINGSPLAN_MODE"),
    enabled: true,
    baseUrl: process.env.OMGEVINGSDOCUMENTEN_API_BASE_URL ?? "https://service.omgevingswet.overheid.nl",
    apiKeyEnvVar: "OMGEVINGSDOCUMENTEN_API_KEY",
    timeoutMs: 8000,
  },
};

export function getApiKey(config: SourceConfig): string | undefined {
  return config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined;
}
