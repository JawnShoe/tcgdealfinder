"use client";

import { useState, useMemo, useEffect } from "react";
import type { ExcludedListing } from "./page";
import { formatDateUTC } from "@/lib/dateFormatting";
import type { OverrideType, ListingOverride } from "@/lib/schema";
import { getSellerDisplayData } from "@/lib/sellerDisplay";

// =============================================================================
// TYPES
// =============================================================================

type Props = {
  listings: ExcludedListing[];
  sinceDate: Date;
};

// Removed OverrideStatus - using ListingOverride from schema directly

// Enriched override with listing details from JOIN
type EnrichedOverride = ListingOverride & {
  title?: string;
  url?: string;
  market?: string;
  price_cad?: number;
  shipping_cad?: number;
  total_price_cad?: number;
  card_id?: number;
};

type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
};

// =============================================================================
// API HELPERS
// =============================================================================

async function applyOverride(
  listingId: string,
  overrideType: OverrideType,
  reason?: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const response = await fetch("/api/debug/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies for auth
      body: JSON.stringify({ listingId, overrideType, reason }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

async function removeOverride(listingId: string): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const response = await fetch(`/api/debug/overrides?listingId=${encodeURIComponent(listingId)}`, {
      method: "DELETE",
      credentials: "include", // Include cookies for auth
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

async function fetchOverrides(since: Date): Promise<Map<string, ListingOverride>> {
  try {
    const response = await fetch(`/api/debug/overrides?since=${since.toISOString()}`, {
      credentials: "include", // Include cookies for auth
    });
    if (!response.ok) return new Map();
    
    const data = await response.json();
    const map = new Map<string, ListingOverride>();
    
    for (const override of data.overrides || []) {
      map.set(override.listing_id, {
        listing_id: override.listing_id,
        override_type: override.override_type,
        reason: override.reason,
        created_at: new Date(override.created_at),
        created_by: override.created_by,
        expires_at: override.expires_at ? new Date(override.expires_at) : null,
      });
    }
    
    return map;
  } catch {
    return new Map();
  }
}

// =============================================================================
// TIME FORMATTING HELPERS
// =============================================================================

function formatCompactTime(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ExclusionsClient({ listings, sinceDate }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, ListingOverride>>(new Map());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    listing: ExcludedListing;
    action: OverrideType;
  } | null>(null);
  const [confirmNote, setConfirmNote] = useState("");
  const [showOverridesPanel, setShowOverridesPanel] = useState(false);
  const [allOverrides, setAllOverrides] = useState<EnrichedOverride[]>([]);
  const [overrideFilter, setOverrideFilter] = useState<"all" | OverrideType>("all");
  const [overrideSearch, setOverrideSearch] = useState("");
  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [adminSecretInput, setAdminSecretInput] = useState("");
  const [adminUnlockStatus, setAdminUnlockStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [adminUnlockError, setAdminUnlockError] = useState<string | null>(null);
  const isAdminUnlocked = adminUnlockStatus === "success";
  
  // Load overrides on mount
  useEffect(() => {
    fetchOverrides(sinceDate).then((map) => {
      setOverrides(map);
      setLoadingOverrides(false);
    });
  }, [sinceDate]);
  
  // Load all overrides for panel
  useEffect(() => {
    if (showOverridesPanel) {
      fetchAllOverrides();
    }
  }, [showOverridesPanel]);
  
  async function fetchAllOverrides() {
    try {
      const response = await fetch("/api/debug/overrides", {
        credentials: "include",
      });
      if (!response.ok) return;
      
      const data = await response.json();
      setAllOverrides(data.overrides || []);
    } catch (error) {
      console.error("Failed to fetch all overrides:", error);
    }
  }

  async function handleAdminUnlock() {
    setAdminUnlockStatus("loading");
    setAdminUnlockError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: adminSecretInput }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unauthorized");
      }
      setAdminUnlockStatus("success");
      setAdminSecretInput("");
    } catch (error) {
      setAdminUnlockStatus("error");
      setAdminUnlockError(
        error instanceof Error ? error.message : "Failed to unlock",
      );
    }
  }
  
  // Filter by search query
  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) {
      return listings;
    }
    const q = searchQuery.toLowerCase();
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.exclusionHit?.toLowerCase().includes(q) ||
        l.exclusionReason.toLowerCase().includes(q) ||
        l.cardName?.toLowerCase().includes(q) ||
        l.cardSetName?.toLowerCase().includes(q)
    );
  }, [listings, searchQuery]);
  
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };
  
  const handleApplyOverride = async (
    listingId: string,
    overrideType: OverrideType,
    reason?: string
  ) => {
    const result = await applyOverride(listingId, overrideType, reason);
    
    if (result.success) {
      // Optimistic update
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(listingId, {
          listing_id: listingId,
          override_type: overrideType,
          reason: reason || null,
          created_at: new Date(),
          created_by: null,
          expires_at: null,
        });
        return next;
      });
      
      const label =
        overrideType === "ALLOW"
          ? "Allowed (live)"
          : overrideType === "HARD_BLOCK"
            ? "Hard blocked (live)"
            : "Soft excluded (live)";
      showToast(label, "success");
    } else {
      const errorMsg = result.status
        ? `Failed (${result.status}): ${result.error}`
        : `Failed: ${result.error}`;
      showToast(errorMsg, "error");
    }
  };
  
  const handleUndo = async (listingId: string) => {
    const result = await removeOverride(listingId);
    
    if (result.success) {
      setOverrides((prev) => {
        const next = new Map(prev);
        next.delete(listingId);
        return next;
      });
      showToast("Override removed", "success");
    } else {
      const errorMsg = result.status
        ? `Failed (${result.status}): ${result.error}`
        : `Failed: ${result.error}`;
      showToast(errorMsg, "error");
    }
  };
  
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (!isAdminUnlocked) {
              setShowAdminUnlock(true);
              setAdminUnlockStatus("idle");
              setAdminUnlockError(null);
            }
          }}
          className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-300"
        >
          Admin tools
        </button>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isAdminUnlocked
              ? "bg-emerald-900/50 text-emerald-300"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {isAdminUnlocked ? "Unlocked" : "Locked"}
        </span>
        {isAdminUnlocked ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <a
              href="/admin/blacklist"
              className="text-amber-400 hover:text-amber-300"
            >
              Open seller blacklist
            </a>
            <a
              href="/admin/listings"
              className="text-amber-400 hover:text-amber-300"
            >
              Open listing exclusions
            </a>
          </div>
        ) : (
          <span className="text-xs text-slate-500">
            Unlock to access admin pages (404 until unlocked).
          </span>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Filter by title, keyword, card name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {searchQuery && (
          <p className="mt-1 text-xs text-slate-400">
            Showing {filteredListings.length} of {listings.length} listings
          </p>
        )}
      </div>
      
      {/* Manual Overrides Panel */}
      <div className="mb-6 rounded-lg border border-amber-700/50 bg-slate-800/50">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-800"
          onClick={() => setShowOverridesPanel(!showOverridesPanel)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-amber-400">📋 Manual Overrides</span>
            <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">
              {allOverrides.length}
            </span>
          </div>
          <span className="text-slate-400">{showOverridesPanel ? "▼" : "▶"}</span>
        </button>
        
        {showOverridesPanel && (
          <div className="border-t border-amber-700/30 p-4">
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={overrideFilter}
                onChange={(e) => setOverrideFilter(e.target.value as any)}
                className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
              >
                <option value="all">All Types</option>
                <option value="ALLOW">ALLOW</option>
                <option value="HARD_BLOCK">HARD_BLOCK</option>
                <option value="SOFT_EXCLUDE">SOFT_EXCLUDE</option>
              </select>
              
              <input
                type="text"
                placeholder="Search by listing ID or title..."
                value={overrideSearch}
                onChange={(e) => setOverrideSearch(e.target.value)}
                className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200"
              />
            </div>
            
            {/* Overrides List */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700">
                  <tr className="text-left text-xs text-slate-400">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Listing</th>
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {allOverrides
                    .filter((o) => overrideFilter === "all" || o.override_type === overrideFilter)
                    .filter((o) => !overrideSearch || o.listing_id.includes(overrideSearch) || o.title?.toLowerCase().includes(overrideSearch.toLowerCase()))
                    .map((override) => {
                      const marketDisplay = override.market ? getMarketDisplay(override.market) : "—";
                      
                      // Parse prices from database (they come as strings)
                      const totalPrice = override.total_price_cad ? parseFloat(String(override.total_price_cad)) : null;
                      const itemPrice = override.price_cad ? parseFloat(String(override.price_cad)) : null;
                      
                      const priceStr = totalPrice
                        ? `$${totalPrice.toFixed(2)}`
                        : itemPrice
                        ? `$${itemPrice.toFixed(2)}`
                        : "—";
                      
                      return (
                        <tr key={override.listing_id} className="text-slate-300">
                          <td className="px-3 py-2 text-xs text-slate-400">
                            {new Date(override.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2" style={{ maxWidth: "300px" }}>
                            {override.title ? (
                              <div>
                                <a
                                  href={override.url || `/cards/${override.card_id || ""}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block truncate text-sm text-slate-200 hover:text-amber-400"
                                  title={override.title}
                                >
                                  {override.title}
                                </a>
                                <div className="mt-0.5 font-mono text-xs text-slate-500">
                                  ID: {override.listing_id}
                                </div>
                              </div>
                            ) : (
                              <div className="font-mono text-xs text-slate-400">
                                {override.listing_id}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {override.market ? (
                              <span>
                                {marketDisplay}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {priceStr}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                override.override_type === "ALLOW"
                                  ? "bg-green-900/70 text-green-200"
                                  : override.override_type === "HARD_BLOCK"
                                  ? "bg-red-900/70 text-red-200"
                                  : "bg-blue-900/70 text-blue-200"
                              }`}
                            >
                              {override.override_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-400" style={{ maxWidth: "200px" }}>
                            <div className="truncate" title={override.reason || ""}>
                              {override.reason || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5">
                              {override.url && (
                                <a
                                  href={override.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded bg-blue-900/50 px-2 py-1 text-xs text-blue-300 transition hover:bg-blue-800/50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View
                                </a>
                              )}
                              <button
                                className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-600"
                                onClick={async () => {
                                  const result = await removeOverride(override.listing_id);
                                  if (result.success) {
                                    showToast("Override removed", "success");
                                    fetchAllOverrides();
                                  } else {
                                    showToast(`Failed: ${result.error}`, "error");
                                  }
                                }}
                              >
                                ↺ Undo
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              
              {allOverrides.length === 0 && (
                <div className="py-8 text-center text-slate-500">
                  No manual overrides applied yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Results Count */}
      <div className="mb-4 text-sm text-slate-400">
        Displaying {filteredListings.length} excluded listings
      </div>
      
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-700 md:block xl:overflow-x-visible">
        <table className="w-full table-fixed divide-y divide-slate-700" style={{ minWidth: "1000px" }}>
          <thead className="bg-slate-800">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "85px" }}>
                Time
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "70px" }}>
                Market
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "75px" }}>
                Price
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "220px" }}>
                Title
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "65px" }}>
                Kind
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "100px" }}>
                Override
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "180px" }}>
                Reason / Hit
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "140px" }}>
                Card
              </th>
              <th className="px-2 py-2 text-left text-xs font-medium uppercase text-slate-400 lg:px-3" style={{ width: "245px" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {filteredListings.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                expanded={expandedIds.has(listing.id)}
                onToggleExpand={() => toggleExpand(listing.id)}
                override={overrides.get(listing.listingId)}
                onConfirm={(action) => setConfirmModal({ listing, action })}
                onUndo={() => handleUndo(listing.listingId)}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {filteredListings.map((listing) => (
          <MobileCard
            key={listing.id}
            listing={listing}
            override={overrides.get(listing.listingId)}
            onConfirm={(action) => setConfirmModal({ listing, action })}
            onUndo={() => handleUndo(listing.listingId)}
            expanded={expandedIds.has(listing.id)}
            onToggleExpand={() => toggleExpand(listing.id)}
          />
        ))}
      </div>
      
      {filteredListings.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          No excluded listings found matching your criteria.
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setConfirmModal(null)}
        >
          <div 
            className="mx-4 w-full max-w-lg rounded-lg bg-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold text-amber-400">
              Confirm Override Action
            </h3>
            
            <div className="mb-4 space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Action:</span>{" "}
                <span className={`font-bold ${
                  confirmModal.action === "ALLOW" ? "text-green-400" :
                  confirmModal.action === "HARD_BLOCK" ? "text-red-400" :
                  "text-blue-400"
                }`}>
                  {confirmModal.action}
                </span>
              </div>
              
              <div>
                <span className="text-slate-400">Listing:</span>{" "}
                <span className="text-slate-200">{confirmModal.listing.title}</span>
              </div>
              
              <div>
                <span className="text-slate-400">Current Reason:</span>{" "}
                <span className="text-amber-300">{confirmModal.listing.exclusionReason}</span>
              </div>
              
              {confirmModal.listing.exclusionHit && (
                <div>
                  <span className="text-slate-400">Hit Pattern:</span>{" "}
                  <span className="font-mono text-amber-400">
                    &quot;{confirmModal.listing.exclusionHit}&quot;
                  </span>
                </div>
              )}
              
              {confirmModal.listing.cardName && (
                <div>
                  <span className="text-slate-400">Card:</span>{" "}
                  <span className="text-slate-200">
                    {confirmModal.listing.cardName}
                    {confirmModal.listing.cardSetName && ` (${confirmModal.listing.cardSetName})`}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="mb-1 block text-sm text-slate-400">
                Note (optional):
              </label>
              <input
                type="text"
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none"
                placeholder="Why are you applying this override?"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <button
                className="flex-1 rounded bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600"
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmNote("");
                }}
              >
                Cancel
              </button>
              <button
                className={`flex-1 rounded px-4 py-2 text-sm font-medium transition ${
                  confirmModal.action === "ALLOW"
                    ? "bg-green-900 text-green-200 hover:bg-green-800"
                    : confirmModal.action === "HARD_BLOCK"
                    ? "bg-red-900 text-red-200 hover:bg-red-800"
                    : "bg-blue-900 text-blue-200 hover:bg-blue-800"
                }`}
                onClick={() => {
                  handleApplyOverride(
                    confirmModal.listing.listingId,
                    confirmModal.action,
                    confirmNote || undefined
                  );
                  setConfirmModal(null);
                  setConfirmNote("");
                }}
              >
                Confirm {confirmModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminUnlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowAdminUnlock(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-lg bg-slate-800 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-amber-400">
              Admin unlock
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Enter the admin secret to set a secure cookie. No secrets are stored
              in URLs.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                autoFocus
                value={adminSecretInput}
                onChange={(e) => setAdminSecretInput(e.target.value)}
                className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                placeholder="Admin secret"
              />
              {adminUnlockStatus === "success" ? (
                <p className="text-xs text-emerald-400">
                  Admin unlocked. You can open /admin/blacklist or /admin/listings.
                </p>
              ) : null}
              {adminUnlockError ? (
                <p className="text-xs text-rose-400">{adminUnlockError}</p>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                onClick={() => setShowAdminUnlock(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleAdminUnlock}
                disabled={adminUnlockStatus === "loading" || !adminSecretInput}
              >
                {adminUnlockStatus === "loading" ? "Unlocking..." : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "bg-green-900 text-green-100"
                : toast.type === "error"
                ? "bg-red-900 text-red-100"
                : "bg-blue-900 text-blue-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// LISTING ROW (Desktop)
// =============================================================================

function ListingRow({
  listing,
  expanded,
  onToggleExpand,
  override,
  onConfirm,
  onUndo,
}: {
  listing: ExcludedListing;
  expanded: boolean;
  onToggleExpand: () => void;
  override: ListingOverride | undefined;
  onConfirm: (action: OverrideType) => void;
  onUndo: () => void;
}) {
  const marketDisplay = getMarketDisplay(listing.market);
  const timeStr = listing.createdAt
    ? formatDateUTC(listing.createdAt)
    : listing.endsAt
      ? `ends: ${formatDateUTC(listing.endsAt)}`
      : "—";
  
  const priceStr = listing.totalPriceCad
    ? `$${listing.totalPriceCad.toFixed(2)}`
    : listing.priceCad
      ? `$${listing.priceCad.toFixed(2)}`
      : "--";
  const sellerUsername = listing.sellerUsername ?? listing.seller ?? null;
  const sellerDisplay = getSellerDisplayData({
    username: sellerUsername,
    storeName: listing.sellerStoreName ?? null,
  });
  const blacklistLabel = listing.sellerBlacklisted ? "BLACKLISTED" : "OK";
  const blacklistClass = listing.sellerBlacklisted
    ? "bg-rose-900/50 text-rose-300"
    : "bg-emerald-900/50 text-emerald-300";
  const isExcluded =
    override?.override_type === "HARD_BLOCK" ||
    override?.override_type === "SOFT_EXCLUDE";
  
  return (
    <>
      <tr
        className="cursor-pointer hover:bg-slate-800/50"
        onClick={onToggleExpand}
      >
        <td className="overflow-hidden whitespace-nowrap px-2 py-2 text-xs text-slate-400 lg:px-3" title={timeStr}>
          {listing.createdAt ? formatDateOnly(listing.createdAt) : listing.endsAt ? formatDateOnly(listing.endsAt) : "—"}
        </td>
        <td className="overflow-hidden whitespace-nowrap px-2 py-2 text-xs lg:px-3 lg:text-sm">
          {marketDisplay}
        </td>
        <td className="overflow-hidden whitespace-nowrap px-2 py-2 text-xs text-slate-300 lg:px-3 lg:text-sm">
          {priceStr}
        </td>
        <td className="overflow-hidden px-2 py-2 lg:px-3" style={{ maxWidth: "220px" }}>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs text-slate-200 hover:text-amber-400 lg:text-sm"
            onClick={(e) => e.stopPropagation()}
            title={listing.title}
          >
            {listing.title}
          </a>
          <div className="text-[11px] text-slate-500">
            Seller: {sellerDisplay.displayName}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
            <span className={`rounded-full px-2 py-0.5 font-medium ${blacklistClass}`}>
              {blacklistLabel}
            </span>
            {isExcluded ? (
              <span className="rounded-full bg-amber-900/50 px-2 py-0.5 font-medium text-amber-300">
                EXCLUDED
              </span>
            ) : null}
          </div>
        </td>
        <td className="overflow-hidden px-2 py-2 lg:px-3">
          <KindBadge kind={listing.exclusionKind} />
        </td>
        <td className="overflow-hidden px-2 py-2 lg:px-3">
          {override && <OverrideBadge override={override} />}
        </td>
        <td className="px-2 py-2 text-xs lg:px-3" style={{ maxWidth: "180px" }}>
          <div className="whitespace-normal break-words">
            <span className="text-slate-400">{listing.exclusionReason}</span>
            {listing.exclusionHit && (
              <span className="ml-1 font-mono text-amber-400">
                &quot;{listing.exclusionHit}&quot;
              </span>
            )}
          </div>
        </td>
        <td className="overflow-hidden px-2 py-2 text-xs text-slate-400 lg:px-3" style={{ maxWidth: "140px" }}>
          {listing.cardName ? (
            <div 
              className="truncate" 
              title={`${listing.cardName}${listing.cardSetName ? ` (${listing.cardSetName}${listing.cardNumber ? ` #${listing.cardNumber}` : ''})` : ''}`}
            >
              {listing.cardName}
              {listing.cardSetName && (
                <span className="text-slate-500">
                  {" "}
                  ({listing.cardSetName}
                  {listing.cardNumber && ` #${listing.cardNumber}`})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
        <td className="overflow-hidden px-2 py-2 lg:px-3" style={{ width: "245px" }}>
          <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {override ? (
              <button
                className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-600 whitespace-nowrap"
                onClick={() => onUndo()}
              >
                ↺ Undo
              </button>
            ) : (
              <>
                <button
                  className="rounded bg-green-900/50 px-2 py-1 text-xs font-medium text-green-300 transition hover:bg-green-800/50 whitespace-nowrap h-7"
                  onClick={() => onConfirm("ALLOW")}
                >
                  Allow
                </button>
                <button
                  className="rounded bg-red-900/50 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-800/50 whitespace-nowrap h-7"
                  onClick={() => onConfirm("HARD_BLOCK")}
                >
                  Hard Block
                </button>
                <button
                  className="rounded bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-300 transition hover:bg-blue-800/50 whitespace-nowrap h-7"
                  onClick={() => onConfirm("SOFT_EXCLUDE")}
                >
                  Soft Exclude
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-800/30">
          <td colSpan={8} className="px-4 py-3">
            <ExpandedDetails listing={listing} />
          </td>
        </tr>
      )}
    </>
  );
}

// =============================================================================
// MOBILE CARD
// =============================================================================

function MobileCard({
  listing,
  expanded,
  onToggleExpand,
  override,
  onConfirm,
  onUndo,
}: {
  listing: ExcludedListing;
  expanded: boolean;
  onToggleExpand: () => void;
  override: ListingOverride | undefined;
  onConfirm: (action: OverrideType) => void;
  onUndo: () => void;
}) {
  const marketDisplay = getMarketDisplay(listing.market);
  const timeStr = listing.createdAt
    ? formatDateUTC(listing.createdAt)
    : listing.endsAt
      ? `ends: ${formatDateUTC(listing.endsAt)}`
      : "—";
  
  const priceStr = listing.totalPriceCad
    ? `$${listing.totalPriceCad.toFixed(2)}`
    : listing.priceCad
      ? `$${listing.priceCad.toFixed(2)}`
      : "—";
  const sellerUsername = listing.sellerUsername ?? listing.seller ?? null;
  const sellerDisplay = getSellerDisplayData({
    username: sellerUsername,
    storeName: listing.sellerStoreName ?? null,
  });
  const blacklistLabel = listing.sellerBlacklisted ? "BLACKLISTED" : "OK";
  const blacklistClass = listing.sellerBlacklisted
    ? "bg-rose-900/50 text-rose-300"
    : "bg-emerald-900/50 text-emerald-300";
  const isExcluded =
    override?.override_type === "HARD_BLOCK" ||
    override?.override_type === "SOFT_EXCLUDE";
  
  return (
    <div
      className="rounded-lg border border-slate-700 bg-slate-800 p-3"
      onClick={onToggleExpand}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex gap-2">
          <KindBadge kind={listing.exclusionKind} />
          {override && <OverrideBadge override={override} />}
        </div>
        <span className="text-xs text-slate-500">{timeStr}</span>
      </div>
      
      <a
        href={listing.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 block text-sm text-slate-200 hover:text-amber-400"
        onClick={(e) => e.stopPropagation()}
      >
        {listing.title}
      </a>
      
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <span className="text-slate-400">
          {marketDisplay}
        </span>
        <span className="text-slate-300">{priceStr}</span>
        {listing.exclusionHit && (
          <span className="font-mono text-amber-400">
            &quot;{listing.exclusionHit}&quot;
          </span>
        )}
      </div>
      <div className="mb-2 text-xs text-slate-500">
        Seller: {sellerDisplay.displayName}
      </div>
      <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-400">
        <span className={`rounded-full px-2 py-0.5 font-medium ${blacklistClass}`}>
          {blacklistLabel}
        </span>
        {isExcluded ? (
          <span className="rounded-full bg-amber-900/50 px-2 py-0.5 font-medium text-amber-300">
            EXCLUDED
          </span>
        ) : null}
      </div>
      
      {listing.cardName && (
        <div className="mb-2 text-xs text-slate-500">
          Card: {listing.cardName}
          {listing.cardSetName && ` (${listing.cardSetName})`}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        {override ? (
          <button
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-600"
            onClick={() => onUndo()}
          >
            ↺ Undo Override
          </button>
        ) : (
          <>
            <button
              className="rounded bg-green-900/50 px-3 py-1.5 text-xs font-medium text-green-300 transition hover:bg-green-800/50"
              onClick={() => onConfirm("ALLOW")}
            >
              Allow
            </button>
            <button
              className="rounded bg-red-900/50 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-800/50"
              onClick={() => onConfirm("HARD_BLOCK")}
            >
              Hard Block
            </button>
            <button
              className="rounded bg-blue-900/50 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-800/50"
              onClick={() => onConfirm("SOFT_EXCLUDE")}
            >
              Soft Exclude
            </button>
          </>
        )}
      </div>
      
      {expanded && (
        <div className="mt-3 border-t border-slate-700 pt-3">
          <ExpandedDetails listing={listing} />
        </div>
      )}
    </div>
  );
}


function OverrideBadge({ override }: { override: ListingOverride }) {
  const config = {
    ALLOW: { bg: "bg-green-900/70", text: "text-green-200", label: "✓ ALLOW" },
    HARD_BLOCK: { bg: "bg-red-900/70", text: "text-red-200", label: "⊗ HARD BLOCK" },
    SOFT_EXCLUDE: { bg: "bg-blue-900/70", text: "text-blue-200", label: "◐ SOFT EXCLUDE" },
  }[override.override_type];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
      title={override.reason || "Override applied"}
    >
      {config.label}
    </span>
  );
}
// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function KindBadge({ kind }: { kind: "hard" | "soft" }) {
  if (kind === "hard") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-300">
        HARD
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-300">
      SOFT
    </span>
  );
}



function ExpandedDetails({ listing }: { listing: ExcludedListing }) {
  const sellerInfo = getSellerDisplayData({
    username: listing.sellerUsername ?? listing.seller ?? null,
    storeName: listing.sellerStoreName ?? null,
  });
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      <div>
        <span className="text-slate-500">Listing ID:</span>{" "}
        <span className="font-mono text-slate-300">{listing.listingId}</span>
      </div>
      <div>
        <span className="text-slate-500">DB ID:</span>{" "}
        <span className="font-mono text-slate-300">{listing.id}</span>
      </div>
      {listing.cardId && (
        <div>
          <span className="text-slate-500">Card ID:</span>{" "}
          <span className="font-mono text-slate-300">{listing.cardId}</span>
        </div>
      )}
      <div>
        <span className="text-slate-500">Seller:</span>{" "}
        <span className="text-slate-300">
          {sellerInfo.displayName}
        </span>
        {listing.sellerUsername &&
          listing.sellerUsername.toLowerCase() !==
            sellerInfo.displayName.toLowerCase() && (
            <span className="ml-1 text-slate-500">
              ({listing.sellerUsername})
            </span>
          )}
      </div>
      <div className="sm:col-span-2">
        <span className="text-slate-500">Reason:</span>{" "}
        <span className="text-slate-300">{listing.exclusionReason}</span>
      </div>
      {listing.exclusionHit && (
        <div className="sm:col-span-2">
          <span className="text-slate-500">Hit Keyword:</span>{" "}
          <span className="font-mono text-amber-400">
            &quot;{listing.exclusionHit}&quot;
          </span>
        </div>
      )}
      <div className="sm:col-span-2">
        <span className="text-slate-500">Full URL:</span>{" "}
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-amber-400 hover:text-amber-300"
        >
          {listing.url}
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// UTILITY
// =============================================================================

function getMarketDisplay(market: string): string {
  // Return just the country code - flag emojis don't render well on Windows
  const code = market.replace("EBAY_", "");
  return code || market;
}
