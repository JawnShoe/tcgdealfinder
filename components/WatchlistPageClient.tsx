"use client";

import Link from "next/link";
import { useWatchlist } from "../lib/useWatchlist";
import { WatchlistStarButton } from "./WatchlistStarButton";
import { useWatchlistContext } from "../lib/WatchlistContext";

export function WatchlistPageClient() {
  const entries = useWatchlist();
  const { isWatched, loading } = useWatchlistContext();

  // Filter by context state to handle removals during session
  const activeEntries = loading
    ? entries
    : entries.filter((entry) => isWatched(entry.id));
  const sorted = [...activeEntries].sort((a, b) =>
    a.cardName.localeCompare(b.cardName)
  );
  const isEmpty = sorted.length === 0;

  if (isEmpty) {
    return (
      <div className="panel space-y-3 text-center">
        <p className="text-sm text-slate-600">
          You haven&apos;t starred any cards yet.
        </p>
        <p className="text-sm text-slate-500">☆ Star cards to track deals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {entry.cardName}
              </h2>
              <p className="text-sm text-slate-500">
                {entry.setName ?? "Pokémon card"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WatchlistStarButton
                cardId={entry.id}
                cardName={entry.cardName}
                setName={entry.setName}
                initialIsWatched={true}
              />
              <Link
                href={`/cards/${entry.id}`}
                className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View card
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
