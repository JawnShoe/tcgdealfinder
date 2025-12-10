import { revalidatePath } from "next/cache";

import { notFound } from "next/navigation";

import { query } from "../../../lib/db";

async function removeSeller(formData: FormData) {
  "use server";

  const username = formData.get("seller_username");
  if (typeof username !== "string" || !username) return;

  await query(
    `
      DELETE FROM seller_blacklist
      WHERE seller_username = $1;
    `,
    [username],
  );

  revalidatePath("/admin/blacklist");
}

type BlacklistedSeller = {
  seller_username: string;
  created_at: string | null;
};

type RejectedListingRow = {
  id: number;
  ebay_item_id: string | null;
  seller_username: string | null;
  title: string;
  reason: string;
  created_at: Date;
};

async function getBlacklistedSellers(): Promise<BlacklistedSeller[]> {
  const res = await query<BlacklistedSeller>(
    `
      SELECT seller_username, created_at
      FROM seller_blacklist
      ORDER BY seller_username ASC;
    `,
  );
  return res.rows.map((row) => ({
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
  return res.rows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at),
  }));
}

export default async function AdminBlacklistPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const expected = process.env.ADMIN_SECRET;
  const provided = Array.isArray(searchParams?.secret)
    ? searchParams?.secret[0]
    : searchParams?.secret;

  if (!expected || provided !== expected) {
    notFound();
  }

  const [sellers, rejected] = await Promise.all([
    getBlacklistedSellers(),
    getRejectedListings(),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="panel">
        <h1 className="text-2xl font-semibold text-slate-900">
          Blacklist Monitor
        </h1>
        <p className="text-sm text-slate-500">
          Review seller blacklist and recently rejected listings (title
          filters, seller bans, etc.).
        </p>
      </div>

      <section className="panel">
        <h2 className="text-lg font-semibold mb-2">Blacklisted Sellers</h2>
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
                        className="text-xs text-red-600 hover:underline"
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
                        className="text-sky-700 hover:underline"
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
