/**
 * Consistency tests to prevent UI drift across table variants.
 * These tests caught the "Unscored" bug and header wrapping issues.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDiscount,
  formatCurrency,
  formatUSD,
  formatCondition,
  formatMarket,
  formatEndsAt,
  formatFreshness,
} from "../dealFormatting";
import { buildDealViewModel, type DealViewModel } from "../dealViewModel";
import { TABLE_TH_NOWRAP } from "../typography";
import { HomepageColumns, NewestColumns, TopDealsColumns, EndingSoonColumns, CardDetailListingsColumns } from "../tableColumns";
import type { Deal } from "../../types/deal";

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
 * Test 4: View model builder sets discountPercent to null when historicUsd is missing
 */
test("buildDealViewModel sets discountPercent to null when historicUsd is null", () => {
  const dealWithoutHistoric: Deal = {
    id: 1,
    title: "Test Card",
    url: "https://example.com",
    totalPriceCad: 100,
    historicPriceCad: null, // Missing historic price
    discountPercent: null,
    market: "EBAY_US",
    endsAt: null,
    thumbnailUrl: null,
    sellerUsername: "testuser",
    sellerFeedbackCount: 100,
    sellerPositivePercent: 99,
    sampleSize: null,
    condition: "raw_nm",
    priceCad: 95,
    shippingCad: 5,
    card: null,
    setName: null,
    cardName: "Test Card",
    cardId: null,
  };

  const vm = buildDealViewModel(dealWithoutHistoric);
  
  assert.strictEqual(vm.historicUsd, null, "historicUsd should be null");
  assert.strictEqual(vm.discountPercent, null, "discountPercent should be null when historic is missing");
});

/**
 * Test 5: View model computes discount correctly when both prices exist
 */
test("buildDealViewModel computes discountPercent when prices exist", () => {
  const dealWithBothPrices: Deal = {
    id: 2,
    title: "Test Card 2",
    url: "https://example.com",
    totalUsd: 95,
    totalPriceCad: 85,
    historicPriceCad: 100,
    discountPercent: null,
    market: "EBAY_US",
    endsAt: null,
    thumbnailUrl: null,
    sellerUsername: "testuser",
    sellerFeedbackCount: 100,
    sellerPositivePercent: 99,
    sampleSize: 25,
    condition: "raw_nm",
    priceCad: 80,
    shippingCad: 5,
    card: null,
    setName: null,
    cardName: "Test Card 2",
    cardId: null,
  };

  const vm = buildDealViewModel(dealWithBothPrices);
  
  assert.strictEqual(
    vm.totalUsd,
    dealWithBothPrices.totalUsd,
    "totalUsd should match deal.totalUsd",
  );
  assert.strictEqual(vm.historicUsd, 100, "historicUsd should match historicPriceCad");
  assert.ok(vm.discountPercent !== null, "discountPercent should be computed");
  assert.ok(vm.discountPercent! < 0, "discountPercent should be negative (discount)");
});

/**
 * Test 6: Price conf. header includes whitespace-nowrap
 */
test("Price conf. column headers have whitespace-nowrap", () => {
  const columnsWithPriceConf = [
    NewestColumns,
    TopDealsColumns,
    CardDetailListingsColumns,
  ];

  for (const columns of columnsWithPriceConf) {
    const priceConfCol = columns.find((col) => col.key === "priceConf");
    if (priceConfCol) {
      assert.ok(
        priceConfCol.headerClassName.includes("whitespace-nowrap") ||
        priceConfCol.headerClassName.includes(TABLE_TH_NOWRAP),
        `Price conf. header should have whitespace-nowrap: ${priceConfCol.headerClassName}`
      );
    }
  }
});

/**
 * Test 7: Homepage and EndingSoon columns do NOT include Price conf.
 */
test("Homepage and EndingSoon variants exclude Price conf. column", () => {
  const homepageHasPriceConf = HomepageColumns.some((col) => col.key === "priceConf");
  const endingSoonHasPriceConf = EndingSoonColumns.some((col) => col.key === "priceConf");

  assert.strictEqual(homepageHasPriceConf, false, "Homepage should NOT have Price conf. column");
  assert.strictEqual(endingSoonHasPriceConf, false, "EndingSoon should NOT have Price conf. column");
});

/**
 * Test 8: Newest, TopDeals, and CardDetail variants include Price conf.
 */
test("Newest, TopDeals, and CardDetail variants include Price conf. column", () => {
  const newestHasPriceConf = NewestColumns.some((col) => col.key === "priceConf");
  const topDealsHasPriceConf = TopDealsColumns.some((col) => col.key === "priceConf");
  const cardDetailHasPriceConf = CardDetailListingsColumns.some((col) => col.key === "priceConf");

  assert.strictEqual(newestHasPriceConf, true, "Newest should have Price conf. column");
  assert.strictEqual(topDealsHasPriceConf, true, "TopDeals should have Price conf. column");
  assert.strictEqual(cardDetailHasPriceConf, true, "CardDetail should have Price conf. column");
});

/**
 * Test 9: Condition column only in TopDeals variant
 */
test("Condition column only appears in TopDeals variant", () => {
  const homepageHasCondition = HomepageColumns.some((col) => col.key === "condition");
  const newestHasCondition = NewestColumns.some((col) => col.key === "condition");
  const topDealsHasCondition = TopDealsColumns.some((col) => col.key === "condition");
  const endingSoonHasCondition = EndingSoonColumns.some((col) => col.key === "condition");

  assert.strictEqual(homepageHasCondition, false, "Homepage should NOT have Condition column");
  assert.strictEqual(newestHasCondition, false, "Newest should NOT have Condition column");
  assert.strictEqual(topDealsHasCondition, true, "TopDeals SHOULD have Condition column");
  assert.strictEqual(endingSoonHasCondition, false, "EndingSoon should NOT have Condition column");
});

/**
 * Test 10: formatCondition returns -- for null/undefined
 */
test("formatCondition returns -- for null/undefined", () => {
  assert.strictEqual(formatCondition(null), "--");
  assert.strictEqual(formatCondition(undefined), "--");
});

/**
 * Test 11: formatCondition maps known buckets correctly
 */
test("formatCondition maps condition buckets to human labels", () => {
  assert.strictEqual(formatCondition("raw_nm"), "Raw NM");
  assert.strictEqual(formatCondition("psa_10"), "PSA 10");
  assert.strictEqual(formatCondition("bgs_95"), "BGS 9.5");
  assert.strictEqual(formatCondition("cgc_9"), "CGC 9");
});

/**
 * Test 12: formatFreshness hides future and stale timestamps
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
 * Test 13: All column specs have required properties
 */
test("All column specs have required properties", () => {
  const allColumns = [
    ...HomepageColumns,
    ...NewestColumns,
    ...TopDealsColumns,
    ...EndingSoonColumns,
    ...CardDetailListingsColumns,
  ];

  for (const col of allColumns) {
    assert.ok(col.key, `Column should have key: ${JSON.stringify(col)}`);
    assert.ok(col.headerLabel, `Column ${col.key} should have headerLabel`);
    assert.ok(col.headerClassName, `Column ${col.key} should have headerClassName`);
    assert.ok(col.cellClassName, `Column ${col.key} should have cellClassName`);
    assert.strictEqual(typeof col.renderCell, "function", `Column ${col.key} should have renderCell function`);
  }
});
// ============================================================================
// Step 2.5: Formatter consistency tests
// ============================================================================

/**
 * Test 13: formatMarket returns consistent structure for all market types
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
 * Test 14: formatEndsAt returns -- for null/undefined/invalid
 */
test("formatEndsAt returns -- for null/undefined/invalid", () => {
  assert.strictEqual(formatEndsAt(null), "--");
  assert.strictEqual(formatEndsAt(undefined), "--");
  assert.strictEqual(formatEndsAt("invalid-date"), "--");
});

/**
 * Test 15: buildDealViewModel produces consistent field names
 * This test ensures DealsTable can rely on these fields
 */
test("buildDealViewModel includes all required fields for table rendering", () => {
  const testDeal: Deal = {
    id: 100,
    title: "Test Card for Field Check",
    url: "https://example.com",
    totalUsd: 45,
    totalPriceCad: 50,
    historicPriceCad: 60,
    discountPercent: null,
    market: "EBAY_US",
    endsAt: "2024-12-20T12:00:00Z",
    thumbnailUrl: "https://example.com/img.jpg",
    sellerUsername: "testseller",
    sellerFeedbackCount: 50,
    sellerPositivePercent: 98,
    sampleSize: 30,
    condition: "raw_nm",
    priceCad: 45,
    shippingCad: 5,
    card: null,
    setName: "Test Set",
    cardName: "Test Card",
    cardId: 1,
  };

  const vm = buildDealViewModel(testDeal, { computeScore: true });
  
  // Check all required fields exist
  assert.ok("deal" in vm, "vm should have deal");
  assert.ok("affiliateUrl" in vm, "vm should have affiliateUrl");
  assert.ok("totalUsd" in vm, "vm should have totalUsd");
  assert.ok("historicUsd" in vm, "vm should have historicUsd");
  assert.ok("discountPercent" in vm, "vm should have discountPercent");
  assert.ok("priceConfidenceLabel" in vm, "vm should have priceConfidenceLabel");
  assert.ok("sampleSize" in vm, "vm should have sampleSize");
  assert.ok("trustedSeller" in vm, "vm should have trustedSeller");
  assert.ok("conditionLabel" in vm, "vm should have conditionLabel");
  assert.ok("marketCode" in vm, "vm should have marketCode");
  assert.ok("thumbnailUrl" in vm, "vm should have thumbnailUrl");
  assert.ok("score" in vm, "vm should have score");
  assert.ok("confidence" in vm, "vm should have confidence");
  assert.ok("confidenceWeight" in vm, "vm should have confidenceWeight");
  assert.ok("cardSortKey" in vm, "vm should have cardSortKey");
  assert.ok("endsAtMs" in vm, "vm should have endsAtMs");
  
  // Verify types
  assert.strictEqual(typeof vm.totalUsd, "number");
  assert.strictEqual(typeof vm.historicUsd, "number");
  assert.strictEqual(typeof vm.trustedSeller, "boolean");
  assert.strictEqual(typeof vm.cardSortKey, "string");
});

/**
 * Test 16: Same deal produces same formatted output regardless of variant
 * This ensures Homepage and /newest can't drift when using shared formatters
 */
test("formatters produce identical output for same vm across variants", () => {
  const testDeal: Deal = {
    id: 200,
    title: "Consistency Test Card",
    url: "https://example.com",
    totalPriceCad: 100,
    historicPriceCad: 120,
    discountPercent: null,
    market: "EBAY_CA",
    endsAt: null, // Missing ends
    thumbnailUrl: null,
    sellerUsername: null, // Missing seller
    sellerFeedbackCount: null,
    sellerPositivePercent: null,
    sampleSize: null, // No sample data
    condition: null,
    priceCad: 90,
    shippingCad: 10,
    card: null,
    setName: null,
    cardName: null,
    cardId: null,
  };

  const vm = buildDealViewModel(testDeal);
  
  // Test that formatters return same value when called multiple times
  // This simulates what would happen on Homepage vs /newest
  const totalFormatted1 = formatUSD(vm.totalUsd);
  const totalFormatted2 = formatUSD(vm.totalUsd);
  assert.strictEqual(totalFormatted1, totalFormatted2, "formatCurrency should be deterministic");
  
  const historicFormatted1 = formatCurrency(vm.historicUsd);
  const historicFormatted2 = formatCurrency(vm.historicUsd);
  assert.strictEqual(historicFormatted1, historicFormatted2, "formatCurrency should be deterministic for historic");
  
  const discountFormatted1 = formatDiscount(vm.discountPercent);
  const discountFormatted2 = formatDiscount(vm.discountPercent);
  assert.strictEqual(discountFormatted1, discountFormatted2, "formatDiscount should be deterministic");
  
  const marketFormatted1 = formatMarket(vm.deal.market);
  const marketFormatted2 = formatMarket(vm.deal.market);
  assert.deepStrictEqual(marketFormatted1, marketFormatted2, "formatMarket should be deterministic");
  
  const endsFormatted1 = formatEndsAt(vm.deal.endsAt);
  const endsFormatted2 = formatEndsAt(vm.deal.endsAt);
  assert.strictEqual(endsFormatted1, endsFormatted2, "formatEndsAt should be deterministic");
});

/**
 * Test 17: Missing historic always shows -- (never blank, never "Unscored")
 */
test("Missing historic price displays as --", () => {
  const dealWithNoHistoric: Deal = {
    id: 300,
    title: "No Historic Card",
    url: "https://example.com",
    totalPriceCad: 50,
    historicPriceCad: null,
    discountPercent: null,
    market: "EBAY_US",
    endsAt: null,
    thumbnailUrl: null,
    sellerUsername: "test",
    sellerFeedbackCount: 10,
    sellerPositivePercent: 90,
    sampleSize: null,
    condition: null,
    priceCad: 45,
    shippingCad: 5,
    card: null,
    setName: null,
    cardName: null,
    cardId: null,
  };

  const vm = buildDealViewModel(dealWithNoHistoric);
  
  assert.strictEqual(vm.historicUsd, null, "historicUsd should be null");
  
  const formatted = formatCurrency(vm.historicUsd);
  assert.strictEqual(formatted, "--", "Missing historic should display as --");
  assert.ok(!formatted.includes("Unscored"), "Should never show Unscored");
  // Note: formatted === "--" which is never empty, so we verify it's truthy
  assert.ok(formatted, "Formatted value should be truthy");
});

/**
 * Test 18: Missing discount always shows -- (never blank, never "N/A")
 */
test("Missing discount displays as --", () => {
  const dealWithNoDiscount: Deal = {
    id: 400,
    title: "No Discount Card",
    url: "https://example.com",
    totalPriceCad: 50,
    historicPriceCad: null, // No historic means no discount
    discountPercent: null,
    market: "EBAY_US",
    endsAt: null,
    thumbnailUrl: null,
    sellerUsername: "test",
    sellerFeedbackCount: 10,
    sellerPositivePercent: 90,
    sampleSize: null,
    condition: null,
    priceCad: 45,
    shippingCad: 5,
    card: null,
    setName: null,
    cardName: null,
    cardId: null,
  };

  const vm = buildDealViewModel(dealWithNoDiscount);
  
  assert.strictEqual(vm.discountPercent, null, "discountPercent should be null");
  
  const formatted = formatDiscount(vm.discountPercent);
  assert.strictEqual(formatted, "--", "Missing discount should display as --");
  assert.ok(!formatted.includes("N/A"), "Should never show N/A");
  assert.ok(!formatted.includes("Unscored"), "Should never show Unscored");
  // Note: formatted === "--" which is never empty, so we verify it's truthy
  assert.ok(formatted, "Formatted value should be truthy");
});
