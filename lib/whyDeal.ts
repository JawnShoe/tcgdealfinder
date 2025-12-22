import { formatDiscount, formatFreshness } from "./dealFormatting";
import { formatMoneyFromCad } from "./money";

export type WhyDealInput = {
  discountPercent?: number | null;
  sampleSize?: number | null;
  updatedAt?: string | null;
  shippingCad?: number | null;
  shippingKnown?: boolean | null;
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

export function getWhyDeal(input: WhyDealInput): string | null {
  const discount = input.discountPercent ?? null;
  const sampleSize = input.sampleSize ?? null;
  if (
    discount != null &&
    Number.isFinite(discount) &&
    sampleSize != null &&
    sampleSize >= BASELINE_SAMPLE_MIN &&
    discount <= -BASELINE_DISCOUNT_MIN
  ) {
    const discountLabel = formatDiscount(discount).replace(/^\+/, "");
    return `~${discountLabel} below recent median (n=${sampleSize})`;
  }

  const minutesSince = getMinutesSince(input.updatedAt ?? null);
  if (minutesSince != null && minutesSince <= NEW_LISTING_WINDOW_MINUTES) {
    const freshness = formatFreshness(input.updatedAt, 2);
    if (freshness) {
      return `New listing (~${freshness} ago)`;
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
    return `Low shipping (${formatMoneyFromCad(input.shippingCad, "CAD")})`;
  }

  return null;
}
