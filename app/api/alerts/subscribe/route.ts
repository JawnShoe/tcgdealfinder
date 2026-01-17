import { NextResponse } from "next/server";

/**
 * Legacy subscribe endpoint — permanently redirects to rebuild lane.
 *
 * Stage 1 Legacy Decommission: This route now forwards all requests to
 * /api/rebuild/alerts/subscribe with method and body preserved.
 *
 * Uses 308 Permanent Redirect to maintain POST method and body.
 */
export async function POST(request: Request) {
  const rebuildUrl = new URL("/api/rebuild/alerts/subscribe", request.url);

  return NextResponse.redirect(rebuildUrl, 308);
}
