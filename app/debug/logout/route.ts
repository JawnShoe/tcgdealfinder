import { NextRequest, NextResponse } from "next/server";
import { DEBUG_ADMIN_COOKIE } from "@/lib/debugAuth";

// =============================================================================
// GET /debug/logout
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Redirect to /debug/exclusions (which will 404 without valid auth)
  const redirectUrl = new URL("/debug/exclusions", request.url);
  const response = NextResponse.redirect(redirectUrl, { status: 302 });
  
  // Clear the cookie by setting maxAge to 0
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set(DEBUG_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    path: "/debug",
    maxAge: 0,
  });
  
  return response;
}
