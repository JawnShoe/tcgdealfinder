import { formatFreshness } from "./dealFormatting";
import { formatMoneyFromCad } from "./money";

export type WhyDealInput = {
  discountPercent?: number | null;
  sampleSize?: number | null;
  updatedAt?: string | null;
  shippingCad?: number | null;
  shippingKnown?: boolean | null;
};

export type WhyDealResult = {
  label: string;
  tooltip: string;
};

const BASELINE_SAMPLE_MIN = 10;
const BASELINE_DISCOUNT_MIN = 12;
const NEW_LISTING_WINDOW_MINUTES = 90;
const LOW_SHIPPING_MAX_CAD = 5;

function getMinutesSince(updatedAt: string | null | undefined): number | null {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / 60000);
}

export function getWhyDeal(input: WhyDealInput): WhyDealResult | null {
  const discount = input.discountPercent ?? null;
  const sampleSize = input.sampleSize ?? null;
  if (
    discount != null &&
    Number.isFinite(discount) &&
    sampleSize != null &&
    sampleSize >= BASELINE_SAMPLE_MIN &&
    discount <= -BASELINE_DISCOUNT_MIN
  ) {
    const absDiscount = Math.abs(discount);
    const discountLabel = absDiscount.toFixed(1);
    const sampleCount = Math.round(sampleSize);
    const label =
      sampleSize >= 25
        ? "Well below typical price"
        : "Below typical price";
    return {
      label,
      tooltip: `About ${discountLabel}% below recent median (${sampleCount} comparable sales).`,
    };
  }

  const minutesSince = getMinutesSince(input.updatedAt ?? null);
  if (minutesSince != null && minutesSince <= NEW_LISTING_WINDOW_MINUTES) {
    const freshness = formatFreshness(input.updatedAt, 2);
    if (freshness) {
      return {
        label: "Just listed",
        tooltip: `Listed about ${freshness} ago.`,
      };
    }
  }

  const shippingKnown =
    input.shippingKnown !== undefined && input.shippingKnown !== null
      ? Boolean(input.shippingKnown)
      : input.shippingCad != null;
  if (
    shippingKnown &&
    input.shippingCad != null &&
    Number.isFinite(input.shippingCad) &&
    input.shippingCad <= LOW_SHIPPING_MAX_CAD
  ) {
    return {
      label: "Low shipping",
      tooltip: `Shipping ${formatMoneyFromCad(input.shippingCad, "CAD")}.`,
    };
  }

  return null;
}
