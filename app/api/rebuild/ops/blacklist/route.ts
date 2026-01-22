import { NextRequest, NextResponse } from "next/server";
import { validateCookieHash, DEBUG_ADMIN_COOKIE } from "@/lib/debugAuth";
import { cookies } from "next/headers";
import {
  listBlacklistedSellers,
  addBlacklistedSeller,
  removeBlacklistedSeller,
} from "@/lib/rebuild/data/blacklist";

// =============================================================================
// AUTH HELPER
// =============================================================================

async function checkOpsAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DEBUG_ADMIN_COOKIE)?.value;
  return validateCookieHash(cookieValue);
}

// =============================================================================
// GET /api/rebuild/ops/blacklist - List blacklisted sellers
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const sellerFilter = searchParams.get("seller") || undefined;

    const sellers = await listBlacklistedSellers({
      limit: Math.min(limit, 500),
      sellerFilter,
    });

    return NextResponse.json({
      ok: true,
      sellers,
      count: sellers.length,
    });
  } catch (error) {
    console.error("[rebuild/ops/blacklist] GET error:", error);

    // Check for missing table error (42P01 = undefined_table in PostgreSQL)
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json({
        ok: true,
        status: "db_not_initialized",
        sellers: [],
        count: 0,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/rebuild/ops/blacklist - Add seller to blacklist
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { sellerUsername } = body;

    // Validate required fields
    if (!sellerUsername || typeof sellerUsername !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid sellerUsername" },
        { status: 400 }
      );
    }

    const trimmed = sellerUsername.trim();
    if (!trimmed) {
      return NextResponse.json(
        { ok: false, error: "sellerUsername cannot be empty" },
        { status: 400 }
      );
    }

    const seller = await addBlacklistedSeller({
      sellerUsername: trimmed,
    });

    return NextResponse.json({
      ok: true,
      seller,
    });
  } catch (error) {
    console.error("[rebuild/ops/blacklist] POST error:", error);

    // Check for missing table error
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          error: "Database not initialized (missing seller_blacklist table)",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/rebuild/ops/blacklist - Remove seller from blacklist
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const sellerUsername = searchParams.get("sellerUsername");

    if (!sellerUsername) {
      return NextResponse.json(
        { ok: false, error: "Missing sellerUsername parameter" },
        { status: 400 }
      );
    }

    const removed = await removeBlacklistedSeller(sellerUsername);

    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "Seller not found in blacklist" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Seller removed from blacklist",
    });
  } catch (error) {
    console.error("[rebuild/ops/blacklist] DELETE error:", error);

    // Check for missing table error
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          error: "Database not initialized (missing seller_blacklist table)",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
