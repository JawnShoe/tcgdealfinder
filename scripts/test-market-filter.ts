#!/usr/bin/env tsx
/**
 * Test script to verify market filter behavior
 */

import { normalizeMarketCode } from "../lib/markets";
import { DEFAULT_MARKET_FILTER } from "../lib/filters";

console.log("=== MARKET FILTER TEST ===\n");

console.log("1. normalizeMarketCode behavior:");
console.log(`   normalizeMarketCode("all") = "${normalizeMarketCode("all")}"`);
console.log(`   normalizeMarketCode("EBAY_US") = "${normalizeMarketCode("EBAY_US")}"`);
console.log(`   normalizeMarketCode("us") = "${normalizeMarketCode("us")}"`);
console.log(`   normalizeMarketCode(null) = "${normalizeMarketCode(null)}"`);
console.log(`   normalizeMarketCode("invalid") = "${normalizeMarketCode("invalid")}"`);

console.log("\n2. Default values:");
console.log(`   DEFAULT_MARKET_FILTER = "${DEFAULT_MARKET_FILTER}"`);

console.log("\n3. Expected behavior:");
console.log("   ✓ normalizeMarketCode('all') should return 'all' (not 'EBAY_US')");
console.log("   ✓ DEFAULT_MARKET_FILTER should be 'all'");
console.log("   ✓ Server should accept 'all' without converting it");
console.log("   ✓ Query should skip market filter when market='all'");

console.log("\n=== RESULT ===");
const allNormalized = normalizeMarketCode("all");
const defaultFilter = DEFAULT_MARKET_FILTER;

if (allNormalized === "all" && defaultFilter === "all") {
  console.log("✅ PASS: Market filter configuration is correct");
} else {
  console.log("❌ FAIL: Market filter configuration has issues");
  if (allNormalized !== "all") {
    console.log(`   - normalizeMarketCode("all") returned "${allNormalized}" instead of "all"`);
  }
  if (defaultFilter !== "all") {
    console.log(`   - DEFAULT_MARKET_FILTER is "${defaultFilter}" instead of "all"`);
  }
}
