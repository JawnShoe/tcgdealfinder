"use client";

import { useState, useSyncExternalStore } from "react";

import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";

type WatchlistStarButtonProps = {
  cardId?: number | null;
  cardName?: string | null;
  setName?: string | null;
  initialIsWatched?: boolean;
  className?: string;
};

type Listener = () => void;

const listeners = new Set<Listener>();
const watchedByCardId = new Map<number, boolean>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getWatched(cardId: number, fallback: boolean): boolean {
  const stored = watchedByCardId.get(cardId);
  if (stored == null) {
    return fallback;
  }
  return stored;
}

function setWatched(cardId: number, next: boolean) {
  watchedByCardId.set(cardId, next);
  emit();
}

async function persistWatchlist(
  cardId: number,
  watched: boolean
): Promise<void> {
  const res = await fetch("/api/watchlist", {
    method: watched ? "POST" : "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cardId }),
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }
}

export function WatchlistStarButton({
  cardId,
  cardName,
  initialIsWatched = false,
  className = "",
}: WatchlistStarButtonProps) {
  const normalizedId = typeof cardId === "number" ? cardId : null;
  const normalizedName = cardName ?? null;
  const [saving, setSaving] = useState(false);

  const watched = useSyncExternalStore(
    subscribe,
    () =>
      normalizedId == null ? false : getWatched(normalizedId, initialIsWatched),
    () => (normalizedId == null ? false : initialIsWatched)
  );

  if (normalizedId == null || !normalizedName) {
    return null;
  }

  const handleClick = async () => {
    if (saving) return;
    const prev = watched;
    const next = !prev;

    setWatched(normalizedId, next);
    setSaving(true);
    try {
      await persistWatchlist(normalizedId, next);
    } catch (error) {
      console.error("[watchlist] toggle failed", error);
      setWatched(normalizedId, prev);
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
