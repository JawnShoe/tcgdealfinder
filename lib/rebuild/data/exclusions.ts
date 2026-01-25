import { query } from "@/lib/db";

// =============================================================================
// TYPES
// =============================================================================

export type OverrideType = "ALLOW" | "HARD_BLOCK" | "SOFT_EXCLUDE";

export interface ListingOverride {
  listing_id: string;
  override_type: OverrideType;
  reason: string | null;
  created_at: Date;
  created_by: string | null;
  expires_at: Date | null;
}

export interface ListingOverrideWithDetails extends ListingOverride {
  title: string | null;
  url: string | null;
  market: string | null;
  price_cad: number | null;
  total_price_cad: number | null;
}

// =============================================================================
// LIST OVERRIDES
// =============================================================================

let warnedMissingListingOverridesTable = false;

export async function listOverrides(options?: {
  limit?: number;
  overrideType?: OverrideType;
  since?: Date;
}): Promise<ListingOverrideWithDetails[]> {
  const limit = options?.limit ?? 100;
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  let sql = `
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
      l.total_price_cad
    FROM listing_overrides lo
    LEFT JOIN listings l ON l.listing_id = lo.listing_id
    WHERE 1=1
  `;

  if (options?.since) {
    sql += ` AND lo.created_at >= $${paramIndex}`;
    queryParams.push(options.since.toISOString());
    paramIndex++;
  }

  if (options?.overrideType) {
    sql += ` AND lo.override_type = $${paramIndex}`;
    queryParams.push(options.overrideType);
    paramIndex++;
  }

  sql += ` ORDER BY lo.created_at DESC LIMIT $${paramIndex}`;
  queryParams.push(limit);

  try {
    const result = await query<ListingOverrideWithDetails>(sql, queryParams);
    return result.rows;
  } catch (error) {
    const code =
      typeof error === "object" && error != null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    if (code === "42P01") {
      if (!warnedMissingListingOverridesTable) {
        warnedMissingListingOverridesTable = true;
        console.warn(
          "[rebuild][ops] listing_overrides missing (42P01); returning empty overrides list."
        );
      }
      return [];
    }

    throw error;
  }
}

// =============================================================================
// ADD OVERRIDE
// =============================================================================

export async function addOverride(payload: {
  listingId: string;
  overrideType: OverrideType;
  reason?: string;
  createdBy?: string;
  expiresAt?: Date;
}): Promise<ListingOverride> {
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
      payload.listingId,
      payload.overrideType,
      payload.reason || null,
      payload.createdBy || "rebuild-ops",
      payload.expiresAt || null,
    ]
  );

  return result.rows[0];
}

// =============================================================================
// REMOVE OVERRIDE
// =============================================================================

export async function removeOverride(listingId: string): Promise<boolean> {
  const result = await query(
    "DELETE FROM listing_overrides WHERE listing_id = $1 RETURNING *",
    [listingId]
  );

  return result.rows.length > 0;
}

// =============================================================================
// GET SINGLE OVERRIDE
// =============================================================================

export async function getOverride(
  listingId: string
): Promise<ListingOverride | null> {
  const result = await query<ListingOverride>(
    "SELECT * FROM listing_overrides WHERE listing_id = $1",
    [listingId]
  );

  return result.rows[0] || null;
}
