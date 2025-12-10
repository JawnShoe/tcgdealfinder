import { NextResponse } from "next/server";

import { query } from "../../../../lib/db";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAuthorized(secret: string | null): boolean {
  return Boolean(ADMIN_SECRET) && secret === ADMIN_SECRET;
}

export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-admin-secret");
  if (!isAuthorized(secretHeader)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { listingId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const listingId = body.listingId;
  if (!listingId || Number.isNaN(Number(listingId))) {
    return NextResponse.json(
      { error: "listingId is required" },
      { status: 400 },
    );
  }

  const listingRes = await query<{
    listing_id: string | null;
    seller_username: string | null;
    title: string;
  }>(
    `
      SELECT listing_id, seller_username, title
      FROM listings
      WHERE id = $1
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

  await query(
    `
      INSERT INTO rejected_listings (
        ebay_item_id,
        seller_username,
        title,
        reason
      )
      VALUES ($1, $2, $3, $4);
    `,
    [
      listing.listing_id,
      listing.seller_username,
      listing.title,
      "manual_hide",
    ],
  );

  await query(
    `
      DELETE FROM listings
      WHERE id = $1;
    `,
    [listingId],
  );

  return NextResponse.json({ ok: true });
}
