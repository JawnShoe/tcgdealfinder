"use client";

import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

type WhyDealHintProps = {
  label: string;
  tooltip?: string | null;
  className?: string;
};

export function WhyDealHint({ label, tooltip, className }: WhyDealHintProps) {
  if (!tooltip) {
    return <span className={className}>{label}</span>;
  }

  return (
    <TooltipPopoverClientOnly
      content={tooltip}
      ariaLabel={`${label} (more info)`}
      className="inline-flex min-w-0 max-w-full items-center whitespace-nowrap"
      tooltipClassName="tooltip-wide"
      size="compact"
      usePortal={true}
      asChild={true}
    >
      <span className={`min-w-0 truncate text-left ${className ?? ""}`.trim()}>
        {label}
      </span>
    </TooltipPopoverClientOnly>
  );
}
