"use client";

import { useState, useEffect, useMemo } from "react";
import { getViewerCurrency } from "../lib/dealFormatting";

/**
 * Hook to detect viewer's currency from browser locale.
 *
 * HYDRATION-SAFE: Returns a stable value that doesn't change DOM structure.
 * The hook returns USD on first render (matching SSR), then updates to the
 * detected locale currency. Components using this hook must ensure the DOM
 * structure remains identical regardless of the currency value.
 *
 * @param options.forceUSD - If true, always return USD (useful for testing)
 */
export function useViewerCurrency(options?: { forceUSD?: boolean }): string {
  // Always start with USD to match SSR
  const [viewerCurrency, setViewerCurrency] = useState("USD");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated and detect locale
    setIsHydrated(true);
    if (!options?.forceUSD) {
      setViewerCurrency(getViewerCurrency());
    }
  }, [options?.forceUSD]);

  return viewerCurrency;
}

/**
 * Check if viewer currency matches listing currency.
 * Used to determine if ≈ USD should be shown.
 *
 * IMPORTANT: This should only affect text content, not DOM structure.
 */
export function shouldShowUsdApprox(
  listingCurrency: string | null | undefined,
  viewerCurrency: string
): boolean {
  const listing = (listingCurrency ?? "USD").toUpperCase();
  const viewer = viewerCurrency.toUpperCase();

  // Don't show ≈ USD if:
  // 1. Listing is already in USD
  // 2. Listing currency matches viewer currency
  if (listing === "USD") return false;
  if (listing === viewer) return false;

  return true;
}
