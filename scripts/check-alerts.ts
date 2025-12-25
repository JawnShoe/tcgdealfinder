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

const SELLER_MIN_FEEDBACK = 20;
const SELLER_MIN_POSITIVE_PERCENT = 98;
const COOLDOWN_HOURS = 6;

const ALERT_EMAIL_ENABLED = Boolean(process.env.SENDGRID_API_KEY);

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

async function notifyEmailSubscribers(args: {
  cardId: number;
  cardInfo: CardInfo | null;
  listing: ListingRow;
  totalPrice: number | null;
  historicPrice: number | null;
  discountPercent: number | null;
}) {
  if (!ALERT_EMAIL_ENABLED) {
    return;
  }

  const discount = args.discountPercent;
  if (discount == null || !Number.isFinite(discount)) {
    return;
  }
  const absoluteDiscount = Math.abs(discount);
  if (!Number.isFinite(absoluteDiscount) || absoluteDiscount <= 0) {
    return;
  }

  const subscriptions = await getActiveSubscriptionsForCard(
    args.cardId,
    absoluteDiscount
  );
  if (subscriptions.length === 0) {
    return;
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
        <a href="${listingLink}" target="_blank">View listing</a> �
        <a href="${cardLink}" target="_blank">Card page</a>
      </p>
      <p style="font-size:12px;color:#475569;">
        You received this email because you subscribed to alerts for this card.
        <a href="${unsubscribeLink}">Unsubscribe</a>.
      </p>
    `;

    await queueAlertEmail({
      to: sub.email,
      subject,
      text,
      html,
      unsubscribeUrl: unsubscribeLink,
    });

    // Mark subscription as emailed to enforce cooldown period
    await markSubscriptionEmailed(sub.id);
    console.log(`    [EMAIL] Sent alert to ${sub.email} (sub #${sub.id})`);
  }
}

async function main() {
  const watches = await fetchActiveWatches();
  if (watches.length === 0) {
    console.log("No active alerts_watchlist entries.");
    return;
  }

  for (const watch of watches) {
    const thresholdRaw = watch.threshold_value;
    const threshold =
      typeof thresholdRaw === "number" ? thresholdRaw : Number(thresholdRaw);
    if (!Number.isFinite(threshold)) {
      console.warn(
        `[ALERTS] Skipping watch #${watch.id} due to invalid threshold_value:`,
        watch.threshold_value
      );
      continue;
    }

    console.log(
      `Checking watch #${watch.id} -> card ${watch.card_id} (${watch.condition || "any"})`
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
      await notifyEmailSubscribers({
        cardId: watch.card_id,
        cardInfo: await fetchCardInfo(watch.card_id),
        listing,
        totalPrice,
        historicPrice,
        discountPercent: discountForSubscribers,
      });
      console.log(
        `  [ALERT] Watch #${watch.id} fired -> ${reason} -> listing ${listing.listing_id}`
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
}

main().catch((err) => {
  console.error("check-alerts failed:", err);
  process.exit(1);
});
