import { NextResponse } from "next/server";

import { query } from "../../../../lib/db";
import { checkAdminApiAuth } from "../../../../lib/adminAuth";

export async function POST(request: Request) {
  const auth = checkAdminApiAuth(request);
  if (!auth.authorized) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { sellerUsername?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const sellerUsername = body.sellerUsername?.toLowerCase().trim();
  if (!sellerUsername) {
    return NextResponse.json(
      { error: "sellerUsername is required" },
      { status: 400 },
    );
  }

  await query(
    `
      INSERT INTO seller_blacklist (seller_username)
      VALUES ($1)
      ON CONFLICT (seller_username) DO NOTHING;
    `,
    [sellerUsername],
  );

  await query(
    `
      WITH removed AS (
        DELETE FROM listings
        WHERE seller_username = $1
        RETURNING listing_id, seller_username, title
      )
      INSERT INTO rejected_listings (
        ebay_item_id,
        seller_username,
        title,
        reason
      )
      SELECT
        listing_id,
        seller_username,
        title,
        'manual_seller_blacklist'
      FROM removed;
    `,
    [sellerUsername],
  );

  return NextResponse.json({ ok: true });
}
