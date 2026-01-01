import Link from "next/link";
import { cookies } from "next/headers";

import { WatchlistStarButton } from "../../components/WatchlistStarButton";
import { ANON_ID_COOKIE, isValidAnonId } from "../../lib/anonId";
import { fetchWatchlistCards } from "../../lib/watchlistDb";
import { PAGE_SUBTITLE, PAGE_TITLE } from "../../lib/typography";

export default async function WatchlistPage() {
  const ownerIdRaw = cookies().get(ANON_ID_COOKIE)?.value ?? null;
  const ownerId = isValidAnonId(ownerIdRaw) ? ownerIdRaw : null;
  const items = ownerId ? await fetchWatchlistCards(ownerId) : [];
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
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
            <p className="text-sm text-slate-600">
              You haven&apos;t starred any cards yet.
            </p>
            <p className="text-sm text-slate-500">
              ☆ Star cards to track deals
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
}
