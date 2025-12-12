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
