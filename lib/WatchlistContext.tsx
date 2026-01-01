"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  addToWatchlist as lsAdd,
  isOnWatchlist as lsIsWatched,
  removeFromWatchlist as lsRemove,
} from "./watchlistStorage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Listener = () => void;

interface WatchlistContextValue {
  /** Check if a card is watched (synchronous, from cache) */
  isWatched: (cardId: number) => boolean;
  /** Toggle watched state for a card. Returns the new watched state. */
  toggle: (cardId: number) => Promise<boolean>;
  /** Subscribe to changes for a specific cardId */
  subscribe: (listener: Listener) => () => void;
  /** Whether the provider is using API mode */
  useApi: boolean;
}

type PersistResultOk = { ok: true };
type PersistResultError = { ok: false; status: number; message: string };
type PersistResult = PersistResultOk | PersistResultError;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface WatchlistProviderProps {
  children: React.ReactNode;
  /**
   * Whether to use the API for persistence.
   * - true: Use /api/watchlist (DB-backed mode)
   * - false: Use localStorage only (default, flag OFF)
   *
   * This value is computed on the server from WATCHLIST_DB_ENABLED and passed
   * as a prop to ensure consistent behavior (client cannot read process.env).
   */
  initialUseApi: boolean;
}

export function WatchlistProvider({
  children,
  initialUseApi,
}: WatchlistProviderProps) {
  // Session-level fallback: if API returns 501/500/network error, fall back
  // to localStorage for the rest of the session (defense-in-depth).
  const fallbackToLocalRef = useRef(false);

  // In-memory cache of watched state per cardId
  const cacheRef = useRef(new Map<number, boolean>());

  // Listeners for useSyncExternalStore
  const listenersRef = useRef(new Set<Listener>());

  // Emit to all listeners
  const emit = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener();
    }
  }, []);

  // Subscribe function for useSyncExternalStore
  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  // Get watched state from cache, falling back to localStorage initial value
  const isWatched = useCallback((cardId: number): boolean => {
    const cached = cacheRef.current.get(cardId);
    if (cached !== undefined) {
      return cached;
    }
    // Initial read from localStorage (works in both modes for hydration)
    const initial = lsIsWatched(cardId);
    cacheRef.current.set(cardId, initial);
    return initial;
  }, []);

  // Persist to API (only called when useApi=true and not in fallback mode)
  const persistToApi = useCallback(
    async (cardId: number, watched: boolean): Promise<PersistResult> => {
      try {
        const res = await fetch("/api/watchlist", {
          method: watched ? "POST" : "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cardId }),
          cache: "no-store",
        });

        if (!res.ok) {
          const message = await res.text().catch(() => "");
          return { ok: false, status: res.status, message };
        }

        return { ok: true };
      } catch {
        return { ok: false, status: 0, message: "Network error" };
      }
    },
    []
  );

  // Toggle watched state
  const toggle = useCallback(
    async (cardId: number): Promise<boolean> => {
      const prev = isWatched(cardId);
      const next = !prev;

      // Optimistic update
      cacheRef.current.set(cardId, next);
      emit();

      // Determine persistence mode:
      // - If initialUseApi=false, always use localStorage (flag OFF)
      // - If initialUseApi=true but fallback triggered, use localStorage
      // - Otherwise use API
      const shouldUseApi = initialUseApi && !fallbackToLocalRef.current;

      if (!shouldUseApi) {
        // localStorage mode: persist directly, no API call
        if (next) {
          lsAdd(cardId);
        } else {
          lsRemove(cardId);
        }
        return next;
      }

      // API mode: persist to API
      const result = await persistToApi(cardId, next);

      if (result.ok === true) {
        // Success - also update localStorage as backup
        if (next) {
          lsAdd(cardId);
        } else {
          lsRemove(cardId);
        }
        return next;
      }

      // API failed - check if we should fallback
      const { status, message } = result;

      if (status === 501 || status === 500 || status === 0) {
        // Trigger session-level fallback
        console.warn(
          `[watchlist] API unavailable (${status}), falling back to localStorage for session`
        );
        fallbackToLocalRef.current = true;

        // Persist to localStorage instead
        if (next) {
          lsAdd(cardId);
        } else {
          lsRemove(cardId);
        }
        return next;
      }

      // Other error (4xx) - rollback optimistic update
      console.error(`[watchlist] toggle failed: ${message}`);
      cacheRef.current.set(cardId, prev);
      emit();
      throw new Error(message || `Request failed (${status})`);
    },
    [initialUseApi, isWatched, persistToApi, emit]
  );

  const value = useMemo<WatchlistContextValue>(
    () => ({
      isWatched,
      toggle,
      subscribe,
      useApi: initialUseApi,
    }),
    [isWatched, toggle, subscribe, initialUseApi]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook to access watchlist functionality.
 * Must be used within a WatchlistProvider.
 */
export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return ctx;
}

/**
 * Hook to get watched state for a specific card.
 * Uses useSyncExternalStore for reactive updates.
 */
export function useIsWatched(cardId: number | null | undefined): boolean {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useIsWatched must be used within a WatchlistProvider");
  }

  const { subscribe, isWatched } = ctx;

  return useSyncExternalStore(
    subscribe,
    () => (cardId == null ? false : isWatched(cardId)),
    () => false // Server snapshot
  );
}
