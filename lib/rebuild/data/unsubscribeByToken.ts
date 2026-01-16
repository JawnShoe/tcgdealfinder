import { queryRebuild } from "../db";

/**
 * Unsubscribe a user from email alerts by their unsubscribe token.
 *
 * This is the rebuild-lane equivalent of the legacy unsubscribeByToken function.
 * It sets unsubscribed_at = NOW() on the matching email_subscriptions row,
 * but only if not already unsubscribed (idempotent).
 *
 * @param token - The UUID unsubscribe token from the email link
 * @returns true if the unsubscribe succeeded (token valid and not already unsubscribed),
 *          false if token is missing, invalid, or already unsubscribed
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!token) return false;

  const res = await queryRebuild<{ id: number }>(
    `
      UPDATE email_subscriptions
      SET unsubscribed_at = NOW()
      WHERE unsubscribe_token = $1 AND unsubscribed_at IS NULL
      RETURNING id;
    `,
    [token]
  );

  return res.rowCount > 0;
}
