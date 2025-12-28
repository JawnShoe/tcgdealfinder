import "dotenv/config";
import { query } from "../lib/db.ts";
import { fetchEbaySoldListings, isValidListingTitle } from "../lib/ebay.ts";
import type { SoldListing } from "../lib/ebay.ts";
import { convertToUSD } from "../lib/fxRates";
import {
  getExpectedCurrency,
  normalizeMarketCode,
  type MarketCode,
} from "../lib/markets";

type CardConfigRow = {
  card_id: number;
  condition_bucket: string;
  search_query: string;
  market: string;
};

async function fetchCardConfigs(): Promise<CardConfigRow[]> {
  const res = await query<CardConfigRow>(
    `
      SELECT
        c.id AS card_id,
        c.condition_bucket,
        cfg.search_query,
        cfg.market
      FROM card_search_config cfg
      JOIN cards c ON c.id = cfg.card_id
      WHERE cfg.is_active = TRUE
      ORDER BY c.id;
    `
  );
  return res.rows;
}

async function insertSoldListing(
  cardId: number,
  condition: string,
  market: MarketCode,
  item: SoldListing
): Promise<void> {
  const currency = getExpectedCurrency(market);

  const priceNative = item.priceCad;
  const shippingNative: number | null = null;
  const shippingUnknown = shippingNative == null;
  const totalNative = priceNative;

  const snapshotAt = new Date();

  const conversion = await convertToUSD(totalNative, currency);
  const totalUsd = conversion?.usd ?? null;
  const fxRateToUsd = conversion?.rate ?? null;
  const fxTimestamp = conversion?.fxTimestamp ?? null;
  const fxStatus = conversion ? "OK" : "MISSING";

  await query(
    `
      INSERT INTO ebay_sold_listings (
        card_id,
        market,
        condition,
        title,
        price,
        currency,
        price_native,
        shipping_native,
        shipping_unknown,
        total_native,
        fx_status,
        fx_rate_to_usd,
        fx_timestamp,
        total_usd,
        sold_at,
        snapshot_at,
        raw
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);
    `,
    [
      cardId,
      market,
      condition,
      item.title,
      item.priceCad,
      currency,
      priceNative,
      shippingNative,
      shippingUnknown,
      totalNative,
      fxStatus,
      fxRateToUsd,
      fxTimestamp,
      totalUsd,
      item.soldAt ? new Date(item.soldAt) : null,
      snapshotAt,
      item.raw ?? {},
    ]
  );
}

async function main() {
  console.log("Starting sold listings update...");
  const configs = await fetchCardConfigs();
  console.log(`Found ${configs.length} cards to process.`);

  let processed = 0;
  let totalInserted = 0;

  for (const config of configs) {
    console.log(
      `Fetching sold listings for card ${config.card_id} (${config.condition_bucket})...`
    );
    const market = normalizeMarketCode(config.market);
    const soldItems = await fetchEbaySoldListings(config.search_query, market);

    let insertedForCard = 0;
    for (const item of soldItems) {
      if (!item.title || !isValidListingTitle(item.title)) {
        continue;
      }
      if (!Number.isFinite(item.priceCad) || item.priceCad <= 0) {
        continue;
      }

      try {
        await insertSoldListing(
          config.card_id,
          config.condition_bucket,
          market,
          item
        );
        insertedForCard += 1;
      } catch (err) {
        console.error(
          `Failed to insert sold listing "${item.title}" for card ${config.card_id}:`,
          err
        );
      }
    }

    processed += 1;
    totalInserted += insertedForCard;
    console.log(
      `Card ${config.card_id}: inserted ${insertedForCard} sold rows (processed ${processed}/${configs.length}).`
    );
  }

  console.log(
    `Sold listings update complete. Total rows inserted: ${totalInserted}.`
  );
}

main().catch((err) => {
  console.error("Error running sold listings update:", err);
  process.exit(1);
});
