type ConfidenceArgs = {
  sampleCount: number | null | undefined;
  medianPrice: number | null | undefined;
  stdDev?: number | null | undefined;
  shippingPrice: number | null | undefined;
};

const SAMPLE_THRESHOLDS: Array<{ min: number; score: number }> = [
  { min: 20, score: 1.0 },
  { min: 10, score: 0.8 },
  { min: 5, score: 0.6 },
  { min: 2, score: 0.4 },
];

const DISPERSION_THRESHOLDS: Array<{ max: number; score: number }> = [
  { max: 0.15, score: 1.0 },
  { max: 0.25, score: 0.8 },
  { max: 0.4, score: 0.6 },
  { max: 0.6, score: 0.4 },
];

const SHIPPING_THRESHOLDS: Array<{ ratio: number; score: number }> = [
  { ratio: 0.15, score: 1.0 },
  { ratio: 0.3, score: 0.8 },
  { ratio: 0.5, score: 0.6 },
];

export const CONFIDENCE_TOOLTIP =
  "Based on sales volume, price consistency, and shipping realism.";

export function computeSampleConfidence(
  sampleCount: number | null | undefined,
): number {
  if (sampleCount == null || !Number.isFinite(sampleCount)) {
    return 0.2;
  }
  for (const threshold of SAMPLE_THRESHOLDS) {
    if (sampleCount >= threshold.min) {
      return threshold.score;
    }
  }
  return 0.2;
}

export function computeDispersionConfidence(
  medianPrice: number | null | undefined,
  stdDev: number | null | undefined,
): number {
  if (
    medianPrice == null ||
    !Number.isFinite(medianPrice) ||
    medianPrice <= 0 ||
    stdDev == null ||
    !Number.isFinite(stdDev) ||
    stdDev < 0
  ) {
    return 0.5;
  }
  const cv = Math.abs(stdDev) / medianPrice;
  for (const threshold of DISPERSION_THRESHOLDS) {
    if (cv <= threshold.max) {
      return threshold.score;
    }
  }
  return 0.2;
}

export function computeShippingConfidence(
  shippingPrice: number | null | undefined,
  medianPrice: number | null | undefined,
): number {
  if (
    shippingPrice == null ||
    !Number.isFinite(shippingPrice) ||
    shippingPrice < 0
  ) {
    return 0.5;
  }
  if (medianPrice == null || !Number.isFinite(medianPrice) || medianPrice <= 0) {
    return 0.5;
  }
  const ratio = shippingPrice / medianPrice;
  for (const threshold of SHIPPING_THRESHOLDS) {
    if (ratio <= threshold.ratio) {
      return threshold.score;
    }
  }
  return 0.4;
}

export function clampConfidenceWeight(value: number): number {
  return Math.min(1, Math.max(0.2, value));
}

export function computeDealConfidenceWeight(args: ConfidenceArgs): number {
  const sampleScore = computeSampleConfidence(args.sampleCount);
  const dispersionScore = computeDispersionConfidence(
    args.medianPrice,
    args.stdDev,
  );
  const shippingScore = computeShippingConfidence(
    args.shippingPrice,
    args.medianPrice,
  );

  const weighted =
    sampleScore * 0.45 + dispersionScore * 0.35 + shippingScore * 0.2;
  return clampConfidenceWeight(weighted);
}

export function getConfidenceLabel(
  weight: number | null | undefined,
): "high" | "medium" | "low" {
  if (weight == null || !Number.isFinite(weight)) {
    return "low";
  }
  if (weight >= 0.8) return "high";
  if (weight >= 0.55) return "medium";
  return "low";
}

export function applyConfidenceToScore(
  baseScore: number | null | undefined,
  weight: number | null | undefined,
): number | null {
  if (baseScore == null || !Number.isFinite(baseScore)) {
    return baseScore ?? null;
  }
  if (weight == null || !Number.isFinite(weight)) {
    return baseScore;
  }
  const clamped = clampConfidenceWeight(weight);
  return Math.round(baseScore * clamped);
}

export function getConfidenceBadgeClass(
  label: "high" | "medium" | "low",
): string {
  if (label === "high") return "bg-emerald-100 text-emerald-700";
  if (label === "medium") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-700";
}

export function getConfidenceDisplayText(
  label: "high" | "medium" | "low",
): string {
  if (label === "high") return "High confidence";
  if (label === "medium") return "Medium confidence";
  return "Low confidence";
}
