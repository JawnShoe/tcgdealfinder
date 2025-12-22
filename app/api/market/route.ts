import { NextResponse, type NextRequest } from "next/server";

import { MARKET_COOKIE_NAME, parseMarketPreference } from "../../../lib/marketPreference";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function POST(request: NextRequest) {
  let body: { market?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const preference = parseMarketPreference(body.market ?? null);
  if (!preference) {
    return NextResponse.json(
      { error: "market must be a supported market or 'all'" },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true, market: preference });
  response.cookies.set(MARKET_COOKIE_NAME, preference, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}
