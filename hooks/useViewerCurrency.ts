"use client";

import { useState, useEffect } from "react";
import { getViewerCurrency } from "../lib/dealFormatting";

/**
 * Hook to detect viewer's currency from browser locale.
 * Returns USD during SSR/initial render, then updates to detected currency.
 * This prevents hydration mismatches.
 */
export function useViewerCurrency(): string {
  const [viewerCurrency, setViewerCurrency] = useState("USD");

  useEffect(() => {
    // Only runs on client after hydration
    setViewerCurrency(getViewerCurrency());
  }, []);

  return viewerCurrency;
}
