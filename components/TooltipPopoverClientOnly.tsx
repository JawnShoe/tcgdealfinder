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

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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

  const baseTriggerClassName =
    "peer inline-flex min-w-0 items-center gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60";

  const fallbackTriggerClassName = fallbackClassName ?? triggerClassName ?? "";

  // SSR / initial client render: render layout-identical (but non-interactive) trigger markup
  if (!isMounted) {
    const inertTriggerProps = {
      ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      "aria-disabled": true as const,
      tabIndex: -1,
      onMouseDown: (event: {
        preventDefault: () => void;
        stopPropagation: () => void;
      }) => {
        event.preventDefault();
        event.stopPropagation();
      },
      onClick: (event: {
        preventDefault: () => void;
        stopPropagation: () => void;
      }) => {
        event.preventDefault();
        event.stopPropagation();
      },
    };

    const triggerNode =
      asChild && Children.count(children) === 1 && isValidElement(children) ? (
        (() => {
          const child = Children.only(children) as React.ReactElement<any>;
          const mergedClassName =
            `${baseTriggerClassName} ${child.props.className ?? ""} ${fallbackTriggerClassName}`.trim();

          return cloneElement(child, {
            ...inertTriggerProps,
            className: mergedClassName,
          } as any);
        })()
      ) : (
        <button
          type="button"
          className={`${baseTriggerClassName} ${fallbackTriggerClassName}`.trim()}
          {...inertTriggerProps}
        >
          {children}
        </button>
      );

    const wrapperClassName =
      `relative inline-flex min-w-0 max-w-full items-center ${className ?? ""}`.trim();

    return <span className={wrapperClassName}>{triggerNode}</span>;
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
