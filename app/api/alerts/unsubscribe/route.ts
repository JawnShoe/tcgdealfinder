import { NextResponse } from "next/server";

/**
 * Legacy unsubscribe endpoint — permanently redirects to rebuild lane.
 *
 * Stage 1 Legacy Decommission: This route now forwards all requests to
 * /api/rebuild/alerts/unsubscribe with the token query param preserved.
 *
 * Uses 308 Permanent Redirect to maintain GET method and signal permanence.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  const rebuildUrl = new URL("/api/rebuild/alerts/unsubscribe", request.url);
  if (token) {
    rebuildUrl.searchParams.set("token", token);
  }

  return NextResponse.redirect(rebuildUrl, 308);
}
