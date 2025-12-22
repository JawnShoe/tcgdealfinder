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
      className={`relative inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap ${className ?? ""}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        className="flex h-4 w-4 flex-none items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        aria-label="More info"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onFocus={() => setIsFocus(true)}
        onBlur={() => {
          setIsFocus(false);
          setIsPinned(false);
        }}
        onClick={(event) => {
          event.stopPropagation();
          setIsPinned((prev) => !prev);
        }}
      >
        i
      </button>
      {isOpen ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 w-max max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-lg"
        >
          {tooltip}
        </span>
      ) : null}
    </span>
  );
}
