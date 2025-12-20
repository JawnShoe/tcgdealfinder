import { revalidatePath } from "next/cache";

import { notFound } from "next/navigation";

import { query } from "../../../lib/db";
import { isAdminAuthenticated } from "../../../lib/adminAuth";
import { AdminToolbar } from "../../../components/AdminToolbar";

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
}

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
}

export default async function AdminBlacklistPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || !isAdminAuthenticated()) {
    notFound();
  }

  const sellerFilterRaw = Array.isArray(searchParams?.seller)
    ? searchParams?.seller[0]
    : searchParams?.seller;
  const sellerFilter = sellerFilterRaw?.trim().toLowerCase() || null;

  const [sellers, historyResult, rejected] = await Promise.all([
    getBlacklistedSellers(sellerFilter),
    getBlacklistHistory(sellerFilter),
    getRejectedListings(),
  ]);
  const { rows: history, missingTable } = historyResult;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <AdminToolbar current="blacklist" />
      <div className="panel">
        <h1 className="text-2xl font-semibold text-slate-900">
          Blacklist Monitor
        </h1>
        <p className="text-sm text-slate-500">
          Review seller blacklist and recently rejected listings (title
          filters, seller bans, etc.).
        </p>
        {sellerFilter && (
          <p className="mt-2 text-xs text-slate-500">
            Filtered to seller:{" "}
            <span className="font-mono text-slate-700">{sellerFilter}</span>{" "}
            ·{" "}
            <a
              href="/admin/blacklist"
              className="text-amber-600 hover:text-amber-700"
            >
              Clear filter
            </a>
          </p>
        )}
      </div>

      <section className="panel">
        <h2 className="text-lg font-semibold mb-2">Blacklisted Sellers</h2>
        <p className="text-xs text-slate-500 mb-3">
          Removing a seller writes to history before unblocking. Restore re-adds
          without deleting history.
        </p>
        {sellers.length === 0 ? (
          <p className="text-sm text-slate-500">No sellers yet.</p>
        ) : (
          <table className="min-w-full border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border px-2 py-1">Username</th>
                <th className="border px-2 py-1">Added</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((row) => (
                <tr key={row.seller_username}>
                  <td className="border px-2 py-1 font-mono">
                    {row.seller_username}
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="border px-2 py-1">
                    <form action={removeSeller} className="inline-block">
                      <input
                        type="hidden"
                        name="seller_username"
                        value={row.seller_username}
                      />
                      <button
                        type="submit"
                        className="text-xs text-red-600 transition hover:text-red-700"
                      >
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h2 className="text-lg font-semibold mb-2">Blacklist History</h2>
        {missingTable ? (
          <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            History table missing; apply migration 004.
          </p>
        ) : null}
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No history yet.</p>
        ) : (
          <table className="min-w-full border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border px-2 py-1">Username</th>
                <th className="border px-2 py-1">Added</th>
                <th className="border px-2 py-1">Removed</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="border px-2 py-1 font-mono">
                    {row.seller_username}
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {formatDate(row.added_at)}
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {formatDate(row.removed_at)}
                  </td>
                  <td className="border px-2 py-1">
                    <form action={restoreSeller} className="inline-block">
                      <input type="hidden" name="history_id" value={row.id} />
                      <button
                        type="submit"
                        className="text-xs text-emerald-700 transition hover:text-emerald-800"
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

      <div className="panel">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Recently rejected listings
        </h2>
        {rejected.length === 0 ? (
          <p className="text-sm text-slate-500">No rejections yet.</p>
        ) : (
          <table className="min-w-full border-collapse text-xs md:text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left">Time</th>
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left">Seller</th>
                <th className="px-2 py-2 text-left">Reason</th>
                <th className="px-2 py-2 text-left">eBay</th>
              </tr>
            </thead>
            <tbody>
              {rejected.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2 align-middle text-slate-500">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-2 py-2 align-middle text-slate-800">
                    {row.title}
                  </td>
                  <td className="px-2 py-2 align-middle text-slate-600">
                    {row.seller_username ?? "—"}
                  </td>
                  <td className="px-2 py-2 align-middle text-slate-600">
                    {row.reason}
                  </td>
                  <td className="px-2 py-2 align-middle">
                    {row.ebay_item_id ? (
                      <a
                        href={`https://www.ebay.com/itm/${row.ebay_item_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 transition hover:text-sky-900"
                      >
                        View
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
