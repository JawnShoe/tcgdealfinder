"use client";

import type { SellerDisplayData } from "@/lib/sellerDisplay";
import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

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

export function SellerNameWithTooltip({
  seller,
  className = "text-slate-600",
}: SellerNameWithTooltipProps) {
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

  const ariaLabel = `${seller.tooltip.title}: ${tooltipRows
    .map((row) => `${row.label} ${row.value}`)
    .join(", ")}`;

  return (
    <TooltipPopoverClientOnly
      content={
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-700">
            {seller.tooltip.title}
          </div>
          <div className="space-y-1">
            {tooltipRows.map((row, idx) => (
              <div key={idx} className="flex justify-between gap-3 text-xs">
                <span className="text-slate-500">{row.label}:</span>
                <span className="break-all font-medium text-slate-900">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      }
      ariaLabel={ariaLabel}
      className="inline-flex min-w-0 max-w-full items-center"
      triggerClassName={`${className} min-w-0 max-w-full truncate text-left hover:text-slate-900`.trim()}
      fallbackClassName={`${className} min-w-0 max-w-full truncate`.trim()}
      tooltipClassName="tooltip-wide"
      size="wide"
      usePortal={true}
    >
      <span className="truncate">{primaryLabel}</span>
    </TooltipPopoverClientOnly>
  );
}
