/**
 * Resilience Evaluator - Track C4
 *
 * Pure function that evaluates the current resilience tier for rebuild routes.
 * No IO, no framework imports, fully deterministic.
 *
 * Tiers (mutually exclusive, in priority order):
 * - LIVE: DB + integrations healthy, data fresh
 * - CACHED: DB unavailable, cache available
 * - STALE: Cache expired but usable
 * - PARTIAL: Some fields unavailable
 * - UNAVAILABLE: No safe data source
 */

export type ResilienceTier =
  | "LIVE"
  | "CACHED"
  | "STALE"
  | "PARTIAL"
  | "UNAVAILABLE";

export type ResilienceEvalInput = {
  dbAvailable: boolean;
  cacheAvailable: boolean;
  cacheAgeMs: number | null;
  requiredFieldsPresent: boolean;
  dataCount: number;
};

export type ResilienceUIFlags = {
  showRetry: boolean;
  showStaleWarning: boolean;
  showCachedLabel: boolean;
  showPartialWarning: boolean;
  hidePrice: boolean;
};

export type ResilienceEvalOutput = {
  tier: ResilienceTier;
  explanation: string;
  uiFlags: ResilienceUIFlags;
};

// Cache staleness threshold: 15 minutes in milliseconds
const CACHE_STALE_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Evaluates resilience tier based on data availability inputs.
 *
 * Priority order (first match wins):
 * 1. UNAVAILABLE - No DB and no cache
 * 2. PARTIAL - DB available but required fields missing
 * 3. STALE - Cache available but expired
 * 4. CACHED - Cache available and fresh, DB unavailable
 * 5. LIVE - DB available, all fields present, data fresh
 */
export function evaluateResilience(
  input: ResilienceEvalInput
): ResilienceEvalOutput {
  const {
    dbAvailable,
    cacheAvailable,
    cacheAgeMs,
    requiredFieldsPresent,
    dataCount,
  } = input;

  // UNAVAILABLE: No safe data source at all
  if (!dbAvailable && !cacheAvailable) {
    return {
      tier: "UNAVAILABLE",
      explanation: "No data source available",
      uiFlags: {
        showRetry: true,
        showStaleWarning: false,
        showCachedLabel: false,
        showPartialWarning: false,
        hidePrice: true,
      },
    };
  }

  // UNAVAILABLE: DB not available, cache not available, no data
  if (!dbAvailable && dataCount === 0) {
    return {
      tier: "UNAVAILABLE",
      explanation: "Database unavailable and no cached data",
      uiFlags: {
        showRetry: true,
        showStaleWarning: false,
        showCachedLabel: false,
        showPartialWarning: false,
        hidePrice: true,
      },
    };
  }

  // CACHED: DB unavailable but cache is available and fresh
  if (
    !dbAvailable &&
    cacheAvailable &&
    cacheAgeMs !== null &&
    cacheAgeMs <= CACHE_STALE_THRESHOLD_MS
  ) {
    return {
      tier: "CACHED",
      explanation: "Serving from cache (database unavailable)",
      uiFlags: {
        showRetry: false,
        showStaleWarning: false,
        showCachedLabel: true,
        showPartialWarning: false,
        hidePrice: false,
      },
    };
  }

  // STALE: Cache available but expired
  if (
    !dbAvailable &&
    cacheAvailable &&
    cacheAgeMs !== null &&
    cacheAgeMs > CACHE_STALE_THRESHOLD_MS
  ) {
    return {
      tier: "STALE",
      explanation: "Serving stale cached data (database unavailable)",
      uiFlags: {
        showRetry: true,
        showStaleWarning: true,
        showCachedLabel: true,
        showPartialWarning: false,
        hidePrice: false,
      },
    };
  }

  // STALE: DB available but data is stale (cache expired, no fresh data)
  if (
    dbAvailable &&
    cacheAgeMs !== null &&
    cacheAgeMs > CACHE_STALE_THRESHOLD_MS
  ) {
    return {
      tier: "STALE",
      explanation: "Data is stale (exceeds freshness threshold)",
      uiFlags: {
        showRetry: false,
        showStaleWarning: true,
        showCachedLabel: false,
        showPartialWarning: false,
        hidePrice: false,
      },
    };
  }

  // PARTIAL: DB available but required fields missing
  if (dbAvailable && !requiredFieldsPresent) {
    return {
      tier: "PARTIAL",
      explanation: "Some required fields unavailable",
      uiFlags: {
        showRetry: false,
        showStaleWarning: false,
        showCachedLabel: false,
        showPartialWarning: true,
        hidePrice: false,
      },
    };
  }

  // PARTIAL: DB available but no data returned
  if (dbAvailable && dataCount === 0) {
    return {
      tier: "PARTIAL",
      explanation: "No data available at this time",
      uiFlags: {
        showRetry: false,
        showStaleWarning: false,
        showCachedLabel: false,
        showPartialWarning: true,
        hidePrice: true,
      },
    };
  }

  // LIVE: DB healthy, fields present, data fresh
  return {
    tier: "LIVE",
    explanation: "Full data available from database",
    uiFlags: {
      showRetry: false,
      showStaleWarning: false,
      showCachedLabel: false,
      showPartialWarning: false,
      hidePrice: false,
    },
  };
}

/**
 * Helper to get human-readable tier label for UI display.
 */
export function getTierLabel(tier: ResilienceTier): string {
  switch (tier) {
    case "LIVE":
      return "Live";
    case "CACHED":
      return "Cached";
    case "STALE":
      return "Stale";
    case "PARTIAL":
      return "Partial";
    case "UNAVAILABLE":
      return "Unavailable";
  }
}

/**
 * Helper to determine if a tier indicates degraded state.
 */
export function isDegradedTier(tier: ResilienceTier): boolean {
  return tier !== "LIVE";
}
