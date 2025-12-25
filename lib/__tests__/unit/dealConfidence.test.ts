import test from "node:test";
import assert from "node:assert/strict";

import {
  applyConfidenceToScore,
  computeDealConfidenceWeight,
} from "../../dealConfidence";

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
    "expected weighted ordering to change",
  );
  assert.ok(
    (highBaseLowWeight ?? 0) > 0,
    "low confidence still yields a positive score so listing remains visible",
  );
});
