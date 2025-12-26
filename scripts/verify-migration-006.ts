/**
 * Verify migration 006 was applied successfully.
 * Checks that listings_card_id_idx index exists on listings table.
 *
 * Usage: npx tsx scripts/verify-migration-006.ts
 * Exit code: 0 = success, 1 = failure
 */

import { query } from "../lib/db";

async function verify(): Promise<void> {
  console.log("Verifying migration 006...\n");

  // Check index exists using to_regclass (audit-specified method)
  const regclassRes = await query<{ exists: boolean }>(`
    SELECT to_regclass('public.listings_card_id_idx') IS NOT NULL AS exists;
  `);

  const indexExists = regclassRes.rows[0]?.exists ?? false;

  if (!indexExists) {
    console.error("❌ ERROR: listings_card_id_idx index not found");
    console.error(
      "   Run: npx tsx scripts/run-migration.ts migrations/006_add_listings_card_id_idx.sql"
    );
    process.exit(1);
  }

  console.log("✅ Verified: listings_card_id_idx index exists");
  console.log(
    "   to_regclass('public.listings_card_id_idx') IS NOT NULL = true\n"
  );

  // Also verify via pg_indexes for additional confirmation
  const pgIndexRes = await query<{ indexname: string; indexdef: string }>(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'listings'
      AND indexname = 'listings_card_id_idx';
  `);

  if (pgIndexRes.rows.length === 0) {
    console.error("❌ ERROR: listings_card_id_idx not found in pg_indexes");
    process.exit(1);
  }

  const indexDef = pgIndexRes.rows[0].indexdef;
  console.log("✅ Index definition confirmed:");
  console.log(`   ${indexDef}\n`);

  // Show EXPLAIN for a sample card_id query (if data exists)
  const cardCountRes = await query<{ count: string }>(`
    SELECT COUNT(DISTINCT card_id) as count FROM listings WHERE card_id IS NOT NULL LIMIT 1;
  `);

  const cardCount = parseInt(cardCountRes.rows[0]?.count ?? "0", 10);

  if (cardCount > 0) {
    // Get a sample card_id
    const sampleRes = await query<{ card_id: number }>(`
      SELECT card_id FROM listings WHERE card_id IS NOT NULL LIMIT 1;
    `);

    const sampleCardId = sampleRes.rows[0]?.card_id;

    if (sampleCardId) {
      console.log(
        `📊 EXPLAIN (ANALYZE, BUFFERS) for card_id = ${sampleCardId}:\n`
      );

      const explainRes = await query<{ "QUERY PLAN": string }>(`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM listings WHERE card_id = ${sampleCardId};
      `);

      for (const row of explainRes.rows) {
        console.log(`   ${row["QUERY PLAN"]}`);
      }

      // Check if index is being used
      const planText = explainRes.rows.map((r) => r["QUERY PLAN"]).join(" ");
      if (
        planText.includes("listings_card_id_idx") ||
        planText.includes("Index Scan") ||
        planText.includes("Index Only Scan")
      ) {
        console.log("\n✅ Query plan uses index scan (good)");
      } else if (planText.includes("Seq Scan")) {
        console.log(
          "\n⚠️  Query plan shows Seq Scan (may be expected for small tables or low selectivity)"
        );
      }
    }
  } else {
    console.log("ℹ️  No listings with card_id found - skipping EXPLAIN demo");
  }

  console.log("\n✅ Migration 006 verification complete");
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
