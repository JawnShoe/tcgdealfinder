import { NextResponse } from "next/server";

import { isAlertsEnabled } from "@/lib/rebuild/alerts/featureFlags";
import { listRecentAlerts } from "@/lib/rebuild/data/alertsOps";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/rebuild/security/rateLimit";

const ROUTE = "/api/rebuild/alerts/history";
const DEFAULT_LIMIT = 50;
const WINDOW_HOURS = 36;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

const RATE_LIMIT = {
  bucket: "alerts-history",
  limit: 60,
  windowMs: 60_000,
};

type AlertsHistoryUnavailableStatus = "db_unavailable" | "db_not_initialized";

type PublicAlertEvent = {
  summary: string;
  occurredAtISO: string;
  triggered: {
    condition: string | null;
    discountPercent: number | null;
  };
};

type AlertsHistoryOkResponse =
  | {
      ok: true;
      alerts: PublicAlertEvent[];
      limit: number;
      windowHours: number;
    }
  | {
      ok: true;
      alerts: [];
      limit: number;
      windowHours: number;
      status: AlertsHistoryUnavailableStatus;
    };

type AlertsHistoryErrorResponse = {
  ok: false;
  error: "rate_limited" | "not_enabled" | "server_error";
};

export async function GET(request: Request) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(request.headers);
  let status = 200;
  let payload: AlertsHistoryOkResponse | AlertsHistoryErrorResponse = {
    ok: true,
    alerts: [],
    limit: DEFAULT_LIMIT,
    windowHours: WINDOW_HOURS,
  };
  let requestError: unknown;

  try {
    if (!isAlertsEnabled()) {
      status = 501;
      payload = { ok: false, error: "not_enabled" };
      return finalizeResponse({ payload, status, requestId });
    }

    const rateKey = getRateLimitKey(request.headers);
    const rateLimit = checkRateLimit({
      bucket: RATE_LIMIT.bucket,
      key: rateKey,
      limit: RATE_LIMIT.limit,
      windowMs: RATE_LIMIT.windowMs,
    });

    if (!rateLimit.allowed) {
      status = 429;
      payload = { ok: false, error: "rate_limited" };
      const response = finalizeResponse({ payload, status, requestId });
      response.headers.set(
        "retry-after",
        Math.ceil(RATE_LIMIT.windowMs / 1000).toString()
      );
      return response;
    }

    if (!isRebuildDbConfigured()) {
      payload = {
        ok: true,
        alerts: [],
        limit: DEFAULT_LIMIT,
        windowHours: WINDOW_HOURS,
        status: "db_unavailable",
      };
      return finalizeResponse({ payload, status, requestId });
    }

    const sinceMs = Date.now() - WINDOW_MS;
    const raw = await listRecentAlerts(DEFAULT_LIMIT);

    const alerts: PublicAlertEvent[] = raw
      .filter((row) => row.created_at.getTime() >= sinceMs)
      .map((row) => ({
        summary: buildSummary({
          cardName: row.card_name,
          setName: row.set_name,
          cardNumber: row.card_number,
        }),
        occurredAtISO: row.created_at.toISOString(),
        triggered: {
          condition: row.condition,
          discountPercent: row.discount_percent,
        },
      }));

    payload = {
      ok: true,
      alerts,
      limit: DEFAULT_LIMIT,
      windowHours: WINDOW_HOURS,
    };
    return finalizeResponse({ payload, status, requestId });
  } catch (error) {
    requestError = error;
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      payload = {
        ok: true,
        alerts: [],
        limit: DEFAULT_LIMIT,
        windowHours: WINDOW_HOURS,
        status: "db_not_initialized",
      };
      return finalizeResponse({ payload, status, requestId });
    }

    status = 500;
    payload = { ok: false, error: "server_error" };
    return finalizeResponse({ payload, status, requestId });
  } finally {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logRequest({
      level,
      msg: "rebuild.alerts.history",
      route: ROUTE,
      requestId,
      durationMs: Date.now() - start,
      status,
      error: requestError,
    });
  }
}

function finalizeResponse(config: {
  payload: AlertsHistoryOkResponse | AlertsHistoryErrorResponse;
  status: number;
  requestId: string;
}): NextResponse {
  const response = NextResponse.json(config.payload, { status: config.status });
  response.headers.set("x-request-id", config.requestId);
  return response;
}

function buildSummary(input: {
  cardName: string;
  setName: string;
  cardNumber: string | null;
}): string {
  const numberSuffix =
    input.cardNumber && input.cardNumber.trim()
      ? ` • #${input.cardNumber.trim()}`
      : "";
  return `${input.cardName} • ${input.setName}${numberSuffix}`;
}
