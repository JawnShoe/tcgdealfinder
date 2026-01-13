import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { checkRateLimit } from "@/lib/rebuild/security/rateLimit";
import { parseOutboundClickPayload } from "@/lib/rebuild/security/validation";
import { POST } from "@/app/api/rebuild/outbound-click/route";
import { getRecentDeals } from "@/lib/rebuild/data/getRecentDeals";

async function withDatabaseUrlUnset<T>(fn: () => Promise<T>): Promise<T> {
  const originalUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    return await fn();
  } finally {
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  }
}

test("rate limiter enforces limits per bucket", () => {
  const key = randomUUID();
  const now = 1_000;

  const first = checkRateLimit({
    bucket: "outbound-click",
    key,
    limit: 2,
    windowMs: 60_000,
    nowMs: now,
  });
  assert.equal(first.allowed, true);

  const second = checkRateLimit({
    bucket: "outbound-click",
    key,
    limit: 2,
    windowMs: 60_000,
    nowMs: now,
  });
  assert.equal(second.allowed, true);

  const third = checkRateLimit({
    bucket: "outbound-click",
    key,
    limit: 2,
    windowMs: 60_000,
    nowMs: now,
  });
  assert.equal(third.allowed, false);

  const segmented = checkRateLimit({
    bucket: "health",
    key,
    limit: 1,
    windowMs: 60_000,
    nowMs: now,
  });
  assert.equal(segmented.allowed, true);
});

test("parseOutboundClickPayload validates required fields", () => {
  const invalid = parseOutboundClickPayload({ listingId: "abc" });
  assert.equal(invalid.ok, false);

  const valid = parseOutboundClickPayload({
    url: "https://example.com/listing/123",
    listingId: "listing-123",
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.url, "https://example.com/listing/123");
  }
});

test("outbound click route rejects invalid payload with 400", async () => {
  await withDatabaseUrlUnset(async () => {
    const request = new Request("http://localhost/api/rebuild/outbound-click", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `test-${randomUUID()}`,
      },
      body: JSON.stringify({ listingId: "missing-url" }),
    });

    const response = await POST(request);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.ok, false);
  });
});

test("outbound click route returns 429 when rate limit is exceeded", async () => {
  await withDatabaseUrlUnset(async () => {
    const ip = `limit-${randomUUID()}`;
    let lastStatus = 200;

    for (let index = 0; index < 21; index += 1) {
      const request = new Request(
        "http://localhost/api/rebuild/outbound-click",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({ url: "https://example.com/listing/123" }),
        }
      );

      const response = await POST(request);
      lastStatus = response.status;
    }

    assert.equal(lastStatus, 429);
  });
});

test("getRecentDeals returns empty result when DB is unavailable", async () => {
  const originalUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    const result = await getRecentDeals(5);
    assert.equal(result.deals.length, 0);
    assert.equal(result.total, 0);
    assert.ok(result.fetchedAtISO);
  } finally {
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  }
});
