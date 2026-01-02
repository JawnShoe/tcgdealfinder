import { NextResponse } from "next/server";

import {
  MAX_ALERT_THRESHOLD,
  MIN_ALERT_THRESHOLD,
} from "../../../../lib/alertsConfig";
import { createOrUpdateSubscription } from "../../../../lib/emailSubscriptions";
import { isAlertsEnabled } from "../../../../lib/featureFlags";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_CONFIG,
} from "../../../../lib/rateLimit";

const ROUTE_ID = "/api/alerts/subscribe";

export async function POST(request: Request) {
  // Feature flag gate: if alerts are disabled, return 501 and do NOT write to DB
  if (!isAlertsEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Alerts are not enabled." },
      { status: 501 }
    );
  }

  try {
    // Rate limiting: enforce before any processing
    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimit(ROUTE_ID, clientIp);

    if (!rateCheck.allowed) {
      const response = NextResponse.json(
        {
          ok: false,
          error: "Too many requests. Please try again later.",
        },
        { status: 429 }
      );
      if (rateCheck.retryAfterSeconds) {
        response.headers.set(
          "Retry-After",
          String(rateCheck.retryAfterSeconds)
        );
      }
      response.headers.set(
        "X-RateLimit-Limit",
        String(RATE_LIMIT_CONFIG.maxRequests)
      );
      response.headers.set("X-RateLimit-Remaining", "0");
      return response;
    }

    const body = await request.json();
    const cardId = Number(body?.cardId);
    const email = String(body?.email ?? "").trim();
    const minDiscountInput = Number(body?.minDiscountPercent ?? 10);

    if (!Number.isFinite(cardId) || cardId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid card id" },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(minDiscountInput) ||
      minDiscountInput < MIN_ALERT_THRESHOLD ||
      minDiscountInput > MAX_ALERT_THRESHOLD
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `Discount percent must be between ${MIN_ALERT_THRESHOLD}% and ${MAX_ALERT_THRESHOLD}%.`,
        },
        { status: 400 }
      );
    }

    const minDiscountPercent = Math.abs(minDiscountInput);

    await createOrUpdateSubscription({
      cardId,
      email,
      minDiscountPercent,
    });

    const response = NextResponse.json({ ok: true });
    response.headers.set(
      "X-RateLimit-Limit",
      String(RATE_LIMIT_CONFIG.maxRequests)
    );
    response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
    return response;
  } catch (error) {
    console.error("Failed to create subscription", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create subscription." },
      { status: 500 }
    );
  }
}
