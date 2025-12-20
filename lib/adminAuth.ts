import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ADMIN_AUTH_COOKIE = "admin_auth";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function isAdminAuthenticated(): boolean {
  const cookieValue = cookies().get(ADMIN_AUTH_COOKIE)?.value;
  return cookieValue === "1";
}

export function setAdminAuthCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_AUTH_COOKIE, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export function checkAdminApiAuth(request: Request): {
  authorized: boolean;
  source: "cookie" | "header" | null;
} {
  const cookieValue = cookies().get(ADMIN_AUTH_COOKIE)?.value;
  if (cookieValue === "1") {
    return { authorized: true, source: "cookie" };
  }

  const headerSecret = request.headers.get("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;
  if (envSecret && headerSecret === envSecret) {
    return { authorized: true, source: "header" };
  }

  return { authorized: false, source: null };
}
