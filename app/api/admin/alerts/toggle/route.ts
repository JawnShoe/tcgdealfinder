import { NextResponse } from "next/server";

import { query } from "../../../../../lib/db";
import { checkAdminApiAuth } from "../../../../../lib/adminAuth";

export async function POST(request: Request) {
  const auth = checkAdminApiAuth(request);
  if (!auth.authorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { id?: number; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.id !== "number" || typeof body.active !== "boolean") {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }

  await query(
    `
      UPDATE alerts_watchlist
      SET active = $2
      WHERE id = $1;
    `,
    [body.id, body.active],
  );

  return NextResponse.json({ ok: true });
}
