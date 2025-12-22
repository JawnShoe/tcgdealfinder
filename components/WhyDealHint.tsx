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
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

  const hasTooltip = Boolean(tooltip);
  const isOpen = hasTooltip && (isHover || isFocus || isPinned);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

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
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onFocus={() => setIsFocus(true)}
        onBlur={() => {
          setIsFocus(false);
          if (!isPinned) {
            setIsPinned(false);
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
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
