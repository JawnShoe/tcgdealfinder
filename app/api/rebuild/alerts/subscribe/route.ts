import { NextResponse } from "next/server";

import { isAlertsEnabled } from "@/lib/rebuild/alerts/featureFlags";
import {
  createOrUpdateSubscription,
  MIN_ALERT_THRESHOLD,
  MAX_ALERT_THRESHOLD,
} from "@/lib/rebuild/data/createOrUpdateSubscription";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/rebuild/security/rateLimit";

const RATE_LIMIT = {
  bucket: "alerts-subscribe",
  limit: 10,
  windowMs: 60_000,
};

export async function POST(request: Request) {
  // Feature flag gate: if alerts are disabled, return 501 and do NOT write to DB
  if (!isAlertsEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Alerts are not enabled." },
      { status: 501 }
    );
  }

  // Rate limiting: enforce before any processing
  const rateKey = getRateLimitKey(request.headers);
  const rateLimit = checkRateLimit({
    bucket: RATE_LIMIT.bucket,
    key: rateKey,
    limit: RATE_LIMIT.limit,
    windowMs: RATE_LIMIT.windowMs,
  });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        ok: false,
        error: "Too many requests. Please try again later.",
      },
      { status: 429 }
    );
    response.headers.set(
      "Retry-After",
      Math.ceil(RATE_LIMIT.windowMs / 1000).toString()
    );
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT.limit));
    response.headers.set("X-RateLimit-Remaining", "0");
    return response;
  }

  try {
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
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    return response;
  } catch (error) {
    console.error("Failed to create subscription", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create subscription." },
      { status: 500 }
    );
  }
}
