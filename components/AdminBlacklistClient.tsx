"use client";

import { useRef } from "react";
import { useAdminToast } from "./AdminActionFeedback";

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
  created_at: string;
};

function getEbaySellerUrl(username: string): string {
  return `https://www.ebay.com/usr/${encodeURIComponent(username)}`;
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

export function AdminBlacklistClient({
  sellers,
  history,
  rejected,
  missingTable,
  sellerFilter,
  clearFilterHref,
  addSellerAction,
  removeSellerAction,
  restoreSellerAction,
}: {
  sellers: BlacklistedSeller[];
  history: BlacklistHistoryRow[];
  rejected: RejectedListingRow[];
  missingTable: boolean;
  sellerFilter?: string | null;
  clearFilterHref: string;
  addSellerAction: (formData: FormData) => Promise<void>;
  removeSellerAction: (formData: FormData) => Promise<void>;
  restoreSellerAction: (formData: FormData) => Promise<void>;
}) {
  const { showToast } = useAdminToast();
  const addFormRef = useRef<HTMLFormElement>(null);

  async function handleAddSeller(formData: FormData) {
    try {
      await addSellerAction(formData);
      showToast("Seller blacklisted", "success");
      addFormRef.current?.reset();
    } catch {
      showToast("Failed to blacklist seller", "error");
    }
  }

  async function handleRemoveSeller(formData: FormData) {
    try {
      await removeSellerAction(formData);
      showToast("Seller removed from blacklist", "success");
    } catch {
      showToast("Failed to remove seller", "error");
    }
  }

  async function handleRestoreSeller(formData: FormData) {
    try {
      await restoreSellerAction(formData);
      showToast("Seller restored to blacklist", "success");
    } catch {
      showToast("Failed to restore seller", "error");
    }
  }

  return (
    <>
      <div className="panel">
        <h1 className="text-2xl font-semibold text-slate-900">
          Blacklist Monitor
        </h1>
        <p className="text-sm text-slate-500">
          Review seller blacklist and recently rejected listings (title filters,
          seller bans, etc.).
        </p>
        {sellerFilter && (
          <p className="mt-2 text-xs text-slate-500">
            Filtered to seller:{" "}
            <span className="font-mono text-slate-700">{sellerFilter}</span> -{" "}
            <a
              href={clearFilterHref}
              className="text-amber-600 hover:text-amber-700"
            >
              Clear filter
            </a>
          </p>
        )}
      </div>

      <section className="panel space-y-3">
        <h2 className="text-lg font-semibold">Add seller to blacklist</h2>
        <form
          ref={addFormRef}
          action={handleAddSeller}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            Seller username
            <input
              name="seller_username"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="seller_name"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Blacklist seller
          </button>
        </form>
        <p className="text-xs text-slate-500">
          Blacklisting a seller removes all their active listings.
        </p>
      </section>

      <section className="panel">
        <h2 className="mb-2 text-lg font-semibold">Blacklisted Sellers</h2>
        <p className="mb-3 text-xs text-slate-500">
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
                    <a
                      href={getEbaySellerUrl(row.seller_username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:text-sky-900"
                    >
                      {row.seller_username}
                    </a>
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="border px-2 py-1">
                    <form action={handleRemoveSeller} className="inline-block">
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
        <h2 className="mb-2 text-lg font-semibold">Blacklist History</h2>
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
                    <a
                      href={getEbaySellerUrl(row.seller_username)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:text-sky-900"
                    >
                      {row.seller_username}
                    </a>
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {formatDate(row.added_at)}
                  </td>
                  <td className="border px-2 py-1 text-slate-500">
                    {formatDate(row.removed_at)}
                  </td>
                  <td className="border px-2 py-1">
                    <form
                      action={handleRestoreSeller}
                      className="inline-block"
                    >
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
                    {row.seller_username ?? "--"}
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
                      "--"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
