import { NextResponse } from "next/server";

import { createOrUpdateSubscription } from "../../../../lib/emailSubscriptions";
import {
  MAX_ALERT_THRESHOLD,
  MIN_ALERT_THRESHOLD,
} from "../../../../lib/alertsConfig";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cardId = Number(body?.cardId);
    const email = String(body?.email ?? "").trim();
    const minDiscountInput = Number(body?.minDiscountPercent ?? 10);

    if (!Number.isFinite(cardId) || cardId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid card id" },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "A valid email address is required." },
        { status: 400 },
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
        { status: 400 },
      );
    }

    const minDiscountPercent = Math.abs(minDiscountInput);

    await createOrUpdateSubscription({
      cardId,
      email,
      minDiscountPercent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to create subscription", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create subscription." },
      { status: 500 },
    );
  }
}
