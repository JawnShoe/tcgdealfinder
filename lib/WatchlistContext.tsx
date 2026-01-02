"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  addToWatchlist as addToLocalStorage,
  removeFromWatchlist as removeFromLocalStorage,
  isOnWatchlist as isOnLocalStorage,
  getWatchlistIds,
  WATCHLIST_STORAGE_KEY,
  WATCHLIST_CHANGE_EVENT,
} from "./watchlistStorage";

type WatchlistContextValue = {
  /** Check if a card is watched */
  isWatched: (cardId: number) => boolean;
  /** Toggle watch state for a card. Returns the new watched state. */
  toggle: (cardId: number) => Promise<boolean>;
  /** Whether the watchlist is currently loading */
  loading: boolean;
  /** Whether we're using API mode (true) or localStorage mode (false) */
  useApi: boolean;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// Session-level fallback flag: if API returns 501, switch to localStorage for session
let sessionFallbackToLocal = false;

type PersistResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

async function fetchWatchlistApi(): Promise<
  { ok: true; cardIds: number[] } | { ok: false; status: number }
> {
  try {
    const res = await fetch("/api/watchlist", { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const data = await res.json();
    const items = data.items ?? [];
    const cardIds = items.map((item: { cardId: number }) => item.cardId);
    return { ok: true, cardIds };
  } catch {
    return { ok: false, status: 0 };
  }
}

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

type WatchlistProviderProps = {
  children: ReactNode;
  /** When true, use API/DB. When false, use localStorage. */
  useApi: boolean;
};

export function WatchlistProvider({
  children,
  useApi,
}: WatchlistProviderProps) {
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [effectiveUseApi, setEffectiveUseApi] = useState(useApi);

  // Hydrate on mount
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // If already fell back to localStorage, or flag is OFF, use localStorage
      if (sessionFallbackToLocal || !useApi) {
        const ids = getWatchlistIds()
          .map((id) => Number(id))
          .filter((n) => !isNaN(n));
        if (!cancelled) {
          setWatchedIds(new Set(ids));
          setEffectiveUseApi(false);
          setLoading(false);
        }
        return;
      }

      // API mode: fetch from server
      const result = await fetchWatchlistApi();

      if (cancelled) return;

      if (result.ok === true) {
        setWatchedIds(new Set(result.cardIds));
        setLoading(false);
        return;
      }

      // result.ok is false - extract status
      const { status } = result;

      // Handle 501: API disabled, fall back to localStorage
      if (status === 501) {
        console.info(
          "[watchlist] API disabled (501), using localStorage fallback"
        );
        sessionFallbackToLocal = true;
        setEffectiveUseApi(false);
        const ids = getWatchlistIds()
          .map((id) => Number(id))
          .filter((n) => !isNaN(n));
        setWatchedIds(new Set(ids));
        setLoading(false);
        return;
      }

      // Other errors: log and fall back to localStorage for this session
      console.error(
        "[watchlist] API error, using localStorage fallback:",
        status
      );
      sessionFallbackToLocal = true;
      setEffectiveUseApi(false);
      const ids = getWatchlistIds()
        .map((id) => Number(id))
        .filter((n) => !isNaN(n));
      setWatchedIds(new Set(ids));
      setLoading(false);
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [useApi]);

  // Subscribe to localStorage changes when in localStorage mode (Flag OFF)
  useEffect(() => {
    // Only subscribe when using localStorage mode
    if (effectiveUseApi || loading) {
      return;
    }

    // Handler to sync context with localStorage
    const syncFromStorage = () => {
      const ids = getWatchlistIds()
        .map((id) => Number(id))
        .filter((n) => !isNaN(n));
      setWatchedIds(new Set(ids));
    };

    // Same-tab updates (custom event from watchlistStorage)
    const handleCustomEvent = () => {
      syncFromStorage();
    };

    // Cross-tab updates (storage event)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === WATCHLIST_STORAGE_KEY || event.key === null) {
        syncFromStorage();
      }
    };

    window.addEventListener(WATCHLIST_CHANGE_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(WATCHLIST_CHANGE_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [effectiveUseApi, loading]);

  const isWatched = useCallback(
    (cardId: number): boolean => {
      return watchedIds.has(cardId);
    },
    [watchedIds]
  );

  const toggle = useCallback(
    async (cardId: number): Promise<boolean> => {
      const prev = watchedIds.has(cardId);
      const next = !prev;

      // Optimistic update
      setWatchedIds((current) => {
        const updated = new Set(current);
        if (next) {
          updated.add(cardId);
        } else {
          updated.delete(cardId);
        }
        return updated;
      });

      // localStorage mode
      if (!effectiveUseApi) {
        if (next) {
          addToLocalStorage(cardId);
        } else {
          removeFromLocalStorage(cardId);
        }
        return next;
      }

      // API mode
      const result = await persistWatchlistApi(cardId, next);

      if (result.ok === true) {
        return next;
      }

      // result.ok is false - extract status and message
      const { status, message } = result;

      // Handle 501: fall back to localStorage for session
      if (status === 501) {
        console.info(
          "[watchlist] API disabled (501), switching to localStorage"
        );
        sessionFallbackToLocal = true;
        setEffectiveUseApi(false);
        if (next) {
          addToLocalStorage(cardId);
        } else {
          removeFromLocalStorage(cardId);
        }
        return next;
      }

      // Other errors: revert optimistic update
      console.error("[watchlist] toggle failed:", message);
      setWatchedIds((current) => {
        const reverted = new Set(current);
        if (prev) {
          reverted.add(cardId);
        } else {
          reverted.delete(cardId);
        }
        return reverted;
      });
      return prev;
    },
    [watchedIds, effectiveUseApi]
  );

  const value = useMemo(
    (): WatchlistContextValue => ({
      isWatched,
      toggle,
      loading,
      useApi: effectiveUseApi,
    }),
    [isWatched, toggle, loading, effectiveUseApi]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext(): WatchlistContextValue {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error(
      "useWatchlistContext must be used within WatchlistProvider"
    );
  }
  return context;
}

/**
 * Safe hook that returns null if not within provider.
 * Use this for components that may render outside the provider.
 */
export function useWatchlistContextSafe(): WatchlistContextValue | null {
  return useContext(WatchlistContext);
}
