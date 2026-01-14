import type { ListingLike, RuleEvaluator } from "../types";

/**
 * Flags MISSING_KEY_FIELDS when critical listing data is absent.
 * Explainable: "Listing is missing price, condition, or seller info."
 *
 * Note: This complements (not replaces) the existing RiskFlag checks
 * in trustAssessment. These are different signals for different purposes.
 */

export const missingKeyFieldsRule: RuleEvaluator = (
  listing: ListingLike
): "MISSING_KEY_FIELDS" | null => {
  const hasMissingPrice = listing.price.amount == null;
  const hasMissingCondition = !listing.condition;
  const hasMissingSeller = !listing.seller.name && !listing.seller.username;

  const missingCount = [
    hasMissingPrice,
    hasMissingCondition,
    hasMissingSeller,
  ].filter(Boolean).length;

  if (missingCount >= 2) {
    return "MISSING_KEY_FIELDS";
  }

  return null;
};
