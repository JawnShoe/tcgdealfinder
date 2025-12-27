import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ADMIN_AUTH_COOKIE = "admin_auth";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const TOKEN_EXPIRY_MS = ADMIN_COOKIE_MAX_AGE * 1000; // 7 days in ms

/**
 * Token format: timestamp.signature
 * - timestamp: Unix epoch milliseconds when token was created
 * - signature: HMAC-SHA256 of timestamp using ADMIN_SECRET as key
 *
 * Security properties:
 * - Time-bound: tokens expire after 7 days (matches cookie maxAge)
 * - Signed: cannot be forged without ADMIN_SECRET
 * - No secrets in token: only timestamp is visible, signature is opaque
 *
 * Rotation: Changing ADMIN_SECRET invalidates all existing tokens immediately.
 */

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET;
}

function createSignature(timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(timestamp).digest("hex");
}

/**
 * Creates a signed, time-bound admin token.
 * Format: timestamp.signature
 */
export function createAdminToken(): string | null {
  const secret = getAdminSecret();
  if (!secret) {
    return null;
  }

  const timestamp = Date.now().toString();
  const signature = createSignature(timestamp, secret);
  return `${timestamp}.${signature}`;
}

/**
 * Verifies a signed admin token.
 * Returns true if:
 * - Token format is valid (timestamp.signature)
 * - Signature matches (using timing-safe comparison)
 * - Token has not expired (within 7 days)
 */
export function verifyAdminToken(token: string): boolean {
  const secret = getAdminSecret();
  if (!secret) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [timestamp, providedSignature] = parts;

  // Validate timestamp is a number
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime)) {
    return false;
  }

  // Check expiration
  const now = Date.now();
  if (now - tokenTime > TOKEN_EXPIRY_MS) {
    return false;
  }

  // Check for future timestamps (clock skew tolerance: 60 seconds)
  if (tokenTime > now + 60000) {
    return false;
  }

  // Verify signature using timing-safe comparison
  const expectedSignature = createSignature(timestamp, secret);

  // Both signatures must be same length for timing-safe comparison
  if (providedSignature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(providedSignature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(): boolean {
  const cookieValue = cookies().get(ADMIN_AUTH_COOKIE)?.value;
  if (!cookieValue) {
    return false;
  }
  return verifyAdminToken(cookieValue);
}

export function setAdminAuthCookie(response: NextResponse): boolean {
  const token = createAdminToken();
  if (!token) {
    return false;
  }

  response.cookies.set(ADMIN_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return true;
}

export function checkAdminApiAuth(request: Request): {
  authorized: boolean;
  source: "cookie" | "header" | null;
} {
  const cookieValue = cookies().get(ADMIN_AUTH_COOKIE)?.value;
  if (cookieValue && verifyAdminToken(cookieValue)) {
    return { authorized: true, source: "cookie" };
  }

  // Fallback: header-based auth for internal scripts
  // This uses the raw ADMIN_SECRET for backward compatibility
  const headerSecret = request.headers.get("x-admin-secret");
  const envSecret = getAdminSecret();
  if (envSecret && headerSecret === envSecret) {
    return { authorized: true, source: "header" };
  }

  return { authorized: false, source: null };
}
