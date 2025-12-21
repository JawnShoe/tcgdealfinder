"use client";

import Link from "next/link";

import { WatchlistStarButton } from "../../components/WatchlistStarButton";
import { removeWatchlistEntry, useWatchlist } from "@/lib/useWatchlist";
import { PAGE_TITLE, PAGE_SUBTITLE } from "@/lib/typography";

export default function WatchlistPage() {
  const entries = useWatchlist();
  const sorted = [...entries].sort((a, b) =>
    a.cardName.localeCompare(b.cardName),
  );
  const isEmpty = sorted.length === 0;

  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 space-y-6 pb-8">
        <div className="space-y-2">
          <h1 className={PAGE_TITLE}>Your watchlist</h1>
          <p className={PAGE_SUBTITLE}>
            Tap the ☆ icon on any card to save it here for quick access.
          </p>
        </div>

      {isEmpty ? (
        <div className="panel space-y-3 text-center">
          <p className="text-sm text-slate-600">You haven&apos;t starred any cards yet.</p>
          <p className="text-sm text-slate-500">
            ☆ Star cards to track deals
          </p>
        </div>
      ) : (
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
                  />
                  <Link
                    href={`/cards/${entry.id}`}
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View card
                  </Link>
                  <button
                    type="button"
                    className="rounded border border-transparent px-2 py-1 text-xs text-slate-500 transition hover:text-slate-700"
                    onClick={() => removeWatchlistEntry(entry.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}
