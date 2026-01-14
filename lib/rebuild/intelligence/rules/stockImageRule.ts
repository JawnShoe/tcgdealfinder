import type { ListingLike, RuleEvaluator } from "../types";

/**
 * Flags STOCK_IMAGE_ONLY when title suggests generic/placeholder imagery.
 * Explainable: "Title contains stock image indicators."
 */

const STOCK_PATTERNS = [
  /stock\s*photo/i,
  /placeholder/i,
  /no\s*image/i,
  /image\s*coming/i,
  /photo\s*unavailable/i,
  /generic\s*image/i,
];

export const stockImageRule: RuleEvaluator = (
  listing: ListingLike
): "STOCK_IMAGE_ONLY" | null => {
  const title = listing.title;
  if (!title) return null;

  for (const pattern of STOCK_PATTERNS) {
    if (pattern.test(title)) {
      return "STOCK_IMAGE_ONLY";
    }
  }

  return null;
};
