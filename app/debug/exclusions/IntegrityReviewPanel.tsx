"use client";

import { useCallback, useEffect, useState } from "react";

import { formatCurrency } from "@/lib/dealFormatting";
import { getSellerDisplayData } from "@/lib/sellerDisplay";
import type { OverrideType } from "@/lib/schema";

type IntegrityListing = {
  id: number;
  listingId: string;
  title: string;
  url: string;
  market: string;
  totalPriceCad: number | null;
  historicPriceCad: number | null;
  integrityReason: string | null;
  integrityScore: number | null;
  cardName: string | null;
  cardSetName: string | null;
  overrideType: string | null;
  sellerUsername: string | null;
  sellerStoreName: string | null;
};

async function applyOverride(
  listingId: string,
  action: OverrideType,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/debug/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        overrideType: action,
        reason: action === "ALLOW" ? "integrity_allow" : "integrity_panel",
      }),
      credentials: "include",
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      return { success: false, error: payload.error ?? res.statusText };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export function IntegrityReviewPanel({
  sinceIso,
}: {
  sinceIso: string;
}): JSX.Element {
  const [listings, setListings] = useState<IntegrityListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/debug/integrity?since=${encodeURIComponent(sinceIso)}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      const payload = await res.json();
      setListings(payload.listings ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load integrity data",
      );
    } finally {
      setLoading(false);
    }
  }, [sinceIso]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleAction = async (
    listingId: string,
    action: OverrideType,
  ): Promise<void> => {
    setStatusMessage(null);
    const result = await applyOverride(listingId, action);
    if (!result.success) {
      setStatusMessage(result.error ?? "Failed to apply override");
      return;
    }
    setStatusMessage(
      action === "ALLOW"
        ? "Listing allowed and will be eligible again."
        : "Override saved.",
    );
    fetchListings();
  };

  return (
    <section className="mt-10 rounded-xl border border-amber-500/30 bg-slate-900 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-amber-300">
            Integrity Review
          </h2>
          <p className="text-sm text-slate-400">
            Listings flagged by integrity heuristics. Allow to whitelist or
            block as needed.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchListings}
          className="rounded-md border border-amber-500/50 px-3 py-1 text-sm text-amber-200 hover:bg-amber-500/10"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {statusMessage && (
        <p className="mt-3 text-sm text-amber-300">{statusMessage}</p>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-400">
          Failed to load integrity queue: {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">
          Loading integrity queue...
        </p>
      ) : listings.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">
          No listings currently flagged for integrity review.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Listing</th>
                <th className="px-3 py-2 text-left font-semibold">Market</th>
                <th className="px-3 py-2 text-left font-semibold">Price</th>
                <th className="px-3 py-2 text-left font-semibold">Reason</th>
                <th className="px-3 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {listings.map((listing) => {
                const sellerDisplay = getSellerDisplayData({
                  username: listing.sellerUsername,
                  storeName: listing.sellerStoreName,
                });

                return (
                  <tr key={listing.id} className="bg-slate-900">
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-200 hover:text-amber-100"
                        >
                          {listing.title}
                        </a>
                        {listing.cardName && (
                          <span className="text-xs text-slate-500">
                            {listing.cardName}
                            {listing.cardSetName
                              ? ` · ${listing.cardSetName}`
                              : ""}
                          </span>
                        )}
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          Seller:{" "}
                          <span className="text-slate-300">
                            {sellerDisplay.displayName}
                          </span>
                        </span>
                        {listing.overrideType && (
                          <span className="text-xs text-slate-400">
                            Override: {listing.overrideType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {listing.market}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col text-slate-200">
                        <span>{formatCurrency(listing.totalPriceCad)}</span>
                        {listing.historicPriceCad && (
                          <span className="text-xs text-slate-500">
                            vs. median {formatCurrency(listing.historicPriceCad)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-200">
                      <div className="flex flex-col gap-1">
                        <span>
                          {listing.integrityReason ?? "Needs manual review"}
                        </span>
                        {listing.integrityScore != null && (
                          <span className="text-xs text-slate-500">
                            Score: {listing.integrityScore}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-600/30"
                          onClick={() =>
                            handleAction(listing.listingId, "ALLOW")
                          }
                        >
                          Allow
                        </button>
                        <button
                          type="button"
                          className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-300 hover:bg-red-600/30"
                          onClick={() =>
                            handleAction(listing.listingId, "HARD_BLOCK")
                          }
                        >
                          Hard block
                        </button>
                        <button
                          type="button"
                          className="rounded bg-blue-600/20 px-2 py-1 text-xs text-blue-200 hover:bg-blue-600/30"
                          onClick={() =>
                            handleAction(listing.listingId, "SOFT_EXCLUDE")
                          }
                        >
                          Soft exclude
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
