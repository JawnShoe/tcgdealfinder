import { NextRequest, NextResponse } from "next/server";
import { validateCookieHash, DEBUG_ADMIN_COOKIE } from "@/lib/debugAuth";
import { cookies } from "next/headers";
import {
  listWatches,
  listRecentAlerts,
  createWatch,
  toggleWatch,
  deleteWatch,
} from "@/lib/rebuild/data/alertsOps";

// =============================================================================
// AUTH HELPER
// =============================================================================

async function checkOpsAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(DEBUG_ADMIN_COOKIE)?.value;
  return validateCookieHash(cookieValue);
}

// =============================================================================
// GET /api/rebuild/ops/alerts - List watches and recent alerts
// =============================================================================

export async function GET(): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [watches, alerts] = await Promise.all([
      listWatches(),
      listRecentAlerts(50),
    ]);

    return NextResponse.json({
      ok: true,
      watches,
      alerts,
    });
  } catch (error) {
    console.error("[rebuild/ops/alerts] GET error:", error);

    // Check for missing table error (42P01 = undefined_table in PostgreSQL)
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json({
        ok: true,
        status: "db_not_initialized",
        watches: [],
        alerts: [],
      });
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/rebuild/ops/alerts - Create watch or toggle watch
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await checkOpsAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Handle toggle action
    if (action === "toggle") {
      const { id, active } = body;
      if (typeof id !== "number" || typeof active !== "boolean") {
        return NextResponse.json(
          { ok: false, error: "Missing or invalid id/active" },
          { status: 400 }
        );
      }

      const success = await toggleWatch(id, active);
      if (!success) {
        return NextResponse.json(
          { ok: false, error: "Watch not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Handle create action (default)
    const { cardId, condition, thresholdType, thresholdValue, note } = body;

    // Validate required fields
    if (typeof cardId !== "number") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid cardId" },
        { status: 400 }
      );
    }

    if (!condition || typeof condition !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid condition" },
        { status: 400 }
      );
    }

    if (
      thresholdType !== "price_below" &&
      thresholdType !== "discount_at_least"
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid thresholdType" },
        { status: 400 }
      );
    }

    if (typeof thresholdValue !== "number") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid thresholdValue" },
        { status: 400 }
      );
    }

    const result = await createWatch({
      cardId,
      condition,
      thresholdType,
      thresholdValue,
      note: note ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      watch: { id: result.id },
    });
  } catch (error) {
    console.error("[rebuild/ops/alerts] POST error:", error);

    // Check for missing table error
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          error: "Database not initialized (missing alerts_watchlist table)",
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
// DELETE /api/rebuild/ops/alerts - Delete watch
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!checkOpsAuth()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { ok: false, error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id parameter" },
        { status: 400 }
      );
    }

    const success = await deleteWatch(id);

    if (!success) {
      return NextResponse.json(
        { ok: false, error: "Watch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Watch deleted",
    });
  } catch (error) {
    console.error("[rebuild/ops/alerts] DELETE error:", error);

    // Check for missing table error
    const pgError = error as { code?: string };
    if (pgError.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          error: "Database not initialized (missing alerts_watchlist table)",
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
