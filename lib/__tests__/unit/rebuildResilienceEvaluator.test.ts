/**
 * Unit tests for evaluateResilience - Track C4
 *
 * One test per tier to verify deterministic tier assignment.
 * Tests are ordered by tier priority.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateResilience,
  getTierLabel,
  isDegradedTier,
  type ResilienceEvalInput,
} from "../../rebuild/resilience/evaluateResilience";

// LIVE tier tests
test("evaluateResilience returns LIVE when DB available, all fields present, data fresh", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: true,
    cacheAvailable: false,
    cacheAgeMs: null,
    requiredFieldsPresent: true,
    dataCount: 10,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "LIVE");
  assert.equal(result.explanation, "Full data available from database");
  assert.deepEqual(result.uiFlags, {
    showRetry: false,
    showStaleWarning: false,
    showCachedLabel: false,
    showPartialWarning: false,
    hidePrice: false,
  });
});

test("evaluateResilience returns LIVE when DB available with fresh cache age", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: true,
    cacheAvailable: true,
    cacheAgeMs: 5 * 60 * 1000, // 5 minutes
    requiredFieldsPresent: true,
    dataCount: 5,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "LIVE");
});

// CACHED tier tests
test("evaluateResilience returns CACHED when DB unavailable but cache is fresh", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: false,
    cacheAvailable: true,
    cacheAgeMs: 10 * 60 * 1000, // 10 minutes (within 15 min threshold)
    requiredFieldsPresent: true,
    dataCount: 10,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "CACHED");
  assert.equal(result.explanation, "Serving from cache (database unavailable)");
  assert.deepEqual(result.uiFlags, {
    showRetry: false,
    showStaleWarning: false,
    showCachedLabel: true,
    showPartialWarning: false,
    hidePrice: false,
  });
});

test("evaluateResilience returns CACHED at exactly 15 minute threshold", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: false,
    cacheAvailable: true,
    cacheAgeMs: 15 * 60 * 1000, // exactly 15 minutes
    requiredFieldsPresent: true,
    dataCount: 10,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "CACHED");
});

// STALE tier tests
test("evaluateResilience returns STALE when DB unavailable and cache is expired", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: false,
    cacheAvailable: true,
    cacheAgeMs: 20 * 60 * 1000, // 20 minutes (exceeds 15 min threshold)
    requiredFieldsPresent: true,
    dataCount: 10,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "STALE");
  assert.equal(
    result.explanation,
    "Serving stale cached data (database unavailable)"
  );
  assert.deepEqual(result.uiFlags, {
    showRetry: true,
    showStaleWarning: true,
    showCachedLabel: true,
    showPartialWarning: false,
    hidePrice: false,
  });
});

test("evaluateResilience returns STALE when DB available but data exceeds freshness threshold", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: true,
    cacheAvailable: false,
    cacheAgeMs: 30 * 60 * 1000, // 30 minutes
    requiredFieldsPresent: true,
    dataCount: 10,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "STALE");
  assert.equal(
    result.explanation,
    "Data is stale (exceeds freshness threshold)"
  );
  assert.equal(result.uiFlags.showStaleWarning, true);
  assert.equal(result.uiFlags.showCachedLabel, false);
});

// PARTIAL tier tests
test("evaluateResilience returns PARTIAL when DB available but required fields missing", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: true,
    cacheAvailable: false,
    cacheAgeMs: null,
    requiredFieldsPresent: false,
    dataCount: 10,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "PARTIAL");
  assert.equal(result.explanation, "Some required fields unavailable");
  assert.deepEqual(result.uiFlags, {
    showRetry: false,
    showStaleWarning: false,
    showCachedLabel: false,
    showPartialWarning: true,
    hidePrice: false,
  });
});

test("evaluateResilience returns PARTIAL when DB available but no data returned", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: true,
    cacheAvailable: false,
    cacheAgeMs: null,
    requiredFieldsPresent: true,
    dataCount: 0,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "PARTIAL");
  assert.equal(result.explanation, "No data available at this time");
  assert.equal(result.uiFlags.showPartialWarning, true);
  assert.equal(result.uiFlags.hidePrice, true);
});

// UNAVAILABLE tier tests
test("evaluateResilience returns UNAVAILABLE when no DB and no cache", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: false,
    cacheAvailable: false,
    cacheAgeMs: null,
    requiredFieldsPresent: false,
    dataCount: 0,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "UNAVAILABLE");
  assert.equal(result.explanation, "No data source available");
  assert.deepEqual(result.uiFlags, {
    showRetry: true,
    showStaleWarning: false,
    showCachedLabel: false,
    showPartialWarning: false,
    hidePrice: true,
  });
});

test("evaluateResilience returns UNAVAILABLE when DB unavailable and no data count", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: false,
    cacheAvailable: false,
    cacheAgeMs: null,
    requiredFieldsPresent: true,
    dataCount: 0,
  };

  const result = evaluateResilience(input);

  assert.equal(result.tier, "UNAVAILABLE");
});

// Deterministic ordering tests
test("evaluateResilience prioritizes UNAVAILABLE over other tiers when no data source", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: false,
    cacheAvailable: false,
    cacheAgeMs: null,
    requiredFieldsPresent: false,
    dataCount: 0,
  };

  const result = evaluateResilience(input);
  assert.equal(result.tier, "UNAVAILABLE");
});

test("evaluateResilience produces same outputs for same inputs (deterministic)", () => {
  const input: ResilienceEvalInput = {
    dbAvailable: true,
    cacheAvailable: true,
    cacheAgeMs: 5 * 60 * 1000,
    requiredFieldsPresent: true,
    dataCount: 10,
  };

  const results = Array.from({ length: 10 }, () => evaluateResilience(input));

  // All results should be identical
  const firstResult = results[0];
  for (const result of results) {
    assert.equal(result.tier, firstResult.tier);
    assert.equal(result.explanation, firstResult.explanation);
    assert.deepEqual(result.uiFlags, firstResult.uiFlags);
  }
});

// getTierLabel tests
test("getTierLabel returns correct labels for all tiers", () => {
  assert.equal(getTierLabel("LIVE"), "Live");
  assert.equal(getTierLabel("CACHED"), "Cached");
  assert.equal(getTierLabel("STALE"), "Stale");
  assert.equal(getTierLabel("PARTIAL"), "Partial");
  assert.equal(getTierLabel("UNAVAILABLE"), "Unavailable");
});

// isDegradedTier tests
test("isDegradedTier returns false for LIVE", () => {
  assert.equal(isDegradedTier("LIVE"), false);
});

test("isDegradedTier returns true for all non-LIVE tiers", () => {
  assert.equal(isDegradedTier("CACHED"), true);
  assert.equal(isDegradedTier("STALE"), true);
  assert.equal(isDegradedTier("PARTIAL"), true);
  assert.equal(isDegradedTier("UNAVAILABLE"), true);
});
