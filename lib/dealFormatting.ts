import { formatMoneyFromCad, type Currency } from "./money";

type FormatEndsAtOptions = {
  short?: boolean;
};

export function formatCurrency(
  value: number | null | undefined,
  currency: Currency = "USD",
): string {
  return formatMoneyFromCad(value ?? null, currency);
}

/**
 * Format a USD amount for display.
 * Value is already in USD (no conversion applied).
 */
export function formatUSD(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  if (!Number.isFinite(value)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDiscount(
  value: number | null | undefined,
): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function discountClass(
  value: number | null | undefined,
): string {
  if (value == null || Number.isNaN(value)) {
    return "";
  }
  if (value <= -15) return "discount-good";
  if (value >= 5) return "discount-bad";
  return "discount-neutral";
}

function formatUtcTimestamp(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

function formatRelativeEnds(
  date: Date,
  shortLabel: boolean,
): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) {
    return shortLabel ? "Ended" : "Ended";
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    const label = diffMinutes <= 1 ? "<1m" : `${diffMinutes}m`;
    return shortLabel ? label : `Ends in ${label}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const minutes = diffMinutes % 60;
    const label =
      minutes > 0 ? `${diffHours}h ${minutes}m` : `${diffHours}h`;
    return shortLabel ? label : `Ends in ${label}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  const label = hours > 0 ? `${diffDays}d ${hours}h` : `${diffDays}d`;
  return shortLabel ? label : `Ends in ${label}`;
}

export function getEndsAtDisplay(
  value: string | null | undefined,
  options?: FormatEndsAtOptions,
): { label: string; tooltip: string } {
  if (!value) {
    return { label: "--", tooltip: "--" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { label: "--", tooltip: "--" };
  }
  const tooltip = formatUtcTimestamp(date);
  const label = formatRelativeEnds(date, Boolean(options?.short));
  return { label, tooltip };
}

export function formatEndsAt(
  value: string | null | undefined,
  options?: FormatEndsAtOptions,
): string {
  return getEndsAtDisplay(value, options).label;
}

export function getConfidenceLabel(
  sampleSize: number | null | undefined,
): string {
  if (sampleSize == null || Number.isNaN(sampleSize)) {
    return "";
  }
  if (sampleSize >= 50) return `High n=${sampleSize}`;
  if (sampleSize >= 20) return `Med n=${sampleSize}`;
  if (sampleSize >= 5) return `Low n=${sampleSize}`;
  return `Very low n=${sampleSize}`;
}

export function formatScore(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) {
    return "--";
  }
  return `${value}`;
}

export function scoreClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "text-slate-500";
  }
  if (value >= 80) return "text-emerald-600 font-semibold";
  if (value >= 60) return "text-emerald-500";
  if (value >= 40) return "text-slate-700";
  return "text-slate-500";
}

/**
 * Format condition bucket to human-readable label.
 * Returns "--" if null/undefined.
 */
export function formatCondition(bucket: string | null | undefined): string {
  if (!bucket) return "--";
  const map: Record<string, string> = {
    raw_nm: "Raw NM",
    raw_lp: "Raw LP",
    raw_mp: "Raw MP",
    raw_hp: "Raw HP",
    psa_10: "PSA 10",
    psa_9: "PSA 9",
    psa_8: "PSA 8",
    bgs_10: "BGS 10",
    bgs_95: "BGS 9.5",
    bgs_9: "BGS 9",
    cgc_10: "CGC 10",
    cgc_95: "CGC 9.5",
    cgc_9: "CGC 9",
  };
  return map[bucket] ?? bucket.replace(/_/g, " ").toUpperCase();
}

/**
 * Market display utilities.
 * Returns normalized code and display label.
 */
export function formatMarket(market: string | null | undefined): {
  code: "US" | "CA" | "GB" | "AU" | "UNKNOWN";
  label: string;
  compactLabel: string;
} {
  const normalized = market?.toUpperCase() ?? "EBAY_US";
  
  if (normalized === "EBAY_US" || normalized === "US") {
    return { code: "US", label: "eBay United States", compactLabel: "US" };
  }
  if (normalized === "EBAY_CA" || normalized === "CA") {
    return { code: "CA", label: "eBay Canada", compactLabel: "CA" };
  }
  if (normalized === "EBAY_GB" || normalized === "GB" || normalized === "UK" || normalized === "EBAY_UK") {
    return { code: "GB", label: "eBay United Kingdom", compactLabel: "UK" };
  }
  if (normalized === "EBAY_AU" || normalized === "AU") {
    return { code: "AU", label: "eBay Australia", compactLabel: "AU" };
  }
  
  // Fallback: should never happen with clean data, but provide safe default
  return {
    code: "UNKNOWN",
    label: "eBay United States",
    compactLabel: "US",
  };
}

/**
 * Format price confidence label for display.
 * Returns chip text and tooltip string.
 */
export function formatPriceConfidence(
  confidenceLabel: "high" | "medium" | "low" | null,
  sampleSize: number | null,
): {
  chipText: string;
  tooltipText: string;
  isEmpty: boolean;
} {
  if (!confidenceLabel || sampleSize == null) {
    return {
      chipText: "--",
      tooltipText: "No price data available",
      isEmpty: true,
    };
  }

  const labelMap = {
    high: "High",
    medium: "Med",
    low: "Low",
  };

  return {
    chipText: `${labelMap[confidenceLabel]} n=${sampleSize}`,
    tooltipText: `Price confidence: ${confidenceLabel} (n=${sampleSize} sales)`,
    isEmpty: false,
  };
}

/**
 * Format deal freshness indicator.
 * Returns null if data is stale (older than threshold).
 * Returns short relative time string if fresh enough.
 */
export function formatFreshness(
  updatedAt: string | null | undefined,
  thresholdHours: number = 4,
): string | null {
  if (!updatedAt) {
    return null;
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  // Only show if recent enough
  const thresholdMinutes = thresholdHours * 60;
  if (diffMinutes > thresholdMinutes) {
    return null;
  }

  // Format as "Xm" for minutes, "Xh" for hours
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h`;
}
