"use client";

import { useRef } from "react";
import { useAdminToast } from "./AdminActionFeedback";

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

const CAD_FORMATTER = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

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

function formatCad(value: string | number | null | undefined): string {
  if (value == null) return "--";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "--";
  return CAD_FORMATTER.format(num);
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

export function AdminListingsClient({
  exclusions,
  excludeListingAction,
  restoreListingAction,
}: {
  exclusions: ListingExclusionRow[];
  excludeListingAction: (formData: FormData) => Promise<void>;
  restoreListingAction: (formData: FormData) => Promise<void>;
}) {
  const { showToast } = useAdminToast();
  const excludeFormRef = useRef<HTMLFormElement>(null);

  async function handleExcludeListing(formData: FormData) {
    try {
      await excludeListingAction(formData);
      showToast("Listing excluded", "success");
      excludeFormRef.current?.reset();
    } catch {
      showToast("Failed to exclude listing", "error");
    }
  }

  async function handleRestoreListing(formData: FormData) {
    try {
      await restoreListingAction(formData);
      showToast("Listing restored", "success");
    } catch {
      showToast("Failed to restore listing", "error");
    }
  }

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
        <form
          ref={excludeFormRef}
          action={handleExcludeListing}
          className="grid gap-3 sm:grid-cols-2"
        >
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
            Expires at (optional, in your local timezone)
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
        <h2 className="mb-2 text-lg font-semibold">Active exclusions</h2>
        {exclusions.length === 0 ? (
          <p className="text-sm text-slate-500">No listing exclusions yet.</p>
        ) : (
          <table className="min-w-full border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border px-2 py-1">Listing ID</th>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Seller</th>
                <th className="border px-2 py-1">Price</th>
                <th className="border px-2 py-1">Reason</th>
                <th className="border px-2 py-1">Created</th>
                <th className="border px-2 py-1">Expires</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exclusions.map((row) => {
                const ebayUrl = getEbayItemUrl(row.listing_id);
                const titleText = row.title ?? "Details unavailable";
                const priceValue = row.total_price_cad ?? row.price_cad;
                return (
                  <tr key={row.listing_id}>
                    <td className="border px-2 py-1 font-mono">
                      <div className="flex flex-col gap-1">
                        <span>{row.listing_id}</span>
                        {ebayUrl ? (
                          <a
                            href={ebayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-700 transition hover:text-sky-900"
                          >
                            View on eBay
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No eBay ID
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border px-2 py-1 text-slate-700">
                      {row.title ? (
                        <span className="block max-w-[320px] truncate" title={row.title}>
                          {row.title}
                        </span>
                      ) : (
                        <span className="text-slate-400">{titleText}</span>
                      )}
                    </td>
                    <td className="border px-2 py-1 text-slate-600">
                      {row.seller_username ?? "--"}
                    </td>
                    <td className="border px-2 py-1 text-slate-600">
                      {formatCad(priceValue)}
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
                      <form
                        action={handleRestoreListing}
                        className="inline-block"
                      >
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
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
