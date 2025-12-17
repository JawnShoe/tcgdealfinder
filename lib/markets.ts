export const SUPPORTED_MARKETS = ["EBAY_US", "EBAY_CA", "EBAY_GB", "EBAY_AU"] as const;

export type MarketCode = (typeof SUPPORTED_MARKETS)[number];

export const DEFAULT_MARKET: MarketCode = "EBAY_US";

const MARKET_LABELS: Record<MarketCode, string> = {
  EBAY_US: "United States",
  EBAY_CA: "Canada",
  EBAY_GB: "United Kingdom",
  EBAY_AU: "Australia",
};

const MARKET_CURRENCIES: Record<MarketCode, string> = {
  EBAY_US: "USD",
  EBAY_CA: "CAD",
  EBAY_GB: "GBP",
  EBAY_AU: "AUD",
};

export function normalizeMarketCode(
  value: string | null | undefined,
): MarketCode | "all" {
  if (!value) {
    return DEFAULT_MARKET;
  }
  const upper = value.toUpperCase();
  if (upper === "ALL") {
    return "all";
  }
  if (upper === "US" || upper === "EBAY_US" || upper === "USA") {
    return "EBAY_US";
  }
  if (upper === "CA" || upper === "EBAY_CA" || upper === "CAN" || upper === "CANADA") {
    return "EBAY_CA";
  }
  if (upper === "GB" || upper === "EBAY_GB" || upper === "UK" || upper === "EBAY_UK") {
    return "EBAY_GB";
  }
  if (upper === "AU" || upper === "EBAY_AU" || upper === "AUS" || upper === "AUSTRALIA") {
    return "EBAY_AU";
  }
  return DEFAULT_MARKET;
}

export function getMarketLabel(code: MarketCode): string {
  return MARKET_LABELS[code] ?? code;
}

export function getMarketEmoji(code: MarketCode): string {
  if (code === "EBAY_US") return "🇺🇸";
  if (code === "EBAY_CA") return "🇨🇦";
  if (code === "EBAY_GB") return "🇬🇧";
  if (code === "EBAY_AU") return "🇦🇺";
  return "";
}

export function getMarketCompactLabel(code: MarketCode): string {
  if (code === "EBAY_US") return "🇺🇸 US";
  if (code === "EBAY_CA") return "🇨🇦 CA";
  if (code === "EBAY_GB") return "🇬🇧 UK";
  if (code === "EBAY_AU") return "🇦🇺 AU";
  return code;
}

export function getExpectedCurrency(code: MarketCode): string {
  return MARKET_CURRENCIES[code];
}

