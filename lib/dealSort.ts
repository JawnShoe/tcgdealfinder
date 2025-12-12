export type DiscountInput = number | null | undefined;

enum DiscountCategory {
  Discount = 0,
  NonDiscount = 1,
  Unscored = 2,
}

function categorizeDiscount(value: DiscountInput): DiscountCategory {
  if (value == null || Number.isNaN(value)) {
    return DiscountCategory.Unscored;
  }
  if (value < 0) {
    return DiscountCategory.Discount;
  }
  return DiscountCategory.NonDiscount;
}

/**
 * Comparator that keeps real discounts first, markups next, unscored last.
 * Within the same bucket it sorts numerically (more negative discounts first,
 * lower markups before higher markups).
 */
export function compareStrictBestDiscountValues(
  a: DiscountInput,
  b: DiscountInput,
): number {
  const categoryA = categorizeDiscount(a);
  const categoryB = categorizeDiscount(b);
  if (categoryA !== categoryB) {
    return categoryA - categoryB;
  }
  if (categoryA === DiscountCategory.Unscored) {
    return 0;
  }
  const left = typeof a === "number" ? a : 0;
  const right = typeof b === "number" ? b : 0;
  return left - right;
}
