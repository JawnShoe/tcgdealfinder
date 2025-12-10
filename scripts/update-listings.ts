import { query } from "../lib/db";
import {
  fetchEbayListings,
  NormalizedListing,
  isValidListingTitle,
  normalizeCondition,
} from "../lib/ebay";
import { computeDiscountPercent } from "../lib/pricing";

type SearchConfigRow = {
  card_id: number;
  name: string;
  set_name: string;
  card_number: string;
  condition_bucket: string;
  search_query: string;
  market: string;
};

const AUTO_BLACKLIST_MIN_TOTAL = 20;
const AUTO_BLACKLIST_MIN_RATIO = 0.7;

async function getBlacklistedSellers(): Promise<Set<string>> {
  const res = await query<{ seller_username: string }>(
    `
      SELECT seller_username
      FROM seller_blacklist;
    `,
  );
  const set = new Set<string>();
  for (const row of res.rows) {
    if (row.seller_username) {
      set.add(row.seller_username.toLowerCase());
    }
  }
  return set;
}

async function logRejectedListing(
  listing: NormalizedListing,
  reason: string,
): Promise<void> {
  const sellerUsername =
    listing.sellerUsername ?? listing.seller?.toLowerCase() ?? null;

  await query(
    `
      INSERT INTO rejected_listings (
        ebay_item_id,
        seller_username,
        title,
        reason
      )
      VALUES ($1, $2, $3, $4);
    `,
    [
      listing.listingId ?? null,
      sellerUsername,
      listing.title,
      reason,
    ],
  );
}

async function upsertListing(
  cardId: number,
  market: string,
  conditionBucket: string,
  listing: NormalizedListing,
  sellerUsername: string | null,
  historicPriceCad: number | null,
) {
  const priceCad =
    listing.priceCad ??
    (listing as any).price ??
    null;
  const shippingCad =
    listing.shippingCad ??
    (listing as any).shipping ??
    null;
  let totalPriceCad =
    listing.totalPriceCad ??
    (listing as any).total ??
    null;
  const thumbnailUrl = listing.imageUrl ?? null;

  if (totalPriceCad == null && priceCad != null && shippingCad != null) {
    totalPriceCad = priceCad + shippingCad;
  }

  const normalizedCondition =
    normalizeCondition(listing.conditionRaw) ??
    normalizeCondition(conditionBucket) ??
    conditionBucket;

  const normalizedDiscount = computeDiscountPercent(
    totalPriceCad,
    historicPriceCad,
  );
  const sellerFeedbackCount =
    listing.sellerFeedbackCount ?? null;
  const sellerPositivePercent =
    listing.sellerPositivePercent ?? null;

  await query(
    `
    INSERT INTO listings (
      card_id,
      source,
      listing_id,
      title,
      url,
      image_url,
      thumbnail_url,
      price_cad,
      shipping_cad,
      total_price_cad,
      seller,
      seller_username,
      seller_feedback_count,
      seller_positive_percent,
      condition_raw,
      market,
      ends_at,
      historic_price_cad,
      discount_percent,
      created_at,
      updated_at
    )
    VALUES (
      $1,  -- card_id
      'EBAY', -- source
      $2,  -- listing_id
      $3,  -- title
      $4,  -- url
      $5,  -- image_url
      $6,  -- thumbnail_url
      $7,  -- price_cad
      $8,  -- shipping_cad
      $9,  -- total_price_cad
      $10, -- seller
      $11, -- seller_username
      $12, -- seller_feedback_count
      $13, -- seller_positive_percent
      $14, -- condition_raw
      $15, -- market
      $16, -- ends_at
      $17, -- historic_price_cad
      $18, -- discount_percent
      NOW(),
      NOW()
    )
    ON CONFLICT (listing_id) DO UPDATE SET
      card_id = EXCLUDED.card_id,
      title = EXCLUDED.title,
      url = EXCLUDED.url,
      image_url = EXCLUDED.image_url,
      thumbnail_url = EXCLUDED.thumbnail_url,
      price_cad = EXCLUDED.price_cad,
      shipping_cad = EXCLUDED.shipping_cad,
      total_price_cad = EXCLUDED.total_price_cad,
      seller = EXCLUDED.seller,
      seller_username = EXCLUDED.seller_username,
      seller_feedback_count = EXCLUDED.seller_feedback_count,
      seller_positive_percent = EXCLUDED.seller_positive_percent,
      condition_raw = EXCLUDED.condition_raw,
      market = EXCLUDED.market,
      ends_at = EXCLUDED.ends_at,
      historic_price_cad = EXCLUDED.historic_price_cad,
      discount_percent = EXCLUDED.discount_percent,
      updated_at = NOW();
  `,
    [
      cardId,
      listing.listingId,
      listing.title,
      listing.url,
      listing.imageUrl ?? null,
      thumbnailUrl,
      priceCad,
      shippingCad,
      totalPriceCad,
      listing.seller ?? null,
      sellerUsername,
      sellerFeedbackCount,
      sellerPositivePercent,
      normalizedCondition,
      market,
      listing.endsAt ?? null,
      historicPriceCad,
      normalizedDiscount,
    ],
  );
}

async function getHistoricalPrice(cardId: number): Promise<number | null> {
  const res = await query<{ median_price_cad: string }>(
    `
      SELECT median_price_cad
      FROM historical_prices
      WHERE card_id = $1
      LIMIT 1;
    `,
    [cardId],
  );

  const value = res.rows[0]?.median_price_cad;
  return value !== undefined && value !== null ? Number(value) : null;
}

async function main() {
  console.log("Starting listings update...");
  const blacklistedSellers = await getBlacklistedSellers();
  console.log(
    `Loaded ${blacklistedSellers.size} blacklisted seller(s) into memory.`,
  );

  const res = await query<SearchConfigRow>(
    `
    SELECT
      c.id AS card_id,
      c.name,
      c.set_name,
      c.card_number,
      c.condition_bucket,
      cfg.search_query,
      cfg.market
    FROM card_search_config cfg
    JOIN cards c ON c.id = cfg.card_id
    WHERE cfg.is_active = TRUE;
  `,
  );

  const rows = res.rows;

  if (rows.length === 0) {
    console.log("No active search configs found.");
    return;
  }

  for (const row of rows) {
    console.log(
      `Fetching listings for card: ${row.name} (${row.condition_bucket}), query="${row.search_query}"`,
    );
    const historicPrice = await getHistoricalPrice(row.card_id);
    if (historicPrice !== null) {
      console.log(
        `Using historic price $${historicPrice.toFixed(2)} for ${row.name} (${row.condition_bucket}).`,
      );
    } else {
      console.log(
        `No historic price available for ${row.name} (${row.condition_bucket}).`,
      );
    }
    const listings = await fetchEbayListings(
      row.search_query,
      "EBAY_US",
    );

    console.log(
      `Fetched ${listings.length} listings for ${row.name} (${row.condition_bucket}).`,
    );

    let updatedCount = 0;
    const sellerStats = new Map<
      string,
      { total: number; invalid: number }
    >();

    for (const listing of listings) {
      const sellerUsername =
        listing.sellerUsername ??
        listing.seller?.toLowerCase() ??
        null;

      if (sellerUsername) {
        const stats =
          sellerStats.get(sellerUsername) ?? { total: 0, invalid: 0 };
        stats.total += 1;
        sellerStats.set(sellerUsername, stats);
      }

      if (!isValidListingTitle(listing.title)) {
        await logRejectedListing(listing, "invalid_title");
        if (sellerUsername) {
          const stats =
            sellerStats.get(sellerUsername) ?? { total: 0, invalid: 0 };
          stats.invalid += 1;
          sellerStats.set(sellerUsername, stats);
        }
        continue;
      }

      if (sellerUsername && blacklistedSellers.has(sellerUsername)) {
        console.log(
          `Skipping listing ${listing.listingId} from blacklisted seller ${sellerUsername}.`,
        );
        await logRejectedListing(listing, "seller_blacklisted");
        continue;
      }
      try {
        await upsertListing(
          row.card_id,
          row.market,
          row.condition_bucket,
          listing,
          sellerUsername,
          historicPrice,
        );
        updatedCount += 1;
      } catch (err) {
        console.error(
          `Failed to upsert listing ${listing.listingId} for ${row.name}:`,
          err,
        );
      }
    }

    for (const [sellerUsername, stats] of sellerStats) {
      if (
        stats.total >= AUTO_BLACKLIST_MIN_TOTAL &&
        stats.invalid / stats.total >= AUTO_BLACKLIST_MIN_RATIO
      ) {
        await query(
          `
            INSERT INTO seller_blacklist (seller_username)
            VALUES ($1)
            ON CONFLICT (seller_username) DO NOTHING;
          `,
          [sellerUsername],
        );
        if (!blacklistedSellers.has(sellerUsername)) {
          blacklistedSellers.add(sellerUsername);
          console.log(
            `Auto-blacklisted seller ${sellerUsername}: ${stats.invalid}/${stats.total} listings invalid.`,
          );
        }
      }
    }

    console.log(
      `Updated ${updatedCount} listings for ${row.name} (${row.condition_bucket}).`,
    );
  }

  console.log("Listing update complete.");
}

main().catch((err) => {
  console.error("Error running listings update:", err);
});
