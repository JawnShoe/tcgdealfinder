"use client";

import { useState } from "react";
import type {
  ListingOverrideWithDetails,
  OverrideType,
} from "@/lib/rebuild/data/exclusions";

type Props = {
  initialOverrides: ListingOverrideWithDetails[];
  limit: number;
  kindFilter?: OverrideType;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

export function ExclusionsToolClient({
  initialOverrides,
  limit,
  kindFilter,
}: Props) {
  const [overrides, setOverrides] =
    useState<ListingOverrideWithDetails[]>(initialOverrides);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newListingId, setNewListingId] = useState("");
  const [newOverrideType, setNewOverrideType] = useState<OverrideType>("ALLOW");
  const [newReason, setNewReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListingId.trim()) {
      showToast("Listing ID is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/rebuild/ops/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          listingId: newListingId.trim(),
          overrideType: newOverrideType,
          reason: newReason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to add override", "error");
        return;
      }

      // Optimistic add to list
      setOverrides((prev) => [
        {
          ...data.override,
          title: null,
          url: null,
          market: null,
          price_cad: null,
          total_price_cad: null,
        },
        ...prev.filter((o) => o.listing_id !== newListingId.trim()),
      ]);

      showToast("Override added", "success");
      setNewListingId("");
      setNewReason("");
      setShowAddForm(false);
    } catch (err) {
      showToast("Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOverride = async (listingId: string) => {
    try {
      const response = await fetch(
        `/api/rebuild/ops/exclusions?listingId=${encodeURIComponent(listingId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to remove override", "error");
        return;
      }

      setOverrides((prev) => prev.filter((o) => o.listing_id !== listingId));
      showToast("Override removed", "success");
    } catch (err) {
      showToast("Network error", "error");
    }
  };

  return (
    <>
      {/* Filter Controls */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Filter:</span>
          <a
            href="/rebuild/ops/exclusions"
            className={`rounded px-3 py-1 text-sm transition ${
              !kindFilter
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All
          </a>
          {(["ALLOW", "HARD_BLOCK", "SOFT_EXCLUDE"] as OverrideType[]).map(
            (type) => (
              <a
                key={type}
                href={`/rebuild/ops/exclusions?kind=${type}&limit=${limit}`}
                className={`rounded px-3 py-1 text-sm transition ${
                  kindFilter === type
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {type}
              </a>
            )
          )}

          <span className="mx-2 text-slate-300">|</span>

          <span className="text-sm font-medium text-slate-700">Limit:</span>
          {[50, 100, 200].map((l) => (
            <a
              key={l}
              href={`/rebuild/ops/exclusions?limit=${l}${kindFilter ? `&kind=${kindFilter}` : ""}`}
              className={`rounded px-3 py-1 text-sm transition ${
                limit === l
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {l}
            </a>
          ))}
        </div>
      </section>

      {/* Add Override Form */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
            data-testid="add-exclusion-button"
          >
            Add exclusion
          </button>
        ) : (
          <form onSubmit={handleAddOverride} className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">Add Override</h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Listing ID *
                </label>
                <input
                  type="text"
                  value={newListingId}
                  onChange={(e) => setNewListingId(e.target.value)}
                  placeholder="v1|EBAY_US|123456|..."
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Override Type *
                </label>
                <select
                  value={newOverrideType}
                  onChange={(e) =>
                    setNewOverrideType(e.target.value as OverrideType)
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="ALLOW">ALLOW</option>
                  <option value="HARD_BLOCK">HARD_BLOCK</option>
                  <option value="SOFT_EXCLUDE">SOFT_EXCLUDE</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Why this override?"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Override"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Overrides Table */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium text-slate-900">
            Overrides ({overrides.length})
          </h2>
        </div>

        {overrides.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-slate-500"
            data-testid="no-exclusions-message"
          >
            No exclusions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Listing ID
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Market
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overrides.map((o) => (
                  <tr key={o.listing_id} className="hover:bg-slate-50">
                    <td
                      className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-slate-600"
                      title={o.listing_id}
                    >
                      {o.listing_id}
                    </td>
                    <td className="px-4 py-3">
                      <OverrideTypeBadge type={o.override_type} />
                    </td>
                    <td
                      className="max-w-[200px] truncate px-4 py-3 text-slate-900"
                      title={o.title || undefined}
                    >
                      {o.title || <span className="text-slate-400">--</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.market?.replace("EBAY_", "") || "--"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.total_price_cad
                        ? `$${Number(o.total_price_cad).toFixed(2)}`
                        : o.price_cad
                          ? `$${Number(o.price_cad).toFixed(2)}`
                          : "--"}
                    </td>
                    <td
                      className="max-w-[150px] truncate px-4 py-3 text-slate-500"
                      title={o.reason || undefined}
                    >
                      {o.reason || "--"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(o.listing_id)}
                        className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-red-100 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}

function OverrideTypeBadge({ type }: { type: OverrideType }) {
  const config = {
    ALLOW: "bg-green-100 text-green-700",
    HARD_BLOCK: "bg-red-100 text-red-700",
    SOFT_EXCLUDE: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config[type]}`}
    >
      {type}
    </span>
  );
}
