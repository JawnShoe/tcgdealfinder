import type { ListingLike, RuleEvaluator } from "../types";

/**
 * Flags SUSPICIOUS_DESCRIPTION for spam patterns or low-quality titles.
 * Explainable: "Title contains spam patterns or is too short."
 */

const MIN_TITLE_LENGTH = 10;

const SPAM_PATTERNS = [
  /buy\s*now/i,
  /act\s*fast/i,
  /limited\s*time/i,
  /!!!+/,
  /\$\$\$+/,
  /free\s*shipping.*free\s*shipping/i,
  /click\s*here/i,
  /amazing\s*deal/i,
  /best\s*price/i,
  /won'?t\s*last/i,
];

const EXCESSIVE_PUNCTUATION = /[!?]{3,}/;
const EXCESSIVE_CAPS_RATIO = 0.7;

function hasExcessiveCaps(title: string): boolean {
  const letters = title.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 10) return false;

  const upperCount = (title.match(/[A-Z]/g) || []).length;
  return upperCount / letters.length > EXCESSIVE_CAPS_RATIO;
}

export const descriptionHeuristicsRule: RuleEvaluator = (
  listing: ListingLike
): "SUSPICIOUS_DESCRIPTION" | null => {
  const title = listing.title;
  if (!title) return null;

  if (title.trim().length < MIN_TITLE_LENGTH) {
    return "SUSPICIOUS_DESCRIPTION";
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(title)) {
      return "SUSPICIOUS_DESCRIPTION";
    }
  }

  if (EXCESSIVE_PUNCTUATION.test(title)) {
    return "SUSPICIOUS_DESCRIPTION";
  }

  if (hasExcessiveCaps(title)) {
    return "SUSPICIOUS_DESCRIPTION";
  }

  return null;
};
