"use client";

import { useState } from "react";
import type {
  ListingOverride,
  OverrideType,
} from "@/lib/rebuild/data/listingsOps";

type Props = {
  initialOverrides: ListingOverride[];
  limit: number;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

const OVERRIDE_TYPES: OverrideType[] = ["ALLOW", "HARD_BLOCK", "SOFT_EXCLUDE"];

const OVERRIDE_TYPE_LABELS: Record<OverrideType, string> = {
  ALLOW: "Allow",
  HARD_BLOCK: "Hard Block",
  SOFT_EXCLUDE: "Soft Exclude",
};

const OVERRIDE_TYPE_COLORS: Record<OverrideType, string> = {
  ALLOW: "bg-green-100 text-green-800",
  HARD_BLOCK: "bg-red-100 text-red-800",
  SOFT_EXCLUDE: "bg-amber-100 text-amber-800",
};

export function ListingsToolClient({ initialOverrides, limit }: Props) {
  const [overrides, setOverrides] =
    useState<ListingOverride[]>(initialOverrides);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newListingId, setNewListingId] = useState("");
  const [newOverrideType, setNewOverrideType] =
    useState<OverrideType>("HARD_BLOCK");
  const [newReason, setNewReason] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  // Search/filter state
  const [searchListingId, setSearchListingId] = useState("");
  const [filterOverrideType, setFilterOverrideType] = useState<
    OverrideType | ""
  >("");

  const showToast = (message: string, type: "success" | "error") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleSearch = async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (searchListingId.trim()) {
        params.set("listingId", searchListingId.trim());
      }
      if (filterOverrideType) {
        params.set("overrideType", filterOverrideType);
      }

      const response = await fetch(
        `/api/rebuild/ops/listings?${params.toString()}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to search", "error");
        return;
      }

      setOverrides(
        data.overrides.map((o: ListingOverride) => ({
          ...o,
          created_at: new Date(o.created_at),
          expires_at: o.expires_at ? new Date(o.expires_at) : null,
        }))
      );
    } catch (err) {
      showToast("Network error", "error");
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListingId.trim()) {
      showToast("Listing ID is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/rebuild/ops/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          listingId: newListingId.trim(),
          overrideType: newOverrideType,
          reason: newReason.trim() || null,
          expiresAt: newExpiresAt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to add override", "error");
        return;
      }

      // Update list - replace if exists, add if new
      const normalizedNew = newListingId.trim();
      setOverrides((prev) => {
        const filtered = prev.filter((o) => o.listing_id !== normalizedNew);
        return [
          {
            ...data.override,
            created_at: new Date(data.override.created_at),
            expires_at: data.override.expires_at
              ? new Date(data.override.expires_at)
              : null,
          },
          ...filtered,
        ];
      });

      showToast("Override set", "success");
      setNewListingId("");
      setNewReason("");
      setNewExpiresAt("");
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
        `/api/rebuild/ops/listings?listingId=${encodeURIComponent(listingId)}`,
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

  const formatDate = (date: Date | null): string => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Search/Filter Controls */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium text-slate-900">
          Search &amp; Filter
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Listing ID
            </label>
            <input
              type="text"
              value={searchListingId}
              onChange={(e) => setSearchListingId(e.target.value)}
              placeholder="v1|226490668389|0"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Override Type
            </label>
            <select
              value={filterOverrideType}
              onChange={(e) =>
                setFilterOverrideType(e.target.value as OverrideType | "")
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All types</option>
              {OVERRIDE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {OVERRIDE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            data-testid="search-overrides-button"
          >
            Search
          </button>
        </div>
      </section>

      {/* Limit Controls */}
      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Limit:</span>
          {[50, 100, 200].map((l) => (
            <a
              key={l}
              href={`/rebuild/ops/listings?limit=${l}`}
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
            data-testid="add-override-button"
          >
            Set listing override
          </button>
        ) : (
          <form onSubmit={handleAddOverride} className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">
              Set Listing Override
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Listing ID *
                </label>
                <input
                  type="text"
                  value={newListingId}
                  onChange={(e) => setNewListingId(e.target.value)}
                  placeholder="v1|226490668389|0"
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
                  required
                >
                  {OVERRIDE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {OVERRIDE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="manual: misleading listing"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
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
                {isSubmitting ? "Setting..." : "Set Override"}
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
            Listing Overrides ({overrides.length})
          </h2>
        </div>

        {overrides.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-slate-500"
            data-testid="no-overrides-message"
          >
            No listing overrides found
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
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overrides.map((o) => (
                  <tr key={o.listing_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-900">
                      {o.listing_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${OVERRIDE_TYPE_COLORS[o.override_type]}`}
                      >
                        {OVERRIDE_TYPE_LABELS[o.override_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.reason || "--"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDate(o.expires_at)}
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
