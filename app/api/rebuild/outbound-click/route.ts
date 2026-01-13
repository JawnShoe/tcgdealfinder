import { NextResponse } from "next/server";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import {
  recordRebuildApiRequest,
  recordRebuildOutboundClick,
} from "@/lib/rebuild/observability/metrics";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/rebuild/security/rateLimit";
import { parseOutboundClickPayload } from "@/lib/rebuild/security/validation";

const ROUTE = "/api/rebuild/outbound-click";
const RATE_LIMIT = {
  bucket: "outbound-click",
  limit: 20,
  windowMs: 60_000,
};

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(request.headers);
  let status = 200;
  let payload: { ok: boolean; error?: string } = { ok: true };
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
    } else {
      const integrationKilled =
        process.env.KILL_INTEGRATION_OUTBOUND_CLICK === "1";
      if (integrationKilled) {
        status = 503;
        payload = { ok: false, error: "integration_killed" };
      } else {
        const body = await request.json();
        const parsed = parseOutboundClickPayload(body);
        if (parsed.ok) {
          await recordRebuildOutboundClick({
            listingId: parsed.data.listingId ?? null,
            url: parsed.data.url,
            requestId,
          });
        } else {
          status = 400;
          payload = { ok: false, error: "invalid_payload" };
        }
      }
    }
  } catch (error) {
    status = 400;
    payload = { ok: false, error: "invalid_payload" };
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
    msg: "rebuild.outbound-click",
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
