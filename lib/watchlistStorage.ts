"use client";

const STORAGE_KEY = "tcg_watchlist";

type WatchlistEntryId = string;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(): WatchlistEntryId[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
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
  } catch {
    // swallow storage errors
  }
}

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
