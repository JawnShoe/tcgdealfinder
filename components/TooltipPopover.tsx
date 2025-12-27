"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipPopoverProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  tooltipClassName?: string;
  ariaLabel?: string;
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
  size = "default",
  side = "bottom",
  usePortal = false,
}: TooltipPopoverProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

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

  // Update tooltip position for portal mode
  useEffect(() => {
    if (!usePortal || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const top = side === "top" ? rect.top - 8 : rect.bottom + 8;

      // Constrain left position to viewport bounds using measured tooltip width
      const viewportWidth = window.innerWidth;
      let left = rect.left;

      // Measure actual tooltip width if available, otherwise use fallback based on size
      const tooltipWidth = tooltipRef.current
        ? tooltipRef.current.getBoundingClientRect().width
        : size === "wide"
          ? 320
          : size === "medium"
            ? 280
            : size === "compact"
              ? 240
              : 384; // default max-w-sm

      // Prevent tooltip from extending beyond right edge
      if (left + tooltipWidth > viewportWidth) {
        left = Math.max(0, viewportWidth - tooltipWidth);
      }

      // Prevent tooltip from extending beyond left edge
      if (left < 0) {
        left = 0;
      }

      setTooltipPosition({
        top,
        left,
      });
    };

    const handleScroll = () => {
      // Dismiss tooltip on scroll instead of repositioning
      setIsOpen(false);
    };

    updatePosition();

    // Dismiss on scroll (capture phase to catch all scroll containers)
    window.addEventListener("scroll", handleScroll, true);
    // Reposition (not dismiss) on window resize
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [usePortal, side, isOpen, size]);

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

  const bubbleClasses = usePortal
    ? isOpen
      ? `visible max-h-96 overflow-visible opacity-100 pointer-events-auto ${sizeOpenClasses}`
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

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex min-w-0 max-w-full items-center ${className ?? ""}`.trim()}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`peer inline-flex min-w-0 items-center gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${triggerClassName ?? ""}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isTouch ? isPinned : undefined}
        aria-describedby={tooltipId}
        onMouseEnter={() => {
          if (usePortal && isHoverCapable) {
            setIsOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (usePortal && isHoverCapable) {
            setIsOpen(false);
          }
        }}
        onFocus={() => {
          if (usePortal && isHoverCapable) {
            setIsOpen(true);
          }
        }}
        onBlur={() => {
          if (usePortal && isHoverCapable) {
            setIsOpen(false);
          }
        }}
        onClick={() => {
          if (isHoverCapable) {
            return;
          }
          setIsPinned((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setIsPinned(false);
            (event.currentTarget as HTMLButtonElement).blur();
          }
        }}
      >
        {children}
      </button>
      {usePortal && typeof document !== "undefined"
        ? createPortal(tooltipBubble, document.body)
        : tooltipBubble}
    </span>
  );
}
