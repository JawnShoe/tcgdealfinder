"use client";

import { TooltipPopover } from "./TooltipPopover";

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
  if (!tooltip) {
    return <span className={className}>{label}</span>;
  }

  return (
    <TooltipPopover
      content={tooltip}
      ariaLabel={`${label} (more info)`}
      className="inline-flex min-w-0 max-w-full items-center whitespace-nowrap"
      triggerClassName={`min-w-0 truncate text-left ${className ?? ""}`.trim()}
      tooltipClassName="w-auto max-w-[240px]"
      size="compact"
    >
      {label}
    </TooltipPopover>
  );
}
