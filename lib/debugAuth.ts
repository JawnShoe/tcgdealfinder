import { createHash } from "crypto";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEBUG_ADMIN_COOKIE = "dbg_admin";

// Cookie settings
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const, // Changed from 'strict' to 'lax' for API route access
    secure: isProduction, // false on localhost, true in production
    path: "/", // Changed from "/debug" to "/" so cookie is sent to /api/debug/* routes
    maxAge: COOKIE_MAX_AGE,
  };
}

// =============================================================================
// HASHING: Never store raw token in cookie
// =============================================================================

/**
 * Hash the token using SHA-256.
 * The cookie stores this hash, not the raw token.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Get the expected hash from the environment token.
 * Returns null if no token is configured.
 */
function getExpectedHash(): string | null {
  const envToken = process.env.DEBUG_ADMIN_TOKEN;
  if (!envToken) {
    return null;
  }
  return hashToken(envToken);
}

/**
 * Validate a raw token against the environment token.
 */
export function validateRawToken(token: string | null | undefined): boolean {
  const envToken = process.env.DEBUG_ADMIN_TOKEN;
  if (!envToken || !token) {
    return false;
  }
  return token === envToken;
}

/**
 * Validate the cookie hash against the expected hash.
 */
export function validateCookieHash(cookieValue: string | null | undefined): boolean {
  const expectedHash = getExpectedHash();
  if (!expectedHash || !cookieValue) {
    return false;
  }
  return cookieValue === expectedHash;
}

// =============================================================================
// AUTH CHECK (for server components and route handlers)
// =============================================================================

export type AuthResult = {
  valid: boolean;
  source: "cookie" | "header" | "query" | null;
  /** If valid via query param, we should set cookie and redirect */
  shouldSetCookieAndRedirect: boolean;
  queryToken?: string;
};

/**
 * Check debug authentication from multiple sources.
 * Priority: cookie > header > query param
 * 
 * If valid via query param, returns shouldSetCookieAndRedirect = true
 * so the caller can set the cookie and redirect to a clean URL.
 */
export function checkDebugAuth(
  searchParams: Record<string, string | string[] | undefined>
): AuthResult {
  const expectedHash = getExpectedHash();
  
  // If no token configured, deny all
  if (!expectedHash) {
    return { valid: false, source: null, shouldSetCookieAndRedirect: false };
  }
  
  // 1. Check cookie first (preferred)
  const cookieStore = cookies();
  const cookieValue = cookieStore.get(DEBUG_ADMIN_COOKIE)?.value;
  
  // Debug logging
  const allCookies = cookieStore.getAll();
  console.log("[DEBUG] checkDebugAuth - Cookies:", {
    targetCookie: DEBUG_ADMIN_COOKIE,
    cookieValue: cookieValue ? `${cookieValue.substring(0, 8)}...` : null,
    allCookieNames: allCookies.map(c => c.name),
    expectedHash: expectedHash ? `${expectedHash.substring(0, 8)}...` : null,
  });
  
  if (cookieValue && validateCookieHash(cookieValue)) {
    console.log("[DEBUG] checkDebugAuth - Cookie valid");
    return { valid: true, source: "cookie", shouldSetCookieAndRedirect: false };
  }
  
  // 2. Check x-debug-token header
  const headersList = headers();
  const headerToken = headersList.get("x-debug-token");
  if (validateRawToken(headerToken)) {
    return { valid: true, source: "header", shouldSetCookieAndRedirect: false };
  }
  
  // 3. Check query param (if valid, we'll set cookie and redirect)
  const queryToken = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : searchParams.token;
  
  if (validateRawToken(queryToken)) {
    return { 
      valid: true, 
      source: "query", 
      shouldSetCookieAndRedirect: true,
      queryToken,
    };
  }
  
  return { valid: false, source: null, shouldSetCookieAndRedirect: false };
}

// =============================================================================
// COOKIE MANAGEMENT
// =============================================================================

/**
 * Set the debug admin cookie with the hashed token.
 */
export function setDebugCookie(response: NextResponse): void {
  const expectedHash = getExpectedHash();
  if (!expectedHash) return;
  
  const options = getCookieOptions();
  response.cookies.set(DEBUG_ADMIN_COOKIE, expectedHash, options);
}

/**
 * Clear the debug admin cookie.
 */
export function clearDebugCookie(response: NextResponse): void {
  response.cookies.set(DEBUG_ADMIN_COOKIE, "", {
    ...getCookieOptions(),
    maxAge: 0,
  });
}

/**
 * Create a redirect response that sets the debug cookie.
 */
export function createLoginRedirect(redirectTo: string): NextResponse {
  const response = NextResponse.redirect(new URL(redirectTo, "http://localhost:3000"), {
    status: 302,
  });
  setDebugCookie(response);
  return response;
}
