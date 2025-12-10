import { NextResponse } from "next/server";

import { query } from "../../../../../lib/db";

const ADMIN_SECRET = "V6DU6T^P9fSx";

function isAuthorized(secret: string | null): boolean {
  return secret === ADMIN_SECRET;
}

export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-admin-secret");
  if (!isAuthorized(secretHeader)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: {
    cardId?: number;
    condition?: string;
    thresholdType?: string;
    thresholdValue?: number;
    note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { cardId, condition, thresholdType, thresholdValue, note } = body;

  if (
    typeof cardId !== "number" ||
    !condition ||
    (thresholdType !== "price_below" && thresholdType !== "discount_at_least") ||
    typeof thresholdValue !== "number"
  ) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }

  await query(
    `
      INSERT INTO alerts_watchlist (
        card_id,
        condition,
        threshold_type,
        threshold_value,
        active,
        note,
        created_at
      )
      VALUES ($1, $2, $3, $4, TRUE, $5, NOW());
    `,
    [cardId, condition, thresholdType, thresholdValue, note ?? null],
  );

  return NextResponse.json({ ok: true });
}
