import { NextRequest, NextResponse } from "next/server";
import { validateCookieHash, DEBUG_ADMIN_COOKIE } from "@/lib/debugAuth";
import { cookies } from "next/headers";
import {
  listListingOverrides,
  setListingOverride,
  clearListingOverride,
  type OverrideType,
} from "@/lib/rebuild/data/listingsOps";

// =============================================================================
// AUTH HELPER
// =============================================================================

function checkOpsAuth(): boolean {
  const cookieStore = cookies();
  const cookieValue = cookieStore.get(DEBUG_ADMIN_COOKIE)?.value;
  return validateCookieHash(cookieValue);
}

// =============================================================================
// VALIDATION
// =============================================================================

const VALID_OVERRIDE_TYPES: OverrideType[] = [
  "ALLOW",
  "HARD_BLOCK",
  "SOFT_EXCLUDE",
];

function isValidOverrideType(value: unknown): value is OverrideType {
  return (
    typeof value === "string" &&
    VALID_OVERRIDE_TYPES.includes(value as OverrideType)
  );
}

// =============================================================================
// GET /api/rebuild/ops/listings - List listing overrides
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!checkOpsAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "200", 10);
    const listingIdFilter = searchParams.get("listingId") || undefined;
    const overrideTypeParam = searchParams.get("overrideType");
    const overrideTypeFilter = isValidOverrideType(overrideTypeParam)
      ? overrideTypeParam
      : undefined;

    const overrides = await listListingOverrides({
      limit: Math.min(limit, 500),
      listingIdFilter,
      overrideTypeFilter,
    });

    return NextResponse.json({
      ok: true,
      overrides,
      count: overrides.length,
    });
  } catch (error) {
    console.error("[rebuild/ops/listings] GET error:", error);

    // Check for missing table error (42P01 = undefined_table in PostgreSQL)
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json({
        ok: true,
        status: "db_not_initialized",
        overrides: [],
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
// POST /api/rebuild/ops/listings - Set listing override
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!checkOpsAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { listingId, overrideType, reason, expiresAt } = body;

    // Validate required fields
    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid listingId" },
        { status: 400 }
      );
    }

    const trimmedId = listingId.trim();
    if (!trimmedId) {
      return NextResponse.json(
        { ok: false, error: "listingId cannot be empty" },
        { status: 400 }
      );
    }

    if (!isValidOverrideType(overrideType)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid overrideType. Must be one of: ${VALID_OVERRIDE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate reason if provided
    const normalizedReason =
      typeof reason === "string" ? reason.trim() || null : null;

    // Validate expiresAt if provided
    let normalizedExpires: string | null = null;
    if (expiresAt && typeof expiresAt === "string") {
      const parsedDate = new Date(expiresAt);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { ok: false, error: "Invalid expiresAt date format" },
          { status: 400 }
        );
      }
      normalizedExpires = parsedDate.toISOString();
    }

    const override = await setListingOverride({
      listingId: trimmedId,
      overrideType,
      reason: normalizedReason,
      expiresAt: normalizedExpires,
    });

    return NextResponse.json({
      ok: true,
      override,
    });
  } catch (error) {
    console.error("[rebuild/ops/listings] POST error:", error);

    // Check for missing table error
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          error: "Database not initialized (missing listing_overrides table)",
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
// DELETE /api/rebuild/ops/listings - Clear listing override
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!checkOpsAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const listingId = searchParams.get("listingId");

    if (!listingId) {
      return NextResponse.json(
        { ok: false, error: "Missing listingId parameter" },
        { status: 400 }
      );
    }

    const removed = await clearListingOverride(listingId);

    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "Override not found for this listing" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Override removed",
    });
  } catch (error) {
    console.error("[rebuild/ops/listings] DELETE error:", error);

    // Check for missing table error
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          error: "Database not initialized (missing listing_overrides table)",
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
