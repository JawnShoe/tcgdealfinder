/**
 * Feature flags for Tier 2 MVP features.
 *
 * All flags default to OFF (false) to ensure features must be explicitly enabled.
 * See docs/ENV_RUNBOOK.md for environment variable documentation.
 */

/**
 * Enable DB-backed watchlist (replaces localStorage).
 * When OFF: Watchlist API returns 501 Not Implemented.
 * When ON: Full DB-backed watchlist functionality.
 */
export function isWatchlistDbEnabled(): boolean {
  return process.env.WATCHLIST_DB_ENABLED === "true";
}

/**
 * Enable email alerts system.
 * When OFF: Alert subscription endpoints return 501 Not Implemented.
 * When ON: Full email alert functionality.
 */
export function isAlertsEnabled(): boolean {
  return process.env.ALERTS_ENABLED === "true";
}
