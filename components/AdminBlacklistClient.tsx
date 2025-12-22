"use client";

import { useMemo, useRef, useState } from "react";
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

type ReviewQueueRow = {
  listing_id: string;
  title: string;
  seller_username: string | null;
  total_price_cad: string | null;
  total_usd: string | null;
  market: string | null;
  ends_at: string | null;
  match_reject_reason: string | null;
  override_type: string | null;
  override_reason: string | null;
  override_created_at: string | null;
};

const MANUAL_ALLOW_REASONS = new Set([
  "language_mismatch",
  "collector_number_mismatch",
]);
const MANUAL_ALLOW_OVERRIDE_REASONS = new Set([
  "manual_allow:language_mismatch",
  "manual_allow:collector_number_mismatch",
]);

function getEbaySellerUrl(username: string): string {
  return `https://www.ebay.com/usr/${encodeURIComponent(username)}`;
}

function extractEbayItemId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{8,}$/.test(trimmed)) return trimmed;
  const numericParts = trimmed
    .split("|")
    .map((part) => part.trim())
    .filter((part) => /^\d{8,}$/.test(part));
  if (numericParts.length === 0) return null;
  numericParts.sort((a, b) => b.length - a.length);
  return numericParts[0] ?? null;
}

function getEbayItemUrl(raw: string | null | undefined): string | null {
  const itemId = extractEbayItemId(raw);
  return itemId ? `https://www.ebay.com/itm/${itemId}` : null;
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
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

function formatPrice(row: ReviewQueueRow): string {
  const totalCad = row.total_price_cad ? Number(row.total_price_cad) : null;
  if (totalCad != null && !Number.isNaN(totalCad)) {
    return `$${totalCad.toFixed(2)} CAD`;
  }
  const totalUsd = row.total_usd ? Number(row.total_usd) : null;
  if (totalUsd != null && !Number.isNaN(totalUsd)) {
    return `$${totalUsd.toFixed(2)} USD`;
  }
  return "--";
}

function isManualAllowReason(reason: string | null | undefined): boolean {
  return reason ? MANUAL_ALLOW_REASONS.has(reason) : false;
}

function isManualAllowOverride(reason: string | null | undefined): boolean {
  return reason ? MANUAL_ALLOW_OVERRIDE_REASONS.has(reason) : false;
}

export function AdminBlacklistClient({
  sellers,
  history,
  rejected,
  reviewQueue,
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
  reviewQueue: ReviewQueueRow[];
  missingTable: boolean;
  sellerFilter?: string | null;
  clearFilterHref: string;
  addSellerAction: (formData: FormData) => Promise<void>;
  removeSellerAction: (formData: FormData) => Promise<void>;
  restoreSellerAction: (formData: FormData) => Promise<void>;
}) {
  const { showToast } = useAdminToast();
  const addFormRef = useRef<HTMLFormElement>(null);
  const [reasonFilter, setReasonFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [reviewQueueRows, setReviewQueueRows] =
    useState<ReviewQueueRow[]>(reviewQueue);

  const reasonOptions = useMemo(() => {
    const reasons = new Set<string>();
    for (const row of rejected) {
      if (row.reason) reasons.add(row.reason);
    }
    return ["All", ...Array.from(reasons).sort()];
  }, [rejected]);

  const filteredRejected = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return rejected.filter((row) => {
      if (reasonFilter !== "All" && row.reason !== reasonFilter) {
        return false;
      }
      if (needle) {
        const haystack = `${row.title} ${row.seller_username ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [rejected, reasonFilter, searchTerm]);

  async function handleAllowListing(row: ReviewQueueRow) {
    if (!isManualAllowReason(row.match_reject_reason)) {
      showToast("Allow only supported for language/collector mismatches", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/allow-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          listingId: row.listing_id,
          rejectReason: row.match_reject_reason,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }
      const overrideReason = `manual_allow:${row.match_reject_reason}`;
      setReviewQueueRows((prev) =>
        prev.map((item) =>
          item.listing_id === row.listing_id
            ? {
                ...item,
                override_type: "ALLOW",
                override_reason: overrideReason,
                override_created_at: new Date().toISOString(),
              }
            : item,
        ),
      );
      showToast("Manually approved", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to allow listing";
      showToast(message, "error");
    }
  }

  async function handleRevokeAllow(row: ReviewQueueRow) {
    try {
      const res = await fetch("/api/admin/revoke-allow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ listingId: row.listing_id }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }
      setReviewQueueRows((prev) =>
        prev.map((item) =>
          item.listing_id === row.listing_id
            ? {
                ...item,
                override_type: null,
                override_reason: null,
                override_created_at: null,
              }
            : item,
        ),
      );
      showToast("Manual allow revoked", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke allow";
      showToast(message, "error");
    }
  }

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
      showToast("Seller re-blacklisted", "success");
    } catch {
      showToast("Failed to re-blacklist seller", "error");
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
                        title="Add this seller back to the active blacklist"
                      >
                        Re-blacklist
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
        <h2 className="mb-2 text-lg font-semibold">
          Review queue (language/collector mismatches)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Listings rejected for language/collector mismatches only. Allow creates
          a manual override without changing global filters.
        </p>
        {reviewQueueRows.length === 0 ? (
          <p className="text-sm text-slate-500">No listings awaiting review.</p>
        ) : (
          <table className="min-w-full border-collapse text-xs md:text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left">Seller</th>
                <th className="px-2 py-2 text-left">Reason</th>
                <th className="px-2 py-2 text-left">Price</th>
                <th className="px-2 py-2 text-left">Ends</th>
                <th className="px-2 py-2 text-left">eBay</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviewQueueRows.map((row) => {
                const ebayUrl = getEbayItemUrl(row.listing_id);
                const isAllowed =
                  row.override_type === "ALLOW" &&
                  isManualAllowOverride(row.override_reason);
                const reasonLabel = row.match_reject_reason ?? "--";
                return (
                  <tr key={row.listing_id}>
                    <td className="px-2 py-2 align-middle">
                      {isAllowed ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Manually approved
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Pending</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-middle text-slate-800">
                      {row.title}
                    </td>
                    <td className="px-2 py-2 align-middle text-slate-600">
                      {row.seller_username ?? "--"}
                    </td>
                    <td className="px-2 py-2 align-middle text-slate-600">
                      {reasonLabel}
                    </td>
                    <td className="px-2 py-2 align-middle text-slate-600">
                      {formatPrice(row)}
                    </td>
                    <td className="px-2 py-2 align-middle text-slate-500">
                      {row.ends_at ? formatDate(row.ends_at) : "--"}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      {ebayUrl ? (
                        <a
                          href={ebayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-700 transition hover:text-sky-900"
                        >
                          View
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">
                          {row.listing_id}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          disabled={
                            isAllowed ||
                            !isManualAllowReason(row.match_reject_reason)
                          }
                          onClick={() => handleAllowListing(row)}
                        >
                          Allow
                        </button>
                        <button
                          type="button"
                          className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                          disabled={!isAllowed}
                          onClick={() => handleRevokeAllow(row)}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3 text-xs text-slate-600">
              <label className="flex flex-col gap-1">
                Reason filter
                <select
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                  value={reasonFilter}
                  onChange={(event) => setReasonFilter(event.target.value)}
                >
                  {reasonOptions.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Search title / seller
                <input
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                  placeholder="pikachu, seller123..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <span className="text-xs text-slate-500">
                Showing {filteredRejected.length} of {rejected.length}
              </span>
            </div>
            {filteredRejected.length === 0 ? (
              <p className="text-sm text-slate-500">
                No rows match the current filters.
              </p>
            ) : (
              <table className="min-w-full border-collapse text-xs md:text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left">Date</th>
                    <th className="px-2 py-2 text-left">Title</th>
                    <th className="px-2 py-2 text-left">Seller</th>
                    <th className="px-2 py-2 text-left">Reason</th>
                    <th className="px-2 py-2 text-left">eBay</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRejected.map((row) => {
                    const ebayUrl = getEbayItemUrl(row.ebay_item_id);
                    const fullTime = formatDate(row.created_at);
                    const dateOnly = formatDateOnly(row.created_at);
                    return (
                      <tr key={row.id}>
                        <td
                          className="px-2 py-2 align-middle text-slate-500"
                          title={fullTime !== "--" ? fullTime : undefined}
                        >
                          {dateOnly}
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
                          {ebayUrl ? (
                            <a
                              href={ebayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-700 transition hover:text-sky-900"
                            >
                              View
                            </a>
                          ) : row.ebay_item_id ? (
                            <span className="font-mono text-xs text-slate-500">
                              {row.ebay_item_id}
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
