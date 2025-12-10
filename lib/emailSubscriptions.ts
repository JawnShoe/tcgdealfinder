import { randomUUID } from "crypto";

import { query } from "./db";
import { clampAlertThreshold } from "./alertsConfig";

export type EmailSubscription = {
  id: number;
  cardId: number;
  email: string;
  minDiscountPercent: number;
  createdAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
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
    unsubscribeToken: row.unsubscribe_token,
  };
}

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

  const existingRes = await query<DbRow>(
    `
      SELECT *
      FROM email_subscriptions
      WHERE card_id = $1 AND email = $2
      ORDER BY id DESC
      LIMIT 1;
    `,
    [params.cardId, emailNormalized],
  );

  const existing = existingRes.rows[0];

  if (existing && !existing.unsubscribed_at) {
    const updated = await query<DbRow>(
      `
        UPDATE email_subscriptions
        SET min_discount_percent = $1,
            confirmed_at = NOW()
        WHERE id = $2
        RETURNING *;
      `,
      [minDiscount, existing.id],
    );
    return mapRow(updated.rows[0]);
  }

  if (existing && existing.unsubscribed_at) {
    const token = randomUUID();
    const updated = await query<DbRow>(
      `
        UPDATE email_subscriptions
        SET min_discount_percent = $1,
            confirmed_at = NOW(),
            unsubscribed_at = NULL,
            unsubscribe_token = $2
        WHERE id = $3
        RETURNING *;
      `,
      [minDiscount, token, existing.id],
    );
    return mapRow(updated.rows[0]);
  }

  const token = randomUUID();
  const inserted = await query<DbRow>(
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
    [params.cardId, emailNormalized, minDiscount, token],
  );

  return mapRow(inserted.rows[0]);
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token) return false;

  const res = await query<{ id: number }>(
    `
      UPDATE email_subscriptions
      SET unsubscribed_at = NOW()
      WHERE unsubscribe_token = $1 AND unsubscribed_at IS NULL
      RETURNING id;
    `,
    [token],
  );

  return res.rowCount > 0;
}

export async function getActiveSubscriptionsForCard(
  cardId: number,
  minDiscountPercent: number,
): Promise<EmailSubscription[]> {
  const res = await query<DbRow>(
    `
      SELECT *
      FROM email_subscriptions
      WHERE card_id = $1
        AND unsubscribed_at IS NULL
        AND confirmed_at IS NOT NULL
        AND min_discount_percent <= $2;
    `,
    [cardId, clampAlertThreshold(minDiscountPercent)],
  );

  return res.rows.map(mapRow);
}
