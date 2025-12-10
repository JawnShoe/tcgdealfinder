export type DealConfidence = "high" | "medium" | "low" | null;

export const TRUST_FEEDBACK_THRESHOLD = 20;
export const TRUST_POSITIVE_PERCENT = 98;

export function isDealTrusted(
  feedbackCount: number | null | undefined,
  positivePercent: number | null | undefined,
): boolean {
  if (feedbackCount == null || positivePercent == null) {
    return false;
  }
  return (
    feedbackCount >= TRUST_FEEDBACK_THRESHOLD &&
    positivePercent >= TRUST_POSITIVE_PERCENT
  );
}

export function getDealConfidence(
  sampleSize: number | null | undefined,
): DealConfidence {
  if (sampleSize == null || !Number.isFinite(sampleSize)) {
    return null;
  }
  if (sampleSize >= 50) return "high";
  if (sampleSize >= 20) return "medium";
  if (sampleSize >= 5) return "low";
  return null;
}

export type ScorableDeal = {
  discountPercent: number | null | undefined;
  isTrustedSeller: boolean;
  endsAt: string | Date | null | undefined;
  confidence: DealConfidence;
};

export function computeDealScore(
  deal: ScorableDeal,
  referenceTime = Date.now(),
): number {
  const discount =
    typeof deal.discountPercent === "number" &&
    Number.isFinite(deal.discountPercent)
      ? deal.discountPercent
      : null;

  if (discount == null) {
    return 0;
  }

  let score = Math.min(60, Math.max(0, -discount) * 2);

  if (deal.isTrustedSeller) {
    score += 15;
  }

  if (deal.endsAt) {
    const endsAtDate =
      deal.endsAt instanceof Date
        ? deal.endsAt
        : new Date(deal.endsAt);
    if (!Number.isNaN(endsAtDate.getTime())) {
      const hoursLeft = (endsAtDate.getTime() - referenceTime) / 3600000;
      if (hoursLeft > 0) {
        if (hoursLeft <= 6) score += 15;
        else if (hoursLeft <= 24) score += 10;
        else if (hoursLeft <= 72) score += 5;
      }
    }
  }

  if (deal.confidence === "high") score += 10;
  else if (deal.confidence === "medium") score += 5;

  return Math.round(Math.max(0, Math.min(100, score)));
}
