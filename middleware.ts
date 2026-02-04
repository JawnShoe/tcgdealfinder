import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/discovery") {
    const rawSort = request.nextUrl.searchParams.get("sort") ?? "";
    const sort = rawSort.trim();
    if (sort) {
      const normalized =
        sort === "ending-soon" || sort === "endingsoon" ? "endingSoon" : sort;
      const allowed = ["newest", "biggest-discount", "endingSoon"];
      if (!allowed.includes(normalized)) {
        return new NextResponse("Not Found", { status: 404 });
      }
    }
  }

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/",
    "/discovery",
    "/listing/:path*",
    "/alerts/:path*",
    "/ops/:path*",
    "/api/rebuild/:path*",
    "/api/health",
  ],
};
