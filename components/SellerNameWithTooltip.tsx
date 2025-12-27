"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { SellerDisplayData } from "@/lib/sellerDisplay";

const SALES_COUNT_FORMATTER = new Intl.NumberFormat("en-US");

export function formatSellerSalesCount(
  salesCount: number | null | undefined
): string | null {
  if (salesCount == null || salesCount < 100) {
    return null;
  }

  let rounded: number;
  if (salesCount < 1000) {
    rounded = Math.floor(salesCount / 100) * 100;
    if (rounded < 100) {
      rounded = 100;
    }
  } else if (salesCount < 10000) {
    rounded = Math.floor(salesCount / 100) * 100;
  } else {
    rounded = Math.floor(salesCount / 1000) * 1000;
  }

  return `${SALES_COUNT_FORMATTER.format(rounded)}+`;
}

type SellerNameWithTooltipProps = {
  seller: SellerDisplayData;
  className?: string;
};

/**
 * Interactive seller name with tooltip
 * - Desktop: hover shows tooltip
 * - Mobile: tap toggles tooltip, tap outside closes
 * - Uses portal to escape overflow:hidden containers
 * - Repositions on scroll/resize
 * - Closes on Escape key
 */
export function SellerNameWithTooltip({
  seller,
  className = "text-slate-600",
}: SellerNameWithTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // For position: fixed, use viewport coordinates directly (no scroll offset)
      setTooltipPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, []);

  // Update position when tooltip shows, on scroll, or on resize
  useEffect(() => {
    if (showTooltip) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [showTooltip, updatePosition]);

  // Close on Escape key
  useEffect(() => {
    if (showTooltip) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowTooltip(false);
        }
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [showTooltip]);

  // Close on outside click (mobile)
  useEffect(() => {
    if (showTooltip) {
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (
          buttonRef.current &&
          !buttonRef.current.contains(e.target as Node)
        ) {
          setShowTooltip(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [showTooltip]);

  // Handle missing seller data gracefully (after all hooks to follow Rules of Hooks)
  if (!seller || !seller.tooltip) {
    return (
      <span className={className}>{seller?.displayName ?? "Unknown"}</span>
    );
  }

  // Only show tooltip if there's additional info beyond display name
  const baseRows = seller.tooltip.rows ?? [];
  const storeRow = baseRows.find((row) => row.label === "Store");
  const usernameRow = baseRows.find((row) => row.label === "Username");

  const primaryLabel =
    typeof storeRow?.value === "string" && storeRow.value.trim().length > 0
      ? storeRow.value
      : typeof usernameRow?.value === "string" &&
          usernameRow.value.trim().length > 0
        ? usernameRow.value
        : seller.displayName;

  const tooltipRows = [
    ...(usernameRow ? [usernameRow] : []),
    ...(storeRow && storeRow.value ? [storeRow] : []),
    ...baseRows.filter(
      (row) => row.label !== "Username" && row.label !== "Store"
    ),
  ];

  const hasTooltipContent = tooltipRows.length > 0;

  if (!hasTooltipContent) {
    return <span className={className}>{primaryLabel}</span>;
  }

  const tooltipElement =
    showTooltip && mounted
      ? createPortal(
          <div
            className="fixed z-[9999] min-w-[200px] max-w-[300px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              pointerEvents: "none",
            }}
          >
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              {seller.tooltip.title}
            </div>
            <div className="space-y-1">
              {tooltipRows.map((row, idx) => (
                <div key={idx} className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-500">{row.label}:</span>
                  <span className="text-slate-900 font-medium break-all">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${className} cursor-help underline decoration-dotted decoration-slate-300 hover:decoration-slate-400 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 rounded`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`${seller.tooltip.title}: ${tooltipRows.map((r) => `${r.label} ${r.value}`).join(", ")}`}
      >
        {primaryLabel}
      </button>
      {tooltipElement}
    </>
  );
}
