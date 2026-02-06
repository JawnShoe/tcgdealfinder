"use client";

import { useState } from "react";
import type { BlacklistedSeller } from "@/lib/rebuild/data/blacklist";

type Props = {
  initialSellers: BlacklistedSeller[];
  limit: number;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

export function BlacklistToolClient({ initialSellers, limit }: Props) {
  const [sellers, setSellers] = useState<BlacklistedSeller[]>(initialSellers);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSellerUsername, setNewSellerUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerUsername.trim()) {
      showToast("Seller username is required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ops/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sellerUsername: newSellerUsername.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to add seller", "error");
        return;
      }

      // Optimistic add to list (check if already exists)
      const normalizedNew = newSellerUsername.trim().toLowerCase();
      setSellers((prev) => {
        const exists = prev.some((s) => s.seller_username === normalizedNew);
        if (exists) {
          return prev;
        }
        return [
          {
            ...data.seller,
            created_at: new Date(data.seller.created_at),
          },
          ...prev,
        ].sort((a, b) => a.seller_username.localeCompare(b.seller_username));
      });

      showToast("Seller blacklisted", "success");
      setNewSellerUsername("");
      setShowAddForm(false);
    } catch (err) {
      showToast("Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSeller = async (sellerUsername: string) => {
    try {
      const response = await fetch(
        `/api/ops/blacklist?sellerUsername=${encodeURIComponent(sellerUsername)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to remove seller", "error");
        return;
      }

      setSellers((prev) =>
        prev.filter((s) => s.seller_username !== sellerUsername)
      );
      showToast("Seller removed from blacklist", "success");
    } catch (err) {
      showToast("Network error", "error");
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEbaySellerUrl = (username: string): string => {
    return `https://www.ebay.com/usr/${encodeURIComponent(username)}`;
  };

  return (
    <>
      {/* Limit Controls */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Limit:</span>
          {[50, 100, 200].map((l) => (
            <a
              key={l}
              href={`/ops/blacklist?limit=${l}`}
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

      {/* Add Seller Form */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
            data-testid="add-blacklist-button"
          >
            Add seller to blacklist
          </button>
        ) : (
          <form onSubmit={handleAddSeller} className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">
              Add Seller to Blacklist
            </h3>

            <div className="max-w-md">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Seller Username *
              </label>
              <input
                type="text"
                value={newSellerUsername}
                onChange={(e) => setNewSellerUsername(e.target.value)}
                placeholder="seller_name"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Username will be normalized to lowercase.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Blacklist Seller"}
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

      {/* Sellers Table */}
      <section className="mt-6 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium text-slate-900">
            Blacklisted Sellers ({sellers.length})
          </h2>
        </div>

        {sellers.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-slate-500"
            data-testid="no-blacklist-message"
          >
            No sellers blacklisted
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Seller Username
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Added
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    eBay Profile
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map((s) => (
                  <tr key={s.seller_username} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-900">
                      {s.seller_username}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={getEbaySellerUrl(s.seller_username)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-800"
                      >
                        View
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveSeller(s.seller_username)}
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
