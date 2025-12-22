"use client";

import { CONFIDENCE_TOOLTIP } from "../lib/dealConfidence";
import { TooltipPopover } from "./TooltipPopover";

interface ConfidenceChipProps {
  weightLabel?: string | null;
  sampleSize?: number | null;
  center?: boolean;
}

type NormalizedLevel = "high" | "medium" | "low";

/**
 * Compact confidence chip component for /newest and /cards tables.
 * Displays "High", "Med", or "Low" with color-coded background.
 * Tooltip shows full confidence explanation with sample size.
 * 
 * Accepts various formats: "high", "High", "High confidence", etc.
 */
export function ConfidenceChip({
  weightLabel,
  sampleSize,
  center = false,
}: ConfidenceChipProps) {
  // Normalize input to handle various formats
  const raw = (weightLabel ?? "low").toLowerCase();
  let level: NormalizedLevel = "low";
  
  if (raw.includes("high")) {
    level = "high";
  } else if (raw.includes("med") || raw.includes("medium")) {
    level = "medium";
  }

  // Get display text
  const displayText = level === "high" ? "High" : level === "medium" ? "Med" : "Low";
  
  // Get full text for tooltip title
  const fullText = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  
  // Get color classes
  const colorClass = 
    level === "high" ? "bg-green-100 text-green-700" :
    level === "medium" ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";

  // Build tooltip with clear data quality emphasis
  const n = sampleSize ?? null;
  const tooltip = typeof n === "number"
    ? `${fullText} data confidence. Based on recent sales volume and price consistency (n=${n}).`
    : `${fullText} data confidence. Based on recent sales volume and price consistency.`;

  const chip = (
    <TooltipPopover
      content={tooltip}
      ariaLabel={`${fullText} data confidence`}
      triggerClassName={`inline-flex min-w-10 items-center justify-center rounded-full px-2 py-0.5 text-center text-xs font-semibold leading-none ${colorClass}`}
    >
      {displayText}
    </TooltipPopover>
  );

  if (center) {
    return <div className="flex justify-center">{chip}</div>;
  }

  return chip;
}
