import { NextRequest, NextResponse } from "next/server";
import {
  validateRawToken,
  hashToken,
  DEBUG_ADMIN_COOKIE,
} from "@/lib/debugAuth";

// =============================================================================
// GET /api/rebuild/ops/login?token=...&redirect=...
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");
  const redirectTo = searchParams.get("redirect") || "/rebuild/ops";

  // Validate token (return 404 to avoid discovery, not 401)
  if (!validateRawToken(token)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Validate redirect target (must be /rebuild/ops/* or /debug/* to prevent open redirects)
  const safeRedirect =
    redirectTo.startsWith("/rebuild/ops/") ||
    redirectTo.startsWith("/rebuild/ops") ||
    redirectTo.startsWith("/debug/")
      ? redirectTo
      : "/rebuild/ops";

  // Create redirect
  const redirectUrl = new URL(safeRedirect, request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });

  // Set HttpOnly cookie with hashed token
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set(DEBUG_ADMIN_COOKIE, hashToken(token!), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}
