import { NextResponse } from "next/server";

// Optional: Import query for freshness checks
// Only runs DB queries if DATABASE_URL is available
let queryFn: typeof import("../../../lib/db").query | null = null;

async function getQuery() {
  if (queryFn) return queryFn;
  try {
    const db = await import("../../../lib/db");
    queryFn = db.query;
    return queryFn;
  } catch {
    return null;
  }
}

type FreshnessData = {
  listings: {
    lastUpdated: string | null;
    staleCount1h: number | null;
    totalActive: number | null;
    totalRows: number | null;
    totalUsdNullCount: number | null;
    totalUsdNullRate: number | null;
    shippingUnknownCount: number | null;
    shippingUnknownRate: number | null;
  };
  historicalPrices: {
    lastUpdated: string | null;
    cardsCovered: number | null;
  };
  fxRates: {
    provider: string;
    cadence: string;
    lastSuccessAt: string | null;
    lastAttemptAt: string | null;
    lastAttemptStatus: string | null;
    lastAttemptMaxDriftPercent: number | null;
    lastAttemptFailureReason: string | null;
    lastUpdated: string | null;
    rates: Record<string, number> | null;
  };
};

async function getFreshnessData(): Promise<FreshnessData | null> {
  const query = await getQuery();
  if (!query || !process.env.DATABASE_URL) {
    return null;
  }

  try {
    // Get listings freshness
    const listingsResult = await query<{
      last_updated: string | null;
      stale_count: string;
      total_active: string;
      total_rows: string;
      total_usd_null_count: string;
      shipping_unknown_count: string;
    }>(`
      SELECT
        MAX(updated_at) FILTER (WHERE total_price_cad IS NOT NULL) as last_updated,
        COUNT(*) FILTER (WHERE total_price_cad IS NOT NULL AND updated_at < NOW() - INTERVAL '1 hour') as stale_count,
        COUNT(*) FILTER (WHERE total_price_cad IS NOT NULL) as total_active,
        COUNT(*) as total_rows,
        COUNT(*) FILTER (WHERE total_usd IS NULL) as total_usd_null_count,
        COUNT(*) FILTER (WHERE shipping_native IS NULL) as shipping_unknown_count
      FROM listings
    `);

    // Get historical prices freshness
    const historicalResult = await query<{
      last_updated: string | null;
      cards_covered: string;
    }>(`
      SELECT
        MAX(last_updated_at) as last_updated,
        COUNT(DISTINCT card_id) as cards_covered
      FROM historical_prices
    `);

    // Get FX rates freshness
    const fxResult = await query<{
      currency: string;
      rate_to_usd: string;
      updated_at: string;
    }>(`
      SELECT currency, rate_to_usd, updated_at
      FROM fx_rates
      ORDER BY updated_at DESC
    `);

    // Get FX run status (if present)
    const fxProvider = "OPEN_EXCHANGE_RATES";
    const fxCadence = "hourly";

    let lastSuccessAt: string | null = null;
    let lastAttemptAt: string | null = null;
    let lastAttemptStatus: string | null = null;
    let lastAttemptMaxDriftPercent: number | null = null;
    let lastAttemptFailureReason: string | null = null;

    try {
      const lastSuccessResult = await query<{ completed_at: string }>(`
        SELECT completed_at
        FROM fx_rate_runs
        WHERE status = 'SUCCESS'
        ORDER BY completed_at DESC
        LIMIT 1
      `);
      lastSuccessAt = lastSuccessResult.rows[0]?.completed_at ?? null;

      const lastAttemptResult = await query<{
        completed_at: string;
        status: string;
        max_drift_percent: string;
        failure_reason: string | null;
      }>(`
        SELECT completed_at, status, max_drift_percent, failure_reason
        FROM fx_rate_runs
        ORDER BY completed_at DESC
        LIMIT 1
      `);
      const row = lastAttemptResult.rows[0];
      if (row) {
        lastAttemptAt = row.completed_at;
        lastAttemptStatus = row.status;
        lastAttemptMaxDriftPercent = parseFloat(row.max_drift_percent);
        lastAttemptFailureReason = row.failure_reason ?? null;
      }
    } catch {
      // fx_rate_runs table not present (or query failed) - omit run status
    }

    const listingsRow = listingsResult.rows[0];
    const historicalRow = historicalResult.rows[0];

    const rates: Record<string, number> = {};
    let fxLastUpdated: string | null = null;
    for (const row of fxResult.rows) {
      rates[row.currency] = parseFloat(row.rate_to_usd);
      if (!fxLastUpdated) {
        fxLastUpdated = row.updated_at;
      }
    }

    if (!lastSuccessAt) {
      // Fallback: since fx_rates is only mutated on successful runs, its last update
      // is a best-effort proxy for "last success" when fx_rate_runs is empty.
      lastSuccessAt = fxLastUpdated;
    }

    const totalRows = listingsRow ? parseInt(listingsRow.total_rows, 10) : null;
    const totalUsdNullCount = listingsRow
      ? parseInt(listingsRow.total_usd_null_count, 10)
      : null;
    const shippingUnknownCount = listingsRow
      ? parseInt(listingsRow.shipping_unknown_count, 10)
      : null;

    const totalUsdNullRate =
      totalRows && totalUsdNullCount != null
        ? totalUsdNullCount / totalRows
        : null;
    const shippingUnknownRate =
      totalRows && shippingUnknownCount != null
        ? shippingUnknownCount / totalRows
        : null;

    return {
      listings: {
        lastUpdated: listingsRow?.last_updated ?? null,
        staleCount1h: listingsRow
          ? parseInt(listingsRow.stale_count, 10)
          : null,
        totalActive: listingsRow
          ? parseInt(listingsRow.total_active, 10)
          : null,
        totalRows,
        totalUsdNullCount,
        totalUsdNullRate,
        shippingUnknownCount,
        shippingUnknownRate,
      },
      historicalPrices: {
        lastUpdated: historicalRow?.last_updated ?? null,
        cardsCovered: historicalRow
          ? parseInt(historicalRow.cards_covered, 10)
          : null,
      },
      fxRates: {
        provider: fxProvider,
        cadence: fxCadence,
        lastSuccessAt,
        lastAttemptAt,
        lastAttemptStatus,
        lastAttemptMaxDriftPercent,
        lastAttemptFailureReason,
        lastUpdated: fxLastUpdated,
        rates: Object.keys(rates).length > 0 ? rates : null,
      },
    };
  } catch (error) {
    // Database query failed - return null freshness data
    console.error("Health check: failed to get freshness data", error);
    return null;
  }
}

export async function GET() {
  const freshness = await getFreshnessData();

  const healthData = {
    ok: true,
    timestamp: new Date().toISOString(),
    service: "tcg-deal-finder",
    version: process.env.npm_package_version || "unknown",
    node: process.version,
    // Freshness data (null if DB unavailable)
    freshness,
  };

  return NextResponse.json(healthData);
}
