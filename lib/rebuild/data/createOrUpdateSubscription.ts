import { randomUUID } from "crypto";

import { queryRebuild } from "../db";

/**
 * Alerts configuration constants
 * Rebuild-lane copy of legacy alertsConfig thresholds
 */
export const MIN_ALERT_THRESHOLD = 5;
export const MAX_ALERT_THRESHOLD = 80;

/**
 * Clamp alert threshold to valid range
 */
export function clampAlertThreshold(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_ALERT_THRESHOLD;
  }
  return Math.min(
    MAX_ALERT_THRESHOLD,
    Math.max(MIN_ALERT_THRESHOLD, Math.abs(value))
  );
}

export type EmailSubscription = {
  id: number;
  cardId: number;
  email: string;
  minDiscountPercent: number;
  createdAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  lastEmailedAt: Date | null;
  unsubscribeToken: string;
};

type DbRow = {
  id: number;
  card_id: number;
  email: string;
  min_discount_percent: string | number;
  unsubscribe_token: string;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  last_emailed_at: string | null;
};

function mapRow(row: DbRow): EmailSubscription {
  return {
    id: row.id,
    cardId: row.card_id,
    email: row.email,
    minDiscountPercent: Number(row.min_discount_percent),
    createdAt: new Date(row.created_at),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : null,
    unsubscribedAt: row.unsubscribed_at ? new Date(row.unsubscribed_at) : null,
    lastEmailedAt: row.last_emailed_at ? new Date(row.last_emailed_at) : null,
    unsubscribeToken: row.unsubscribe_token,
  };
}

/**
 * Create or update a subscription to email alerts for a card.
 *
 * This is the rebuild-lane equivalent of the legacy createOrUpdateSubscription function.
 * Behavior:
 * - If no subscription exists: create new one with confirmed_at = NOW()
 * - If active subscription exists: update min_discount_percent
 * - If unsubscribed subscription exists: reactivate with new threshold and token
 *
 * @param params - cardId, email, minDiscountPercent
 * @returns The created or updated EmailSubscription
 * @throws Error if email is empty or DB unavailable
 */
export async function createOrUpdateSubscription(params: {
  cardId: number;
  email: string;
  minDiscountPercent: number;
}): Promise<EmailSubscription> {
  const emailNormalized = params.email.trim().toLowerCase();
  if (!emailNormalized) {
    throw new Error("Email is required");
  }

  const minDiscount = clampAlertThreshold(params.minDiscountPercent);

  const existingRes = await queryRebuild<DbRow>(
    `
      SELECT *
      FROM email_subscriptions
      WHERE card_id = $1 AND email = $2
      ORDER BY id DESC
      LIMIT 1;
    `,
    [params.cardId, emailNormalized]
  );

  const existing = existingRes.rows[0];

  if (existing && !existing.unsubscribed_at) {
    const updated = await queryRebuild<DbRow>(
      `
        UPDATE email_subscriptions
        SET min_discount_percent = $1,
            confirmed_at = NOW()
        WHERE id = $2
        RETURNING *;
      `,
      [minDiscount, existing.id]
    );
    return mapRow(updated.rows[0]);
  }

  if (existing && existing.unsubscribed_at) {
    const token = randomUUID();
    const updated = await queryRebuild<DbRow>(
      `
        UPDATE email_subscriptions
        SET min_discount_percent = $1,
            confirmed_at = NOW(),
            unsubscribed_at = NULL,
            unsubscribe_token = $2
        WHERE id = $3
        RETURNING *;
      `,
      [minDiscount, token, existing.id]
    );
    return mapRow(updated.rows[0]);
  }

  const token = randomUUID();
  const inserted = await queryRebuild<DbRow>(
    `
      INSERT INTO email_subscriptions (
        card_id,
        email,
        min_discount_percent,
        unsubscribe_token,
        confirmed_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `,
    [params.cardId, emailNormalized, minDiscount, token]
  );

  return mapRow(inserted.rows[0]);
}
