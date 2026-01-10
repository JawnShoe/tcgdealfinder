import type { ListingDomain } from "@/lib/rebuild/data/listingMapper";

export type PredictiveSignalLabel =
  | "High likelihood undervalued"
  | "Monitor"
  | "Low signal"
  | "Insufficient data";

export type PredictiveSignalsResult = {
  label: PredictiveSignalLabel;
  score: number;
  reasons: string[];
  inputsUsed: string[];
};

export function computePredictiveSignals(
  listing: ListingDomain
): PredictiveSignalsResult {
  const reasons: string[] = [];
  const inputsUsed: string[] = [];
  const missing: string[] = [];

  const discountPercent = listing.price.discountPercent;
  if (discountPercent == null) {
    missing.push("discount percent");
  } else {
    inputsUsed.push("discountPercent");
    if (discountPercent < 0) {
      reasons.push(`Discount signal: ${Math.abs(discountPercent)}% below.`);
    } else {
      reasons.push("No discount signal detected.");
    }
  }

  const confidenceWeight = listing.trust.confidence.weight;
  if (confidenceWeight == null) {
    missing.push("confidence weight");
  } else {
    inputsUsed.push("confidenceWeight");
    reasons.push(
      `Confidence weight: ${Math.round(confidenceWeight * 100)} / 100.`
    );
  }

  const dataAgeSeconds = listing.freshness.dataAgeSeconds;
  if (dataAgeSeconds == null) {
    missing.push("data age");
  } else {
    inputsUsed.push("dataAgeSeconds");
    reasons.push(`Data age: ${listing.freshness.dataAgeLabel}.`);
  }

  const integrityStatus = listing.reliability.integrityStatus;
  if (integrityStatus) {
    inputsUsed.push("integrityStatus");
    if (integrityStatus !== "OK") {
      reasons.push(`Integrity flagged: ${integrityStatus}.`);
    }
  }

  const shippingKnown = listing.reliability.shippingKnown;
  if (shippingKnown != null) {
    inputsUsed.push("shippingKnown");
    if (!shippingKnown) {
      reasons.push("Shipping unknown in source data.");
    }
  }

  if (missing.length > 0) {
    return {
      label: "Insufficient data",
      score: 0,
      reasons: missing.map((item) => `Missing ${item}.`).slice(0, 3),
      inputsUsed,
    };
  }

  const discountScore = Math.max(
    0,
    Math.min(50, Math.round(Math.abs(discountPercent ?? 0) * 2))
  );
  const confidenceScore = Math.round((confidenceWeight ?? 0) * 30);
  const freshnessScore = computeFreshnessScore(dataAgeSeconds);
  const penalty = computePenalty(integrityStatus, shippingKnown);

  const rawScore = discountScore + confidenceScore + freshnessScore - penalty;
  const score = Math.max(0, Math.min(100, rawScore));
  const label =
    score >= 75
      ? "High likelihood undervalued"
      : score >= 45
        ? "Monitor"
        : "Low signal";

  return {
    label,
    score,
    reasons: reasons.slice(0, 4),
    inputsUsed,
  };
}

function computeFreshnessScore(ageSeconds: number | null): number {
  if (ageSeconds == null) return 0;
  if (ageSeconds <= 15 * 60) return 20;
  if (ageSeconds <= 60 * 60) return 10;
  return 0;
}

function computePenalty(
  integrityStatus: string | null,
  shippingKnown: boolean | null
): number {
  let penalty = 0;
  if (integrityStatus && integrityStatus !== "OK") {
    penalty += 15;
  }
  if (shippingKnown === false) {
    penalty += 5;
  }
  return penalty;
}
