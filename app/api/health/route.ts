import { NextResponse } from "next/server";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/observability/logging";
import { recordApiRequest } from "@/lib/observability/metrics";

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

// ============================================================================
// JOB STATUS THRESHOLDS (for OK/STALE/FAIL signals)
// ============================================================================

/** Listings are STALE if older than 2 hours */
const LISTINGS_STALE_THRESHOLD_HOURS = 2;
/** Historical prices are STALE if older than 26 hours (daily job + buffer) */
const HISTORICAL_STALE_THRESHOLD_HOURS = 26;
/** Sold listings are STALE if older than 26 hours (daily job + buffer) */
const SOLD_STALE_THRESHOLD_HOURS = 26;
/** FX rates are STALE if older than 2 hours (hourly job + buffer) */
const FX_STALE_THRESHOLD_HOURS = 2;
/** Alerts check is STALE if never run or env not configured (informational) */

type JobStatus = "OK" | "STALE" | "FAIL" | "DISABLED" | "UNKNOWN";

/**
 * Compute job status based on last success timestamp and threshold.
 * Returns UNKNOWN if timestamp is null (never ran or DB unavailable).
 */
function computeJobStatus(
  lastSuccessAt: string | null,
  staleThresholdHours: number
): JobStatus {
  if (!lastSuccessAt) return "UNKNOWN";
  const lastSuccess = new Date(lastSuccessAt).getTime();
  const ageHours = (Date.now() - lastSuccess) / (1000 * 60 * 60);
  if (ageHours > staleThresholdHours) return "STALE";
  return "OK";
}

type JobStatusEntry = {
  status: JobStatus;
  lastSuccessAt: string | null;
  ageHours: number | null;
  staleThresholdHours: number;
};

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
  soldListings: {
    lastUpdated: string | null;
    totalCount: number | null;
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
  alertsSending: {
    configured: boolean;
    lastSentAt: string | null;
    totalSent: number | null;
  };
};

type JobStatuses = {
  listings: JobStatusEntry;
  historicalPrices: JobStatusEntry;
  soldListings: JobStatusEntry;
  fxRates: JobStatusEntry;
  alertsSending: JobStatusEntry & { configured: boolean };
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

    // Get sold listings freshness
    let soldLastUpdated: string | null = null;
    let soldTotalCount: number | null = null;
    try {
      const soldResult = await query<{
        last_updated: string | null;
        total_count: string;
      }>(`
        SELECT
          MAX(created_at) as last_updated,
          COUNT(*) as total_count
        FROM ebay_sold_listings
      `);
      soldLastUpdated = soldResult.rows[0]?.last_updated ?? null;
      soldTotalCount = soldResult.rows[0]
        ? parseInt(soldResult.rows[0].total_count, 10)
        : null;
    } catch {
      // ebay_sold_listings table not present - omit sold data
    }

    // Get alerts sending freshness
    let alertsConfigured = false;
    let alertsLastSentAt: string | null = null;
    let alertsTotalSent: number | null = null;
    try {
      // Check if email_sends table exists and has data
      const alertsResult = await query<{
        last_sent: string | null;
        total_sent: string;
      }>(`
        SELECT
          MAX(sent_at) as last_sent,
          COUNT(*) FILTER (WHERE status = 'sent') as total_sent
        FROM email_sends
      `);
      alertsLastSentAt = alertsResult.rows[0]?.last_sent ?? null;
      alertsTotalSent = alertsResult.rows[0]
        ? parseInt(alertsResult.rows[0].total_sent, 10)
        : null;
      // Alerts are "configured" if ALERTS_ENABLED + SENDGRID_API_KEY are set
      alertsConfigured =
        process.env.ALERTS_ENABLED === "true" &&
        !!process.env.SENDGRID_API_KEY &&
        !!process.env.SITE_BASE_URL;
    } catch {
      // email_sends table not present - alerts not configured
    }

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
      soldListings: {
        lastUpdated: soldLastUpdated,
        totalCount: soldTotalCount,
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
      alertsSending: {
        configured: alertsConfigured,
        lastSentAt: alertsLastSentAt,
        totalSent: alertsTotalSent,
      },
    };
  } catch (error) {
    // Database query failed - return null freshness data
    console.error("Health check: failed to get freshness data", error);
    return null;
  }
}

/**
 * Compute age in hours from a timestamp string.
 */
function computeAgeHours(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const ts = new Date(timestamp).getTime();
  return (Date.now() - ts) / (1000 * 60 * 60);
}

/**
 * Build job statuses from freshness data.
 * Returns deterministic OK/STALE/UNKNOWN signals for each pipeline job.
 */
function buildJobStatuses(freshness: FreshnessData | null): JobStatuses | null {
  if (!freshness) return null;

  const listingsLastSuccess = freshness.listings.lastUpdated;
  const listingsAge = computeAgeHours(listingsLastSuccess);

  const historicalLastSuccess = freshness.historicalPrices.lastUpdated;
  const historicalAge = computeAgeHours(historicalLastSuccess);

  const soldLastSuccess = freshness.soldListings.lastUpdated;
  const soldAge = computeAgeHours(soldLastSuccess);

  const fxLastSuccess = freshness.fxRates.lastSuccessAt;
  const fxAge = computeAgeHours(fxLastSuccess);

  // Alerts sending is "configured" if env vars are set, "disabled" otherwise
  const alertsConfigured = freshness.alertsSending.configured;
  const alertsLastSent = freshness.alertsSending.lastSentAt;
  // We don't apply a staleness threshold to alerts — they only run when there are deals

  return {
    listings: {
      status: computeJobStatus(
        listingsLastSuccess,
        LISTINGS_STALE_THRESHOLD_HOURS
      ),
      lastSuccessAt: listingsLastSuccess,
      ageHours:
        listingsAge !== null ? Math.round(listingsAge * 100) / 100 : null,
      staleThresholdHours: LISTINGS_STALE_THRESHOLD_HOURS,
    },
    historicalPrices: {
      status: computeJobStatus(
        historicalLastSuccess,
        HISTORICAL_STALE_THRESHOLD_HOURS
      ),
      lastSuccessAt: historicalLastSuccess,
      ageHours:
        historicalAge !== null ? Math.round(historicalAge * 100) / 100 : null,
      staleThresholdHours: HISTORICAL_STALE_THRESHOLD_HOURS,
    },
    soldListings: {
      status: computeJobStatus(soldLastSuccess, SOLD_STALE_THRESHOLD_HOURS),
      lastSuccessAt: soldLastSuccess,
      ageHours: soldAge !== null ? Math.round(soldAge * 100) / 100 : null,
      staleThresholdHours: SOLD_STALE_THRESHOLD_HOURS,
    },
    fxRates: {
      status: computeJobStatus(fxLastSuccess, FX_STALE_THRESHOLD_HOURS),
      lastSuccessAt: fxLastSuccess,
      ageHours: fxAge !== null ? Math.round(fxAge * 100) / 100 : null,
      staleThresholdHours: FX_STALE_THRESHOLD_HOURS,
    },
    alertsSending: {
      status: alertsConfigured
        ? alertsLastSent
          ? "OK"
          : "UNKNOWN"
        : "DISABLED",
      configured: alertsConfigured,
      lastSuccessAt: alertsLastSent,
      ageHours: alertsLastSent
        ? Math.round(computeAgeHours(alertsLastSent)! * 100) / 100
        : null,
      // No staleness threshold for alerts — they run on-demand
      staleThresholdHours: 0,
    },
  };
}

/**
 * Compute overall health status based on job statuses.
 * Returns false if any critical job is STALE or FAIL.
 */
function computeOverallHealth(jobStatuses: JobStatuses | null): boolean {
  if (!jobStatuses) return true; // No DB = assume ok (health endpoint works)
  // Critical jobs: listings, fxRates (most time-sensitive)
  const criticalJobs = [jobStatuses.listings, jobStatuses.fxRates];
  for (const job of criticalJobs) {
    if (job.status === "STALE" || job.status === "FAIL") {
      return false;
    }
  }
  return true;
}

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(request.headers);
  let status = 200;
  let requestError: unknown;
  let response: NextResponse;

  try {
    const freshness = await getFreshnessData();
    const jobStatuses = buildJobStatuses(freshness);
    const overallOk = computeOverallHealth(jobStatuses);

    const healthData = {
      ok: overallOk,
      timestamp: new Date().toISOString(),
      service: "tcg-deal-finder",
      version: process.env.npm_package_version || "unknown",
      node: process.version,
      // Job statuses with OK/STALE/FAIL signals (null if DB unavailable)
      jobs: jobStatuses,
      // Detailed freshness data (null if DB unavailable)
      freshness,
    };

    response = NextResponse.json(healthData);
  } catch (error) {
    status = 500;
    requestError = error;
    response = NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        service: "tcg-deal-finder",
        error: "health_check_failed",
      },
      { status }
    );
  }

  response.headers.set("x-request-id", requestId);

  await recordApiRequest({
    route: "/api/health",
    statusCode: status,
    durationMs: Date.now() - start,
    requestId,
  });

  logRequest({
    level: status >= 500 ? "error" : "info",
    msg: "health.check",
    route: "/api/health",
    requestId,
    durationMs: Date.now() - start,
    status,
    error: requestError,
  });

  return response;
}
