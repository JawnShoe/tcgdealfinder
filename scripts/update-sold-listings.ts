import "dotenv/config";
import { pathToFileURL } from "url";
import { query } from "../lib/db.ts";
import { fetchEbaySoldListings, isValidListingTitle } from "../lib/ebay.ts";
import type { SoldListing } from "../lib/ebay.ts";
import { convertToUSD } from "../lib/fxRates.ts";
import {
  getExpectedCurrency,
  normalizeMarketCode,
  type MarketCode,
} from "../lib/markets.ts";

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

async function fetchExistingSoldItemIds(
  cardId: number,
  market: MarketCode,
  listingIds: string[]
): Promise<Set<string>> {
  if (listingIds.length === 0) {
    return new Set();
  }

  const res = await query<{ item_id: string | null }>(
    `
      SELECT raw->>'itemId' AS item_id
      FROM ebay_sold_listings
      WHERE
        card_id = $1
        AND market = $2
        AND raw->>'itemId' = ANY($3::text[]);
    `,
    [cardId, market, listingIds]
  );

  const existing = new Set<string>();
  for (const row of res.rows) {
    if (row.item_id) {
      existing.add(row.item_id);
    }
  }

  return existing;
}

async function deleteDuplicateSoldRowsForCard(
  cardId: number,
  market: MarketCode
): Promise<number> {
  const res = await query<{ deleted_count: string }>(
    `
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY raw->>'itemId'
            ORDER BY id ASC
          ) AS rn
        FROM ebay_sold_listings
        WHERE
          card_id = $1
          AND market = $2
          AND sold_at IS NOT NULL
          AND sold_at >= NOW() - INTERVAL '180 days'
          AND raw->>'itemId' IS NOT NULL
      ),
      del AS (
        DELETE FROM ebay_sold_listings
        WHERE id IN (
          SELECT id FROM ranked WHERE rn > 1
        )
        RETURNING 1
      )
      SELECT COUNT(*)::text AS deleted_count FROM del;
    `,
    [cardId, market]
  );

  return parseInt(res.rows[0]?.deleted_count ?? "0", 10);
}

async function main() {
  console.log("Starting sold listings update...");
  const configs = await fetchCardConfigs();
  console.log(`Found ${configs.length} cards to process.`);

  let processed = 0;
  let totalInserted = 0;
  let totalSkippedAlreadyPresent = 0;
  let totalSkippedMissingId = 0;

  for (const config of configs) {
    console.log(
      `Fetching sold listings for card ${config.card_id} (${config.condition_bucket})...`
    );
    const market = normalizeMarketCode(config.market);
    const deletedDuplicates = await deleteDuplicateSoldRowsForCard(
      config.card_id,
      market
    );
    if (deletedDuplicates > 0) {
      console.log(
        `Card ${config.card_id}: deleted ${deletedDuplicates} duplicate sold rows within 180d before ingest.`
      );
    }
    const soldItems = await fetchEbaySoldListings(config.search_query, market, {
      limit: 200,
      maxPages: 10,
      maxResults: 2000,
    });

    let insertedForCard = 0;
    let skippedAlreadyPresentForCard = 0;
    let skippedMissingIdForCard = 0;

    const candidates = soldItems.filter((item) => {
      if (!item.title || !isValidListingTitle(item.title)) {
        return false;
      }
      if (!item.soldAt) {
        return false;
      }
      if (!Number.isFinite(item.priceCad) || item.priceCad <= 0) {
        return false;
      }
      return true;
    });

    const listingIds: string[] = [];
    for (const item of candidates) {
      if (!item.listingId) {
        continue;
      }
      listingIds.push(String(item.listingId));
    }

    const existingItemIds = await fetchExistingSoldItemIds(
      config.card_id,
      market,
      listingIds
    );

    for (const item of candidates) {
      if (!item.listingId) {
        skippedMissingIdForCard += 1;
        continue;
      }
      if (existingItemIds.has(String(item.listingId))) {
        skippedAlreadyPresentForCard += 1;
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
    totalSkippedAlreadyPresent += skippedAlreadyPresentForCard;
    totalSkippedMissingId += skippedMissingIdForCard;
    console.log(
      `Card ${config.card_id}: inserted ${insertedForCard} sold rows (skipped: ${skippedAlreadyPresentForCard} already present, ${skippedMissingIdForCard} missing listingId) (processed ${processed}/${configs.length}).`
    );
  }

  console.log(
    `Sold listings update complete. Total rows inserted: ${totalInserted}. Skipped: ${totalSkippedAlreadyPresent} already present, ${totalSkippedMissingId} missing listingId.`
  );
}

const isCliExecution = (() => {
  if (typeof process === "undefined" || !process.argv?.[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isCliExecution) {
  main().catch((err) => {
    console.error("Error running sold listings update:", err);
    process.exit(1);
  });
}
