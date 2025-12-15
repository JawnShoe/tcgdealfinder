import { formatMoneyFromCad } from "./money";

type FormatEndsAtOptions = {
  short?: boolean;
};

export function formatCurrency(
  value: number | null | undefined,
  currency = "USD",
): string {
  return formatMoneyFromCad(value ?? null, currency);
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

export function formatEndsAt(
  value: string | null | undefined,
  options?: FormatEndsAtOptions,
): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  if (options?.short) {
    const diffMs = date.getTime() - Date.now();
    if (diffMs <= 0) return "Ended";
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      const minutes = diffMinutes % 60;
      return `${diffHours}h ${minutes}m`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
  }

  return date.toLocaleString();
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
  code: "US" | "CA" | "UNKNOWN";
  label: string;
  compactLabel: string;
} {
  const normalized = market?.toUpperCase() ?? "EBAY_US";
  if (normalized === "EBAY_CA" || normalized === "CA") {
    return {
      code: "CA",
      label: "eBay Canada",
      compactLabel: "CA",
    };
  }
  if (normalized === "EBAY_US" || normalized === "US") {
    return {
      code: "US",
      label: "eBay United States",
      compactLabel: "US",
    };
  }
  return {
    code: "UNKNOWN",
    label: "Unknown Market",
    compactLabel: "??",
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
