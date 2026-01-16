import { queryRebuild } from "../db";
import { isRebuildDbConfigured } from "./dataAvailability";

type ListingRow = {
  listing_id: string;
};

/**
 * Resolves a legacy cardId to a rebuild listing_id.
 *
 * Deterministic selection rule: when multiple listings exist for the same cardId,
 * we select the listing with the lowest listing_id (lexicographic order) for stability.
 * This ensures consistent redirects regardless of when or how many listings exist.
 *
 * @param cardId - The legacy card ID (integer)
 * @returns The listing_id string if found, null otherwise
 */
export async function resolveListingIdByCardId(
  cardId: number
): Promise<string | null> {
  if (!isRebuildDbConfigured()) {
    return null;
  }

  if (!Number.isFinite(cardId) || cardId <= 0) {
    return null;
  }

  const result = await queryRebuild<ListingRow>(
    `
      SELECT listing_id
      FROM listings
      WHERE card_id = $1
      ORDER BY listing_id ASC
      LIMIT 1
    `,
    [cardId]
  );

  const row = result.rows[0];
  return row?.listing_id ?? null;
}
