import { revalidatePath } from "next/cache";

import { query } from "@/lib/db";

type ListingExclusionRow = {
  listing_id: string;
  override_type: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
};

async function getListingExclusions(): Promise<ListingExclusionRow[]> {
  const res = await query<ListingExclusionRow>(
    `
      SELECT listing_id, override_type, reason, created_by, created_at, expires_at
      FROM listing_overrides
      WHERE override_type = 'HARD_BLOCK'
      ORDER BY created_at DESC
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
    <>
      <div className="panel">
        <h1 className="text-2xl font-semibold text-slate-900">
          Listing Exclusions
        </h1>
        <p className="text-sm text-slate-500">
          Exclude or restore a single listing without blacklisting an entire
          seller.
        </p>
      </div>

      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">Exclude a listing</h2>
        <form action={excludeListing} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Listing ID
            <input
              name="listing_id"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="v1|226490668389|0"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Reason
            <input
              name="reason"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="manual: misleading listing"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Expires at (optional, UTC)
            <input
              type="datetime-local"
              name="expires_at"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Exclude listing
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="text-lg font-semibold mb-2">Active exclusions</h2>
        {exclusions.length === 0 ? (
          <p className="text-sm text-slate-500">No listing exclusions yet.</p>
        ) : (
          <table className="min-w-full border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border px-2 py-1">Listing ID</th>
                <th className="border px-2 py-1">Reason</th>
                <th className="border px-2 py-1">Created</th>
                <th className="border px-2 py-1">Expires</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exclusions.map((row) => (
                <tr key={row.listing_id}>
                  <td className="border px-2 py-1 font-mono">
                    {row.listing_id}
                  </td>
                  <td className="border px-2 py-1 text-slate-600">
                    {row.reason ?? "--"}
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {row.expires_at ? formatDate(row.expires_at) : "--"}
                  </td>
                  <td className="border px-2 py-1">
                    <form action={restoreListing} className="inline-block">
                      <input
                        type="hidden"
                        name="listing_id"
                        value={row.listing_id}
                      />
                      <button
                        type="submit"
                        className="text-xs text-amber-700 transition hover:text-amber-800"
                      >
                        Restore
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
