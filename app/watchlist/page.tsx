import { WatchlistPageClient } from "../../components/WatchlistPageClient";
import { WatchlistPageApi } from "../../components/WatchlistPageApi";
import { isWatchlistDbEnabled } from "../../lib/featureFlags";
import { PAGE_SUBTITLE, PAGE_TITLE } from "../../lib/typography";

function WatchlistHeader() {
  return (
    <div className="space-y-2">
      <h1 className={PAGE_TITLE}>Your watchlist</h1>
      <p className={PAGE_SUBTITLE}>
        Tap the ☆ icon on any card to save it here for quick access.
      </p>
    </div>
  );
}

export default function WatchlistPage() {
  const dbEnabled = isWatchlistDbEnabled();

  // Flag OFF: client-side localStorage-based watchlist
  // Flag ON: client-side API-based watchlist (ensures anon_id cookie is set)
  const ContentComponent = dbEnabled ? WatchlistPageApi : WatchlistPageClient;

  return (
    <main className="bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10 space-y-6 pb-8">
        <WatchlistHeader />
        <ContentComponent />
      </div>
    </main>
  );
}
