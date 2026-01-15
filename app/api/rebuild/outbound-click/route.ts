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
import { isRebuildDbConfigured } from "@/lib/rebuild/data/dataAvailability";
import { queryRebuild } from "@/lib/rebuild/db";
import {
  isObviousAutomationUserAgent,
  normalizeOutboundUrlForStorage,
  shouldSuppressDuplicateClick,
  validateOutboundClickTarget,
} from "@/lib/rebuild/compliance/outboundClickIntegrity";

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
      const userAgent = request.headers.get("user-agent");
      if (isObviousAutomationUserAgent(userAgent)) {
        status = 403;
        payload = { ok: false, error: "bot_blocked" };
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
            const normalized = normalizeOutboundUrlForStorage(parsed.data.url);
            if (!normalized.ok) {
              status = 400;
              payload = { ok: false, error: "invalid_payload" };
            } else if (!isRebuildDbConfigured()) {
              await recordRebuildOutboundClick({
                listingId: parsed.data.listingId,
                url: normalized.value,
                requestId,
              });
            } else {
              const listingResult = await queryRebuild<{
                listing_id: string;
                url: string | null;
                market: string | null;
              }>(
                `
                SELECT listing_id, url, market
                FROM listings
                WHERE listing_id = $1
                LIMIT 1
              `,
                [parsed.data.listingId]
              );

              const listing = listingResult.rows[0];
              if (!listing) {
                status = 400;
                payload = { ok: false, error: "unknown_listing" };
              } else {
                const validation = validateOutboundClickTarget({
                  rawUrl: parsed.data.url,
                  expectedListingUrl: listing.url ?? null,
                  listingMarket: listing.market ?? null,
                });

                if (validation.ok === false) {
                  status = 400;
                  payload = { ok: false, error: validation.error };
                } else {
                  const lastClickResult = await queryRebuild<{
                    created_at: Date | string;
                  }>(
                    `
                    SELECT created_at
                    FROM rebuild_outbound_clicks
                    WHERE listing_id = $1 AND url = $2
                    ORDER BY created_at DESC
                    LIMIT 1
                  `,
                    [listing.listing_id, validation.normalizedUrl]
                  );

                  const lastClickRow = lastClickResult.rows[0];
                  const previousClickAtMs = lastClickRow?.created_at
                    ? new Date(lastClickRow.created_at).getTime()
                    : null;

                  if (
                    shouldSuppressDuplicateClick({
                      nowMs: Date.now(),
                      previousClickAtMs,
                    })
                  ) {
                    // Duplicate click within TTL: treat as success but do not write a new row.
                  } else {
                    await recordRebuildOutboundClick({
                      listingId: listing.listing_id,
                      url: validation.normalizedUrl,
                      requestId,
                    });
                  }
                }
              }
            }
          } else {
            status = 400;
            payload = { ok: false, error: "invalid_payload" };
          }
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
