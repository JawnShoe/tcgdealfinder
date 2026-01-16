/**
 * Feature Flags — Tier 2 MVP
 *
 * These flags control Tier 2 features.
 * Flags default to OFF for zero behavior change until explicitly enabled.
 *
 * Set to "true" to enable. Any other value (including unset) = disabled.
 */

/**
 * Check if email alerts system is enabled.
 * When true, email alerts can be sent to subscribers.
 */
export function isAlertsEnabled(): boolean {
  return process.env.ALERTS_ENABLED === "true";
}
