import { NextResponse } from "next/server";
import {
  evaluatePriceThresholdAlert,
  evaluateSavedSearchAlert,
  evaluateTrustThresholdAlert,
} from "@/lib/rebuild/alerts/alerts";
import { parseAlertEvaluatePayload } from "@/lib/rebuild/alerts/validation";
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { getRecentDeals } from "@/lib/rebuild/data/getRecentDeals";
import { getRebuildListingById } from "@/lib/rebuild/data/getRebuildListingById";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import { recordRebuildApiRequest } from "@/lib/rebuild/observability/metrics";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/rebuild/security/rateLimit";

const ROUTE = "/api/rebuild/alerts/evaluate";
const RATE_LIMIT = {
  bucket: "alerts-evaluate",
  limit: 30,
  windowMs: 60_000,
};
const DEFAULT_CANDIDATE_LIMIT = 25;

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(request.headers);
  let status = 200;
  let payload: Record<string, unknown> = { ok: true };
  let requestError: unknown;

  try {
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
    } else if (!isRebuildDbConfigured()) {
      status = 503;
      payload = { ok: false, error: "db_unavailable" };
    } else {
      const body = await request.json();
      const parsed = parseAlertEvaluatePayload(body);
      if (!parsed.ok) {
        status = 400;
        payload = { ok: false, error: "invalid_payload" };
      } else {
        const { alert, candidateLimit } = parsed.data;
        if (alert.type === "saved_search") {
          const { deals } = await getRecentDeals(
            candidateLimit ?? DEFAULT_CANDIDATE_LIMIT
          );
          payload = {
            ok: true,
            decision: evaluateSavedSearchAlert(alert, deals),
          };
        } else if (alert.type === "price_threshold") {
          const listing = await getRebuildListingById(alert.listingId);
          payload = listing
            ? {
                ok: true,
                decision: evaluatePriceThresholdAlert(alert, listing),
              }
            : {
                ok: true,
                decision: {
                  shouldFire: false,
                  reasons: ["listing_not_found"],
                },
              };
        } else {
          const listing = await getRebuildListingById(alert.listingId);
          payload = listing
            ? {
                ok: true,
                decision: evaluateTrustThresholdAlert(alert, listing),
              }
            : {
                ok: true,
                decision: {
                  shouldFire: false,
                  reasons: ["listing_not_found"],
                },
              };
        }
      }
    }
  } catch (error) {
    status = 500;
    payload = { ok: false, error: "server_error" };
    requestError = error;
  }

  await recordRebuildApiRequest({
    route: ROUTE,
    statusCode: status,
    durationMs: Date.now() - start,
    requestId,
  });

  const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  logRequest({
    level,
    msg: "rebuild.alerts.evaluate",
    route: ROUTE,
    requestId,
    durationMs: Date.now() - start,
    status,
    error: requestError,
  });

  const response = NextResponse.json(payload, { status });
  response.headers.set("x-request-id", requestId);
  if (status === 429) {
    response.headers.set(
      "retry-after",
      Math.ceil(RATE_LIMIT.windowMs / 1000).toString()
    );
  }
  return response;
}
