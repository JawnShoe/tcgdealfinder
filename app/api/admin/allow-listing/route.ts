import { NextResponse } from "next/server";

import { query } from "../../../../lib/db";
import { checkAdminApiAuth } from "../../../../lib/adminAuth";

const ALLOWED_REASONS = new Set([
  "language_mismatch",
  "collector_number_mismatch",
]);

export async function POST(request: Request) {
  const auth = checkAdminApiAuth(request);
  if (!auth.authorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { listingId?: string; rejectReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const listingId = typeof body.listingId === "string"
    ? body.listingId.trim()
    : "";
  if (!listingId) {
    return NextResponse.json(
      { error: "listingId is required" },
      { status: 400 },
    );
  }

  const rejectReason = typeof body.rejectReason === "string"
    ? body.rejectReason.trim()
    : "";
  if (!ALLOWED_REASONS.has(rejectReason)) {
    return NextResponse.json(
      { error: "rejectReason must be language_mismatch or collector_number_mismatch" },
      { status: 400 },
    );
  }

  const listingRes = await query<{
    listing_id: string;
    match_reject_reason: string | null;
  }>(
    `
      SELECT listing_id, match_reject_reason
      FROM listings
      WHERE listing_id = $1
      LIMIT 1;
    `,
    [listingId],
  );

  const listing = listingRes.rows[0];
  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 },
    );
  }

  if (listing.match_reject_reason !== rejectReason) {
    return NextResponse.json(
      { error: "Listing reject reason does not match requested override" },
      { status: 400 },
    );
  }

  const overrideReason = `manual_allow:${rejectReason}`;

  await query(
    `
      INSERT INTO listing_overrides (listing_id, override_type, reason, created_by, expires_at)
      VALUES ($1, 'ALLOW', $2, 'admin', NULL)
      ON CONFLICT (listing_id) DO UPDATE
        SET override_type = EXCLUDED.override_type,
            reason = EXCLUDED.reason,
            created_by = EXCLUDED.created_by,
            expires_at = EXCLUDED.expires_at;
    `,
    [listingId, overrideReason],
  );

  return NextResponse.json({ ok: true });
}
