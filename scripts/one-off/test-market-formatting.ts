import "dotenv/config";
import { formatMarket } from "../lib/dealFormatting";

console.log("=== TESTING formatMarket() WITH ALL 4 MARKETS ===\n");

const testCases = [
  "EBAY_US",
  "EBAY_CA",
  "EBAY_GB",
  "EBAY_AU",
  "US",
  "CA",
  "GB",
  "AU",
  "UK",
  "EBAY_UK",
  null,
  undefined,
  "INVALID_MARKET",
];

for (const market of testCases) {
  const result = formatMarket(market);
  console.log(
    `Market: ${String(market).padEnd(18)} => ${result.compactLabel.padEnd(4)} | ${result.code.padEnd(8)} | ${result.label}`
  );
}

console.log("\n=== VERIFICATION ===");
console.log("✅ All markets should show proper labels (US, CA, UK, AU)");
console.log("✅ No '??' should appear in compactLabel");
console.log("✅ Invalid/null markets should default to US");
