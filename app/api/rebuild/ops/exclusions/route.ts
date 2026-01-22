import { NextRequest, NextResponse } from "next/server";
import { validateCookieHash, DEBUG_ADMIN_COOKIE } from "@/lib/debugAuth";
import { cookies } from "next/headers";
import {
  listOverrides,
  addOverride,
  removeOverride,
  type OverrideType,
} from "@/lib/rebuild/data/exclusions";

// =============================================================================
// AUTH HELPER
// =============================================================================

async function checkOpsAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DEBUG_ADMIN_COOKIE)?.value;
  return validateCookieHash(cookieValue);
}

// =============================================================================
// GET /api/rebuild/ops/exclusions - List overrides
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const overrideType = searchParams.get("type") as OverrideType | null;
    const since = searchParams.get("since");

    const overrides = await listOverrides({
      limit: Math.min(limit, 500),
      overrideType: overrideType || undefined,
      since: since ? new Date(since) : undefined,
    });

    return NextResponse.json({
      ok: true,
      overrides,
      count: overrides.length,
    });
  } catch (error) {
    console.error("[rebuild/ops/exclusions] GET error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/rebuild/ops/exclusions - Add or update override
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { listingId, overrideType, reason } = body;

    // Validate required fields
    if (!listingId || typeof listingId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid listingId" },
        { status: 400 }
      );
    }

    const validTypes: OverrideType[] = ["ALLOW", "HARD_BLOCK", "SOFT_EXCLUDE"];
    if (!overrideType || !validTypes.includes(overrideType)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid overrideType. Must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const override = await addOverride({
      listingId,
      overrideType,
      reason: typeof reason === "string" ? reason : undefined,
    });

    return NextResponse.json({
      ok: true,
      override,
    });
  } catch (error) {
    console.error("[rebuild/ops/exclusions] POST error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/rebuild/ops/exclusions - Remove override
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
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

    const removed = await removeOverride(listingId);

    if (!removed) {
      return NextResponse.json(
        { ok: false, error: "Override not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Override removed",
    });
  } catch (error) {
    console.error("[rebuild/ops/exclusions] DELETE error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
