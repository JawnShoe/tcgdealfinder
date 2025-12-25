/**
 * E2E Test for Email Alerts
 *
 * This script performs a complete end-to-end test of the email alerts system:
 * 1. Finds a card with qualifying deals (same logic as check-alerts)
 * 2. Creates temporary alerts_watchlist + email_subscriptions rows
 * 3. Runs check-alerts to trigger email sending
 * 4. Cleans up test data
 *
 * Usage: npx tsx scripts/e2e-test-alerts.ts <test-email>
 * Example: npx tsx scripts/e2e-test-alerts.ts test@example.com
 *
 * Required env vars:
 * - DATABASE_URL: Postgres connection string
 * - SENDGRID_API_KEY: SendGrid API key (hard fail if missing)
 * - ALERTS_EMAIL_FROM: Verified sender address
 * - SITE_BASE_URL: Base URL for email links
 */

import { randomUUID } from "crypto";
import { query } from "../lib/db";

// Marker to identify test data for cleanup
const E2E_TEST_MARKER = "__E2E_TEST__";

// Same thresholds as check-alerts.ts
const SELLER_MIN_FEEDBACK = 20;
const SELLER_MIN_POSITIVE_PERCENT = 98;

type QualifyingDeal = {
  card_id: number;
  card_name: string;
  set_name: string;
  condition_raw: string;
  total_price_cad: number;
  historic_price_cad: number;
  discount_percent: number;
};

async function findQualifyingDeal(): Promise<QualifyingDeal | null> {
  // Find a card+condition combo that will trigger an alert
  // Uses same qualifying logic as check-alerts fetchBestListing()
  const res = await query<{
    card_id: number;
    card_name: string;
    set_name: string;
    condition_raw: string;
    total_price_cad: string;
    historic_price_cad: string;
    discount_percent: string;
  }>(
    `
    SELECT
      l.card_id,
      c.name as card_name,
      c.set_name,
      l.condition_raw,
      l.total_price_cad,
      l.historic_price_cad,
      ROUND(((l.historic_price_cad - l.total_price_cad) / l.historic_price_cad * 100)::numeric, 1) as discount_percent
    FROM listings l
    JOIN cards c ON c.id = l.card_id
    WHERE
      l.total_price_cad IS NOT NULL
      AND l.historic_price_cad IS NOT NULL
      AND l.seller_username IS NOT NULL
      AND l.seller_feedback_count IS NOT NULL
      AND l.seller_feedback_count >= $1
      AND l.seller_positive_percent IS NOT NULL
      AND l.seller_positive_percent >= $2
      AND l.condition_raw IS NOT NULL
      AND l.condition_raw != ''
      AND NOT EXISTS (
        SELECT 1 FROM seller_blacklist sb WHERE sb.seller_username = l.seller_username
      )
      AND ((l.historic_price_cad - l.total_price_cad) / l.historic_price_cad * 100) >= 10
    ORDER BY ((l.historic_price_cad - l.total_price_cad) / l.historic_price_cad) DESC
    LIMIT 1;
    `,
    [SELLER_MIN_FEEDBACK, SELLER_MIN_POSITIVE_PERCENT]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    card_id: row.card_id,
    card_name: row.card_name,
    set_name: row.set_name,
    condition_raw: row.condition_raw,
    total_price_cad: parseFloat(row.total_price_cad),
    historic_price_cad: parseFloat(row.historic_price_cad),
    discount_percent: parseFloat(row.discount_percent),
  };
}

async function createTestWatch(
  cardId: number,
  condition: string
): Promise<number> {
  // Insert test watch with marker in note field for cleanup
  // Use threshold_value = 0 to guarantee trigger (any discount >= 0%)
  const res = await query<{ id: number }>(
    `
    INSERT INTO alerts_watchlist (
      card_id,
      condition,
      threshold_type,
      threshold_value,
      active,
      note
    )
    VALUES ($1, $2, 'discount_at_least', 0, TRUE, $3)
    RETURNING id;
    `,
    [cardId, condition, E2E_TEST_MARKER]
  );
  return res.rows[0].id;
}

async function createTestSubscription(
  cardId: number,
  email: string
): Promise<{ id: number; wasCreated: boolean }> {
  // Use INSERT ... ON CONFLICT DO UPDATE to handle unique constraint
  // min_discount_percent = 0 to guarantee trigger (any discount >= 0%)
  const res = await query<{ id: number; was_created: boolean }>(
    `
    INSERT INTO email_subscriptions (
      card_id,
      email,
      min_discount_percent,
      unsubscribe_token,
      confirmed_at
    )
    VALUES ($1, $2, 0, $3, NOW())
    ON CONFLICT (card_id, email) WHERE unsubscribed_at IS NULL
    DO UPDATE SET
      min_discount_percent = 0,
      confirmed_at = NOW(),
      last_emailed_at = NULL
    RETURNING id, (xmax = 0) as was_created;
    `,
    [cardId, email.toLowerCase(), randomUUID()]
  );
  return {
    id: res.rows[0].id,
    wasCreated: res.rows[0].was_created,
  };
}

async function cleanupTestData(
  watchId: number,
  subscriptionId: number,
  subscriptionWasCreated: boolean
): Promise<void> {
  // Delete the test watch (alerts_log entries cascade)
  await query(`DELETE FROM alerts_watchlist WHERE id = $1;`, [watchId]);

  // Also clean up any orphaned test watches from previous runs
  await query(`DELETE FROM alerts_watchlist WHERE note = $1;`, [
    E2E_TEST_MARKER,
  ]);

  // If we created a fresh subscription, mark it as unsubscribed
  // If we updated an existing one, leave it alone (user may want to keep it)
  if (subscriptionWasCreated) {
    await query(
      `UPDATE email_subscriptions SET unsubscribed_at = NOW() WHERE id = $1;`,
      [subscriptionId]
    );
  }
}

async function runCheckAlerts(): Promise<boolean> {
  // Import and run the main check-alerts logic
  // We use dynamic import to avoid circular dependencies
  const { spawn } = await import("child_process");

  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", "scripts/check-alerts.ts"], {
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}

async function main() {
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error("Usage: npx tsx scripts/e2e-test-alerts.ts <test-email>");
    console.error(
      "Example: npx tsx scripts/e2e-test-alerts.ts test@example.com"
    );
    process.exit(1);
  }

  // Hard fail if required env vars are missing
  if (!process.env.SENDGRID_API_KEY) {
    console.error("ERROR: SENDGRID_API_KEY is not set.");
    console.error(
      "This test requires a valid SendGrid API key to send test emails."
    );
    process.exit(1);
  }

  if (!process.env.ALERTS_EMAIL_FROM) {
    console.error("ERROR: ALERTS_EMAIL_FROM is not set.");
    console.error("This test requires a verified sender address.");
    process.exit(1);
  }

  if (!process.env.SITE_BASE_URL) {
    console.error("ERROR: SITE_BASE_URL is not set.");
    console.error("This test requires a base URL for email links.");
    process.exit(1);
  }

  console.log("=== E2E Alert Test ===");
  console.log(`Test email: ${testEmail}`);
  console.log("");

  // Step 1: Find a qualifying deal
  console.log("Step 1: Finding qualifying deal...");
  const deal = await findQualifyingDeal();

  if (!deal) {
    console.error("ERROR: No qualifying deals found in database.");
    console.error("Cannot run E2E test without active deals.");
    process.exit(1);
  }

  console.log(`  Found: ${deal.card_name} (${deal.set_name})`);
  console.log(`  card_id=${deal.card_id}, condition=${deal.condition_raw}`);
  console.log(
    `  Price: $${deal.total_price_cad.toFixed(2)} (was $${deal.historic_price_cad.toFixed(2)}, ${deal.discount_percent}% off)`
  );
  console.log("");

  // Step 2: Create test watch
  console.log("Step 2: Creating test alerts_watchlist entry...");
  const watchId = await createTestWatch(deal.card_id, deal.condition_raw);
  console.log(`  Created watch #${watchId}`);
  console.log("");

  // Step 3: Create/update test subscription
  console.log("Step 3: Creating test email subscription...");
  const subscription = await createTestSubscription(deal.card_id, testEmail);
  console.log(
    `  Subscription #${subscription.id} ${subscription.wasCreated ? "(created)" : "(updated existing)"}`
  );
  console.log("");

  // Step 4: Run check-alerts
  console.log("Step 4: Running check-alerts...");
  console.log("---");
  const success = await runCheckAlerts();
  console.log("---");
  console.log("");

  // Step 5: Cleanup
  console.log("Step 5: Cleaning up test data...");
  await cleanupTestData(watchId, subscription.id, subscription.wasCreated);
  console.log(`  Deleted watch #${watchId}`);
  if (subscription.wasCreated) {
    console.log(`  Marked subscription #${subscription.id} as unsubscribed`);
  }
  console.log("");

  // Summary
  console.log("=== Summary ===");
  console.log(
    `EMAIL_ATTEMPTED=${success}, card_id=${deal.card_id}, condition=${deal.condition_raw}`
  );

  if (success) {
    console.log("");
    console.log(`Check inbox for: ${testEmail}`);
    console.log(
      "If no email received, check SendGrid activity logs for delivery status."
    );
  }

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
