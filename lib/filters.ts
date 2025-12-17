import {
  DEFAULT_MARKET,
  type MarketCode,
  getMarketLabel,
  SUPPORTED_MARKETS,
} from "./markets";

export type ConditionFilterKey =
  | "all"
  | "raw_nm"
  | "raw_lp_plus"
  | "graded_9_plus"
  | "graded_10";

type ConditionFilterConfig = {
  key: ConditionFilterKey;
  label: string;
  codes: string[] | null;
};

const RAW_NM_CODES = [
  "raw_nm",
  "raw_near_mint",
  "raw_mint",
  "nm",
  "mint",
  "raw_ungraded_nm",
];

const RAW_LP_CODES = [
  ...RAW_NM_CODES,
  "raw_lp",
  "raw_mp",
  "raw_hp",
  "lp",
  "mp",
  "hp",
  "raw_good",
];

const GRADED_9_CODES = [
  "psa_10",
  "psa_9",
  "bgs_10",
  "bgs_95",
  "bgs_9",
  "cgc_10",
  "cgc_95",
  "cgc_9",
];

const GRADED_10_CODES = ["psa_10", "bgs_10", "cgc_10"];

export const CONDITION_FILTERS: ConditionFilterConfig[] = [
  {
    key: "all",
    label: "All conditions",
    codes: null,
  },
  {
    key: "raw_nm",
    label: "Raw (Near Mint)",
    codes: RAW_NM_CODES,
  },
  {
    key: "raw_lp_plus",
    label: "Raw (LP or better)",
    codes: RAW_LP_CODES,
  },
  {
    key: "graded_9_plus",
    label: "Graded (PSA 9+)",
    codes: GRADED_9_CODES,
  },
  {
    key: "graded_10",
    label: "Graded (PSA 10)",
    codes: GRADED_10_CODES,
  },
];

export function matchesConditionFilter(
  condition: string | null | undefined,
  filter: ConditionFilterKey,
): boolean {
  if (filter === "all") return true;
  if (!condition) return false;
  const normalized = condition.toLowerCase();
  const config = CONDITION_FILTERS.find((entry) => entry.key === filter);
  if (!config || !config.codes) return true;
  return config.codes.includes(normalized);
}

export function hasConditionMatch(
  filter: ConditionFilterKey,
  availableConditions: string[],
): boolean {
  if (filter === "all") {
    return availableConditions.length > 0;
  }
  const config = CONDITION_FILTERS.find((entry) => entry.key === filter);
  if (!config || !config.codes) return false;
  return availableConditions.some((condition) =>
    config.codes?.includes(condition.toLowerCase()),
  );
}

export function resolvePreferredCondition(
  filter: ConditionFilterKey,
  availableConditions: string[],
): string | null {
  if (availableConditions.length === 0) return null;
  if (filter === "all") {
    return availableConditions[0];
  }
  const config = CONDITION_FILTERS.find((entry) => entry.key === filter);
  if (!config || !config.codes) {
    return availableConditions[0];
  }
  const lowerAvailable = availableConditions.map((value) =>
    value.toLowerCase(),
  );
  for (const code of config.codes) {
    const index = lowerAvailable.indexOf(code);
    if (index >= 0) {
      return availableConditions[index];
    }
  }
  return availableConditions[0] ?? null;
}

export type MarketFilterKey = MarketCode | "all";

export const MARKET_FILTERS: { key: MarketFilterKey; label: string }[] = [
  { key: "all", label: "All Markets" },
  ...SUPPORTED_MARKETS.map((code) => ({
    key: code,
    label: getMarketLabel(code),
  })),
];

export const DEFAULT_MARKET_FILTER: MarketFilterKey = "all";

export function matchesMarket(
  market: string | null | undefined,
  filter: MarketFilterKey,
): boolean {
  if (!market) return false;
  if (filter === "all") return true; // Show all markets
  return market.toUpperCase() === filter;
}
