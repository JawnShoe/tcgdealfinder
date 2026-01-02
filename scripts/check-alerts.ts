/**
 * check-alerts.ts — Alerts Sending Script (T2-7 Go-Live Gating)
 *
 * This script checks active watches against listings and optionally sends email alerts.
 * It implements multi-layer safety gates to prevent accidental production sends.
 *
 * USAGE:
 *   npx tsx scripts/check-alerts.ts              # Dry-run mode (default)
 *   npx tsx scripts/check-alerts.ts --dry-run    # Explicit dry-run
 *   npx tsx scripts/check-alerts.ts --send       # Actually send emails (requires all gates)
 *
 * REQUIRED ENV VARS (for --send mode):
 *   ALERTS_ENABLED=true              Feature flag
 *   SENDGRID_API_KEY=...             SendGrid API key
 *   SITE_BASE_URL=https://...        Base URL for email links (no localhost in prod)
 *   ALERTS_SENDING_ENABLED=true      Explicit send gate (required even with --send flag)
 *
 * SAFETY CONTROLS:
 *   - MAX_EMAILS_PER_RUN: Hard cap on emails sent per run (default 25)
 *   - Idempotency: Uses subscription last_emailed_at cooldown to prevent duplicates
 *   - PII hygiene: Emails redacted in logs (a***@domain.com)
 */

import { query } from "../lib/db";
import { queueAlertEmail } from "../lib/emailQueue";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../lib/pricing";
import {
  getActiveSubscriptionsForCard,
  markSubscriptionEmailed,
} from "../lib/emailSubscriptions";
import { isAlertsEnabled } from "../lib/featureFlags";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SELLER_MIN_FEEDBACK = 20;
const SELLER_MIN_POSITIVE_PERCENT = 98;
const COOLDOWN_HOURS = 6;

/** Maximum emails to send per run (hard cap for safety) */
const MAX_EMAILS_PER_RUN = parseInt(process.env.MAX_EMAILS_PER_RUN || "25", 10);

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

type RunMode = "dry-run" | "send";

function parseArgs(): RunMode {
  const args = process.argv.slice(2);
  if (args.includes("--send")) {
    return "send";
  }
  // Default to dry-run (safe default)
  return "dry-run";
}

// ============================================================================
// SEND GATE VALIDATION
// ============================================================================

type GateCheckResult = {
  ok: boolean;
  reason?: string;
};

function validateSendGates(mode: RunMode): GateCheckResult {
  // Gate 1: Feature flag
  if (!isAlertsEnabled()) {
    return { ok: false, reason: "ALERTS_ENABLED is not set to 'true'" };
  }

  // Gate 2: SendGrid API key
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!sendgridKey) {
    return { ok: false, reason: "SENDGRID_API_KEY is not configured" };
  }

  // Gate 3: Site base URL (must exist and not be localhost in production)
  const siteBaseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || process.env.SITE_BASE_URL;
  if (!siteBaseUrl) {
    return { ok: false, reason: "SITE_BASE_URL is not configured" };
  }

  // Check for localhost URLs (warning in dry-run, error in send mode)
  const isLocalhost =
    siteBaseUrl.includes("localhost") || siteBaseUrl.includes("127.0.0.1");
  if (isLocalhost && mode === "send") {
    const nodeEnv = process.env.NODE_ENV;
    // Allow localhost in development, block in production
    if (nodeEnv === "production") {
      return {
        ok: false,
        reason: `SITE_BASE_URL contains localhost (${siteBaseUrl}) which is invalid in production`,
      };
    }
    // In non-production, warn but allow
    console.warn(
      `[WARN] SITE_BASE_URL is localhost (${siteBaseUrl}) — allowed in non-production mode`
    );
  }

  // Gate 4: Explicit send gate (only required in send mode)
  if (mode === "send") {
    const sendingEnabled = process.env.ALERTS_SENDING_ENABLED;
    if (sendingEnabled !== "true") {
      return {
        ok: false,
        reason:
          "ALERTS_SENDING_ENABLED is not set to 'true' (explicit send gate required)",
      };
    }
  }

  return { ok: true };
}

// ============================================================================
// PII REDACTION
// ============================================================================

/**
 * Redact email for logging: "user@domain.com" -> "u***@domain.com"
 */
function redactEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***@***";
  const local = email.substring(0, atIndex);
  const domain = email.substring(atIndex);
  if (local.length <= 1) return "*" + domain;
  return local[0] + "***" + domain;
}

// ============================================================================
// DATABASE TYPES & QUERIES
// ============================================================================

type WatchRow = {
  id: number;
  card_id: number;
  condition: string | null;
  threshold_type: "price_below" | "discount_at_least";
  threshold_value: string | number;
  last_triggered_at: string | null;
};

type ListingRow = {
  listing_id: number;
  total_price_cad: string | null;
  historic_price_cad: string | null;
  discount_percent: string | null;
  seller_feedback_count: number | null;
  seller_positive_percent: number | null;
  title: string;
  url: string;
  market: string;
  seller_username: string | null;
};

type CardInfo = {
  id: number;
  name: string;
  set_name: string;
  card_number: string | null;
};

const cardInfoCache = new Map<number, CardInfo | null>();

async function fetchActiveWatches(): Promise<WatchRow[]> {
  const res = await query<WatchRow>(
    `
      SELECT id, card_id, condition, threshold_type, threshold_value, last_triggered_at
      FROM alerts_watchlist
      WHERE active = TRUE
      ORDER BY id ASC;
    `
  );
  return res.rows;
}

async function fetchBestListing(
  cardId: number,
  condition: string | null
): Promise<ListingRow | null> {
  // Normalize condition: null/undefined/empty -> null for consistent SQL handling
  const normalizedCondition =
    condition == null || condition === "" ? null : condition;

  const res = await query<ListingRow>(
    `
      SELECT
        l.id AS listing_id,
        l.total_price_cad,
        l.historic_price_cad,
        l.discount_percent,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.title,
        l.url,
        l.market,
        l.seller_username
      FROM listings l
      WHERE
        l.card_id = $1
        AND ($2::TEXT IS NULL OR l.condition_raw = $2::TEXT)
        AND l.total_price_cad IS NOT NULL
        AND l.historic_price_cad IS NOT NULL
        AND l.seller_username IS NOT NULL
        AND l.seller_feedback_count IS NOT NULL
        AND l.seller_feedback_count >= $3
        AND l.seller_positive_percent IS NOT NULL
        AND l.seller_positive_percent >= $4
        AND NOT EXISTS (
          SELECT 1 FROM seller_blacklist sb WHERE sb.seller_username = l.seller_username
        )
      ORDER BY l.total_price_cad ASC
      LIMIT 1;
    `,
    [
      cardId,
      normalizedCondition,
      SELLER_MIN_FEEDBACK,
      SELLER_MIN_POSITIVE_PERCENT,
    ]
  );

  return res.rows[0] ?? null;
}

async function fetchCardInfo(cardId: number): Promise<CardInfo | null> {
  if (cardInfoCache.has(cardId)) {
    return cardInfoCache.get(cardId) ?? null;
  }
  const res = await query<CardInfo>(
    `
      SELECT id, name, set_name, card_number
      FROM cards
      WHERE id = $1
      LIMIT 1;
    `,
    [cardId]
  );
  const info = res.rows[0] ?? null;
  cardInfoCache.set(cardId, info);
  return info;
}

async function insertAlert(
  watch: WatchRow,
  listing: ListingRow,
  totalPrice: number | null,
  historicPrice: number | null,
  discountPercent: number | null
) {
  await query(
    `
      INSERT INTO alerts_log (
        watch_id,
        card_id,
        condition,
        listing_id,
        total_price_cad,
        median_price_cad,
        discount_percent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `,
    [
      watch.id,
      watch.card_id,
      watch.condition,
      listing.listing_id,
      totalPrice,
      historicPrice,
      discountPercent,
    ]
  );
}

async function updateWatchChecked(watchId: number, fired: boolean) {
  if (fired) {
    await query(
      `
        UPDATE alerts_watchlist
        SET last_checked_at = NOW(), last_triggered_at = NOW()
        WHERE id = $1;
      `,
      [watchId]
    );
  } else {
    await query(
      `
        UPDATE alerts_watchlist
        SET last_checked_at = NOW()
        WHERE id = $1;
      `,
      [watchId]
    );
  }
}

function withinCooldown(lastTriggeredAt: string | null): boolean {
  if (!lastTriggeredAt) return false;
  const last = new Date(lastTriggeredAt).getTime();
  const elapsedHours = (Date.now() - last) / (1000 * 60 * 60);
  return elapsedHours < COOLDOWN_HOURS;
}

function formatCurrency(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `$${value.toFixed(2)}`;
}

function getSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.SITE_BASE_URL ||
    "http://localhost:3000"
  );
}

// ============================================================================
// EMAIL SENDING (with safety controls)
// ============================================================================

type EmailStats = {
  sent: number;
  skipped: number;
  capped: boolean;
};

/**
 * Idempotency is enforced via email_subscriptions.last_emailed_at:
 * - getActiveSubscriptionsForCard() already filters out subscriptions emailed within COOLDOWN_HOURS
 * - markSubscriptionEmailed() updates last_emailed_at after each send
 * - This prevents the same subscriber from receiving multiple emails within the cooldown window
 * - Different subscribers can each receive emails for the same listing (correct behavior)
 *
 * Schema: email_subscriptions.last_emailed_at (TIMESTAMPTZ, nullable)
 * Query filter: last_emailed_at IS NULL OR last_emailed_at < NOW() - INTERVAL '6 hours'
 */
async function notifyEmailSubscribers(args: {
  cardId: number;
  cardInfo: CardInfo | null;
  listing: ListingRow;
  totalPrice: number | null;
  historicPrice: number | null;
  discountPercent: number | null;
  mode: RunMode;
  emailsSentSoFar: number;
}): Promise<EmailStats> {
  const stats: EmailStats = { sent: 0, skipped: 0, capped: false };

  const discount = args.discountPercent;
  if (discount == null || !Number.isFinite(discount)) {
    return stats;
  }
  const absoluteDiscount = Math.abs(discount);
  if (!Number.isFinite(absoluteDiscount) || absoluteDiscount <= 0) {
    return stats;
  }

  // getActiveSubscriptionsForCard() enforces idempotency:
  // - Only returns subscriptions where last_emailed_at IS NULL or older than COOLDOWN_HOURS
  // - This means each subscriber gets at most one email per cooldown window
  const subscriptions = await getActiveSubscriptionsForCard(
    args.cardId,
    absoluteDiscount
  );
  if (subscriptions.length === 0) {
    return stats;
  }

  const card = args.cardInfo ??
    (await fetchCardInfo(args.cardId)) ?? {
      id: args.cardId,
      name: "This card",
      set_name: "Unknown set",
      card_number: null,
    };

  const siteUrl = getSiteBaseUrl();
  const listingLink = args.listing.url;
  const cardLink = `${siteUrl}/cards/${args.cardId}`;
  const discountText = `${absoluteDiscount.toFixed(1)}% off vs historic`;
  const subject = `[TCG Deal Finder] ${card.name} is ${discountText}`;

  for (const sub of subscriptions) {
    // Check rate limit
    const totalSent = args.emailsSentSoFar + stats.sent;
    if (totalSent >= MAX_EMAILS_PER_RUN) {
      console.log(
        `    [CAP] MAX_EMAILS_PER_RUN (${MAX_EMAILS_PER_RUN}) reached. Stopping.`
      );
      stats.capped = true;
      break;
    }

    const unsubscribeLink = `${siteUrl}/api/alerts/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken)}`;
    const text = `Good news! ${card.name} (${card.set_name}) is now ${discountText}.
Price: ${formatCurrency(args.totalPrice)}
Historic median: ${formatCurrency(args.historicPrice)}
Market: ${args.listing.market}

Listing: ${listingLink}
Card: ${cardLink}

Unsubscribe: ${unsubscribeLink}`;
    const html = `
      <p>Good news! <strong>${card.name}</strong> (${card.set_name}) is now <strong>${discountText}</strong>.</p>
      <ul>
        <li>Price: ${formatCurrency(args.totalPrice)}</li>
        <li>Historic median: ${formatCurrency(args.historicPrice)}</li>
        <li>Market: ${args.listing.market}</li>
      </ul>
      <p>
        <a href="${listingLink}" target="_blank">View listing</a> ·
        <a href="${cardLink}" target="_blank">Card page</a>
      </p>
      <p style="font-size:12px;color:#475569;">
        You received this email because you subscribed to alerts for this card.
        <a href="${unsubscribeLink}">Unsubscribe</a>.
      </p>
    `;

    const redactedEmail = redactEmail(sub.email);

    if (args.mode === "dry-run") {
      console.log(
        `    [DRY-RUN] Would send to ${redactedEmail} (sub #${sub.id})`
      );
      stats.sent++;
    } else {
      // Actually send
      await queueAlertEmail({
        to: sub.email,
        subject,
        text,
        html,
        unsubscribeUrl: unsubscribeLink,
      });

      // Mark subscription as emailed to enforce cooldown period
      // This is the idempotency mechanism: sets last_emailed_at = NOW()
      await markSubscriptionEmailed(sub.id);
      console.log(`    [SENT] Alert to ${redactedEmail} (sub #${sub.id})`);
      stats.sent++;
    }
  }

  return stats;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const mode = parseArgs();

  console.log("=".repeat(60));
  console.log(`TCG Deal Finder — Alerts Check`);
  console.log(`Mode: ${mode.toUpperCase()}`);
  console.log(`MAX_EMAILS_PER_RUN: ${MAX_EMAILS_PER_RUN}`);
  console.log("=".repeat(60));

  // Validate send gates
  const gateResult = validateSendGates(mode);
  if (!gateResult.ok) {
    console.log(`\n[BLOCKED] ${gateResult.reason}`);
    if (mode === "send") {
      console.log("\nTo enable sending, ensure all gates are satisfied:");
      console.log("  1. ALERTS_ENABLED=true");
      console.log("  2. SENDGRID_API_KEY=<your-key>");
      console.log("  3. SITE_BASE_URL=https://<your-domain>");
      console.log("  4. ALERTS_SENDING_ENABLED=true");
      process.exit(1);
    }
    // In dry-run mode, continue but note the missing gates
    console.log("(Continuing in dry-run mode — gates would block send mode)");
  } else {
    console.log("[GATES] All send gates satisfied");
  }

  console.log("");

  const watches = await fetchActiveWatches();
  if (watches.length === 0) {
    console.log("No active alerts_watchlist entries.");
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY: 0 watches, 0 alerts, 0 emails");
    console.log("=".repeat(60));
    return;
  }

  console.log(`Found ${watches.length} active watch(es)\n`);

  let totalAlerts = 0;
  let totalEmailsSent = 0;
  let totalEmailsSkipped = 0;
  let capReached = false;

  for (const watch of watches) {
    if (capReached) {
      console.log(`[CAP] Skipping remaining watches — email cap reached`);
      break;
    }

    const thresholdRaw = watch.threshold_value;
    const threshold =
      typeof thresholdRaw === "number" ? thresholdRaw : Number(thresholdRaw);
    if (!Number.isFinite(threshold)) {
      console.warn(
        `[WARN] Skipping watch #${watch.id} — invalid threshold_value:`,
        watch.threshold_value
      );
      continue;
    }

    console.log(
      `Checking watch #${watch.id} → card ${watch.card_id} (${watch.condition || "any"})`
    );

    const listing = await fetchBestListing(watch.card_id, watch.condition);
    if (!listing) {
      console.log("  No qualifying listings.");
      await updateWatchChecked(watch.id, false);
      continue;
    }

    const totalPrice =
      listing.total_price_cad != null ? Number(listing.total_price_cad) : null;
    const historicPrice =
      listing.historic_price_cad != null
        ? Number(listing.historic_price_cad)
        : null;
    let rawDiscount =
      listing.discount_percent != null
        ? Number(listing.discount_percent)
        : null;
    if (rawDiscount == null) {
      rawDiscount = computeDiscountPercent(totalPrice, historicPrice);
    }

    const sellerFeedback =
      listing.seller_feedback_count != null
        ? Number(listing.seller_feedback_count)
        : null;
    const sellerPositive =
      listing.seller_positive_percent != null
        ? Number(listing.seller_positive_percent)
        : null;

    const displayDiscount = getDisplayDiscountPercent({
      discount_percent: rawDiscount,
      seller_feedback_count: sellerFeedback,
      seller_positive_percent: sellerPositive,
    });

    let shouldFire = false;
    let reason = "";
    if (watch.threshold_type === "price_below") {
      if (totalPrice != null && totalPrice < threshold) {
        shouldFire = true;
        reason = `price ${totalPrice.toFixed(2)} < ${threshold.toFixed(2)}`;
      }
    } else if (watch.threshold_type === "discount_at_least") {
      const absThreshold = Math.abs(threshold);
      if (displayDiscount != null && displayDiscount <= -absThreshold) {
        shouldFire = true;
        reason = `discount ${Math.abs(displayDiscount).toFixed(
          1
        )}% off >= ${absThreshold.toFixed(1)}%`;
      }
    } else {
      console.warn(
        `  Unknown threshold_type "${watch.threshold_type}", skipping.`
      );
      await updateWatchChecked(watch.id, false);
      continue;
    }

    if (shouldFire && !withinCooldown(watch.last_triggered_at)) {
      const discountForSubscribers = displayDiscount ?? rawDiscount ?? null;

      await insertAlert(
        watch,
        listing,
        totalPrice,
        historicPrice,
        watch.threshold_type === "discount_at_least"
          ? displayDiscount
          : rawDiscount
      );
      await updateWatchChecked(watch.id, true);

      const emailStats = await notifyEmailSubscribers({
        cardId: watch.card_id,
        cardInfo: await fetchCardInfo(watch.card_id),
        listing,
        totalPrice,
        historicPrice,
        discountPercent: discountForSubscribers,
        mode,
        emailsSentSoFar: totalEmailsSent,
      });

      totalEmailsSent += emailStats.sent;
      totalEmailsSkipped += emailStats.skipped;
      if (emailStats.capped) {
        capReached = true;
      }

      totalAlerts++;
      console.log(
        `  [ALERT] Watch #${watch.id} fired → ${reason} → listing ${listing.listing_id}`
      );
    } else {
      console.log(
        shouldFire
          ? "  Condition met but still in cooldown window."
          : "  Condition not met."
      );
      await updateWatchChecked(watch.id, false);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Mode: ${mode.toUpperCase()}`);
  console.log(`Watches checked: ${watches.length}`);
  console.log(`Alerts triggered: ${totalAlerts}`);
  console.log(
    `Emails ${mode === "dry-run" ? "would send" : "sent"}: ${totalEmailsSent}`
  );
  if (totalEmailsSkipped > 0) {
    console.log(`Emails skipped (cooldown): ${totalEmailsSkipped}`);
  }
  if (capReached) {
    console.log(`[CAP] Email limit (${MAX_EMAILS_PER_RUN}) was reached`);
  }
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("check-alerts failed:", err);
  process.exit(1);
});
