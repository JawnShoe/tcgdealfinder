import { query } from "../lib/db";
import { computeDealConfidenceWeight } from "../lib/dealConfidence";
import {
  ensureHistoricalMarketColumn,
  ensureListingsMarketColumn,
} from "../lib/schema";

type BackfillRow = {
  id: number;
  shipping_cad: string | null;
  historic_price_cad: string | null;
  sample_size: number | null;
};

async function fetchBatch(
  afterId: number,
  limit: number,
  marketJoinClause: string,
): Promise<BackfillRow[]> {
  const res = await query<BackfillRow>(
    `
      SELECT
        l.id,
        l.shipping_cad,
        l.historic_price_cad,
        hp.sample_size
      FROM listings l
      LEFT JOIN historical_prices hp ON hp.card_id = l.card_id
        ${marketJoinClause}
      WHERE l.id > $1
      ORDER BY l.id
      LIMIT $2;
    `,
    [afterId, limit],
  );
  return res.rows;
}

async function backfill(): Promise<void> {
  const hasListingsMarket = await ensureListingsMarketColumn();
  const hasHistoricalMarket = await ensureHistoricalMarketColumn();
  const marketJoinClause =
    hasListingsMarket && hasHistoricalMarket ? "AND hp.market = l.market" : "";
  let processed = 0;
  let lastId = 0;
  const batchSize = 500;

  while (true) {
    const rows = await fetchBatch(lastId, batchSize, marketJoinClause);
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const shippingPrice =
        row.shipping_cad != null ? Number(row.shipping_cad) : null;
      const medianPrice =
        row.historic_price_cad != null ? Number(row.historic_price_cad) : null;
      const sampleSize =
        row.sample_size != null ? Number(row.sample_size) : null;

      const weight = computeDealConfidenceWeight({
        sampleCount: sampleSize,
        medianPrice,
        stdDev: null,
        shippingPrice,
      });

      await query(
        `
          UPDATE listings
          SET deal_confidence_weight = $1
          WHERE id = $2;
        `,
        [weight, row.id],
      );

      lastId = row.id;
      processed += 1;
    }

    console.log(`Processed ${processed} listings...`);
  }

  console.log(`Backfill complete. Updated ${processed} listings.`);
}

backfill().catch((err) => {
  console.error("Failed to backfill confidence weights:", err);
  process.exitCode = 1;
});
