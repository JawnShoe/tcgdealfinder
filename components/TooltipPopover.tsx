"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type TooltipPopoverProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  tooltipClassName?: string;
  ariaLabel?: string;
  asChild?: boolean;
  size?: "default" | "compact" | "medium" | "wide";
  side?: "top" | "bottom";
  usePortal?: boolean;
};

export function TooltipPopover({
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
}: TooltipPopoverProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isOpen, setIsOpen] = useState(false);
  // Track whether position has been computed for current open state
  const [isPositioned, setIsPositioned] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();
  const rafIdRef = useRef<number | null>(null);

  const isTouch = !isHoverCapable;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setIsHoverCapable(mql.matches);
    update();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);

  useEffect(() => {
    if (isHoverCapable && isPinned) {
      setIsPinned(false);
    }
  }, [isHoverCapable, isPinned]);

  useEffect(() => {
    if (!isPinned) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPinned(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!wrapperRef.current || !target) return;
      if (!wrapperRef.current.contains(target)) {
        setIsPinned(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isPinned]);

  // Compute tooltip position - called after tooltip is measurable
  const computePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // For side="top", position tooltip above trigger (need tooltip height)
    // For side="bottom", position tooltip below trigger
    const tooltipHeight = tooltipRect.height || 40; // fallback if still 0
    const top =
      side === "top"
        ? triggerRect.top - tooltipHeight - 8
        : triggerRect.bottom + 8;

    // Constrain left position to viewport bounds using measured tooltip width
    const viewportWidth = window.innerWidth;
    let left = triggerRect.left;

    const tooltipWidth =
      tooltipRect.width ||
      (size === "wide"
        ? 320
        : size === "medium"
          ? 280
          : size === "compact"
            ? 240
            : 384);

    // Prevent tooltip from extending beyond right edge
    if (left + tooltipWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - tooltipWidth);
    }

    // Prevent tooltip from extending beyond left edge
    if (left < 0) {
      left = 0;
    }

    setTooltipPosition({ top, left });
    setIsPositioned(true);
  }, [side, size]);

  // Reset positioned state when tooltip closes
  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
    }
  }, [isOpen]);

  // Position tooltip after it becomes visible and measurable
  // Uses requestAnimationFrame to wait for browser paint
  useEffect(() => {
    if (!usePortal || !isOpen) return;

    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Wait for next frame when tooltip is rendered and measurable
    rafIdRef.current = requestAnimationFrame(() => {
      // Double RAF ensures paint has occurred
      rafIdRef.current = requestAnimationFrame(() => {
        computePosition();
      });
    });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [usePortal, isOpen, computePosition]);

  // Handle scroll (dismiss), resize (reposition), and visibility changes
  useEffect(() => {
    if (!usePortal || !isOpen) return;

    const handleScroll = () => {
      setIsOpen(false);
    };

    const handleResize = () => {
      computePosition();
    };

    // Recompute position when tab/window regains focus (fixes "tab away/back" symptom)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isOpen) {
        // Use RAF to ensure DOM is ready after visibility change
        requestAnimationFrame(() => {
          computePosition();
        });
      }
    };

    const handleWindowFocus = () => {
      if (isOpen) {
        requestAnimationFrame(() => {
          computePosition();
        });
      }
    };

    // Dismiss on scroll (capture phase to catch all scroll containers)
    window.addEventListener("scroll", handleScroll, true);
    // Reposition on window resize
    window.addEventListener("resize", handleResize);
    // Recompute on visibility/focus changes
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [usePortal, isOpen, computePosition]);

  // Phase 1: Removed w-max to prevent blank space; width: fit-content applied via CSS
  const sizeHoverClasses =
    size === "wide"
      ? "peer-hover:max-w-[320px] peer-focus-visible:max-w-[320px]"
      : size === "medium"
        ? "peer-hover:max-w-[280px] peer-focus-visible:max-w-[280px]"
        : size === "compact"
          ? "peer-hover:max-w-[240px] peer-focus-visible:max-w-[240px]"
          : "peer-hover:max-w-xs peer-focus-visible:max-w-xs";

  const sizeOpenClasses =
    size === "wide"
      ? "max-w-[320px]"
      : size === "medium"
        ? "max-w-[280px]"
        : size === "compact"
          ? "max-w-[240px]"
          : "max-w-xs";

  // Portal tooltip states:
  // - closed: invisible, collapsed (max-h-0 max-w-0), no pointer events
  // - open but not positioned: visible for measurement, full size, but opacity-0 (invisible to user)
  // - open and positioned: visible, full size, opacity-100 (user can see it)
  const bubbleClasses = usePortal
    ? isOpen
      ? isPositioned
        ? `visible max-h-96 overflow-visible opacity-100 pointer-events-auto ${sizeOpenClasses}`
        : `visible max-h-96 overflow-visible opacity-0 pointer-events-none ${sizeOpenClasses}` // measurable but invisible
      : "invisible max-h-0 max-w-0 overflow-hidden opacity-0 pointer-events-none"
    : isHoverCapable
      ? `invisible max-h-0 max-w-0 overflow-hidden opacity-0 pointer-events-none peer-hover:visible peer-hover:max-h-96 peer-hover:overflow-visible peer-hover:opacity-100 peer-focus-visible:visible peer-focus-visible:max-h-96 peer-focus-visible:overflow-visible peer-focus-visible:opacity-100 ${sizeHoverClasses}`
      : isPinned
        ? `visible max-h-96 overflow-visible opacity-100 pointer-events-auto ${sizeOpenClasses}`
        : "invisible max-h-0 max-w-0 overflow-hidden opacity-0 pointer-events-none";

  const positionClass = side === "top" ? "bottom-full mb-2" : "top-full mt-2";

  const tooltipBubble = (
    <span
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className={`${usePortal ? "fixed" : "absolute left-0"} ${usePortal ? "" : positionClass} z-50 w-fit whitespace-normal break-words rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-normal normal-case leading-snug text-slate-700 shadow-lg transition-opacity ${bubbleClasses} ${tooltipClassName ?? ""}`.trim()}
      style={
        usePortal
          ? {
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
            }
          : undefined
      }
    >
      {content}
    </span>
  );

  const baseTriggerClassName =
    "peer inline-flex min-w-0 items-center gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60";

  const mergeEventHandlers =
    <E,>(
      theirHandler: ((event: E) => void) | undefined,
      ourHandler: ((event: E) => void) | undefined
    ) =>
    (event: E) => {
      theirHandler?.(event);
      if ((event as { defaultPrevented?: boolean } | null)?.defaultPrevented) {
        return;
      }
      ourHandler?.(event);
    };

  const sharedTriggerProps = {
    ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
    "aria-haspopup": "dialog" as const,
    "aria-expanded": isTouch ? isPinned : undefined,
    "aria-describedby": tooltipId,
    onMouseEnter: () => {
      if (usePortal && isHoverCapable) {
        setIsOpen(true);
      }
    },
    onMouseLeave: () => {
      if (usePortal && isHoverCapable) {
        setIsOpen(false);
      }
    },
    onFocus: () => {
      if (usePortal && isHoverCapable) {
        setIsOpen(true);
      }
    },
    onBlur: () => {
      if (usePortal && isHoverCapable) {
        setIsOpen(false);
      }
    },
    onClick: () => {
      if (isHoverCapable) {
        return;
      }
      setIsPinned((prev) => !prev);
    },
    onKeyDown: (event: { key: string; currentTarget: unknown }) => {
      if (event.key === "Escape") {
        setIsPinned(false);
        if (event.currentTarget instanceof HTMLElement) {
          event.currentTarget.blur();
        }
      }
    },
  };

  const triggerNode =
    asChild && Children.count(children) === 1 && isValidElement(children) ? (
      (() => {
        const child = Children.only(children) as React.ReactElement<any>;
        const childRef = (child as unknown as { ref?: unknown }).ref;
        const setRef = (node: HTMLElement | null) => {
          triggerRef.current = node;
          if (typeof childRef === "function") {
            childRef(node);
          } else if (
            childRef &&
            typeof childRef === "object" &&
            "current" in childRef
          ) {
            (childRef as { current?: unknown }).current = node;
          }
        };

        const mergedClassName =
          `${baseTriggerClassName} ${child.props.className ?? ""} ${
            triggerClassName ?? ""
          }`.trim();

        return cloneElement(child, {
          ...sharedTriggerProps,
          ref: setRef,
          className: mergedClassName,
          onMouseEnter: mergeEventHandlers(
            child.props.onMouseEnter,
            sharedTriggerProps.onMouseEnter
          ),
          onMouseLeave: mergeEventHandlers(
            child.props.onMouseLeave,
            sharedTriggerProps.onMouseLeave
          ),
          onFocus: mergeEventHandlers(
            child.props.onFocus,
            sharedTriggerProps.onFocus
          ),
          onBlur: mergeEventHandlers(
            child.props.onBlur,
            sharedTriggerProps.onBlur
          ),
          onClick: mergeEventHandlers(
            child.props.onClick,
            sharedTriggerProps.onClick
          ),
          onKeyDown: mergeEventHandlers(
            child.props.onKeyDown,
            sharedTriggerProps.onKeyDown
          ),
        } as any);
      })()
    ) : (
      <button
        ref={triggerRef as unknown as React.Ref<HTMLButtonElement>}
        type="button"
        className={`${baseTriggerClassName} ${triggerClassName ?? ""}`.trim()}
        {...sharedTriggerProps}
      >
        {children}
      </button>
    );

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex min-w-0 max-w-full items-center ${className ?? ""}`.trim()}
    >
      {triggerNode}
      {usePortal && typeof document !== "undefined"
        ? createPortal(tooltipBubble, document.body)
        : tooltipBubble}
    </span>
  );
}
