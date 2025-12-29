"use client";

import { useEffect, useMemo, useState } from "react";

import {
  toggleWatchlistEntry,
  useWatchlist,
  type WatchlistEntry,
} from "@/lib/useWatchlist";

type WatchlistStarButtonProps = {
  cardId?: number | null;
  cardName?: string | null;
  setName?: string | null;
  className?: string;
};

export function WatchlistStarButton({
  cardId,
  cardName,
  setName,
  className = "",
}: WatchlistStarButtonProps) {
  const normalizedId = typeof cardId === "number" ? cardId : null;
  const normalizedName = cardName ?? null;
  const watchlist = useWatchlist();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWatching = useMemo(() => {
    if (normalizedId == null) {
      return false;
    }
    if (!mounted) {
      return false;
    }
    return watchlist.some((entry) => entry.id === normalizedId);
  }, [watchlist, normalizedId, mounted]);

  if (normalizedId == null || !normalizedName) {
    return null;
  }

  const entry: WatchlistEntry = {
    id: normalizedId,
    cardName: normalizedName,
    setName: setName ?? null,
  };

  const handleClick = () => {
    toggleWatchlistEntry(entry);
  };

  const label = isWatching
    ? "Remove this card from your watchlist"
    : "Watch this card (all listings)";

  const baseClasses =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2";
  const watchingClasses = isWatching
    ? "border-amber-500 bg-amber-50 text-amber-600"
    : "border-slate-300 bg-white text-slate-500 hover:border-amber-400 hover:text-amber-500";

  return (
    <button
      type="button"
      className={`${baseClasses} ${watchingClasses} ${className}`}
      aria-pressed={isWatching}
      aria-label={label}
      title={label}
      onClick={handleClick}
    >
      <span aria-hidden="true">{isWatching ? "★" : "☆"}</span>
    </button>
  );
}
