import { queryRebuild } from "../db";
import { isRebuildDbConfigured } from "../data/dataAvailability";

const API_WINDOW_MINUTES = 60;
const OUTBOUND_WINDOW_HOURS = 24;

type MetricsStatus =
  | "available"
  | "unavailable"
  | "empty"
  | "not_instrumented"
  | "error";

type MetricsDependencies = {
  isDbConfigured: () => boolean;
  query: typeof queryRebuild;
  logError: (...args: unknown[]) => void;
};

const defaultMetricsDependencies: MetricsDependencies = {
  isDbConfigured: isRebuildDbConfigured,
  query: queryRebuild,
  logError: console.error,
};

export type ApiMetricsSnapshot = {
  status: MetricsStatus;
  windowMinutes: number;
  totalRequests: number | null;
  errorRate: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
};

export type OutboundClicksSnapshot = {
  status: MetricsStatus;
  totalClicks: number | null;
  last24hClicks: number | null;
  lastClickedAtISO: string | null;
  windowHours: number;
};

type MetricsErrorStatus = Extract<MetricsStatus, "not_instrumented" | "error">;

type MetricsErrorMapping = {
  status: MetricsErrorStatus;
  shouldLog: boolean;
};

function extractErrorCode(error: unknown): string {
  if (typeof error === "object" && error != null && "code" in error) {
    return String((error as { code?: unknown }).code ?? "").toUpperCase();
  }

  return "";
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error != null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").toLowerCase();
  }

  return String(error ?? "").toLowerCase();
}

/**
 * Canonical missing-table detector for rebuild observability metrics queries.
 * 42P01 is the authoritative Postgres signal; message matching is a fallback.
 */
export function mapMetricsTableError(error: unknown): MetricsErrorMapping {
  const errorCode = extractErrorCode(error);
  if (errorCode === "42P01") {
    return { status: "not_instrumented", shouldLog: false };
  }

  const message = extractErrorMessage(error);
  const refersToMetricsTable =
    message.includes("rebuild_api_requests") ||
    message.includes("rebuild_outbound_clicks");
  const missingTableSignal =
    message.includes("undefined_table") ||
    message.includes("42p01") ||
    message.includes("relation") ||
    message.includes("table");
  const missingPhraseSignal =
    message.includes("does not exist") || message.includes("no such table");

  if (refersToMetricsTable && missingTableSignal && missingPhraseSignal) {
    return { status: "not_instrumented", shouldLog: false };
  }

  return { status: "error", shouldLog: true };
}

export async function recordRebuildApiRequest(
  params: {
    route: string;
    statusCode: number;
    durationMs: number;
    requestId: string;
  },
  deps: MetricsDependencies = defaultMetricsDependencies
) {
  if (!deps.isDbConfigured()) {
    return;
  }

  try {
    await deps.query(
      `
        INSERT INTO rebuild_api_requests (
          route,
          status_code,
          duration_ms,
          request_id
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        params.route,
        params.statusCode,
        Math.round(params.durationMs),
        params.requestId,
      ]
    );
  } catch (error) {
    const errorMapping = mapMetricsTableError(error);
    if (errorMapping.shouldLog) {
      deps.logError("rebuild api metrics insert failed", error);
    }
  }
}

export async function recordRebuildOutboundClick(
  params: {
    listingId: string | null;
    url: string;
    requestId: string;
  },
  deps: MetricsDependencies = defaultMetricsDependencies
) {
  if (!deps.isDbConfigured()) {
    return;
  }

  try {
    await deps.query(
      `
        INSERT INTO rebuild_outbound_clicks (
          listing_id,
          url,
          request_id
        )
        VALUES ($1, $2, $3)
      `,
      [params.listingId, params.url, params.requestId]
    );
  } catch (error) {
    const errorMapping = mapMetricsTableError(error);
    if (errorMapping.shouldLog) {
      deps.logError("rebuild outbound click insert failed", error);
    }
  }
}

export async function getRebuildApiMetricsSnapshot(
  deps: MetricsDependencies = defaultMetricsDependencies
): Promise<ApiMetricsSnapshot> {
  if (!deps.isDbConfigured()) {
    return {
      status: "unavailable",
      windowMinutes: API_WINDOW_MINUTES,
      totalRequests: null,
      errorRate: null,
      p50Ms: null,
      p95Ms: null,
    };
  }

  try {
    const result = await deps.query<{
      total: number | string | null;
      errors: number | string | null;
      p50_ms: number | string | null;
      p95_ms: number | string | null;
    }>(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status_code >= 500)::int AS errors,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms
        FROM rebuild_api_requests
        WHERE created_at >= NOW() - INTERVAL '${API_WINDOW_MINUTES} minutes'
      `
    );

    const row = result.rows[0];
    const total = row?.total != null ? Number(row.total) : 0;
    const errors = row?.errors != null ? Number(row.errors) : 0;
    const p50 = row?.p50_ms != null ? Number(row.p50_ms) : null;
    const p95 = row?.p95_ms != null ? Number(row.p95_ms) : null;

    if (!total) {
      return {
        status: "empty",
        windowMinutes: API_WINDOW_MINUTES,
        totalRequests: 0,
        errorRate: null,
        p50Ms: null,
        p95Ms: null,
      };
    }

    return {
      status: "available",
      windowMinutes: API_WINDOW_MINUTES,
      totalRequests: total,
      errorRate: total > 0 ? errors / total : null,
      p50Ms: Number.isFinite(p50 ?? NaN) ? p50 : null,
      p95Ms: Number.isFinite(p95 ?? NaN) ? p95 : null,
    };
  } catch (error) {
    const errorMapping = mapMetricsTableError(error);
    if (errorMapping.shouldLog) {
      deps.logError("rebuild api metrics query failed", error);
    }

    return {
      status: errorMapping.status,
      windowMinutes: API_WINDOW_MINUTES,
      totalRequests: null,
      errorRate: null,
      p50Ms: null,
      p95Ms: null,
    };
  }
}

export async function getRebuildOutboundClicksSnapshot(
  deps: MetricsDependencies = defaultMetricsDependencies
): Promise<OutboundClicksSnapshot> {
  if (!deps.isDbConfigured()) {
    return {
      status: "unavailable",
      windowHours: OUTBOUND_WINDOW_HOURS,
      totalClicks: null,
      last24hClicks: null,
      lastClickedAtISO: null,
    };
  }

  try {
    const result = await deps.query<{
      total: number | string | null;
      last_24h: number | string | null;
      last_clicked_at: Date | string | null;
    }>(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${OUTBOUND_WINDOW_HOURS} hours')::int AS last_24h,
          MAX(created_at) AS last_clicked_at
        FROM rebuild_outbound_clicks
      `
    );

    const row = result.rows[0];
    const total = row?.total != null ? Number(row.total) : 0;
    const last24h = row?.last_24h != null ? Number(row.last_24h) : 0;
    const lastClickedAtRaw = row?.last_clicked_at ?? null;
    const lastClickedAt =
      lastClickedAtRaw != null ? new Date(lastClickedAtRaw) : null;
    const lastClickedAtISO =
      lastClickedAt && !Number.isNaN(lastClickedAt.getTime())
        ? lastClickedAt.toISOString()
        : null;

    if (!total) {
      return {
        status: "empty",
        windowHours: OUTBOUND_WINDOW_HOURS,
        totalClicks: 0,
        last24hClicks: 0,
        lastClickedAtISO: null,
      };
    }

    return {
      status: "available",
      windowHours: OUTBOUND_WINDOW_HOURS,
      totalClicks: total,
      last24hClicks: last24h,
      lastClickedAtISO,
    };
  } catch (error) {
    const errorMapping = mapMetricsTableError(error);
    if (errorMapping.shouldLog) {
      deps.logError("rebuild outbound clicks query failed", error);
    }

    return {
      status: errorMapping.status,
      windowHours: OUTBOUND_WINDOW_HOURS,
      totalClicks: null,
      last24hClicks: null,
      lastClickedAtISO: null,
    };
  }
}
