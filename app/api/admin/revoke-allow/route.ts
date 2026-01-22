import { NextResponse } from "next/server";

import { query } from "../../../../lib/db";
import { checkAdminApiAuth } from "../../../../lib/adminAuth";

export async function POST(request: Request) {
  const auth = await checkAdminApiAuth(request);
  if (!auth.authorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { listingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId =
    typeof body.listingId === "string" ? body.listingId.trim() : "";
  if (!listingId) {
    return NextResponse.json(
      { error: "listingId is required" },
      { status: 400 }
    );
  }

  const res = await query(
    `
      DELETE FROM listing_overrides
      WHERE listing_id = $1
        AND override_type = 'ALLOW'
        AND reason IN (
          'manual_allow:language_mismatch',
          'manual_allow:collector_number_mismatch'
        );
    `,
    [listingId]
  );

  return NextResponse.json({ ok: true, deleted: res.rowCount ?? 0 });
}
