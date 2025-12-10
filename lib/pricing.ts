export function computeDiscountPercent(
  totalPriceCad: number | null | undefined,
  historicPriceCad: number | null | undefined,
): number | null {
  if (
    totalPriceCad == null ||
    historicPriceCad == null ||
    totalPriceCad <= 0 ||
    !Number.isFinite(totalPriceCad) ||
    !Number.isFinite(historicPriceCad) ||
    historicPriceCad <= 0
  ) {
    return null;
  }

  const raw =
    ((totalPriceCad - historicPriceCad) / historicPriceCad) * 100;
  if (!Number.isFinite(raw)) {
    return null;
  }
  return Number(raw.toFixed(2));
}

export type ListingWithSellerInfo = {
  discount_percent: number | null | undefined;
  seller_feedback_count?: number | null;
  seller_positive_percent?: number | null;
};

const MAX_ABS_CLAMP = 150;
const HIGH_TRUST_FEEDBACK = 50;
const HIGH_TRUST_POSITIVE = 99;

export function getDisplayDiscountPercent(
  listing: ListingWithSellerInfo,
): number | null {
  const rawValue =
    listing.discount_percent != null
      ? Number(listing.discount_percent)
      : null;
  if (rawValue == null || !Number.isFinite(rawValue)) {
    return null;
  }

  const feedback = listing.seller_feedback_count ?? 0;
  const positive = listing.seller_positive_percent ?? 0;

  if (feedback >= HIGH_TRUST_FEEDBACK && positive >= HIGH_TRUST_POSITIVE) {
    return Number(rawValue.toFixed(2));
  }

  let clamped = rawValue;
  if (clamped > MAX_ABS_CLAMP) clamped = MAX_ABS_CLAMP;
  if (clamped < -MAX_ABS_CLAMP) clamped = -MAX_ABS_CLAMP;
  return Number(clamped.toFixed(2));
}
