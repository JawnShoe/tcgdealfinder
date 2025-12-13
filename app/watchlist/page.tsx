"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { WatchlistButton } from "../../components/WatchlistButton";
import {
  getWatchlistIds,
  removeFromWatchlist,
} from "../../lib/watchlistStorage";
import { formatCurrency } from "@/lib/dealFormatting";
import { FX_RATE_COPY } from "@/lib/money";

type WatchlistCard = {
  id: number;
  name: string;
  setName: string;
  cardNumber: string | null;
  condition: string;
  estimatedValue: number | null;
  sampleSize: number | null;
};

export default function WatchlistPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [cards, setCards] = useState<WatchlistCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIds(getWatchlistIds());
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setCards([]);
      setLoading(false);
      return;
    }

    async function loadCards() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("ids", ids.join(","));
        const res = await fetch(`/api/watchlist-cards?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        const data = (await res.json()) as { cards: WatchlistCard[] };
        if (!cancelled) {
          setCards(data.cards ?? []);
        }
      } catch (error) {
        console.error("Failed to load watchlist cards:", error);
        if (!cancelled) {
          setCards([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCards();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const empty = !loading && (ids.length === 0 || cards.length === 0);

  const orderedCards = useMemo(() => {
    return [...cards].sort((a, b) => a.name.localeCompare(b.name));
  }, [cards]);

  const handleRemove = (cardId: number) => {
    removeFromWatchlist(cardId);
    setIds(getWatchlistIds());
  };

  return (
    <main className="page-shell space-y-6 py-6">
      <div className="panel space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Your Watchlist</h1>
        <p className="text-base text-slate-600">
          Save cards to track their estimated value and active deals.
        </p>
      </div>

      {loading ? (
        <div className="panel text-sm text-slate-500">Loading watchlist…</div>
      ) : empty ? (
        <div className="panel space-y-3 text-center text-sm text-slate-600">
          <p>No cards in your watchlist yet.</p>
          <Link href="/" className="text-sky-600 hover:underline">
            Browse current deals
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedCards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {card.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {card.setName} •{" "}
                    {card.cardNumber ? `#${card.cardNumber}` : "Unnumbered"} •{" "}
                    {card.condition}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <WatchlistButton
                    cardId={card.id}
                    variant="icon"
                    onChange={(watching) => {
                      if (!watching) {
                        handleRemove(card.id);
                      }
                    }}
                  />
                  <Link
                    href={`/cards/${card.id}`}
                    className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View card
                  </Link>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
                <div>
                  <span className="text-slate-500">Estimated value:</span>{" "}
                  <strong>
                    {card.estimatedValue != null
                      ? formatCurrency(card.estimatedValue)
                      : "Not available"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Sample size:</span>{" "}
                  <strong>
                    {card.sampleSize != null ? card.sampleSize : "Unknown"}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
