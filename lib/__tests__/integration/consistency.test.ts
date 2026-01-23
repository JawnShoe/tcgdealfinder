/**
 * Formatter consistency tests to prevent UI drift.
 * These tests caught the "Unscored" bug and ensure consistent null handling.
 *
 * NOTE: Legacy table column tests (HomepageColumns, etc.) and dealViewModel
 * tests were removed as those modules are no longer used by active code.
 * Formatter coverage retained as these functions are used by lib/whyDeal.ts
 * and scripts.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDiscount,
  formatCurrency,
  formatCondition,
  formatMarket,
  formatEndsAt,
  formatFreshness,
} from "../../dealFormatting";

/**
 * Test 1: formatDiscount(null) must return "--", never "Unscored"
 */
test("formatDiscount returns -- for null/undefined", () => {
  assert.strictEqual(formatDiscount(null), "--");
  assert.strictEqual(formatDiscount(undefined), "--");
  assert.strictEqual(formatDiscount(NaN), "--");
});

/**
 * Test 2: formatDiscount handles valid values correctly
 */
test("formatDiscount formats valid percentages with sign", () => {
  assert.strictEqual(formatDiscount(-15.5), "-15.5%");
  assert.strictEqual(formatDiscount(10.2), "+10.2%");
  assert.strictEqual(formatDiscount(0), "0.0%");
});

/**
 * Test 3: formatCurrency returns -- for missing values
 */
test("formatCurrency returns -- for null/undefined", () => {
  assert.strictEqual(formatCurrency(null), "--");
  assert.strictEqual(formatCurrency(undefined), "--");
  assert.strictEqual(formatCurrency(NaN), "--");
});

/**
 * Test 4: formatCondition returns -- for null/undefined
 */
test("formatCondition returns -- for null/undefined", () => {
  assert.strictEqual(formatCondition(null), "--");
  assert.strictEqual(formatCondition(undefined), "--");
});

/**
 * Test 5: formatCondition maps known buckets correctly
 */
test("formatCondition maps condition buckets to human labels", () => {
  assert.strictEqual(formatCondition("raw_nm"), "Raw NM");
  assert.strictEqual(formatCondition("psa_10"), "PSA 10");
  assert.strictEqual(formatCondition("bgs_95"), "BGS 9.5");
  assert.strictEqual(formatCondition("cgc_9"), "CGC 9");
});

/**
 * Test 6: formatFreshness hides future and stale timestamps
 */
test("formatFreshness returns null for future or stale timestamps", () => {
  const originalNow = Date.now;
  const fixedNow = new Date("2025-01-01T00:00:00Z").getTime();
  Date.now = () => fixedNow;

  try {
    const future = new Date(fixedNow + 5 * 60 * 1000).toISOString();
    const stale = new Date(fixedNow - 5 * 60 * 60 * 1000).toISOString();
    const fresh = new Date(fixedNow - 30 * 60 * 1000).toISOString();

    assert.strictEqual(formatFreshness(future), null);
    assert.strictEqual(formatFreshness(stale), null);
    assert.strictEqual(formatFreshness(fresh), "30m");
  } finally {
    Date.now = originalNow;
  }
});

/**
 * Test 7: formatMarket returns consistent structure for all market types
 */
test("formatMarket returns consistent structure for all markets", () => {
  // US market
  const us = formatMarket("EBAY_US");
  assert.strictEqual(us.code, "US");
  assert.strictEqual(us.compactLabel, "US");
  assert.ok(us.label.includes("United States"));

  // CA market
  const ca = formatMarket("EBAY_CA");
  assert.strictEqual(ca.code, "CA");
  assert.strictEqual(ca.compactLabel, "CA");
  assert.ok(ca.label.includes("Canada"));

  // Null/undefined defaults to US
  const nullMarket = formatMarket(null);
  assert.strictEqual(nullMarket.code, "US");

  const undefinedMarket = formatMarket(undefined);
  assert.strictEqual(undefinedMarket.code, "US");
});

/**
 * Test 8: formatEndsAt returns -- for null/undefined/invalid
 */
test("formatEndsAt returns -- for null/undefined/invalid", () => {
  assert.strictEqual(formatEndsAt(null), "--");
  assert.strictEqual(formatEndsAt(undefined), "--");
  assert.strictEqual(formatEndsAt("invalid-date"), "--");
});

/**
 * Test 9: formatDiscount never shows "Unscored" or "N/A"
 */
test("formatDiscount never shows Unscored or N/A", () => {
  const formatted = formatDiscount(null);
  assert.strictEqual(formatted, "--", "Missing discount should display as --");
  assert.ok(!formatted.includes("N/A"), "Should never show N/A");
  assert.ok(!formatted.includes("Unscored"), "Should never show Unscored");
});

/**
 * Test 10: formatCurrency never shows "Unscored"
 */
test("formatCurrency never shows Unscored", () => {
  const formatted = formatCurrency(null);
  assert.strictEqual(formatted, "--", "Missing price should display as --");
  assert.ok(!formatted.includes("Unscored"), "Should never show Unscored");
});
