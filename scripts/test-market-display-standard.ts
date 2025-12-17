/**
 * Verification test for market display standardization
 */

import { formatMarket } from "../lib/dealFormatting";

console.log("=== MARKET DISPLAY STANDARDIZATION TEST ===\n");

// Test all 4 supported markets
const markets = ["EBAY_US", "EBAY_CA", "EBAY_GB", "EBAY_AU"];

console.log("✅ Testing formatMarket() with all 4 markets:");
for (const market of markets) {
  const result = formatMarket(market);
  console.log(`  ${market} => flag + "${result.compactLabel}" (${result.label})`);
}

// Test various inputs
console.log("\n✅ Testing aliases and edge cases:");
const testCases = [
  { input: "UK", expected: "UK" },
  { input: "EBAY_UK", expected: "UK" },
  { input: "GB", expected: "UK" },
  { input: "AU", expected: "AU" },
  { input: null, expected: "US" },
  { input: undefined, expected: "US" },
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = formatMarket(test.input as any);
  const success = result.compactLabel === test.expected;
  if (success) {
    passed++;
    console.log(`  ✅ ${String(test.input).padEnd(15)} => "${result.compactLabel}" (expected "${test.expected}")`);
  } else {
    failed++;
    console.log(`  ❌ ${String(test.input).padEnd(15)} => "${result.compactLabel}" (expected "${test.expected}")`);
  }
}

console.log(`\n=== RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);

if (failed === 0) {
  console.log("\n✅ All tests passed! Market display is standardized.");
  process.exit(0);
} else {
  console.log("\n❌ Some tests failed. Review the output above.");
  process.exit(1);
}
