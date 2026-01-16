/**
 * Feature Flags for Rebuild Alerts
 *
 * Rebuild-lane copy of alerts feature flag check.
 * Controls whether email alerts system is operational.
 */

/**
 * Check if email alerts system is enabled.
 * When true, email alerts and unsubscribe operations are allowed.
 * When false, the system returns 501 Not Implemented.
 */
export function isAlertsEnabled(): boolean {
  return process.env.ALERTS_ENABLED === "true";
}
