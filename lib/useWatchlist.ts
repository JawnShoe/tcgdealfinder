"use client";

import { useSyncExternalStore } from "react";

export type WatchlistEntry = {
  id: number;
  cardName: string;
  setName: string | null;
};

const STORAGE_KEY = "tcgdf_watchlist_v1";
const STORAGE_VERSION = 1;

type StoredPayload = {
  version: number;
  entries: Array<{
    id: number;
    cardName: string;
    setName: string | null;
  }>;
};

type Listener = () => void;

const listeners = new Set<Listener>();

const store = {
  entries: [] as WatchlistEntry[],
};

let hydrated = false;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadFromStorage(): WatchlistEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredPayload;
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.entries)) {
      return [];
    }

    return parsed.entries
      .map((entry) => {
        if (!entry || typeof entry.id !== "number") {
          return null;
        }
        return {
          id: entry.id,
          cardName: entry.cardName ?? "",
          setName: entry.setName ?? null,
        };
      })
      .filter((entry): entry is WatchlistEntry => Boolean(entry?.cardName));
  } catch {
    return [];
  }
}

function saveToStorage(entries: WatchlistEntry[]) {
  if (!isBrowser()) return;
  try {
    const payload: StoredPayload = {
      version: STORAGE_VERSION,
      entries: entries.map((entry) => ({
        id: entry.id,
        cardName: entry.cardName,
        setName: entry.setName,
      })),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function ensureHydrated() {
  if (!hydrated && isBrowser()) {
    store.entries = loadFromStorage();
    hydrated = true;
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setEntries(entries: WatchlistEntry[]) {
  store.entries = entries;
  saveToStorage(entries);
  emit();
}

function upsertEntry(entry: WatchlistEntry) {
  ensureHydrated();
  const existing = store.entries.find((item) => item.id === entry.id);
  if (existing && existing.cardName === entry.cardName && existing.setName === entry.setName) {
    return;
  }
  const filtered = store.entries.filter((item) => item.id !== entry.id);
  setEntries([...filtered, entry]);
}

function removeEntry(id: number) {
  ensureHydrated();
  const next = store.entries.filter((item) => item.id !== id);
  setEntries(next);
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key && event.key !== STORAGE_KEY) {
    return;
  }
  hydrated = false;
  ensureHydrated();
  emit();
}

if (isBrowser()) {
  window.addEventListener("storage", handleStorageEvent);
}

export function useWatchlist(): WatchlistEntry[] {
  ensureHydrated();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => store.entries,
    () => [],
  );
}

export function isCardWatched(cardId: number | null | undefined): boolean {
  if (cardId == null) return false;
  ensureHydrated();
  return store.entries.some((entry) => entry.id === cardId);
}

export function toggleWatchlistEntry(entry: WatchlistEntry): boolean {
  ensureHydrated();
  const isWatching = store.entries.some((item) => item.id === entry.id);
  if (isWatching) {
    removeEntry(entry.id);
    return false;
  }
  upsertEntry(entry);
  return true;
}

export function removeWatchlistEntry(id: number) {
  removeEntry(id);
}
