/**
 * Test script: Verify seller store name is in card detail payload
 *
 * This directly calls getCardDetail and logs the listings data
 */
import { query } from "../lib/db";
import {
  computeDiscountPercent,
  getDisplayDiscountPercent,
} from "../lib/pricing";
import { computeDealConfidenceWeight } from "../lib/dealConfidence";
import {
  ensureDealConfidenceColumn,
  ensureCardLanguageColumn,
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../lib/schema";
import { DEFAULT_MARKET, type MarketCode } from "../lib/markets";

// Copy the exact same types and queries from page.tsx

type CardRecord = {
  id: number;
  name: string;
  set_name: string;
  card_number: string | null;
  rarity: string | null;
  condition_bucket: string;
  language: string | null;
};

type ListingDbRow = {
  id: number;
  listing_id: string;
  title: string;
  url: string;
  price_cad: string | null;
  shipping_cad: string | null;
  total_price_cad: string | null;
  market: string;
  ends_at: string | null;
  thumbnail_url: string | null;
  condition: string;
  median_price_cad: string | null;
  sample_size: number | null;
  seller_feedback_count: number | null;
  seller_positive_percent: string | null;
  seller_username: string | null;
  seller_store_name: string | null;
  deal_confidence_weight: string | null;
};

async function getListings(
  cardIds: number[],
  market: MarketCode,
  hasListingsMarketColumn: boolean,
  hasHistoricalMarketColumn: boolean
): Promise<ListingDbRow[]> {
  if (cardIds.length === 0) return [];
  const hasConfidenceColumn = await ensureDealConfidenceColumn();
  const params: unknown[] = [cardIds];
  let marketFilterClause = "";
  if (hasListingsMarketColumn) {
    params.push(market);
    marketFilterClause = "AND l.market = $2";
  }
  const marketLiteral = `'${market}'::text`;
  const marketSelect = hasListingsMarketColumn ? "l.market" : marketLiteral;
  const historicalJoinClause =
    hasHistoricalMarketColumn && hasListingsMarketColumn
      ? "AND hp.market = l.market"
      : hasHistoricalMarketColumn
        ? `AND hp.market = ${marketLiteral}`
        : "";

  const res = await query<ListingDbRow>(
    `
      SELECT
        l.id,
        l.listing_id,
        l.title,
        l.url,
        l.price_cad,
        l.shipping_cad,
        l.total_price_cad,
        ${marketSelect} AS market,
        l.ends_at,
        l.thumbnail_url,
        c.condition_bucket AS condition,
        hp.median_price_cad,
        hp.sample_size,
        l.seller_feedback_count,
        l.seller_positive_percent,
        l.seller_username,
        l.seller_store_name,
        ${
          hasConfidenceColumn ? "l.deal_confidence_weight" : "NULL::numeric"
        } AS deal_confidence_weight
      FROM listings l
      JOIN cards c ON c.id = l.card_id
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${historicalJoinClause}
      WHERE l.card_id = ANY($1)
        ${marketFilterClause}
        AND l.seller_username IS NOT NULL
        AND l.match_eligible = TRUE
        AND l.shipping_known = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM seller_blacklist sb
          WHERE sb.seller_username = l.seller_username
        )
      ORDER BY l.discount_percent ASC NULLS LAST, l.total_price_cad ASC NULLS LAST
    `,
    params
  );

  return res.rows;
}

async function main() {
  const cardId = 5;
  console.log(`=== Testing Card Detail for card_id=${cardId} ===\n`);

  const hasListingsMarketColumn = await ensureListingsMarketColumn();
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const market: MarketCode = DEFAULT_MARKET;

  // Get card IDs (simplified - just use the one)
  const cardIds = [cardId];

  console.log("Fetching listings from database...\n");
  const listings = await getListings(
    cardIds,
    market,
    hasListingsMarketColumn,
    hasHistoricalMarketColumn
  );

  console.log(`Found ${listings.length} listings\n`);

  // Find the listing with item 177383271547
  const targetListing = listings.find((l) =>
    l.listing_id?.includes("177383271547")
  );

  console.log("=== ALL LISTINGS (first 10) ===");
  listings.slice(0, 10).forEach((listing, i) => {
    console.log(`\nListing ${i + 1}:`);
    console.log(`  listing_id: ${listing.listing_id}`);
    console.log(`  title: ${listing.title?.substring(0, 50)}...`);
    console.log(`  market: ${listing.market}`);
    console.log(`  seller_username: ${listing.seller_username}`);
    console.log(`  seller_store_name: ${listing.seller_store_name}`);
  });

  console.log("\n=== TARGET LISTING (177383271547) ===");
  if (targetListing) {
    console.log(`  listing_id: ${targetListing.listing_id}`);
    console.log(`  seller_username: ${targetListing.seller_username}`);
    console.log(`  seller_store_name: ${targetListing.seller_store_name}`);

    if (targetListing.seller_store_name === "brazil shop") {
      console.log("\n✅ seller_store_name IS 'brazil shop' in query result");
    } else if (targetListing.seller_store_name === null) {
      console.log(
        "\n❌ seller_store_name IS NULL - not being selected or not in DB"
      );
    } else {
      console.log(
        `\n⚠️ seller_store_name = '${targetListing.seller_store_name}'`
      );
    }
  } else {
    console.log("❌ Listing 177383271547 NOT FOUND in results for card 5");
    console.log("   This might mean it's associated with a different card_id");

    // Search for it directly
    const directResult = await query(
      `SELECT card_id, listing_id, seller_username, seller_store_name, market, match_eligible
       FROM listings 
       WHERE listing_id LIKE '%177383271547%'`,
      []
    );

    if (directResult.rows.length > 0) {
      console.log("\n   Direct DB lookup:");
      console.log(`   card_id: ${directResult.rows[0].card_id}`);
      console.log(`   listing_id: ${directResult.rows[0].listing_id}`);
      console.log(`   market: ${directResult.rows[0].market}`);
      console.log(`   match_eligible: ${directResult.rows[0].match_eligible}`);
      console.log(
        `   seller_store_name: ${directResult.rows[0].seller_store_name}`
      );
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
