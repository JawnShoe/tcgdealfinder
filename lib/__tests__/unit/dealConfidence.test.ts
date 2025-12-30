import test from "node:test";
import assert from "node:assert/strict";

import {
  applyConfidenceToScore,
  computeDealConfidenceWeight,
  computeSampleConfidence,
  computeDispersionConfidence,
  computeShippingConfidence,
  clampConfidenceWeight,
  getConfidenceLabel,
} from "../../dealConfidence";

// ============================================================
// computeSampleConfidence() threshold ladder tests
// ============================================================

test("computeSampleConfidence: returns 1.0 for sampleCount >= 20", () => {
  assert.equal(computeSampleConfidence(20), 1.0);
  assert.equal(computeSampleConfidence(100), 1.0);
});

test("computeSampleConfidence: returns 0.8 for sampleCount >= 10 and < 20", () => {
  assert.equal(computeSampleConfidence(10), 0.8);
  assert.equal(computeSampleConfidence(19), 0.8);
});

test("computeSampleConfidence: returns 0.6 for sampleCount >= 5 and < 10", () => {
  assert.equal(computeSampleConfidence(5), 0.6);
  assert.equal(computeSampleConfidence(9), 0.6);
});

test("computeSampleConfidence: returns 0.4 for sampleCount >= 2 and < 5", () => {
  assert.equal(computeSampleConfidence(2), 0.4);
  assert.equal(computeSampleConfidence(4), 0.4);
});

test("computeSampleConfidence: returns 0.2 for sampleCount < 2", () => {
  assert.equal(computeSampleConfidence(1), 0.2);
  assert.equal(computeSampleConfidence(0), 0.2);
});

test("computeSampleConfidence: returns 0.2 for null/undefined input", () => {
  assert.equal(computeSampleConfidence(null), 0.2);
  assert.equal(computeSampleConfidence(undefined), 0.2);
});

// ============================================================
// computeDispersionConfidence() threshold ladder tests
// ============================================================

test("computeDispersionConfidence: returns 1.0 for CV <= 0.15", () => {
  // CV = stdDev / medianPrice = 10 / 100 = 0.10
  assert.equal(computeDispersionConfidence(100, 10), 1.0);
  // CV = 15 / 100 = 0.15 (boundary)
  assert.equal(computeDispersionConfidence(100, 15), 1.0);
});

test("computeDispersionConfidence: returns 0.8 for CV > 0.15 and <= 0.25", () => {
  // CV = 20 / 100 = 0.20
  assert.equal(computeDispersionConfidence(100, 20), 0.8);
  // CV = 25 / 100 = 0.25 (boundary)
  assert.equal(computeDispersionConfidence(100, 25), 0.8);
});

test("computeDispersionConfidence: returns 0.6 for CV > 0.25 and <= 0.4", () => {
  // CV = 30 / 100 = 0.30
  assert.equal(computeDispersionConfidence(100, 30), 0.6);
  // CV = 40 / 100 = 0.40 (boundary)
  assert.equal(computeDispersionConfidence(100, 40), 0.6);
});

test("computeDispersionConfidence: returns 0.4 for CV > 0.4 and <= 0.6", () => {
  // CV = 50 / 100 = 0.50
  assert.equal(computeDispersionConfidence(100, 50), 0.4);
  // CV = 60 / 100 = 0.60 (boundary)
  assert.equal(computeDispersionConfidence(100, 60), 0.4);
});

test("computeDispersionConfidence: returns 0.2 for CV > 0.6", () => {
  // CV = 70 / 100 = 0.70
  assert.equal(computeDispersionConfidence(100, 70), 0.2);
  // CV = 100 / 100 = 1.0
  assert.equal(computeDispersionConfidence(100, 100), 0.2);
});

test("computeDispersionConfidence: returns 0.5 for null/invalid inputs", () => {
  assert.equal(computeDispersionConfidence(null, 10), 0.5);
  assert.equal(computeDispersionConfidence(100, null), 0.5);
  assert.equal(computeDispersionConfidence(0, 10), 0.5); // medianPrice <= 0
  assert.equal(computeDispersionConfidence(-100, 10), 0.5); // negative median
  assert.equal(computeDispersionConfidence(100, -10), 0.5); // negative stdDev
});

// ============================================================
// computeShippingConfidence() threshold ladder tests
// ============================================================

test("computeShippingConfidence: returns 1.0 for ratio <= 0.15", () => {
  // ratio = 10 / 100 = 0.10
  assert.equal(computeShippingConfidence(10, 100), 1.0);
  // ratio = 15 / 100 = 0.15 (boundary)
  assert.equal(computeShippingConfidence(15, 100), 1.0);
});

test("computeShippingConfidence: returns 0.8 for ratio > 0.15 and <= 0.3", () => {
  // ratio = 20 / 100 = 0.20
  assert.equal(computeShippingConfidence(20, 100), 0.8);
  // ratio = 30 / 100 = 0.30 (boundary)
  assert.equal(computeShippingConfidence(30, 100), 0.8);
});

test("computeShippingConfidence: returns 0.6 for ratio > 0.3 and <= 0.5", () => {
  // ratio = 40 / 100 = 0.40
  assert.equal(computeShippingConfidence(40, 100), 0.6);
  // ratio = 50 / 100 = 0.50 (boundary)
  assert.equal(computeShippingConfidence(50, 100), 0.6);
});

test("computeShippingConfidence: returns 0.4 for ratio > 0.5", () => {
  // ratio = 60 / 100 = 0.60
  assert.equal(computeShippingConfidence(60, 100), 0.4);
  // ratio = 100 / 100 = 1.0
  assert.equal(computeShippingConfidence(100, 100), 0.4);
});

test("computeShippingConfidence: returns 0.5 for null/invalid inputs", () => {
  assert.equal(computeShippingConfidence(null, 100), 0.5);
  assert.equal(computeShippingConfidence(10, null), 0.5);
  assert.equal(computeShippingConfidence(-10, 100), 0.5); // negative shipping
  assert.equal(computeShippingConfidence(10, 0), 0.5); // medianPrice <= 0
  assert.equal(computeShippingConfidence(10, -100), 0.5); // negative median
});

// ============================================================
// clampConfidenceWeight() tests
// ============================================================

test("clampConfidenceWeight: clamps to floor of 0.2", () => {
  assert.equal(clampConfidenceWeight(0.1), 0.2);
  assert.equal(clampConfidenceWeight(0), 0.2);
  assert.equal(clampConfidenceWeight(-1), 0.2);
});

test("clampConfidenceWeight: clamps to ceiling of 1.0", () => {
  assert.equal(clampConfidenceWeight(1.5), 1.0);
  assert.equal(clampConfidenceWeight(2), 1.0);
});

test("clampConfidenceWeight: passes through values in valid range", () => {
  assert.equal(clampConfidenceWeight(0.5), 0.5);
  assert.equal(clampConfidenceWeight(0.8), 0.8);
  assert.equal(clampConfidenceWeight(0.2), 0.2);
  assert.equal(clampConfidenceWeight(1.0), 1.0);
});

// ============================================================
// getConfidenceLabel() tests
// ============================================================

test("getConfidenceLabel: returns 'high' for weight >= 0.8", () => {
  assert.equal(getConfidenceLabel(0.8), "high");
  assert.equal(getConfidenceLabel(0.9), "high");
  assert.equal(getConfidenceLabel(1.0), "high");
});

test("getConfidenceLabel: returns 'medium' for weight >= 0.55 and < 0.8", () => {
  assert.equal(getConfidenceLabel(0.55), "medium");
  assert.equal(getConfidenceLabel(0.7), "medium");
  assert.equal(getConfidenceLabel(0.79), "medium");
});

test("getConfidenceLabel: returns 'low' for weight < 0.55", () => {
  assert.equal(getConfidenceLabel(0.54), "low");
  assert.equal(getConfidenceLabel(0.3), "low");
  assert.equal(getConfidenceLabel(0.2), "low");
});

test("getConfidenceLabel: returns 'low' for null/undefined/NaN", () => {
  assert.equal(getConfidenceLabel(null), "low");
  assert.equal(getConfidenceLabel(undefined), "low");
  assert.equal(getConfidenceLabel(NaN), "low");
});

// ============================================================
// computeDealConfidenceWeight() composite weighting tests
// ============================================================

test("high sample and low dispersion yields high weight", () => {
  const weight = computeDealConfidenceWeight({
    sampleCount: 25,
    medianPrice: 100,
    stdDev: 10,
    shippingPrice: 5,
  });
  assert.ok(weight >= 0.8, `expected >= 0.8, got ${weight}`);
});

test("low sample and high dispersion yields low weight", () => {
  const weight = computeDealConfidenceWeight({
    sampleCount: 3,
    medianPrice: 80,
    stdDev: 60,
    shippingPrice: 60,
  });
  assert.ok(weight <= 0.5, `expected <= 0.5, got ${weight}`);
});

test("weight influences ordering but does not hide deals", () => {
  const highBaseLowWeight = applyConfidenceToScore(80, 0.3);
  const lowerBaseHighWeight = applyConfidenceToScore(65, 0.9);
  assert.ok(
    (highBaseLowWeight ?? 0) < (lowerBaseHighWeight ?? 0),
    "expected weighted ordering to change"
  );
  assert.ok(
    (highBaseLowWeight ?? 0) > 0,
    "low confidence still yields a positive score so listing remains visible"
  );
});

test("computeDealConfidenceWeight: composite weight uses 0.45/0.35/0.2 formula", () => {
  // All max scores: sample=1.0 (>=20), dispersion=1.0 (CV<=0.15), shipping=1.0 (ratio<=0.15)
  // Expected: 1.0*0.45 + 1.0*0.35 + 1.0*0.2 = 1.0
  const weight = computeDealConfidenceWeight({
    sampleCount: 25,
    medianPrice: 100,
    stdDev: 10, // CV = 0.10 <= 0.15 -> 1.0
    shippingPrice: 10, // ratio = 0.10 <= 0.15 -> 1.0
  });
  assert.equal(weight, 1.0);
});

test("computeDealConfidenceWeight: mixed scores apply weighted average", () => {
  // sample=0.6 (5 comps), dispersion=0.5 (null stdDev), shipping=0.8 (ratio=0.20)
  // Expected: 0.6*0.45 + 0.5*0.35 + 0.8*0.2 = 0.27 + 0.175 + 0.16 = 0.605
  const weight = computeDealConfidenceWeight({
    sampleCount: 5,
    medianPrice: 100,
    stdDev: null,
    shippingPrice: 20,
  });
  // Allow small floating point tolerance
  assert.ok(Math.abs(weight - 0.605) < 0.001, `expected ~0.605, got ${weight}`);
});

// ============================================================
// NULL-STDDEV BEHAVIOR TEST (documents current behavior)
// ============================================================

test("computeDealConfidenceWeight: null stdDev results in dispersion score of 0.5 (neutral)", () => {
  // This test documents the CURRENT behavior where null stdDev causes
  // computeDispersionConfidence to return 0.5 (neutral).
  // This is intentional: when we don't have dispersion data, we use neutral score.
  const withNullStdDev = computeDealConfidenceWeight({
    sampleCount: 20,
    medianPrice: 100,
    stdDev: null,
    shippingPrice: 10,
  });

  const withPerfectStdDev = computeDealConfidenceWeight({
    sampleCount: 20,
    medianPrice: 100,
    stdDev: 10, // CV = 0.10 -> 1.0
    shippingPrice: 10,
  });

  // Null stdDev: 1.0*0.45 + 0.5*0.35 + 1.0*0.2 = 0.45 + 0.175 + 0.2 = 0.825
  // Perfect stdDev: 1.0*0.45 + 1.0*0.35 + 1.0*0.2 = 1.0
  assert.ok(
    Math.abs(withNullStdDev - 0.825) < 0.001,
    `expected ~0.825 with null stdDev, got ${withNullStdDev}`
  );
  assert.equal(withPerfectStdDev, 1.0);
  assert.ok(
    withNullStdDev < withPerfectStdDev,
    "null stdDev should produce lower weight than perfect stdDev"
  );
});

test("computeDealConfidenceWeight: undefined stdDev behaves same as null", () => {
  const withUndefinedStdDev = computeDealConfidenceWeight({
    sampleCount: 20,
    medianPrice: 100,
    stdDev: undefined,
    shippingPrice: 10,
  });
  // Should be same as null: 0.825
  assert.ok(
    Math.abs(withUndefinedStdDev - 0.825) < 0.001,
    `expected ~0.825 with undefined stdDev, got ${withUndefinedStdDev}`
  );
});

// ============================================================
// applyConfidenceToScore() additional tests
// ============================================================

test("applyConfidenceToScore: returns null for null baseScore", () => {
  assert.equal(applyConfidenceToScore(null, 0.8), null);
});

test("applyConfidenceToScore: returns baseScore unchanged for null weight", () => {
  assert.equal(applyConfidenceToScore(80, null), 80);
});

test("applyConfidenceToScore: applies clamped weight (floor at 0.2)", () => {
  // Even if weight is below 0.2, it gets clamped to 0.2
  const result = applyConfidenceToScore(100, 0.1);
  // clamp(0.1) = 0.2, so 100 * 0.2 = 20
  assert.equal(result, 20);
});

test("applyConfidenceToScore: rounds result to integer", () => {
  // 100 * 0.33 = 33 (but 0.33 stays as is since > 0.2)
  const result = applyConfidenceToScore(100, 0.33);
  assert.equal(result, 33);
});
