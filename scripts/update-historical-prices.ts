import "dotenv/config";
import { pathToFileURL } from "url";

import { query } from "../lib/db";

const SOLD_LOOKBACK_DAYS = 365;
const MIN_SAMPLE_SIZE = 5;

type HistoricalGroupRow = {
  card_id: number;
  condition: string;
  median_price_cad: string;
  sample_size: string;
  last_sold_at: string | null;
  language: string;
  market: string;
};

async function fetchRecentSoldGroups(): Promise<HistoricalGroupRow[]> {
  const res = await query<HistoricalGroupRow>(buildRecentSoldQuery());
  return res.rows;
}

export function buildRecentSoldQuery(): string {
  return `
      WITH recent_sold AS (
        SELECT
          es.card_id,
          es.market,
          es.condition,
          es.price,
          es.sold_at,
          c.language
        FROM ebay_sold_listings es
        JOIN cards c ON c.id = es.card_id
        WHERE es.card_id IS NOT NULL
          AND es.condition IS NOT NULL
          AND es.price IS NOT NULL
          AND es.price > 0
          AND es.sold_at IS NOT NULL
          AND es.sold_at >= NOW() - INTERVAL '${SOLD_LOOKBACK_DAYS} days'
      )
      SELECT
        card_id,
        condition,
        language,
        market,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price_cad,
        COUNT(*) AS sample_size,
        MAX(sold_at) AS last_sold_at
      FROM recent_sold
      GROUP BY card_id, condition, language, market
      HAVING COUNT(*) >= ${MIN_SAMPLE_SIZE}
      ORDER BY card_id;
    `;
}

async function upsertHistoricalPrice(
  cardId: number,
  market: string,
  medianPrice: number,
  sampleSize: number,
): Promise<void> {
  await query(
    `
      INSERT INTO historical_prices (
        card_id,
        market,
        median_price_cad,
        sample_size,
        last_updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (card_id, market) DO UPDATE SET
        median_price_cad = EXCLUDED.median_price_cad,
        sample_size = EXCLUDED.sample_size,
        last_updated_at = NOW();
    `,
    [cardId, market, medianPrice, sampleSize],
  );
}

async function rebuildHistoricalPrices(): Promise<void> {
  console.log(
    `Rebuilding historical prices from ebay_sold_listings (lookback ${SOLD_LOOKBACK_DAYS} days, min sample ${MIN_SAMPLE_SIZE}).`,
  );

  const groups = await fetchRecentSoldGroups();

  if (groups.length === 0) {
    console.warn("No recent sold data found. Historical prices were not updated.");
    return;
  }

  let processed = 0;

  for (const group of groups) {
    const medianPrice = Number(group.median_price_cad);
    const sampleSize = Number(group.sample_size);

    if (!Number.isFinite(medianPrice) || !Number.isFinite(sampleSize)) {
      continue;
    }

    await upsertHistoricalPrice(
      group.card_id,
      group.market,
      medianPrice,
      sampleSize,
    );

    processed += 1;
    if (processed <= 5) {
      console.log(
        `[card_id=${group.card_id} ${group.condition} ${group.language} ${group.market}] median=${medianPrice.toFixed(
          2,
        )}, sample=${sampleSize}${
          group.last_sold_at ? ` (last sold: ${group.last_sold_at})` : ""
        }`,
      );
    }
  }

  console.log(`Updated ${processed} historical price records.`);
}

const isCli = (() => {
  if (typeof process === "undefined" || !process.argv?.[1]) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isCli) {
  rebuildHistoricalPrices()
    .then(() => {
      console.log("Historical price rebuild complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error rebuilding historical prices:", err);
      process.exit(1);
    });
}
