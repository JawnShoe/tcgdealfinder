import { revalidatePath } from "next/cache";

import { query } from "@/lib/db";
import { AdminListingsClient } from "./AdminListingsClient";

type ListingExclusionRow = {
  listing_id: string;
  override_type: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  title: string | null;
  seller_username: string | null;
  price_cad: string | null;
  total_price_cad: string | null;
};

async function getListingExclusions(): Promise<ListingExclusionRow[]> {
  const res = await query<ListingExclusionRow>(
    `
      SELECT
        lo.listing_id,
        lo.override_type,
        lo.reason,
        lo.created_by,
        lo.created_at,
        lo.expires_at,
        l.title,
        l.seller_username,
        l.price_cad,
        l.total_price_cad
      FROM listing_overrides lo
      LEFT JOIN listings l ON l.listing_id = lo.listing_id
      WHERE lo.override_type = 'HARD_BLOCK'
      ORDER BY lo.created_at DESC
      LIMIT 200;
    `,
  );
  return res.rows;
}

async function excludeListing(formData: FormData) {
  "use server";

  const listingId = formData.get("listing_id");
  const reason = formData.get("reason");
  const expiresAt = formData.get("expires_at");

  if (typeof listingId !== "string" || !listingId.trim()) return;
  const normalizedId = listingId.trim();
  const normalizedReason =
    typeof reason === "string" && reason.trim() ? reason.trim() : null;
  const normalizedExpires =
    typeof expiresAt === "string" && expiresAt.trim()
      ? new Date(expiresAt).toISOString()
      : null;

  await query(
    `
      INSERT INTO listing_overrides (listing_id, override_type, reason, created_by, expires_at)
      VALUES ($1, 'HARD_BLOCK', $2, 'admin', $3)
      ON CONFLICT (listing_id) DO UPDATE
        SET override_type = EXCLUDED.override_type,
            reason = EXCLUDED.reason,
            created_by = EXCLUDED.created_by,
            expires_at = EXCLUDED.expires_at;
    `,
    [normalizedId, normalizedReason, normalizedExpires],
  );

  revalidatePath("/admin/listings");
  revalidatePath("/admin");
}

async function restoreListing(formData: FormData) {
  "use server";

  const listingId = formData.get("listing_id");
  if (typeof listingId !== "string" || !listingId.trim()) return;

  await query(
    `
      DELETE FROM listing_overrides
      WHERE listing_id = $1;
    `,
    [listingId.trim()],
  );

  revalidatePath("/admin/listings");
  revalidatePath("/admin");
}

export async function AdminListingsPanel() {
  const exclusions = await getListingExclusions();

  return (
    <AdminListingsClient
      exclusions={exclusions}
      excludeListingAction={excludeListing}
      restoreListingAction={restoreListing}
    />
  );
}
