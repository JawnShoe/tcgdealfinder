/**
 * Deterministic date formatting utilities.
 * 
 * These functions format dates in a locale-independent, timezone-fixed way
 * to prevent SSR/client hydration mismatches.
 * 
 * All functions use UTC to ensure identical output on server and client.
 */

/**
 * Format a date as "YYYY-MM-DD HH:mm:ss UTC"
 * 
 * This format is:
 * - Deterministic (no locale dependency)
 * - SSR-safe (identical on server and client)
 * - Human-readable
 * - Sortable
 * 
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted string like "2025-12-16 08:53:56 UTC"
 */
export function formatDateUTC(date: Date | string | number | null | undefined): string {
  if (!date) {
    return "—";
  }
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    return "—";
  }
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

/**
 * Format a date as "YYYY-MM-DD" (date only, no time)
 * 
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted string like "2025-12-16"
 */
export function formatDateOnlyUTC(date: Date | string | number | null | undefined): string {
  if (!date) {
    return "—";
  }
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    return "—";
  }
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

/**
 * Format a date as "HH:mm:ss UTC" (time only, no date)
 * 
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted string like "08:53:56 UTC"
 */
export function formatTimeOnlyUTC(date: Date | string | number | null | undefined): string {
  if (!date) {
    return "—";
  }
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    return "—";
  }
  
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  
  return `${hours}:${minutes}:${seconds} UTC`;
}

/**
 * Format a relative time string for recent dates (e.g., "2h ago", "3d ago")
 * Falls back to full UTC format for dates older than 30 days.
 * 
 * This is deterministic because it uses UTC and rounds to whole units.
 * 
 * @param date - Date object, ISO string, or timestamp
 * @param now - Optional "now" reference (defaults to Date.now())
 * @returns Relative time string or full UTC format
 */
export function formatRelativeTimeUTC(
  date: Date | string | number | null | undefined,
  now: number = Date.now()
): string {
  if (!date) {
    return "—";
  }
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) {
    return "—";
  }
  
  const diffMs = now - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  
  // Fall back to full format for older dates
  return formatDateUTC(d);
}
