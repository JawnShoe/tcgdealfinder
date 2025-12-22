/**
 * Normalized view model for deal rows across all table variants.
 * UI components should receive this structure, not raw database fields.
 */

import type { Deal } from "../types/deal";
import { getDealDiscount } from "./dealMath";
import { getDealConfidence, isDealTrusted, type DealConfidence } from "./dealScore";
import { getConfidenceLabel as getWeightLabel } from "./dealConfidence";
import { buildAffiliateUrl } from "./affiliateUrl";
import { normalizeMarketCode } from "./markets";
import { getWhyDeal } from "./whyDeal";

export type DealViewModel = {
  // Original deal data (with affiliate-tagged URL)
  deal: Deal;
  
  // Affiliate-tagged URL for eBay links (falls back to original if not configured)
  affiliateUrl: string;
  
  // Normalized display fields (null-safe, ready to render)
  totalUsd: number | null;
  historicUsd: number | null;
  discountPercent: number | null;
  
  // Confidence/quality signals
  priceConfidenceLabel: "high" | "medium" | "low" | null;
  sampleSize: number | null;
  trustedSeller: boolean;
  whyDeal: string | null;
  
  // Presentation fields
  conditionLabel: string | null;
  marketCode: "US" | "CA" | "GB" | "AU" | "all" | string;
  thumbnailUrl: string | null;
  stockImageUrl: string | null; // TCGplayer stock image (preferred for card identity)
  integrityStatus: "OK" | "REVIEW";
  integrityReason: string | null;
  integrityScore: number | null;
  
  // Internal scoring (for sorting, not always displayed)
  score: number | null;
  confidence: DealConfidence;
  confidenceWeight: number | null;
  
  // Sort helpers (used internally by table components)
  cardSortKey: string;
  endsAtMs: number | null;
};

/**
 * Build a normalized view model from a raw Deal object.
 * This is the single source of truth for transforming deals into renderable rows.
 */
export function buildDealViewModel(
  deal: Deal,
  options?: {
    computeScore?: boolean;
    referenceTime?: number;
  }
): DealViewModel {
  const totalUsd = deal.totalUsd ?? null;
  const historicUsd = deal.historicPriceCad ?? null;
  const discountPercent = getDealDiscount(deal);
  
  const trustedSeller = isDealTrusted(
    deal.sellerFeedbackCount ?? null,
    deal.sellerPositivePercent ?? null
  );
  
  const confidence = getDealConfidence(deal.sampleSize ?? null);
  const confidenceWeight = deal.confidenceWeight ?? null;
  const priceConfidenceLabel = getWeightLabel(confidenceWeight);
  
  // Compute score if needed (for sorting)
  let score: number | null = null;
  if (options?.computeScore) {
    // Import computeDealScore only if needed to avoid circular deps
    const { computeDealScore } = require("./dealScore");
    const { applyConfidenceToScore } = require("./dealConfidence");
    const baseScore = computeDealScore(
      {
        discountPercent,
        isTrustedSeller: trustedSeller,
        endsAt: deal.endsAt,
        confidence,
      },
      options.referenceTime ?? Date.now()
    );
    score = applyConfidenceToScore(baseScore, confidenceWeight);
  }
  
  // Compute sort helpers
  const endsAtMs = deal.endsAt ? Date.parse(deal.endsAt) : null;
  const cardSortKey = buildCardSortKey(deal);
  
  return {
    deal,
    affiliateUrl: buildAffiliateUrl(deal.url),
    totalUsd,
    historicUsd,
    discountPercent,
    priceConfidenceLabel,
    sampleSize: deal.sampleSize ?? null,
    trustedSeller,
    whyDeal: getWhyDeal({
      discountPercent,
      sampleSize: deal.sampleSize ?? null,
      updatedAt: deal.updatedAt ?? null,
      shippingCad: deal.shippingCad ?? null,
    }),
    conditionLabel: deal.condition ?? deal.card?.conditionBucket ?? null,
    marketCode: normalizeMarketCode(deal.market),
    thumbnailUrl: deal.thumbnailUrl ?? null,
    stockImageUrl: deal.stockImageUrl ?? null,
    integrityStatus: (deal.integrityStatus ?? "OK") as "OK" | "REVIEW",
    integrityReason: deal.integrityReason ?? null,
    integrityScore:
      deal.integrityScore != null ? Number(deal.integrityScore) : null,
    score,
    confidence,
    confidenceWeight,
    cardSortKey,
    endsAtMs: Number.isNaN(endsAtMs) ? null : endsAtMs,
  };
}

/**
 * Build a stable sort key for card name sorting.
 * Format: "setName||cardNumber||cardName" (all lowercase)
 */
function buildCardSortKey(deal: Deal): string {
  const setName = (deal.card?.setName ?? deal.setName ?? "").toLowerCase();
  const number = (deal.card?.cardNumber ?? "").toLowerCase();
  const name = (deal.card?.name ?? deal.cardName ?? deal.title ?? "").toLowerCase();
  return `${setName}||${number}||${name}`;
}
