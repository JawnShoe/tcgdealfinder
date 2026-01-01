"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WatchlistStarButton } from "./WatchlistStarButton";

type WatchlistItem = {
  cardId: number;
  name: string;
  setName: string | null;
};

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: WatchlistItem[] };

export function WatchlistPageApi() {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/watchlist", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) {
          setState({ status: "success", items: data.items ?? [] });
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

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
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

  const sorted = [...state.items].sort((a, b) => a.name.localeCompare(b.name));
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
          key={entry.cardId}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {entry.name}
              </h2>
              <p className="text-sm text-slate-500">
                {entry.setName ?? "Pokémon card"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WatchlistStarButton
                cardId={entry.cardId}
                cardName={entry.name}
                setName={entry.setName}
                initialIsWatched={true}
                useApi={true}
              />
              <Link
                href={`/cards/${entry.cardId}`}
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
