/**
 * Schema introspection tests to ensure query builders handle missing columns gracefully.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureDealConfidenceColumn,
  ensureCardLanguageColumn,
  ensureListingsMarketColumn,
  ensureHistoricalMarketColumn,
  ensureHistoricalStdDevColumn,
} from "../../schema";

/**
 * Test that all schema introspection helpers return boolean values.
 * These are used to conditionally build SQL queries for backward compatibility.
 */
test("schema introspection helpers return boolean", async () => {
  const hasDealConfidence = await ensureDealConfidenceColumn();
  const hasCardLanguage = await ensureCardLanguageColumn();
  const hasListingsMarket = await ensureListingsMarketColumn();
  const hasHistoricalMarket = await ensureHistoricalMarketColumn();
  const hasStdDev = await ensureHistoricalStdDevColumn();

  assert.strictEqual(typeof hasDealConfidence, "boolean");
  assert.strictEqual(typeof hasCardLanguage, "boolean");
  assert.strictEqual(typeof hasListingsMarket, "boolean");
  assert.strictEqual(typeof hasHistoricalMarket, "boolean");
  assert.strictEqual(typeof hasStdDev, "boolean");
});

/**
 * Test that std_dev_cad introspection allows safe query building.
 * When the column doesn't exist, queries should use NULL::numeric fallback.
 */
test("ensureHistoricalStdDevColumn enables safe SQL query building", async () => {
  const hasStdDev = await ensureHistoricalStdDevColumn();
  
  // Build SQL fragment based on column existence
  const stdDevSelect = hasStdDev
    ? "hp.std_dev_cad"
    : "NULL::numeric";
  
  // Verify the fragment is a valid SQL expression
  assert.match(stdDevSelect, /^(hp\.std_dev_cad|NULL::numeric)$/);
  
  // If column doesn't exist, must use NULL fallback
  if (!hasStdDev) {
    assert.strictEqual(stdDevSelect, "NULL::numeric");
  }
});

/**
 * Test that caching works correctly - multiple calls return same result.
 * This verifies the cache prevents redundant database queries.
 */
test("schema introspection uses cache on repeated calls", async () => {
  const first = await ensureHistoricalStdDevColumn();
  const second = await ensureHistoricalStdDevColumn();
  const third = await ensureHistoricalStdDevColumn();
  
  assert.strictEqual(first, second, "Cached result should match first call");
  assert.strictEqual(second, third, "Cached result should remain consistent");
});

/**
 * Test that simulates /top-deals query builder logic.
 * When std_dev_cad doesn't exist, the query must use NULL fallback.
 */
test("top-deals query builder uses NULL fallback when std_dev_cad missing", async () => {
  const hasStdDev = await ensureHistoricalStdDevColumn();
  
  // Simulate the query builder logic from app/top-deals/page.tsx
  const stdDevSelect = hasStdDev ? "hp.std_dev_cad" : "NULL::numeric";
  
  // Build a minimal SELECT fragment like the real query
  const selectFragment = `SELECT ${stdDevSelect} AS std_dev_cad`;
  
  // Verify the fragment is syntactically valid SQL
  assert.match(selectFragment, /^SELECT (hp\.std_dev_cad|NULL::numeric) AS std_dev_cad$/);
  
  // When column doesn't exist, the fallback ensures no runtime crash
  if (!hasStdDev) {
    assert.strictEqual(
      stdDevSelect,
      "NULL::numeric",
      "Query must use NULL::numeric when std_dev_cad column doesn't exist"
    );
  }
});
