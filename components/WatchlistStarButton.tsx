"use client";

import { useState } from "react";

import { useIsWatched, useWatchlist } from "../lib/WatchlistContext";
import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

type WatchlistStarButtonProps = {
  cardId?: number | null;
  cardName?: string | null;
  setName?: string | null;
  className?: string;
};

export function WatchlistStarButton({
  cardId,
  cardName,
  className = "",
}: WatchlistStarButtonProps) {
  const normalizedId = typeof cardId === "number" ? cardId : null;
  const normalizedName = cardName ?? null;
  const [saving, setSaving] = useState(false);

  const { toggle } = useWatchlist();
  const watched = useIsWatched(normalizedId);

  if (normalizedId == null || !normalizedName) {
    return null;
  }

  const handleClick = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await toggle(normalizedId);
    } catch (error) {
      console.error("[watchlist] toggle failed", error);
    } finally {
      setSaving(false);
    }
  };

  const label = watched
    ? "Remove this card from your watchlist"
    : "Watch this card (all listings)";

  const baseClasses =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 disabled:opacity-60";
  const watchingClasses = watched
    ? "border-amber-500 bg-amber-50 text-amber-600"
    : "border-slate-300 bg-white text-slate-500 hover:border-amber-400 hover:text-amber-500";

  return (
    <TooltipPopoverClientOnly
      content={label}
      tooltipClassName="tooltip-wide"
      size="wide"
      usePortal={true}
      asChild
    >
      <button
        type="button"
        className={`${baseClasses} ${watchingClasses} ${className}`}
        aria-pressed={watched}
        aria-label={label}
        onClick={handleClick}
        disabled={saving}
      >
        <span aria-hidden="true">{watched ? "★" : "☆"}</span>
      </button>
    </TooltipPopoverClientOnly>
  );
}
