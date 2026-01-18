import { query } from "@/lib/db";

// =============================================================================
// TYPES
// =============================================================================

export type OverrideType = "ALLOW" | "HARD_BLOCK" | "SOFT_EXCLUDE";

export interface ListingOverride {
  listing_id: string;
  override_type: OverrideType;
  reason: string | null;
  created_by: string | null;
  created_at: Date;
  expires_at: Date | null;
}

// =============================================================================
// LIST LISTING OVERRIDES
// =============================================================================

export async function listListingOverrides(options?: {
  limit?: number;
  listingIdFilter?: string;
  overrideTypeFilter?: OverrideType;
}): Promise<ListingOverride[]> {
  const limit = options?.limit ?? 200;
  const listingIdFilter = options?.listingIdFilter?.trim();
  const overrideTypeFilter = options?.overrideTypeFilter;

  const queryParams: unknown[] = [];
  let paramIndex = 1;
  const conditions: string[] = [];

  if (listingIdFilter) {
    conditions.push(`listing_id = $${paramIndex}`);
    queryParams.push(listingIdFilter);
    paramIndex++;
  }

  if (overrideTypeFilter) {
    conditions.push(`override_type = $${paramIndex}`);
    queryParams.push(overrideTypeFilter);
    paramIndex++;
  }

  let sql = `
    SELECT listing_id, override_type, reason, created_by, created_at, expires_at
    FROM listing_overrides
  `;

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
  queryParams.push(limit);

  const result = await query<ListingOverride>(sql, queryParams);
  return result.rows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at),
    expires_at: row.expires_at ? new Date(row.expires_at) : null,
  }));
}

// =============================================================================
// GET LISTING OVERRIDE BY ID
// =============================================================================

export async function getListingOverrideById(
  listingId: string
): Promise<ListingOverride | null> {
  const normalizedId = listingId.trim();

  if (!normalizedId) {
    return null;
  }

  const result = await query<ListingOverride>(
    `SELECT listing_id, override_type, reason, created_by, created_at, expires_at
     FROM listing_overrides
     WHERE listing_id = $1`,
    [normalizedId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    created_at: new Date(row.created_at),
    expires_at: row.expires_at ? new Date(row.expires_at) : null,
  };
}

// =============================================================================
// SET LISTING OVERRIDE (upsert)
// =============================================================================

export async function setListingOverride(payload: {
  listingId: string;
  overrideType: OverrideType;
  reason?: string | null;
  expiresAt?: string | null;
}): Promise<ListingOverride> {
  const normalizedId = payload.listingId.trim();

  if (!normalizedId) {
    throw new Error("Listing ID is required");
  }

  const normalizedReason = payload.reason?.trim() || null;
  const normalizedExpires = payload.expiresAt
    ? new Date(payload.expiresAt).toISOString()
    : null;

  const result = await query<ListingOverride>(
    `INSERT INTO listing_overrides (listing_id, override_type, reason, created_by, expires_at)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (listing_id) DO UPDATE
       SET override_type = EXCLUDED.override_type,
           reason = EXCLUDED.reason,
           created_by = EXCLUDED.created_by,
           expires_at = EXCLUDED.expires_at
     RETURNING listing_id, override_type, reason, created_by, created_at, expires_at`,
    [normalizedId, payload.overrideType, normalizedReason, normalizedExpires]
  );

  const row = result.rows[0];
  return {
    ...row,
    created_at: new Date(row.created_at),
    expires_at: row.expires_at ? new Date(row.expires_at) : null,
  };
}

// =============================================================================
// CLEAR LISTING OVERRIDE
// =============================================================================

export async function clearListingOverride(
  listingId: string
): Promise<boolean> {
  const normalizedId = listingId.trim();

  if (!normalizedId) {
    return false;
  }

  const result = await query(
    "DELETE FROM listing_overrides WHERE listing_id = $1 RETURNING *",
    [normalizedId]
  );

  return result.rows.length > 0;
}
