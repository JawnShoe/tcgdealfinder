import type {
  IntelligenceResult,
  IntelligenceRiskFlag,
  ListingLike,
} from "./types";
import { ALL_RULES } from "./rules";

const ENGINE_VERSION = "intelligence-v1" as const;

/**
 * Deduplicates and sorts flags for stable, deterministic output.
 * Alphabetical sort ensures consistent ordering regardless of rule execution order.
 */
function dedupeAndSort(flags: IntelligenceRiskFlag[]): IntelligenceRiskFlag[] {
  return [...new Set(flags)].sort();
}

/**
 * Evaluates a listing against all intelligence rules.
 *
 * Pure function guarantees:
 * - Same input always yields same output (deterministic)
 * - No IO, no DB, no side effects
 * - No wall-clock time dependency
 * - Stable flag ordering (alphabetical)
 *
 * @param listing - Listing data to evaluate (ListingLike subset)
 * @returns IntelligenceResult with sorted riskFlags and engine version
 */
export function evaluateIntelligence(listing: ListingLike): IntelligenceResult {
  const flags: IntelligenceRiskFlag[] = [];

  for (const rule of ALL_RULES) {
    const flag = rule(listing);
    if (flag) flags.push(flag);
  }

  return {
    riskFlags: dedupeAndSort(flags),
    engineVersion: ENGINE_VERSION,
  };
}
