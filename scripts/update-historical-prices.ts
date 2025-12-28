import "dotenv/config";
import { pathToFileURL } from "url";

import { query } from "../lib/db";
import { computeBaselineMedianUsd } from "../lib/baselineUsd";
import {
  ensureCardLanguageColumn,
  ensureHistoricalMarketColumn,
} from "../lib/schema";

const SOLD_LOOKBACK_DAYS = 365;
const MIN_SAMPLE_SIZE = 5;

const BASELINE_PRIMARY_WINDOW_DAYS = 90;
const BASELINE_FALLBACK_WINDOW_DAYS = 180;
const BASELINE_MIN_COMPS = 30;
const BASELINE_OUTLIER_TRIM_PERCENT = 5;

type HistoricalGroupRow = {
  card_id: number;
  condition: string;
  median_price_cad: string;
  sample_size: string;
  last_sold_at: string | null;
  language: string;
  market: string;
};

type HistoricalPriceKeyRow = {
  card_id: number;
  market: string;
};

type UsdSoldTotalsRow = {
  card_id: number;
  market: string;
  totals_90: unknown;
  totals_180: unknown;
};

let soldMarketColumnCache: boolean | null = null;

async function hasSoldMarketColumn(): Promise<boolean> {
  if (soldMarketColumnCache != null) {
    return soldMarketColumnCache;
  }

  const res = await query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ebay_sold_listings'
          AND column_name = 'market'
      ) AS exists;
    `
  );

  soldMarketColumnCache = Boolean(res.rows[0]?.exists);
  return soldMarketColumnCache;
}

async function fetchRecentSoldGroups(params: {
  includeMarket: boolean;
  hasSoldMarketColumn: boolean;
  hasCardLanguageColumn: boolean;
}): Promise<HistoricalGroupRow[]> {
  const res = await query<HistoricalGroupRow>(buildRecentSoldQuery(params));
  return res.rows;
}

export function buildRecentSoldQuery(options?: {
  includeMarket?: boolean;
  hasSoldMarketColumn?: boolean;
  hasCardLanguageColumn?: boolean;
}): string {
  const includeMarket = options?.includeMarket ?? true;
  const hasSoldMarketColumn = options?.hasSoldMarketColumn ?? true;
  const hasCardLanguageColumn = options?.hasCardLanguageColumn ?? true;

  const marketExpression =
    includeMarket && hasSoldMarketColumn ? "es.market" : "'EBAY_US'::text";
  const marketSelect = includeMarket ? "market," : "'EBAY_US'::text AS market,";
  const marketGroupBy = includeMarket ? ", market" : "";
  const languageExpression = hasCardLanguageColumn
    ? "c.language"
    : "'UNKNOWN'::text";

  return `
      WITH recent_sold AS (
        SELECT
          es.card_id,
          ${marketExpression} AS market,
          es.condition,
          es.price,
          es.sold_at,
          ${languageExpression} AS language
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
        ${marketSelect}
        percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price_cad,
        COUNT(*) AS sample_size,
        MAX(sold_at) AS last_sold_at
      FROM recent_sold
      GROUP BY card_id, condition, language${marketGroupBy}
      HAVING COUNT(*) >= ${MIN_SAMPLE_SIZE}
      ORDER BY card_id;
    `;
}

async function upsertHistoricalPrice(
  cardId: number,
  market: string,
  medianPrice: number,
  sampleSize: number,
  options: { hasHistoricalMarketColumn: boolean }
): Promise<void> {
  if (options.hasHistoricalMarketColumn) {
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
      [cardId, market, medianPrice, sampleSize]
    );
    return;
  }

  await query(
    `
      INSERT INTO historical_prices (
        card_id,
        median_price_cad,
        sample_size,
        last_updated_at
      )
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (card_id) DO UPDATE SET
        median_price_cad = EXCLUDED.median_price_cad,
        sample_size = EXCLUDED.sample_size,
        last_updated_at = NOW();
    `,
    [cardId, medianPrice, sampleSize]
  );
}

async function rebuildHistoricalPrices(): Promise<void> {
  console.log(
    `Rebuilding historical prices from ebay_sold_listings (lookback ${SOLD_LOOKBACK_DAYS} days, min sample ${MIN_SAMPLE_SIZE}).`
  );

  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const hasCardLanguageColumn = await ensureCardLanguageColumn();
  const hasSoldMarket = await hasSoldMarketColumn();

  const groups = await fetchRecentSoldGroups({
    includeMarket: hasHistoricalMarketColumn,
    hasCardLanguageColumn,
    hasSoldMarketColumn: hasSoldMarket,
  });

  if (groups.length === 0) {
    console.warn(
      "No recent sold data found. Historical prices were not updated."
    );
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
      { hasHistoricalMarketColumn }
    );

    processed += 1;
    if (processed <= 5) {
      console.log(
        `[card_id=${group.card_id} ${group.condition} ${group.language} ${group.market}] median=${medianPrice.toFixed(
          2
        )}, sample=${sampleSize}${
          group.last_sold_at ? ` (last sold: ${group.last_sold_at})` : ""
        }`
      );
    }
  }

  console.log(`Updated ${processed} historical price records.`);
}

async function fetchHistoricalPriceKeys(
  hasHistoricalMarketColumn: boolean
): Promise<HistoricalPriceKeyRow[]> {
  if (!hasHistoricalMarketColumn) {
    const res = await query<HistoricalPriceKeyRow>(`
      SELECT card_id, 'EBAY_US'::text AS market
      FROM historical_prices
      ORDER BY card_id;
    `);
    return res.rows;
  }

  const res = await query<HistoricalPriceKeyRow>(`
    SELECT card_id, market
    FROM historical_prices
    ORDER BY card_id;
  `);
  return res.rows;
}

function normalizeNumberArray(value: unknown): number[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "number" ? item : Number(item)))
      .filter((num) => Number.isFinite(num) && num > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeNumberArray(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

async function fetchUsdSoldTotalsByGroup(): Promise<
  Map<string, { totals90: number[]; totals180: number[] }>
> {
  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();
  const hasSoldMarket = await hasSoldMarketColumn();

  const includeMarket = hasHistoricalMarketColumn;
  const marketExpression =
    includeMarket && hasSoldMarket ? "market" : "'EBAY_US'::text";

  const res = await query<UsdSoldTotalsRow>(`
    SELECT
      card_id,
      ${marketExpression} AS market,
      json_agg(total_usd ORDER BY total_usd) FILTER (
        WHERE sold_at >= NOW() - INTERVAL '${BASELINE_PRIMARY_WINDOW_DAYS} days'
      ) AS totals_90,
      json_agg(total_usd ORDER BY total_usd) FILTER (
        WHERE sold_at >= NOW() - INTERVAL '${BASELINE_FALLBACK_WINDOW_DAYS} days'
      ) AS totals_180
    FROM ebay_sold_listings
    WHERE sold_at IS NOT NULL
      AND sold_at >= NOW() - INTERVAL '${BASELINE_FALLBACK_WINDOW_DAYS} days'
      AND fx_status = 'OK'
      AND total_usd IS NOT NULL
      AND total_usd > 0
    GROUP BY card_id, ${marketExpression}
    ORDER BY card_id;
  `);

  const map = new Map<string, { totals90: number[]; totals180: number[] }>();

  for (const row of res.rows) {
    const key = `${row.card_id}|${row.market}`;
    map.set(key, {
      totals90: normalizeNumberArray(row.totals_90),
      totals180: normalizeNumberArray(row.totals_180),
    });
  }

  return map;
}

async function updateUsdBaseline(
  cardId: number,
  market: string,
  baseline: ReturnType<typeof computeBaselineMedianUsd>,
  options: { hasHistoricalMarketColumn: boolean }
): Promise<void> {
  if (baseline.status === "OK" && baseline.medianUsd == null) {
    throw new Error(
      `Baseline median was null despite status OK (card_id=${cardId}, market=${market})`
    );
  }

  if (options.hasHistoricalMarketColumn) {
    await query(
      `
        UPDATE historical_prices
        SET
          baseline_median_usd = $3,
          baseline_sample_size_usd = $4,
          baseline_window_days = $5,
          baseline_outlier_trim_percent = $6,
          baseline_status = $7,
          last_updated_at = NOW()
        WHERE card_id = $1 AND market = $2;
      `,
      [
        cardId,
        market,
        baseline.medianUsd,
        baseline.sampleSize,
        baseline.windowDays,
        baseline.trimPercent,
        baseline.status,
      ]
    );
    return;
  }

  await query(
    `
      UPDATE historical_prices
      SET
        baseline_median_usd = $2,
        baseline_sample_size_usd = $3,
        baseline_window_days = $4,
        baseline_outlier_trim_percent = $5,
        baseline_status = $6,
        last_updated_at = NOW()
      WHERE card_id = $1;
    `,
    [
      cardId,
      baseline.medianUsd,
      baseline.sampleSize,
      baseline.windowDays,
      baseline.trimPercent,
      baseline.status,
    ]
  );
}

async function rebuildUsdBaselines(): Promise<void> {
  console.log(
    `Rebuilding baseline_median_usd from ebay_sold_listings.total_usd (windows ${BASELINE_PRIMARY_WINDOW_DAYS}d/${BASELINE_FALLBACK_WINDOW_DAYS}d, min comps ${BASELINE_MIN_COMPS}, trim ${BASELINE_OUTLIER_TRIM_PERCENT}%).`
  );

  const hasHistoricalMarketColumn = await ensureHistoricalMarketColumn();

  const buckets = await fetchHistoricalPriceKeys(hasHistoricalMarketColumn);
  if (buckets.length === 0) {
    console.warn(
      "No historical_prices rows found. USD baselines were not updated."
    );
    return;
  }

  const totalsByBucket = await fetchUsdSoldTotalsByGroup();

  let processed = 0;
  let okCount = 0;
  let insufficientCount = 0;

  for (const bucket of buckets) {
    const key = `${bucket.card_id}|${bucket.market}`;
    const totals = totalsByBucket.get(key) ?? { totals90: [], totals180: [] };

    const baseline = computeBaselineMedianUsd({
      primaryWindowDays: BASELINE_PRIMARY_WINDOW_DAYS,
      fallbackWindowDays: BASELINE_FALLBACK_WINDOW_DAYS,
      minComps: BASELINE_MIN_COMPS,
      trimPercent: BASELINE_OUTLIER_TRIM_PERCENT,
      primaryWindowValues: totals.totals90,
      fallbackWindowValues: totals.totals180,
    });

    await updateUsdBaseline(bucket.card_id, bucket.market, baseline, {
      hasHistoricalMarketColumn,
    });

    processed += 1;
    if (baseline.status === "OK") okCount += 1;
    if (baseline.status === "INSUFFICIENT_DATA") insufficientCount += 1;

    if (processed <= 5) {
      console.log(
        `[baseline_usd card_id=${bucket.card_id} ${bucket.market}] status=${baseline.status}, window=${baseline.windowDays}d, comps=${baseline.sampleSize}, median_usd=${baseline.medianUsd ?? "NULL"}`
      );
    }
  }

  console.log(
    `Updated ${processed} USD baselines. OK=${okCount}, INSUFFICIENT_DATA=${insufficientCount}.`
  );
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
    .then(() => rebuildUsdBaselines())
    .then(() => {
      console.log("Historical price rebuild complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error rebuilding historical prices:", err);
      process.exit(1);
    });
}
