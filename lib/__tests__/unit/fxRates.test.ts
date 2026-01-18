import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyFXDriftStatus,
  computeFXDriftPercent,
  validateFXRateDirection,
  getFXRate,
  convertToUSD,
  __setFXCacheForTesting,
  type FXRate,
} from "../../rebuild/scripts/fxRates";

test("validateFXRateDirection: accepts rates within bounds", () => {
  assert.equal(validateFXRateDirection("GBP", 1.35), null);
  assert.equal(validateFXRateDirection("GBP", 0.788), null);
  assert.equal(validateFXRateDirection("CAD", 0.72), null);
  assert.equal(validateFXRateDirection("CAD", 1.35), null);
  assert.equal(validateFXRateDirection("USD", 1.0), null);
});

test("validateFXRateDirection: rejects non-finite or non-positive rates", () => {
  assert.ok(validateFXRateDirection("GBP", 0)?.includes("> 0"));
  assert.ok(validateFXRateDirection("GBP", -1)?.includes("> 0"));
  assert.ok(validateFXRateDirection("GBP", NaN)?.includes("> 0"));
  assert.ok(validateFXRateDirection("GBP", Infinity)?.includes("> 0"));
});

test("validateFXRateDirection: rejects rates outside broad bounds", () => {
  assert.ok(validateFXRateDirection("GBP", 0.00001)?.includes("within"));
  assert.ok(validateFXRateDirection("GBP", 100000)?.includes("within"));
});

test("computeFXDriftPercent: uses previous as denominator", () => {
  assert.equal(computeFXDriftPercent(1, 1), 0);
  assert.ok(Math.abs(computeFXDriftPercent(1, 1.04) - 4) < 1e-9);
});

test("classifyFXDriftStatus: applies locked 5%/15% thresholds", () => {
  assert.equal(classifyFXDriftStatus(0), "SUCCESS");
  assert.equal(classifyFXDriftStatus(5), "SUCCESS");
  assert.equal(classifyFXDriftStatus(5.0001), "DRIFT_SUSPECT");
  assert.equal(classifyFXDriftStatus(15), "DRIFT_SUSPECT");
  assert.equal(classifyFXDriftStatus(15.0001), "FAILED");
});

test("bug example: inverted GBP rate triggers FAILED drift classification", () => {
  const correctRate = 1.35;
  const invertedRate = 0.788;

  const driftPercent = computeFXDriftPercent(correctRate, invertedRate);
  assert.ok(driftPercent > 15);
  assert.equal(classifyFXDriftStatus(driftPercent), "FAILED");
});

// --- getFXRate tests (using cache injection) ---

test("getFXRate: returns rate when currency exists in cache", async () => {
  const mockCache = new Map<string, FXRate>();
  mockCache.set("CAD", {
    currency: "CAD",
    rateToUsd: 0.72,
    updatedAt: new Date(),
  });
  __setFXCacheForTesting(mockCache);

  const rate = await getFXRate("CAD");
  assert.equal(rate, 0.72);

  // Cleanup
  __setFXCacheForTesting(null, 0);
});

test("getFXRate: returns null when currency is missing from cache", async () => {
  const mockCache = new Map<string, FXRate>();
  mockCache.set("USD", {
    currency: "USD",
    rateToUsd: 1.0,
    updatedAt: new Date(),
  });
  __setFXCacheForTesting(mockCache);

  const rate = await getFXRate("XYZ");
  assert.equal(rate, null);

  // Cleanup
  __setFXCacheForTesting(null, 0);
});

// --- convertToUSD tests (using cache injection) ---

test("convertToUSD: converts amount using cached rate", async () => {
  const mockCache = new Map<string, FXRate>();
  mockCache.set("CAD", {
    currency: "CAD",
    rateToUsd: 0.72,
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  });
  __setFXCacheForTesting(mockCache);

  const result = await convertToUSD(100, "CAD");
  assert.ok(result !== null);
  assert.equal(result.usd, 72);
  assert.equal(result.rate, 0.72);

  // Cleanup
  __setFXCacheForTesting(null, 0);
});

test("convertToUSD: returns null when currency is missing from cache", async () => {
  const mockCache = new Map<string, FXRate>();
  mockCache.set("USD", {
    currency: "USD",
    rateToUsd: 1.0,
    updatedAt: new Date(),
  });
  __setFXCacheForTesting(mockCache);

  const result = await convertToUSD(100, "MISSING");
  assert.equal(result, null);

  // Cleanup
  __setFXCacheForTesting(null, 0);
});

test("convertToUSD: returns null for invalid amounts", async () => {
  const mockCache = new Map<string, FXRate>();
  mockCache.set("CAD", {
    currency: "CAD",
    rateToUsd: 0.72,
    updatedAt: new Date(),
  });
  __setFXCacheForTesting(mockCache);

  assert.equal(await convertToUSD(null, "CAD"), null);
  assert.equal(await convertToUSD(undefined, "CAD"), null);
  assert.equal(await convertToUSD(-1, "CAD"), null);
  assert.equal(await convertToUSD(NaN, "CAD"), null);

  // Cleanup
  __setFXCacheForTesting(null, 0);
});

test("convertToUSD: rounds to 6 decimal places", async () => {
  const mockCache = new Map<string, FXRate>();
  mockCache.set("GBP", {
    currency: "GBP",
    rateToUsd: 1.333333,
    updatedAt: new Date(),
  });
  __setFXCacheForTesting(mockCache);

  const result = await convertToUSD(100, "GBP");
  assert.ok(result !== null);
  // 100 * 1.333333 = 133.3333, rounded to 6 decimals
  assert.equal(result.usd, 133.3333);

  // Cleanup
  __setFXCacheForTesting(null, 0);
});
