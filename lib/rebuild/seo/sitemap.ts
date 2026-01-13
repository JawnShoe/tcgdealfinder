import { queryRebuild } from "@/lib/rebuild/db";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { buildListingCanonicalUrl } from "./canonical";

type ListingIdRow = { listing_id: string };

export async function getListingSitemapEntries(
  limit = 50
): Promise<{ url: string; lastModified: Date }[]> {
  if (!isRebuildDbConfigured()) {
    return [];
  }

  const result = await queryRebuild<ListingIdRow>(
    `
      SELECT listing_id
      FROM listings
      WHERE listing_id IS NOT NULL
      ORDER BY updated_at DESC NULLS LAST
      LIMIT $1;
    `,
    [limit]
  );

  const now = new Date();
  return result.rows
    .map((row) => row.listing_id)
    .filter((listingId): listingId is string => Boolean(listingId))
    .map((listingId) => ({
      url: buildListingCanonicalUrl(listingId),
      lastModified: now,
    }));
}
