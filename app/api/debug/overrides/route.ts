import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkDebugAuth } from "@/lib/debugAuth";
import type { OverrideType, ListingOverride } from "@/lib/schema";

// =============================================================================
// POST /api/debug/overrides - Create or update an override
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const { searchParams } = request.nextUrl;
  const params: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const auth = await checkDebugAuth(params);

  // Debug logging
  if (!auth.valid) {
    console.log("[DEBUG] POST /api/debug/overrides - Auth failed:", {
      source: auth.source,
      hasToken: !!process.env.DEBUG_ADMIN_TOKEN,
      searchParams: Object.fromEntries(searchParams.entries()),
    });
    return new NextResponse("Not Found", { status: 404 });
  }

  console.log("[DEBUG] POST /api/debug/overrides - Auth success:", auth.source);

  try {
    const body = await request.json();
    const { listingId, overrideType, reason, createdBy, expiresAt } = body;

    // Validate required fields
    if (!listingId || !overrideType) {
      return NextResponse.json(
        { error: "Missing required fields: listingId, overrideType" },
        { status: 400 }
      );
    }

    // Validate override type
    const validTypes: OverrideType[] = ["ALLOW", "HARD_BLOCK", "SOFT_EXCLUDE"];
    if (!validTypes.includes(overrideType)) {
      return NextResponse.json(
        {
          error: `Invalid overrideType. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Upsert override
    const result = await query<ListingOverride>(
      `INSERT INTO listing_overrides (listing_id, override_type, reason, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (listing_id)
       DO UPDATE SET
         override_type = $2,
         reason = $3,
         created_by = $4,
         expires_at = $5,
         created_at = NOW()
       RETURNING *`,
      [
        listingId,
        overrideType,
        reason || null,
        createdBy || "debug",
        expiresAt || null,
      ]
    );

    return NextResponse.json({
      success: true,
      override: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating override:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/debug/overrides - List overrides
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const { searchParams } = request.nextUrl;
  const params: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const auth = await checkDebugAuth(params);
  if (!auth.valid) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const since = searchParams.get("since");
    const overrideType = searchParams.get("overrideType");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Join with listings table to get listing details
    // listing_id format is "v1|{market}|{id}|{variant}", need to extract the numeric ID
    let queryStr = `
      SELECT 
        lo.listing_id,
        lo.override_type,
        lo.reason,
        lo.created_at,
        lo.created_by,
        lo.expires_at,
        l.title,
        l.url,
        l.market,
        l.price_cad,
        l.shipping_cad,
        l.total_price_cad,
        l.card_id
      FROM listing_overrides lo
      LEFT JOIN listings l ON l.listing_id = lo.listing_id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by date
    if (since) {
      queryStr += ` AND lo.created_at >= $${paramIndex}`;
      queryParams.push(since);
      paramIndex++;
    }

    // Filter by type
    if (overrideType) {
      queryStr += ` AND lo.override_type = $${paramIndex}`;
      queryParams.push(overrideType);
      paramIndex++;
    }

    // Order and limit
    queryStr += ` ORDER BY lo.created_at DESC LIMIT $${paramIndex}`;
    queryParams.push(limit);

    const result = await query<any>(queryStr, queryParams);

    // Debug logging
    if (result.rows.length > 0) {
      console.log(
        "[DEBUG] GET /api/debug/overrides - Sample row:",
        JSON.stringify(result.rows[0], null, 2)
      );
      console.log("[DEBUG] Fields present:", Object.keys(result.rows[0]));
    }
    console.log("[DEBUG] Total overrides returned:", result.rows.length);

    return NextResponse.json({
      success: true,
      overrides: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching overrides:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/debug/overrides - Remove an override
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const { searchParams } = request.nextUrl;
  const params: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const auth = await checkDebugAuth(params);
  if (!auth.valid) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const listingId = searchParams.get("listingId");

    if (!listingId) {
      return NextResponse.json(
        { error: "Missing required parameter: listingId" },
        { status: 400 }
      );
    }

    const result = await query(
      "DELETE FROM listing_overrides WHERE listing_id = $1 RETURNING *",
      [listingId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Override not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Override removed",
    });
  } catch (error) {
    console.error("Error deleting override:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
