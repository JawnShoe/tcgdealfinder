import { query } from "@/lib/db";

// =============================================================================
// TYPES
// =============================================================================

export interface BlacklistedSeller {
  id: number;
  seller_username: string;
  created_at: Date;
}

// =============================================================================
// LIST BLACKLISTED SELLERS
// =============================================================================

export async function listBlacklistedSellers(options?: {
  limit?: number;
  sellerFilter?: string;
}): Promise<BlacklistedSeller[]> {
  const limit = options?.limit ?? 100;
  const sellerFilter = options?.sellerFilter?.trim().toLowerCase();

  const queryParams: unknown[] = [];
  let paramIndex = 1;

  let sql = `
    SELECT id, seller_username, created_at
    FROM seller_blacklist
  `;

  if (sellerFilter) {
    sql += ` WHERE seller_username = $${paramIndex}`;
    queryParams.push(sellerFilter);
    paramIndex++;
  }

  sql += ` ORDER BY seller_username ASC LIMIT $${paramIndex}`;
  queryParams.push(limit);

  const result = await query<BlacklistedSeller>(sql, queryParams);
  return result.rows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at),
  }));
}

// =============================================================================
// ADD SELLER TO BLACKLIST
// =============================================================================

export async function addBlacklistedSeller(payload: {
  sellerUsername: string;
}): Promise<BlacklistedSeller> {
  // Normalize: trim and lowercase
  const normalizedUsername = payload.sellerUsername.trim().toLowerCase();

  if (!normalizedUsername) {
    throw new Error("Seller username is required");
  }

  const result = await query<BlacklistedSeller>(
    `INSERT INTO seller_blacklist (seller_username)
     VALUES ($1)
     ON CONFLICT (seller_username) DO UPDATE SET created_at = seller_blacklist.created_at
     RETURNING id, seller_username, created_at`,
    [normalizedUsername]
  );

  return {
    ...result.rows[0],
    created_at: new Date(result.rows[0].created_at),
  };
}

// =============================================================================
// REMOVE SELLER FROM BLACKLIST
// =============================================================================

export async function removeBlacklistedSeller(
  sellerUsername: string
): Promise<boolean> {
  // Normalize: trim and lowercase
  const normalizedUsername = sellerUsername.trim().toLowerCase();

  if (!normalizedUsername) {
    return false;
  }

  // First, archive to history table (best effort - may fail if history table doesn't exist)
  try {
    await query(
      `INSERT INTO seller_blacklist_history (seller_username, added_at)
       SELECT seller_username, created_at
       FROM seller_blacklist
       WHERE seller_username = $1`,
      [normalizedUsername]
    );
  } catch (err) {
    // History table may not exist - continue with removal
    const pgError = err as { code?: string };
    if (pgError.code !== "42P01") {
      console.error("[blacklist] Failed to archive to history:", err);
    }
  }

  // Then remove from blacklist
  const result = await query(
    "DELETE FROM seller_blacklist WHERE seller_username = $1 RETURNING *",
    [normalizedUsername]
  );

  return result.rows.length > 0;
}

// =============================================================================
// GET SINGLE BLACKLISTED SELLER
// =============================================================================

export async function getBlacklistedSeller(
  sellerUsername: string
): Promise<BlacklistedSeller | null> {
  const normalizedUsername = sellerUsername.trim().toLowerCase();

  const result = await query<BlacklistedSeller>(
    "SELECT id, seller_username, created_at FROM seller_blacklist WHERE seller_username = $1",
    [normalizedUsername]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    ...result.rows[0],
    created_at: new Date(result.rows[0].created_at),
  };
}
