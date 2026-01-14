import type { RuleEvaluator } from "../types";
import { descriptionHeuristicsRule } from "./descriptionHeuristicsRule";
import { missingKeyFieldsRule } from "./missingKeyFieldsRule";
import { priceOutlierRule } from "./priceOutlierRule";
import { sellerMismatchRule } from "./sellerMismatchRule";
import { stockImageRule } from "./stockImageRule";

/**
 * All intelligence rules, exported as a stable array.
 * Order does not affect output (flags are sorted alphabetically).
 */
export const ALL_RULES: RuleEvaluator[] = [
  descriptionHeuristicsRule,
  missingKeyFieldsRule,
  priceOutlierRule,
  sellerMismatchRule,
  stockImageRule,
];

export {
  descriptionHeuristicsRule,
  missingKeyFieldsRule,
  priceOutlierRule,
  sellerMismatchRule,
  stockImageRule,
};
