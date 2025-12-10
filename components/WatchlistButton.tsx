"use client";

import { useEffect, useState } from "react";

import {
  addToWatchlist,
  getWatchlistIds,
  isOnWatchlist,
  removeFromWatchlist,
} from "../lib/watchlistStorage";

type WatchlistButtonProps = {
  cardId: number | string;
  variant?: "default" | "icon";
  onChange?: (isWatching: boolean) => void;
};

export function WatchlistButton({
  cardId,
  variant = "default",
  onChange,
}: WatchlistButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    setIsReady(true);
    setIsWatching(isOnWatchlist(cardId));
  }, [cardId]);

  const handleToggle = () => {
    if (!isReady) return;
    if (isWatching) {
      removeFromWatchlist(cardId);
      setIsWatching(false);
      onChange?.(false);
    } else {
      addToWatchlist(cardId);
      setIsWatching(true);
      onChange?.(true);
    }
  };

  if (!isReady) {
    return variant === "icon" ? (
      <button
        type="button"
        className="watchlist-button-icon"
        aria-label="Add to watchlist"
        disabled
      >
        ☆
      </button>
    ) : (
      <button type="button" className="watchlist-button" disabled>
        Add to watchlist
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={`watchlist-button-icon ${isWatching ? "watchlist-active" : ""}`}
        aria-label={isWatching ? "Remove from watchlist" : "Add to watchlist"}
        aria-pressed={isWatching}
        onClick={handleToggle}
      >
        {isWatching ? "★" : "☆"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`watchlist-button ${isWatching ? "watchlist-active" : ""}`}
      onClick={handleToggle}
      aria-pressed={isWatching}
    >
      {isWatching ? "Watching" : "Add to watchlist"}
    </button>
  );
}
