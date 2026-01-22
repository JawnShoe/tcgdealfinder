import { NextResponse } from "next/server";

import { query } from "../../../../../lib/db";
import { checkAdminApiAuth } from "../../../../../lib/adminAuth";

export async function POST(request: Request) {
  const auth = await checkAdminApiAuth(request);
  if (!auth.authorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.id !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await query(
    `
      DELETE FROM alerts_watchlist
      WHERE id = $1;
    `,
    [body.id]
  );

  return NextResponse.json({ ok: true });
}
