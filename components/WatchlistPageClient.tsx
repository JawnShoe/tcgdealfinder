"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WatchlistStarButton } from "./WatchlistStarButton";
import { useWatchlistContext } from "../lib/WatchlistContext";
import { getWatchlistIds } from "../lib/watchlistStorage";

type CardDetails = {
  id: number;
  name: string;
  setName: string | null;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; cards: CardDetails[] };

export function WatchlistPageClient() {
  const { isWatched, loading: contextLoading } = useWatchlistContext();
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [watchedIds, setWatchedIds] = useState<number[]>([]);

  // Read watched IDs from localStorage (same key as WatchlistContext)
  useEffect(() => {
    const ids = getWatchlistIds()
      .map((id) => Number(id))
      .filter((n) => !isNaN(n) && n > 0);
    setWatchedIds(ids);
  }, []);

  // Fetch card details when we have IDs
  useEffect(() => {
    if (watchedIds.length === 0) {
      setState({ status: "success", cards: [] });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    async function fetchCards() {
      try {
        const idsParam = watchedIds.join(",");
        const res = await fetch(`/api/watchlist-cards?ids=${idsParam}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          const cards: CardDetails[] = (data.cards ?? []).map(
            (c: { id: number; name: string; setName: string | null }) => ({
              id: c.id,
              name: c.name,
              setName: c.setName,
            })
          );
          setState({ status: "success", cards });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load",
          });
        }
      }
    }

    fetchCards();
    return () => {
      cancelled = true;
    };
  }, [watchedIds]);

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="panel space-y-3 text-center">
        <p className="text-sm text-slate-600">Loading your watchlist...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="panel space-y-3 text-center">
        <p className="text-sm text-red-600">Failed to load watchlist</p>
        <p className="text-xs text-slate-500">{state.message}</p>
      </div>
    );
  }

  // Filter by context state to handle removals during session
  const activeCards = contextLoading
    ? state.cards
    : state.cards.filter((card) => isWatched(card.id));
  const sorted = [...activeCards].sort((a, b) => a.name.localeCompare(b.name));
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
      {sorted.map((card) => (
        <div
          key={card.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {card.name}
              </h2>
              <p className="text-sm text-slate-500">
                {card.setName ?? "Pokémon card"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WatchlistStarButton
                cardId={card.id}
                cardName={card.name}
                setName={card.setName}
                initialIsWatched={true}
              />
              <Link
                href={`/cards/${card.id}`}
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
