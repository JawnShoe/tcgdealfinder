type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitState>;

type RateLimitConfig = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
  bucket: string;
};

declare global {
  var rebuildRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!global.rebuildRateLimitStore) {
    global.rebuildRateLimitStore = new Map();
  }
  return global.rebuildRateLimitStore;
}

function getStoreKey(bucket: string, key: string): string {
  return `${bucket}:${key}`;
}

export function getRateLimitKey(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return ip;
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = config.nowMs ?? Date.now();
  const store = getStore();
  const storeKey = getStoreKey(config.bucket, config.key);
  const existing = store.get(storeKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + config.windowMs;
    const state = { count: 1, resetAt };
    store.set(storeKey, state);
    return {
      allowed: true,
      remaining: Math.max(config.limit - 1, 0),
      resetAt,
      limit: config.limit,
      bucket: config.bucket,
    };
  }

  if (existing.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: config.limit,
      bucket: config.bucket,
    };
  }

  existing.count += 1;
  store.set(storeKey, existing);

  return {
    allowed: true,
    remaining: Math.max(config.limit - existing.count, 0),
    resetAt: existing.resetAt,
    limit: config.limit,
    bucket: config.bucket,
  };
}
