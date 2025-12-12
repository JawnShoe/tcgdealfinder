export const SUPPORTED_MARKETS = ["EBAY_US", "EBAY_CA"] as const;

export type MarketCode = (typeof SUPPORTED_MARKETS)[number];

export const DEFAULT_MARKET: MarketCode = "EBAY_US";

const MARKET_LABELS: Record<MarketCode, string> = {
  EBAY_US: "United States",
  EBAY_CA: "Canada",
};

const MARKET_CURRENCIES: Record<MarketCode, string> = {
  EBAY_US: "USD",
  EBAY_CA: "CAD",
};

export function normalizeMarketCode(
  value: string | null | undefined,
): MarketCode {
  if (!value) {
    return DEFAULT_MARKET;
  }
  const upper = value.toUpperCase();
  if (upper === "US" || upper === "EBAY_US") {
    return "EBAY_US";
  }
  if (upper === "CA" || upper === "EBAY_CA" || upper === "CAN") {
    return "EBAY_CA";
  }
  return DEFAULT_MARKET;
}

export function getMarketLabel(code: MarketCode): string {
  return MARKET_LABELS[code] ?? code;
}

export function getMarketEmoji(code: MarketCode): string {
  if (code === "EBAY_US") return "🇺🇸";
  if (code === "EBAY_CA") return "🇨🇦";
  return "";
}

export function getMarketCompactLabel(code: MarketCode): string {
  if (code === "EBAY_US") return "🇺🇸 US";
  if (code === "EBAY_CA") return "🇨🇦 CA";
  return code;
}

export function getExpectedCurrency(code: MarketCode): string {
  return MARKET_CURRENCIES[code];
}

