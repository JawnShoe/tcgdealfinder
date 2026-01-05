"use client";

import { useState, useEffect } from "react";
import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

type WhyDealHintProps = {
  label: string;
  tooltip?: string | null;
  className?: string;
};

/**
 * WhyDealHint - Client-only component to prevent hydration mismatches.
 *
 * HYDRATION STRATEGY:
 * The label/tooltip for this component can differ between SSR and CSR because
 * the underlying computation uses Date.now() (e.g., "Just listed" depends on
 * time elapsed since updatedAt). To prevent hydration mismatches, we render
 * nothing on SSR and only render the hint after client-side hydration.
 *
 * This is acceptable because WhyDealHint is supplementary metadata, not
 * critical content - users won't notice a brief delay before hints appear.
 */
export function WhyDealHint({ label, tooltip, className }: WhyDealHintProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // SSR / initial client render: render nothing to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  // After hydration: render the full hint
  if (!tooltip) {
    return <span className={className}>{label}</span>;
  }

  return (
    <TooltipPopoverClientOnly
      content={tooltip}
      ariaLabel={`${label} (more info)`}
      className="inline-flex min-w-0 max-w-full items-center whitespace-nowrap"
      triggerClassName={`min-w-0 truncate text-left ${className ?? ""}`.trim()}
      tooltipClassName="tooltip-wide"
      size="compact"
      usePortal={true}
    >
      {label}
    </TooltipPopoverClientOnly>
  );
}
