/**
 * Shared metrics types and no-op implementations for legacy surfaces.
 *
 * Rebuild surfaces should use @/lib/rebuild/observability/metrics which
 * provides actual DB-backed implementations.
 */

export type ApiRequestParams = {
  route: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
};

/**
 * No-op API request recorder for legacy surfaces.
 *
 * Legacy routes that need structured logging should use logRequest()
 * from @/lib/observability/logging instead of recording to rebuild
 * metrics tables.
 */
export async function recordApiRequest(
  _params: ApiRequestParams
): Promise<void> {
  // No-op for legacy surfaces - logging is handled separately via logRequest()
}
