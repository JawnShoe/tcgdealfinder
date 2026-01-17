import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// GET /debug/login?token=...&redirect=...
// DEPRECATED: Redirects to /api/rebuild/ops/login (Stage 2 MIGRATE)
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  // Build redirect URL preserving query params
  const rebuildUrl = new URL("/api/rebuild/ops/login", request.url);
  rebuildUrl.search = searchParams.toString();

  return NextResponse.redirect(rebuildUrl, { status: 308 });
}
