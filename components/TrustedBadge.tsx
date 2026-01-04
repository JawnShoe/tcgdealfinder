"use client";

import {
  TRUST_FEEDBACK_THRESHOLD,
  TRUST_POSITIVE_PERCENT,
} from "../lib/dealScore";
import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

const TRUSTED_TOOLTIP = `Trusted seller: ${TRUST_POSITIVE_PERCENT}%+ positive feedback, ${TRUST_FEEDBACK_THRESHOLD}+ ratings`;

export function TrustedBadge({ className }: { className?: string }) {
  return (
    <TooltipPopoverClientOnly
      content={TRUSTED_TOOLTIP}
      ariaLabel="Trusted seller"
      triggerClassName={`inline-flex items-center justify-center text-emerald-500 ${className ?? ""}`.trim()}
      tooltipClassName="tooltip-wide"
      size="medium"
      usePortal={true}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3 4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-3Z" />
        <path d="m9 12 2.5 2.5L15 11" />
      </svg>
    </TooltipPopoverClientOnly>
  );
}
