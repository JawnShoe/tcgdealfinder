import { NextResponse } from "next/server";
import {
  getRequestIdFromHeaders,
  logRequest,
} from "@/lib/rebuild/observability/logging";
import {
  recordRebuildApiRequest,
  recordRebuildOutboundClick,
} from "@/lib/rebuild/observability/metrics";

const ROUTE = "/api/rebuild/outbound-click";

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestIdFromHeaders(request.headers);
  let status = 200;
  let payload: { ok: boolean; error?: string } = { ok: true };
  let requestError: unknown;

  try {
    const integrationKilled =
      process.env.KILL_INTEGRATION_OUTBOUND_CLICK === "1";
    if (integrationKilled) {
      status = 503;
      payload = { ok: false, error: "integration_killed" };
    } else {
      const body = await request.json();
      const url = typeof body?.url === "string" ? body.url : null;
      const listingId =
        typeof body?.listingId === "string" ? body.listingId : null;

      if (!url) {
        status = 400;
        payload = { ok: false, error: "missing_url" };
      } else {
        await recordRebuildOutboundClick({ listingId, url, requestId });
      }
    }
  } catch (error) {
    status = 400;
    payload = { ok: false, error: "invalid_json" };
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
  return response;
}
