import type { DataMode, SourceResult, SourceStatus } from "@/types/dataSource";
import { successResult, partialResult, emptyResult, errorResult, timeoutResult } from "@/types/dataSource";

interface ResilienceOptions<T> {
  source: string;
  label: string;
  mode: DataMode;
  status: SourceStatus;
  timeoutMs: number;
  isEmpty?: (data: T) => boolean;
  missingFields?: (data: T) => string[];
}

// Gedeelde try/catch + time-out-wrapper. Elke adapter (mock én live) roept
// dit aan in plaats van eigen foutafhandeling te schrijven, zodat elke bron
// zich op dezelfde manier gedraagt bij een fout, time-out, leeg resultaat of
// gedeeltelijk resultaat — en nooit de rest van het rapport blokkeert.
export async function withResilience<T>(
  task: () => Promise<T>,
  options: ResilienceOptions<T>
): Promise<SourceResult<T>> {
  const { source, label, mode, status, timeoutMs, isEmpty, missingFields } = options;

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("__TIMEOUT__")), timeoutMs);
  });

  try {
    const data = await Promise.race([task(), timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (isEmpty?.(data)) {
      return emptyResult<T>(source, label, mode, status);
    }

    const missing = missingFields?.(data) ?? [];
    if (missing.length > 0) {
      return partialResult<T>(source, label, mode, status, data, missing);
    }

    return successResult<T>(source, label, mode, status, data);
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (err instanceof Error && err.message === "__TIMEOUT__") {
      return timeoutResult<T>(source, label, mode, status);
    }

    const message = err instanceof Error ? err.message : "Onbekende fout bij het ophalen van deze bron.";
    return errorResult<T>(source, label, mode, status, message);
  }
}
