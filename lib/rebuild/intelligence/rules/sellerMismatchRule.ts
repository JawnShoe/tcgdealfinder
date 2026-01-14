import type { ListingLike, RuleEvaluator } from "../types";

/**
 * Flags SELLER_MISMATCH when seller name and username differ significantly.
 * Explainable: "Seller display name does not match username."
 */

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSimilar(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  return false;
}

export const sellerMismatchRule: RuleEvaluator = (
  listing: ListingLike
): "SELLER_MISMATCH" | null => {
  const { name, username } = listing.seller;

  if (!name || !username) return null;

  if (!isSimilar(name, username)) {
    return "SELLER_MISMATCH";
  }

  return null;
};
