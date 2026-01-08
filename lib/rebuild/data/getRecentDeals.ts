import { queryRebuild } from "../db";
import {
  DbListingRow,
  ListingDomain,
  mapDbRowToListingDomain,
} from "./listingMapper";
import { isRebuildDbConfigured } from "./dataAvailability";

const DEFAULT_LIMIT = 10;

export type RecentDealsResult = {
  deals: ListingDomain[];
  total: number;
  fetchedAtISO: string;
};

/**
 * Fetches recent deals from the rebuild data pipeline.
 * Returns listings ordered by updated_at descending, limited to `limit` results.
 * This is the rebuild-native equivalent of the legacy deals query.
 */
export async function getRecentDeals(
  limit: number = DEFAULT_LIMIT
): Promise<RecentDealsResult> {
  const now = new Date();
  if (!isRebuildDbConfigured()) {
    return { deals: [], total: 0, fetchedAtISO: now.toISOString() };
  }
  const safeLimit = Math.min(Math.max(1, limit), 50);

  const result = await queryRebuild<DbListingRow>(
    `
      SELECT
        l.listing_id,
        l.title,
        l.url,
        l.total_price_cad,
        l.total_usd,
        l.total_native,
        l.currency,
        l.price_native,
        l.discount_percent,
        l.condition_raw,
        l.shipping_known,
        l.seller,
        l.seller_username,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.source,
        l.market,
        (to_jsonb(l) ->> 'deal_confidence_weight') as deal_confidence_weight,
        l.integrity_status,
        l.integrity_reason,
        l.snapshot_at,
        l.ingested_at,
        l.updated_at,
        l.created_at
      FROM listings l
      WHERE l.total_price_cad IS NOT NULL
        AND l.discount_percent IS NOT NULL
      ORDER BY l.updated_at DESC NULLS LAST
      LIMIT $1;
    `,
    [safeLimit]
  );

  const deals = result.rows.map((row) => mapDbRowToListingDomain(row, now));

  return {
    deals,
    total: deals.length,
    fetchedAtISO: now.toISOString(),
  };
}
