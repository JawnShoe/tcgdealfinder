import { NextResponse } from "next/server";

import { setAdminAuthCookie } from "../../../../lib/adminAuth";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export async function POST(request: Request) {
  if (!ADMIN_SECRET) {
    return new NextResponse("Admin auth not configured", { status: 500 });
  }

  let body: { secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.secret || body.secret !== ADMIN_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminAuthCookie(response);
  return response;
}
