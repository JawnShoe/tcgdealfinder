export type BaselineStatus = "OK" | "INSUFFICIENT_DATA";

export type BaselineComputation = {
  status: BaselineStatus;
  windowDays: number;
  sampleSize: number;
  trimPercent: number;
  medianUsd: number | null;
};

function roundToScale(value: number, scale: number): number {
  const factor = 10 ** scale;
  return Math.round(value * factor) / factor;
}

export function computeTrimCount(
  sampleSize: number,
  trimPercent: number
): number {
  if (!Number.isFinite(sampleSize) || sampleSize <= 0) {
    return 0;
  }
  if (!Number.isFinite(trimPercent) || trimPercent <= 0) {
    return 0;
  }
  return Math.floor(sampleSize * (trimPercent / 100));
}

export function computeTrimmedMedian(
  values: number[],
  trimPercent: number
): number | null {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const cleaned = values.filter((value) => Number.isFinite(value) && value > 0);
  if (cleaned.length === 0) {
    return null;
  }

  const sorted = cleaned.slice().sort((a, b) => a - b);
  const trimCount = computeTrimCount(sorted.length, trimPercent);

  const start = trimCount;
  const endExclusive = sorted.length - trimCount;
  if (start >= endExclusive) {
    return null;
  }

  const trimmed = sorted.slice(start, endExclusive);
  const middleIndex = Math.floor(trimmed.length / 2);

  if (trimmed.length % 2 === 1) {
    return roundToScale(trimmed[middleIndex], 6);
  }

  const left = trimmed[middleIndex - 1];
  const right = trimmed[middleIndex];
  return roundToScale((left + right) / 2, 6);
}

export function computeBaselineMedianUsd(params: {
  primaryWindowDays: number;
  fallbackWindowDays: number;
  minComps: number;
  trimPercent: number;
  primaryWindowValues: number[];
  fallbackWindowValues: number[];
}): BaselineComputation {
  const {
    primaryWindowDays,
    fallbackWindowDays,
    minComps,
    trimPercent,
    primaryWindowValues,
    fallbackWindowValues,
  } = params;

  const primaryValues = (primaryWindowValues ?? []).filter(
    (value) => Number.isFinite(value) && value > 0
  );
  const fallbackValues = (fallbackWindowValues ?? []).filter(
    (value) => Number.isFinite(value) && value > 0
  );

  if (primaryValues.length >= minComps) {
    return {
      status: "OK",
      windowDays: primaryWindowDays,
      sampleSize: primaryValues.length,
      trimPercent,
      medianUsd: computeTrimmedMedian(primaryValues, trimPercent),
    };
  }

  if (fallbackValues.length >= minComps) {
    return {
      status: "OK",
      windowDays: fallbackWindowDays,
      sampleSize: fallbackValues.length,
      trimPercent,
      medianUsd: computeTrimmedMedian(fallbackValues, trimPercent),
    };
  }

  return {
    status: "INSUFFICIENT_DATA",
    windowDays: fallbackWindowDays,
    sampleSize: fallbackValues.length,
    trimPercent,
    medianUsd: null,
  };
}
