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
  };
  historicalPrices: {
    lastUpdated: string | null;
    cardsCovered: number | null;
  };
  fxRates: {
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
    }>(`
      SELECT
        MAX(updated_at) as last_updated,
        COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '1 hour') as stale_count,
        COUNT(*) as total_active
      FROM listings
      WHERE total_price_cad IS NOT NULL
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

    return {
      listings: {
        lastUpdated: listingsRow?.last_updated ?? null,
        staleCount1h: listingsRow
          ? parseInt(listingsRow.stale_count, 10)
          : null,
        totalActive: listingsRow
          ? parseInt(listingsRow.total_active, 10)
          : null,
      },
      historicalPrices: {
        lastUpdated: historicalRow?.last_updated ?? null,
        cardsCovered: historicalRow
          ? parseInt(historicalRow.cards_covered, 10)
          : null,
      },
      fxRates: {
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
