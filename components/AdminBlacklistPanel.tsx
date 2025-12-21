import { revalidatePath } from "next/cache";

import { query } from "@/lib/db";
import { AdminBlacklistClient } from "./AdminBlacklistClient";

type BlacklistedSeller = {
  seller_username: string;
  created_at: string | null;
};

type BlacklistHistoryRow = {
  id: number;
  seller_username: string;
  added_at: string;
  removed_at: string;
};

type RejectedListingRow = {
  id: number;
  ebay_item_id: string | null;
  seller_username: string | null;
  title: string;
  reason: string;
  created_at: Date;
};

async function removeSeller(formData: FormData) {
  "use server";

  const username = formData.get("seller_username");
  if (typeof username !== "string" || !username) return;

  await query("BEGIN");
  try {
    await query(
      `
        INSERT INTO seller_blacklist_history (seller_username, added_at)
        SELECT seller_username, created_at
        FROM seller_blacklist
        WHERE seller_username = $1;
      `,
      [username],
    );
    await query(
      `
        DELETE FROM seller_blacklist
        WHERE seller_username = $1;
      `,
      [username],
    );
    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }

  revalidatePath("/admin/blacklist");
  revalidatePath("/admin");
}

async function restoreSeller(formData: FormData) {
  "use server";

  const historyId = formData.get("history_id");
  if (typeof historyId !== "string" || !historyId) return;
  const id = Number(historyId);
  if (Number.isNaN(id)) return;

  await query("BEGIN");
  try {
    const res = await query<BlacklistHistoryRow>(
      `
        SELECT seller_username, added_at
        FROM seller_blacklist_history
        WHERE id = $1;
      `,
      [id],
    );
    if (res.rowCount === 0) {
      await query("ROLLBACK");
      return;
    }
    const row = res.rows[0];
    await query(
      `
        INSERT INTO seller_blacklist (seller_username, created_at)
        VALUES ($1, $2)
        ON CONFLICT (seller_username) DO NOTHING;
      `,
      [row.seller_username, row.added_at],
    );
    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }

  revalidatePath("/admin/blacklist");
  revalidatePath("/admin");
}

async function addSeller(formData: FormData) {
  "use server";

  const username = formData.get("seller_username");
  if (typeof username !== "string" || !username.trim()) return;

  const normalizedUsername = username.trim().toLowerCase();

  await query(
    `
      INSERT INTO seller_blacklist (seller_username)
      VALUES ($1)
      ON CONFLICT (seller_username) DO NOTHING;
    `,
    [normalizedUsername],
  );

  // Also remove any active listings from this seller
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
    [normalizedUsername],
  );

  revalidatePath("/admin/blacklist");
  revalidatePath("/admin");
}

async function getBlacklistedSellers(
  sellerFilter?: string | null,
): Promise<BlacklistedSeller[]> {
  const res = await query<BlacklistedSeller>(
    `
      SELECT seller_username, created_at
      FROM seller_blacklist
      ${sellerFilter ? "WHERE seller_username = $1" : ""}
      ORDER BY seller_username ASC;
    `,
    sellerFilter ? [sellerFilter] : [],
  );
  return res.rows.map((row: BlacklistedSeller) => ({
    seller_username: row.seller_username,
    created_at: row.created_at ?? null,
  }));
}

async function getRejectedListings(): Promise<RejectedListingRow[]> {
  const res = await query<RejectedListingRow>(
    `
      SELECT
        id,
        ebay_item_id,
        seller_username,
        title,
        reason,
        created_at
      FROM rejected_listings
      ORDER BY created_at DESC
      LIMIT 200;
    `,
  );
  return res.rows.map((row: RejectedListingRow) => ({
    ...row,
    created_at: new Date(row.created_at),
  }));
}

async function getBlacklistHistory(
  sellerFilter?: string | null,
): Promise<{ rows: BlacklistHistoryRow[]; missingTable: boolean }> {
  try {
    const res = await query<BlacklistHistoryRow>(
      `
        SELECT id, seller_username, added_at, removed_at
        FROM seller_blacklist_history
        ${sellerFilter ? "WHERE seller_username = $1" : ""}
        ORDER BY removed_at DESC
        LIMIT 200;
      `,
      sellerFilter ? [sellerFilter] : [],
    );
    return { rows: res.rows, missingTable: false };
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "42P01") {
      return { rows: [], missingTable: true };
    }
    throw error;
  }
}

export async function AdminBlacklistPanel({
  sellerFilter,
  clearFilterHref = "/admin/blacklist",
}: {
  sellerFilter?: string | null;
  clearFilterHref?: string;
}) {
  const [sellers, historyResult, rejected] = await Promise.all([
    getBlacklistedSellers(sellerFilter),
    getBlacklistHistory(sellerFilter),
    getRejectedListings(),
  ]);
  const { rows: history, missingTable } = historyResult;

  // Serialize dates for client component
  const serializedRejected = rejected.map((row) => ({
    ...row,
    created_at: row.created_at.toISOString(),
  }));

  return (
    <AdminBlacklistClient
      sellers={sellers}
      history={history}
      rejected={serializedRejected}
      missingTable={missingTable}
      sellerFilter={sellerFilter}
      clearFilterHref={clearFilterHref}
      addSellerAction={addSeller}
      removeSellerAction={removeSeller}
      restoreSellerAction={restoreSeller}
    />
  );
}
