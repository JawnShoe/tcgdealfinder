/**
 * Test seller display system
 */

import { getSellerDisplayData, getSellerDisplayName } from "../lib/sellerDisplay";

console.log("=== SELLER DISPLAY SYSTEM TEST ===\n");

// Test 1: Username only
console.log("Test 1: Username only");
const user1 = getSellerDisplayData({
  username: "andre17",
  storeName: null,
  feedbackCount: 250,
  feedbackPercent: 99.2,
});
console.log(`  Display: "${user1.displayName}"`);
console.log(`  Has store: ${user1.hasStoreName}`);
console.log(`  Tooltip rows: ${user1.tooltip.rows.length}`);
console.table(user1.tooltip.rows);

// Test 2: Store name different from username
console.log("\nTest 2: Store name ≠ username");
const user2 = getSellerDisplayData({
  username: "andre17",
  storeName: "brazil shop",
  feedbackCount: 250,
  feedbackPercent: 99.2,
});
console.log(`  Display: "${user2.displayName}"`);
console.log(`  Has store: ${user2.hasStoreName}`);
console.log(`  Tooltip rows: ${user2.tooltip.rows.length}`);
console.table(user2.tooltip.rows);

// Test 3: Store name same as username
console.log("\nTest 3: Store name = username");
const user3 = getSellerDisplayData({
  username: "poke_canada",
  storeName: "poke_canada",
  feedbackCount: 500,
  feedbackPercent: 100,
});
console.log(`  Display: "${user3.displayName}"`);
console.log(`  Has store: ${user3.hasStoreName}`);
console.log(`  Tooltip rows: ${user3.tooltip.rows.length}`);
console.table(user3.tooltip.rows);

// Test 4: Quick helper
console.log("\nTest 4: Quick helper getSellerDisplayName()");
console.log(`  Username only: "${getSellerDisplayName({ username: "seller1" })}"`);
console.log(`  With store: "${getSellerDisplayName({ username: "seller1", storeName: "My Store" })}"`);

console.log("\n✅ All tests completed");
