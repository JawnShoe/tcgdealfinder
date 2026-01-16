import { permanentRedirect } from "next/navigation";

/**
 * /watchlist — RETIRED (pre-launch)
 *
 * Watchlist feature was retired as part of Stage 1 Legacy Decommission.
 * Rebuild does not expose watchlist UI. Redirects to discovery.
 */
export default function WatchlistPage() {
  permanentRedirect("/rebuild/discovery");
}
