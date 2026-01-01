"use client";

import { useState, useSyncExternalStore } from "react";

import { TooltipPopoverClientOnly } from "./TooltipPopoverClientOnly";
import {
  addToWatchlist,
  removeFromWatchlist,
  isOnWatchlist,
} from "../lib/watchlistStorage";

type WatchlistStarButtonProps = {
  cardId?: number | null;
  cardName?: string | null;
  setName?: string | null;
  initialIsWatched?: boolean;
  className?: string;
  /** When true, persist to /api/watchlist. When false (default), use localStorage. */
  useApi?: boolean;
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

function getWatched(
  cardId: number,
  fallback: boolean,
  useApi: boolean
): boolean {
  // If using localStorage mode, check localStorage state
  if (!useApi) {
    return isOnWatchlist(cardId);
  }
  // API mode: use in-memory cache with SSR fallback
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

type PersistResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

async function persistWatchlistApi(
  cardId: number,
  watched: boolean
): Promise<PersistResult> {
  try {
    const res = await fetch("/api/watchlist", {
      method: watched ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cardId }),
      cache: "no-store",
    });

    if (!res.ok) {
      const message = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        message: message || `Request failed (${res.status})`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

function persistWatchlistLocal(cardId: number, watched: boolean): void {
  if (watched) {
    addToWatchlist(cardId);
  } else {
    removeFromWatchlist(cardId);
  }
}

export function WatchlistStarButton({
  cardId,
  cardName,
  initialIsWatched = false,
  className = "",
  useApi = false,
}: WatchlistStarButtonProps) {
  const normalizedId = typeof cardId === "number" ? cardId : null;
  const normalizedName = cardName ?? null;
  const [saving, setSaving] = useState(false);

  const watched = useSyncExternalStore(
    subscribe,
    () =>
      normalizedId == null
        ? false
        : getWatched(normalizedId, initialIsWatched, useApi),
    () => (normalizedId == null ? false : initialIsWatched)
  );

  if (normalizedId == null || !normalizedName) {
    return null;
  }

  const handleClick = async () => {
    if (saving) return;
    const prev = watched;
    const next = !prev;

    // Optimistic update
    setWatched(normalizedId, next);
    setSaving(true);

    try {
      // localStorage mode: persist locally, no API call
      if (!useApi) {
        persistWatchlistLocal(normalizedId, next);
        return;
      }

      // API mode: persist to database
      const result = await persistWatchlistApi(normalizedId, next);

      if (result.ok === true) {
        // API succeeded
        return;
      }

      // Handle errors: revert optimistic update
      console.error("[watchlist] toggle failed:", result.message);
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
