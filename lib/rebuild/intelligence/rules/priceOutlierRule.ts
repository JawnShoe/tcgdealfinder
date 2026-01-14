import type { ListingLike, RuleEvaluator } from "../types";

/**
 * Flags PRICE_OUTLIER_SIMPLE when discount is extreme.
 * Explainable: "Price discount exceeds reasonable thresholds."
 *
 * Thresholds (simple, not statistical):
 * - More than 80% below market (too good to be true)
 * - More than 50% above market (potential pricing error or scam)
 */

const DISCOUNT_TOO_GOOD_THRESHOLD = -80;
const PREMIUM_TOO_HIGH_THRESHOLD = 50;

export const priceOutlierRule: RuleEvaluator = (
  listing: ListingLike
): "PRICE_OUTLIER_SIMPLE" | null => {
  const discountPercent = listing.price.discountPercent;

  if (discountPercent == null) return null;

  if (discountPercent <= DISCOUNT_TOO_GOOD_THRESHOLD) {
    return "PRICE_OUTLIER_SIMPLE";
  }

  if (discountPercent >= PREMIUM_TOO_HIGH_THRESHOLD) {
    return "PRICE_OUTLIER_SIMPLE";
  }

  return null;
};
