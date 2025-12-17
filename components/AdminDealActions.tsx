"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminDealActionsProps {
  listingId?: number | null;
  sellerUsername?: string | null;
  adminSecret?: string;
}

function normalizeUsername(username: string | null | undefined): string | null {
  if (!username) return null;
  return username.toLowerCase();
}

export function AdminDealActions({
  listingId,
  sellerUsername,
  adminSecret,
}: AdminDealActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!adminSecret) {
    return null;
  }

  const normalizedSeller = normalizeUsername(sellerUsername);

  async function callAdminApi(url: string, payload: Record<string, unknown>) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      router.refresh();
    } catch (err) {
      console.error("Admin action failed:", err);
      setError("Failed");
    } finally {
      setIsLoading(false);
    }
  }

  const canBlacklistSeller = Boolean(normalizedSeller);
  const canHideListing = typeof listingId === "number";

  return (
    <div className="flex flex-col gap-1 text-xs">
      <button
        type="button"
        disabled={!canBlacklistSeller || isLoading}
        onClick={() =>
          normalizedSeller &&
          callAdminApi("/api/admin/blacklist-seller", {
            sellerUsername: normalizedSeller,
          })
        }
        className="text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        Blacklist seller
      </button>
      <button
        type="button"
        disabled={!canHideListing || isLoading}
        onClick={() =>
          typeof listingId === "number" &&
          callAdminApi("/api/admin/hide-listing", { listingId })
        }
        className="text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        Hide listing
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
}
