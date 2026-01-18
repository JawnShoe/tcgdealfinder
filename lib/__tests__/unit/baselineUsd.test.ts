import test from "node:test";
import assert from "node:assert/strict";

import {
  computeBaselineMedianUsd,
  computeTrimCount,
  computeTrimmedMedian,
} from "../../rebuild/scripts/baselineUsd";

test("computeTrimCount floors per-tail trim", () => {
  assert.equal(computeTrimCount(30, 5), 1);
  assert.equal(computeTrimCount(39, 5), 1);
  assert.equal(computeTrimCount(40, 5), 2);
});

test("computeTrimCount returns 0 for non-positive inputs", () => {
  assert.equal(computeTrimCount(0, 5), 0);
  assert.equal(computeTrimCount(-10, 5), 0);
  assert.equal(computeTrimCount(30, 0), 0);
  assert.equal(computeTrimCount(30, -1), 0);
});

test("computeTrimmedMedian computes median for odd/even lengths", () => {
  assert.equal(computeTrimmedMedian([3, 1, 2], 0), 2);
  assert.equal(computeTrimmedMedian([4, 1, 2, 3], 0), 2.5);
});

test("computeTrimmedMedian trims top/bottom tails before median", () => {
  const values = Array.from({ length: 30 }, (_, idx) => idx + 1);
  // Trim 5% per tail => floor(30 * 0.05) = 1 per tail.
  // Remaining values are 2..29 (28 values), median is average of 15 and 16 => 15.5.
  assert.equal(computeTrimmedMedian(values, 5), 15.5);
});

test("computeBaselineMedianUsd prefers primary window when >= minComps", () => {
  const primary = Array.from({ length: 30 }, (_, idx) => idx + 1);
  const fallback = Array.from({ length: 40 }, (_, idx) => idx + 1);

  const result = computeBaselineMedianUsd({
    primaryWindowDays: 90,
    fallbackWindowDays: 180,
    minComps: 30,
    trimPercent: 5,
    primaryWindowValues: primary,
    fallbackWindowValues: fallback,
  });

  assert.equal(result.status, "OK");
  assert.equal(result.windowDays, 90);
  assert.equal(result.sampleSize, 30);
  assert.equal(result.medianUsd, 15.5);
});

test("computeBaselineMedianUsd falls back when primary < minComps", () => {
  const primary = Array.from({ length: 29 }, (_, idx) => idx + 1);
  const fallback = Array.from({ length: 30 }, (_, idx) => idx + 1);

  const result = computeBaselineMedianUsd({
    primaryWindowDays: 90,
    fallbackWindowDays: 180,
    minComps: 30,
    trimPercent: 5,
    primaryWindowValues: primary,
    fallbackWindowValues: fallback,
  });

  assert.equal(result.status, "OK");
  assert.equal(result.windowDays, 180);
  assert.equal(result.sampleSize, 30);
  assert.equal(result.medianUsd, 15.5);
});

test("computeBaselineMedianUsd marks insufficient when both windows < minComps", () => {
  const primary = Array.from({ length: 10 }, (_, idx) => idx + 1);
  const fallback = Array.from({ length: 29 }, (_, idx) => idx + 1);

  const result = computeBaselineMedianUsd({
    primaryWindowDays: 90,
    fallbackWindowDays: 180,
    minComps: 30,
    trimPercent: 5,
    primaryWindowValues: primary,
    fallbackWindowValues: fallback,
  });

  assert.equal(result.status, "INSUFFICIENT_DATA");
  assert.equal(result.windowDays, 180);
  assert.equal(result.sampleSize, 29);
  assert.equal(result.medianUsd, null);
});
