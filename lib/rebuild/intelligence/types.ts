/**
 * Intelligence Layer Types (Track C3)
 *
 * Defines types for the rules-based intelligence engine.
 * Uses ListingLike (minimal subset) to avoid circular import risk
 * with listingMapper.ts.
 */

/**
 * Minimal listing shape for intelligence rules.
 * Uses only the fields that rules actually inspect.
 * Avoids circular dependency with listingMapper.ts.
 */
export type ListingLike = {
  title: string;
  price: {
    amount: number | null;
    discountPercent: number | null;
  };
  seller: {
    name: string | null;
    username: string | null;
  };
  condition: string | null;
};

export type IntelligenceRiskFlag =
  | "MISSING_KEY_FIELDS"
  | "PRICE_OUTLIER_SIMPLE"
  | "SELLER_MISMATCH"
  | "STOCK_IMAGE_ONLY"
  | "SUSPICIOUS_DESCRIPTION";

export type IntelligenceResult = {
  riskFlags: IntelligenceRiskFlag[];
  engineVersion: "intelligence-v1";
};

export type RuleEvaluator = (
  listing: ListingLike
) => IntelligenceRiskFlag | null;
