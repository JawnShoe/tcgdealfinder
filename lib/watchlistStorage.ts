"use client";

const STORAGE_KEY = "tcg_watchlist";
const LEGACY_STORAGE_KEY = "tcgdf_watchlist_v1";
const WATCHLIST_UPDATED_EVENT = "tcg_watchlist_updated";

type WatchlistEntryId = string;

// Legacy format from useWatchlist.ts
type LegacyStoredPayload = {
  version: number;
  entries: Array<{
    id: number;
    cardName: string;
    setName: string | null;
  }>;
};

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

/**
 * Attempt to migrate legacy watchlist format to new format.
 * Only migrates if new key is empty/missing AND legacy key exists.
 * Returns the migrated IDs (or empty array if no migration needed).
 */
function migrateLegacyIfNeeded(): WatchlistEntryId[] {
  if (!isBrowser()) return [];

  try {
    // Check if new format already has data
    const newRaw = window.localStorage.getItem(STORAGE_KEY);
    if (newRaw) {
      const parsed = JSON.parse(newRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // New format exists with data, no migration needed
        return [];
      }
    }

    // Check if legacy format exists
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return [];

    const legacy = JSON.parse(legacyRaw) as LegacyStoredPayload;
    if (
      !legacy ||
      !Array.isArray(legacy.entries) ||
      legacy.entries.length === 0
    ) {
      return [];
    }

    // Extract IDs from legacy format
    const ids: WatchlistEntryId[] = legacy.entries
      .map((entry) => {
        if (entry && typeof entry.id === "number") {
          return String(entry.id);
        }
        return null;
      })
      .filter((id): id is WatchlistEntryId => id !== null);

    if (ids.length > 0) {
      // Write to new format
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      // Leave legacy key in place (do not delete)
    }

    return ids;
  } catch {
    return [];
  }
}

function readStorage(): WatchlistEntryId[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Try migration from legacy format
      const migrated = migrateLegacyIfNeeded();
      if (migrated.length > 0) {
        return migrated;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      // Try migration from legacy format
      const migrated = migrateLegacyIfNeeded();
      if (migrated.length > 0) {
        return migrated;
      }
      return [];
    }
    return parsed
      .map((value) => {
        if (typeof value === "number" || typeof value === "string") {
          return String(value);
        }
        return null;
      })
      .filter((value): value is WatchlistEntryId => Boolean(value));
  } catch {
    return [];
  }
}

function writeStorage(ids: WatchlistEntryId[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    // Dispatch custom event for same-tab listeners (storage event doesn't fire in same tab)
    window.dispatchEvent(new Event(WATCHLIST_UPDATED_EVENT));
  } catch {
    // swallow storage errors
  }
}

/** Event name dispatched when watchlist changes (for same-tab listeners) */
export const WATCHLIST_STORAGE_KEY = STORAGE_KEY;
export const WATCHLIST_CHANGE_EVENT = WATCHLIST_UPDATED_EVENT;

export function getWatchlistIds(): WatchlistEntryId[] {
  return readStorage();
}

export function isOnWatchlist(cardId: WatchlistEntryId | number): boolean {
  const target = String(cardId);
  return readStorage().includes(target);
}

export function addToWatchlist(cardId: WatchlistEntryId | number): void {
  const target = String(cardId);
  const current = new Set(readStorage());
  current.add(target);
  writeStorage(Array.from(current));
}

export function removeFromWatchlist(cardId: WatchlistEntryId | number): void {
  const target = String(cardId);
  const current = new Set(readStorage());
  current.delete(target);
  writeStorage(Array.from(current));
}

export function toggleWatchlist(cardId: WatchlistEntryId | number): boolean {
  const target = String(cardId);
  const current = new Set(readStorage());
  if (current.has(target)) {
    current.delete(target);
    writeStorage(Array.from(current));
    return false;
  }
  current.add(target);
  writeStorage(Array.from(current));
  return true;
}
