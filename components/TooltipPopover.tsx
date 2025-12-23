"use client";

import { useEffect, useId, useRef, useState } from "react";

type TooltipPopoverProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  tooltipClassName?: string;
  ariaLabel?: string;
  size?: "default" | "compact" | "medium" | "wide";
  side?: "top" | "bottom";
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
}: TooltipPopoverProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
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

  const sizeHoverClasses =
    size === "wide"
      ? "peer-hover:max-w-[320px] peer-focus-visible:max-w-[320px] peer-hover:w-fit peer-focus-visible:w-fit"
      : size === "medium"
        ? "peer-hover:max-w-[280px] peer-focus-visible:max-w-[280px] peer-hover:w-fit peer-focus-visible:w-fit"
        : size === "compact"
          ? "peer-hover:max-w-[240px] peer-focus-visible:max-w-[240px] peer-hover:w-fit peer-focus-visible:w-fit"
          : "peer-hover:max-w-sm peer-focus-visible:max-w-sm";

  const sizePinnedClasses =
    size === "wide"
      ? "max-w-[320px] w-fit"
      : size === "medium"
        ? "max-w-[280px] w-fit"
        : size === "compact"
          ? "max-w-[240px] w-fit"
          : "max-w-sm";

  const bubbleClasses = isHoverCapable
    ? `invisible max-h-0 max-w-0 overflow-hidden opacity-0 pointer-events-none peer-hover:visible peer-hover:max-h-96 peer-hover:overflow-visible peer-hover:opacity-100 peer-focus-visible:visible peer-focus-visible:max-h-96 peer-focus-visible:overflow-visible peer-focus-visible:opacity-100 ${sizeHoverClasses}`
    : isPinned
      ? `visible max-h-96 overflow-visible opacity-100 pointer-events-auto ${sizePinnedClasses}`
      : "invisible max-h-0 max-w-0 overflow-hidden opacity-0 pointer-events-none";

  const positionClass = side === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <span
      ref={wrapperRef}
      className={`relative inline-flex min-w-0 max-w-full items-center ${className ?? ""}`.trim()}
    >
      <button
        type="button"
        className={`peer inline-flex min-w-0 items-center gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${triggerClassName ?? ""}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isTouch ? isPinned : undefined}
        aria-describedby={tooltipId}
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
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute left-0 ${positionClass} z-50 whitespace-normal break-words rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-normal normal-case leading-snug text-slate-700 shadow-lg transition-opacity ${bubbleClasses} ${tooltipClassName ?? ""}`.trim()}
      >
        {content}
      </span>
    </span>
  );
}
