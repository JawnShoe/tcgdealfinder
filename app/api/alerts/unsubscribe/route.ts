import { NextResponse } from "next/server";

import { unsubscribeByToken } from "../../../../lib/emailSubscriptions";
import { isAlertsEnabled } from "../../../../lib/featureFlags";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_CONFIG,
} from "../../../../lib/rateLimit";

const ROUTE_ID = "/api/alerts/unsubscribe";

export async function GET(request: Request) {
  // Feature flag gate: if alerts are disabled, return 501 and do NOT write to DB
  if (!isAlertsEnabled()) {
    return new NextResponse(renderHtml("Alerts are not enabled."), {
      status: 501,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Rate limiting: enforce before any processing
  const clientIp = getClientIp(request);
  const rateCheck = await checkRateLimit(ROUTE_ID, clientIp);

  if (!rateCheck.allowed) {
    const response = new NextResponse(
      renderHtml("Too many requests. Please try again later."),
      { status: 429, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
    if (rateCheck.retryAfterSeconds) {
      response.headers.set("Retry-After", String(rateCheck.retryAfterSeconds));
    }
    response.headers.set(
      "X-RateLimit-Limit",
      String(RATE_LIMIT_CONFIG.maxRequests)
    );
    response.headers.set("X-RateLimit-Remaining", "0");
    return response;
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(renderHtml("Missing unsubscribe token."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const success = await unsubscribeByToken(token);
  return new NextResponse(
    renderHtml(
      success
        ? "You have been unsubscribed from alerts for this card."
        : "This unsubscribe link is invalid or has already been used."
    ),
    {
      status: success ? 200 : 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

function renderHtml(message: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TCG Deal Finder Alerts</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: white; padding: 24px 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px rgba(15, 23, 42, 0.05); max-width: 420px; text-align: center; }
      h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
      p { font-size: 0.95rem; margin: 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>TCG Deal Finder</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`;
}
