import { query } from "./db";

/**
 * Rate limiting configuration
 * Sliding window: count requests in the last WINDOW_SECONDS
 */
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Extract client IP from request headers.
 * Priority: x-forwarded-for (first IP) > x-real-ip > fallback
 *
 * FRAGILE: Relies on reverse proxy headers. In direct connections without
 * a proxy, this will fall back to "unknown" which groups all such requests.
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);

  // x-forwarded-for may contain multiple IPs: "client, proxy1, proxy2"
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Fallback to x-real-ip (some proxies use this)
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Vercel-specific header
  const vercelIp = headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const firstIp = vercelIp.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // No IP available - this groups all non-proxied requests together
  // In production behind Vercel/Cloudflare, this should not happen
  return "unknown";
}

/**
 * Check and record a rate-limited action.
 * Uses sliding window: counts requests in the last WINDOW_SECONDS.
 *
 * @param route - Route identifier (e.g., "/api/rebuild/alerts/subscribe")
 * @param ip - Client IP address
 * @returns RateLimitResult with allowed status and retry info
 */
export async function checkRateLimit(
  route: string,
  ip: string
): Promise<RateLimitResult> {
  const rateKey = `${route}:${ip}`;
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000
  ).toISOString();

  // Count requests in the sliding window
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM rate_limits
     WHERE rate_key = $1 AND created_at > $2`,
    [rateKey, windowStart]
  );

  const currentCount = parseInt(countResult.rows[0]?.count ?? "0", 10);

  if (currentCount >= RATE_LIMIT_MAX_REQUESTS) {
    // Find the oldest request in the window to calculate retry-after
    const oldestResult = await query<{ created_at: Date }>(
      `SELECT created_at FROM rate_limits
       WHERE rate_key = $1 AND created_at > $2
       ORDER BY created_at ASC
       LIMIT 1`,
      [rateKey, windowStart]
    );

    let retryAfterSeconds = RATE_LIMIT_WINDOW_SECONDS;
    if (oldestResult.rows[0]) {
      const oldestTime = new Date(oldestResult.rows[0].created_at).getTime();
      const windowEndTime = oldestTime + RATE_LIMIT_WINDOW_SECONDS * 1000;
      retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowEndTime - Date.now()) / 1000)
      );
    }

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Record this request
  await query(`INSERT INTO rate_limits (rate_key) VALUES ($1)`, [rateKey]);

  // Opportunistic cleanup: delete old entries (fire-and-forget, don't await)
  // Only run occasionally to avoid overhead on every request
  if (Math.random() < 0.01) {
    query(
      `DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '1 hour'`
    ).catch(() => {
      // Ignore cleanup errors
    });
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - currentCount - 1,
  };
}

/**
 * Rate limit constants exported for documentation/testing
 */
export const RATE_LIMIT_CONFIG = {
  maxRequests: RATE_LIMIT_MAX_REQUESTS,
  windowSeconds: RATE_LIMIT_WINDOW_SECONDS,
} as const;
