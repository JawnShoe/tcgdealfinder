"use client";

import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

type SellerSeenBadgeProps = {
  count: number | null | undefined;
  windowDays?: number | null;
  marketLabel?: string | null;
  className?: string;
};

export function SellerSeenBadge({
  count,
  windowDays = 30,
  marketLabel,
  className,
}: SellerSeenBadgeProps) {
  if (!count || count < 3) {
    return null;
  }
  const label = `Seen on ${count} deals`;
  const days = windowDays ?? 30;
  const marketSuffix = marketLabel ? ` (${marketLabel})` : "";
  const tooltip = `Seen on ${count} deals in the last ${days} days${marketSuffix}.`;
  return (
    <TooltipPopoverClientOnly
      content={tooltip}
      className="w-fit"
      triggerClassName={`w-fit text-[11px] text-slate-500 ${className ?? ""}`.trim()}
      tooltipClassName="tooltip-wide"
      size="medium"
      usePortal={true}
    >
      {label}
    </TooltipPopoverClientOnly>
  );
}
