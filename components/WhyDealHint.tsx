"use client";

import { useEffect, useId, useRef, useState } from "react";

type WhyDealHintProps = {
  label: string;
  tooltip?: string | null;
  className?: string;
};

export function WhyDealHint({
  label,
  tooltip,
  className,
}: WhyDealHintProps) {
  const [isHover, setIsHover] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

  const hasTooltip = Boolean(tooltip);
  const isTouch = !isHoverCapable;
  const isOpen = hasTooltip &&
    (isHoverCapable ? (isHover || isFocus) : (isPinned || isFocus));

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
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPinned(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isPinned) return;
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
  }, [isOpen, isPinned]);

  if (!hasTooltip) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex min-w-0 max-w-full items-center whitespace-nowrap"
    >
      <button
        type="button"
        className={`min-w-0 truncate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${className ?? ""}`.trim()}
        aria-label={`${label} (more info)`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onMouseEnter={() => {
          if (isHoverCapable) setIsHover(true);
        }}
        onMouseLeave={() => {
          if (isHoverCapable) setIsHover(false);
        }}
        onFocus={() => setIsFocus(true)}
        onBlur={() => {
          setIsFocus(false);
          setIsPinned(false);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (isHoverCapable) {
            setIsPinned(false);
            return;
          }
          setIsPinned((prev) => !prev);
        }}
      >
        {label}
      </button>
      {isOpen ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 max-w-xs whitespace-normal break-words rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-lg"
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}
