/**
 * Verify migration 005 was applied successfully.
 * Checks that last_emailed_at column exists in email_subscriptions table.
 *
 * Usage: npx tsx scripts/verify-migration-005.ts
 * Exit code: 0 = success, 1 = failure
 */

import { query } from "../lib/db";

async function verify(): Promise<void> {
  console.log("Verifying migration 005...");

  const res = await query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'email_subscriptions'
      AND column_name = 'last_emailed_at';
  `);

  if (res.rows.length === 0) {
    console.error("❌ ERROR: last_emailed_at column not found");
    process.exit(1);
  }

  console.log(
    "✅ Verified: last_emailed_at column exists in email_subscriptions"
  );

  // Also check index exists
  const indexRes = await query<{ indexname: string }>(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'email_subscriptions'
      AND indexname = 'email_subscriptions_last_emailed_idx';
  `);

  if (indexRes.rows.length === 0) {
    console.error(
      "❌ ERROR: email_subscriptions_last_emailed_idx index not found"
    );
    process.exit(1);
  }

  console.log("✅ Verified: email_subscriptions_last_emailed_idx index exists");
}

verify().then(() => process.exit(0));
