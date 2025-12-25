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

  // Also verify the unique index required for ON CONFLICT upsert exists
  // This is a product invariant needed by e2e-test-alerts.ts
  const uniqueIdxRes = await query<{ indexname: string }>(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'email_subscriptions'
      AND indexname = 'email_subscriptions_active_idx';
  `);

  if (uniqueIdxRes.rows.length === 0) {
    console.error(
      "❌ ERROR: email_subscriptions_active_idx unique index not found"
    );
    console.error(
      "   This index is required for ON CONFLICT upsert in E2E tests"
    );
    process.exit(1);
  }

  console.log(
    "✅ Verified: email_subscriptions_active_idx unique index exists"
  );
}

verify().then(() => process.exit(0));
