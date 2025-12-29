"use client";

/**
 * Client-only wrapper for TooltipPopover to prevent SSR hydration mismatches.
 *
 * HYDRATION STRATEGY:
 * - On SSR: Renders children in a plain <span> (no button, no tooltip)
 * - On CSR: Renders the full interactive TooltipPopover
 *
 * This ensures the server-rendered HTML matches the initial client render,
 * preventing "Expected server HTML to contain a matching <button>" errors.
 *
 * Use this component on pages that are server-rendered (SSR) where tooltips
 * need to be interactive after hydration.
 */

import { useState, useEffect, type ReactNode } from "react";
import { TooltipPopover } from "./TooltipPopover";

type TooltipPopoverClientOnlyProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  triggerClassName?: string;
  tooltipClassName?: string;
  ariaLabel?: string;
  asChild?: boolean;
  size?: "default" | "compact" | "medium" | "wide";
  side?: "top" | "bottom";
  usePortal?: boolean;
  /**
   * Class to apply to the SSR fallback wrapper.
   * Defaults to triggerClassName for visual consistency.
   */
  fallbackClassName?: string;
};

export function TooltipPopoverClientOnly({
  content,
  children,
  className,
  triggerClassName,
  tooltipClassName,
  ariaLabel,
  asChild = false,
  size = "default",
  side = "bottom",
  usePortal = false,
  fallbackClassName,
}: TooltipPopoverClientOnlyProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // SSR / initial client render: plain span matching triggerClassName styling
  if (!isMounted) {
    return (
      <span
        className={`inline-flex min-w-0 items-center gap-1.5 ${fallbackClassName ?? triggerClassName ?? ""}`.trim()}
      >
        {children}
      </span>
    );
  }

  // After hydration: full interactive tooltip
  return (
    <TooltipPopover
      content={content}
      className={className}
      triggerClassName={triggerClassName}
      tooltipClassName={tooltipClassName}
      ariaLabel={ariaLabel}
      asChild={asChild}
      size={size}
      side={side}
      usePortal={usePortal}
    >
      {children}
    </TooltipPopover>
  );
}
