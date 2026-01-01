import { randomUUID } from "crypto";
import type { NextResponse } from "next/server";

export const ANON_ID_COOKIE = "anon_id";
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidAnonId(
  value: string | null | undefined
): value is string {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

export function createAnonId(): string {
  return randomUUID();
}

export function setAnonIdCookie(response: NextResponse, anonId: string) {
  response.cookies.set(ANON_ID_COOKIE, anonId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANON_COOKIE_MAX_AGE,
  });
}

export function mintAnonIdCookie(response: NextResponse): string {
  const anonId = createAnonId();
  setAnonIdCookie(response, anonId);
  return anonId;
}
