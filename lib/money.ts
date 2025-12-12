export type Currency = "USD" | "CAD";

export const DEFAULT_DISPLAY_CURRENCY: Currency = "USD";
export const FX_CAD_TO_USD = 0.74;
export const FX_RATE_COPY = `Approx. FX rate: 1 CAD ≈ ${FX_CAD_TO_USD.toFixed(
  2,
)} USD.`;

/**
 * All stored monetary fields are CAD; UI converts to display currency.
 */
export function convertCad(
  amountCad: number,
  currency: Currency,
): number {
  if (!Number.isFinite(amountCad)) {
    return amountCad;
  }
  if (currency === "USD") {
    return amountCad * FX_CAD_TO_USD;
  }
  return amountCad;
}

export function formatMoneyFromCad(
  amountCad: number | null | undefined,
  currency: Currency = DEFAULT_DISPLAY_CURRENCY,
): string {
  if (amountCad == null || Number.isNaN(amountCad)) {
    return "--";
  }
  const converted = convertCad(amountCad, currency);
  if (!Number.isFinite(converted)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}
