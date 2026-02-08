#!/usr/bin/env tsx
/**
 * Integration test for market filter fix
 * Simulates the client/server interaction
 */

import "dotenv/config";
import { normalizeMarketCode } from "../lib/markets";
import { DEFAULT_MARKET_FILTER } from "../lib/filters";
import { runDealsQuery } from "../app/api/deals/dealsQuery";

async function testMarketFilter() {
  console.log("=== MARKET FILTER INTEGRATION TEST ===\n");

  // Simulate homepage load
  console.log("1. Homepage server-side render:");
  console.log(`   Market parameter: "${DEFAULT_MARKET_FILTER}"`);

  const initialResult = await runDealsQuery({
    sort: "best",
    page: 1,
    pageSize: 10,
    market: DEFAULT_MARKET_FILTER,
  });

  console.log(`   Response market: "${initialResult.market}"`);
  console.log(`   Items returned: ${initialResult.items.length}`);
  console.log(`   Total items: ${initialResult.totalItems}`);

  // Simulate client-side initialization
  console.log("\n2. Client component hydration:");
  const clientState = DEFAULT_MARKET_FILTER;
  const serverMeta = initialResult.market;
  console.log(`   Client state: "${clientState}"`);
  console.log(`   Server meta: "${serverMeta}"`);

  if (clientState === serverMeta) {
    console.log("   ✅ No mismatch - useEffect will NOT fire");
  } else {
    console.log(`   ❌ Mismatch detected - would trigger infinite loop!`);
    console.log(`      useEffect would fetch with market="${clientState}"`);
  }

  // Test API endpoint behavior
  console.log("\n3. API endpoint normalization:");
  const testCases = ["all", "EBAY_US", "us", null, "invalid"];
  for (const input of testCases) {
    const normalized = normalizeMarketCode(input);
    console.log(
      `   normalizeMarketCode(${JSON.stringify(input)}) → "${normalized}"`
    );
  }

  // Test query with different markets
  console.log("\n4. Database query behavior:");
  for (const market of ["all", "EBAY_US", "EBAY_CA"] as const) {
    const result = await runDealsQuery({
      sort: "best",
      page: 1,
      pageSize: 5,
      market,
    });
    console.log(
      `   market="${market}" → ${result.items.length} items (total: ${result.totalItems})`
    );
  }

  console.log("\n=== RESULT ===");
  if (clientState === serverMeta) {
    console.log("✅ PASS: No client/server mismatch - loop prevented");
  } else {
    console.log("❌ FAIL: Client/server mismatch will cause infinite loop");
  }
}

testMarketFilter()
  .then(() => {
    console.log("\n✅ Integration test complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Integration test failed:", err);
    process.exit(1);
  });
