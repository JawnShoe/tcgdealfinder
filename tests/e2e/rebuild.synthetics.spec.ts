import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCanonicalUrl,
  buildDiscoveryCanonicalUrl,
  buildListingCanonicalUrl,
} from "../../lib/rebuild/seo/canonical";
import {
  buildListingTitle,
  buildRebuildTitle,
} from "../../lib/rebuild/seo/meta";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const listingId = "rebuild-e2e-1";

const complianceCopy = "We may earn a commission from qualifying purchases.";

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild synthetics.");

function buildCanonicalDiscoveryUrl(searchParams?: URLSearchParams): string {
  return buildDiscoveryCanonicalUrl(searchParams);
}

test("Stage 1 delete: /top-deals returns 404 (legacy route removed)", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/top-deals`;

  const response = await request.get(legacyUrl);
  expect(response.status()).toBe(404);

  const pageResponse = await page.goto(legacyUrl, {
    waitUntil: "domcontentloaded",
  });
  expect(pageResponse?.status()).toBe(404);
});

test("Stage 1 delete: /newest returns 404 (legacy route removed)", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/newest`;

  const response = await request.get(legacyUrl);
  expect(response.status()).toBe(404);

  const pageResponse = await page.goto(legacyUrl, {
    waitUntil: "domcontentloaded",
  });
  expect(pageResponse?.status()).toBe(404);
});

test("Stage 1 delete: /ending-soon returns 404 (legacy route removed)", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/ending-soon`;

  const response = await request.get(legacyUrl);
  expect(response.status()).toBe(404);

  const pageResponse = await page.goto(legacyUrl, {
    waitUntil: "domcontentloaded",
  });
  expect(pageResponse?.status()).toBe(404);
});

test("Stage 5 delete: /search returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/search`);
  expect(response.status()).toBe(404);
});

// Stage 4: /sets stubs deleted - all requests return 404
test("Stage 4 delete: /sets returns 404 (stubs removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/sets`);
  expect(response.status()).toBe(404);
});

test("Stage 4 delete: /sets/[setId] returns 404 (stubs removed)", async ({
  request,
}) => {
  // Any setId now returns 404 since stubs are deleted
  const response = await request.get(`${baseURL}/sets/1`);
  expect(response.status()).toBe(404);
});

test("Stage 1 decommission: /alerts/unsubscribe page renders HTML surface (no redirect)", async ({
  request,
}) => {
  const testToken = "test-token-e2e-page-redirect";
  const legacyUrl = `${baseURL}/alerts/unsubscribe?token=${testToken}`;

  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(200);

  const contentType = response.headers()["content-type"] ?? "";
  expect(contentType).toContain("text/html");
  const body = await response.text();
  expect(body).toContain('id="__next-page-redirect"');
  expect(body).toContain(
    `content="0;url=/api/rebuild/alerts/unsubscribe?token=${encodeURIComponent(testToken)}"`
  );
});

test("Stage 1 decommission: /alerts/unsubscribe page handles missing token gracefully", async ({
  request,
}) => {
  const legacyUrl = `${baseURL}/alerts/unsubscribe`;

  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(200);

  const contentType = response.headers()["content-type"] ?? "";
  expect(contentType).toContain("text/html");
  const body = await response.text();
  expect(body).toContain('id="__next-page-redirect"');
  expect(body).toContain('content="0;url=/api/rebuild/alerts/unsubscribe"');
  expect(body).not.toContain(
    'content="0;url=/api/rebuild/alerts/unsubscribe?token='
  );
});

test("Stage 1 decommission: /api/alerts/unsubscribe redirects to rebuild endpoint", async ({
  request,
}) => {
  const testToken = "test-token-e2e-redirect";
  const legacyUrl = `${baseURL}/api/alerts/unsubscribe?token=${testToken}`;
  const expectedPath = `/api/rebuild/alerts/unsubscribe?token=${testToken}`;

  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }
});

test("Rebuild unsubscribe endpoint: returns 400 for missing token", async ({
  request,
}) => {
  const url = `${baseURL}/api/rebuild/alerts/unsubscribe`;

  const response = await request.get(url);
  // When alerts are disabled, returns 501; when enabled, returns 400 for missing token
  expect([400, 501]).toContain(response.status());

  const body = await response.text();
  expect(body).toMatch(/Missing unsubscribe token|Alerts are not enabled/i);
});

test("Rebuild unsubscribe endpoint: returns appropriate response for invalid token", async ({
  request,
}) => {
  const invalidToken = "invalid-token-does-not-exist";
  const url = `${baseURL}/api/rebuild/alerts/unsubscribe?token=${invalidToken}`;

  const response = await request.get(url);
  // When alerts are disabled, returns 501; when enabled, returns 400 for invalid token
  expect([400, 501]).toContain(response.status());

  const body = await response.text();
  expect(body).toMatch(
    /invalid or has already been used|Alerts are not enabled/i
  );
});

test("Stage 1 decommission: /api/alerts/subscribe redirects to rebuild endpoint", async ({
  request,
}) => {
  const legacyUrl = `${baseURL}/api/alerts/subscribe`;
  const expectedPath = `/api/rebuild/alerts/subscribe`;

  // Send a POST request with maxRedirects: 0 to verify redirect behavior
  const response = await request.post(legacyUrl, {
    data: { cardId: 1, email: "test@example.com", minDiscountPercent: 10 },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }
});

test("Rebuild subscribe endpoint: returns deterministic validation error for missing email", async ({
  request,
}) => {
  const url = `${baseURL}/api/rebuild/alerts/subscribe`;

  // Send POST with missing email to trigger validation
  const response = await request.post(url, {
    data: { cardId: 1, minDiscountPercent: 10 },
  });

  // When alerts are disabled, returns 501; when enabled, returns 400 for missing email
  expect([400, 501]).toContain(response.status());

  const body = await response.json();
  expect(body.ok).toBe(false);
  expect(body.error).toMatch(/valid email address|Alerts are not enabled/i);
});

test("Stage 5 delete: /watchlist returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/watchlist`);
  expect(response.status()).toBe(404);
});

test("Stage 1 decommission: header does not contain Watchlist link", async ({
  page,
}) => {
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("link", { name: "Watchlist" })).toHaveCount(0);
});

test("Stage 1 decommission: no watchlist star buttons on discovery page", async ({
  page,
}) => {
  await page.goto(`${baseURL}/discovery`, {
    waitUntil: "domcontentloaded",
  });
  // Star buttons used aria-label "Watch this card" or similar
  await expect(page.locator('[aria-label*="watchlist"]')).toHaveCount(0);
  await expect(page.locator('[aria-label*="Watch this card"]')).toHaveCount(0);
  // The star unicode characters used by watchlist
  await expect(page.locator('button:has-text("☆")')).toHaveCount(0);
  await expect(page.locator('button:has-text("★")')).toHaveCount(0);
});

// Stage 4: /cards stubs deleted - all requests return 404
test("Stage 4 delete: /cards/[cardId] returns 404 (stubs removed)", async ({
  request,
}) => {
  // Any cardId now returns 404 since stubs are deleted
  const response = await request.get(`${baseURL}/cards/99999`);
  expect(response.status()).toBe(404);
});

test("Stage 4 delete: /cards/invalid returns 404 (stubs removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/cards/invalid`);
  expect(response.status()).toBe(404);
});

test("Stage 1 decommission: /catalog returns 404 (retired)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/catalog`);
  expect(response.status()).toBe(404);
});

test("Stage 1 decommission: /catalog/sets/[id] returns 404 (retired)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/catalog/sets/1`);
  expect(response.status()).toBe(404);
});

test("Stage 2 decommission: /debug/logout returns 404 (retired)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/debug/logout`);
  expect(response.status()).toBe(404);
});

test("Stage 2 decommission: /admin/login returns 404 (retired)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/admin/login`);
  expect(response.status()).toBe(404);
});

test("Stage 5 delete: /admin/exclusions returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/admin/exclusions`);
  expect(response.status()).toBe(404);
});

test("Stage 5 delete: /admin/blacklist returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/admin/blacklist`);
  expect(response.status()).toBe(404);
});

test("Stage 5 delete: /admin/alerts returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/admin/alerts`);
  expect(response.status()).toBe(404);
});

test("Stage 5 delete: /admin/listings returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/admin/listings`);
  expect(response.status()).toBe(404);
});

test("Stage 5 delete: /debug/login returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/debug/login`);
  expect(response.status()).toBe(404);
});

test("Stage 2 migrate: rebuild ops login returns 404 for invalid token", async ({
  request,
}) => {
  const invalidToken = "invalid-token-does-not-exist";
  const url = `${baseURL}/api/rebuild/ops/login?token=${invalidToken}`;

  const response = await request.get(url);
  expect(response.status()).toBe(404);
});

test("Stage 5 delete: /debug/exclusions returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/debug/exclusions`);
  expect(response.status()).toBe(404);
});

test("Stage 5 delete: /admin returns 404 (redirect stub removed)", async ({
  request,
}) => {
  const response = await request.get(`${baseURL}/admin`);
  expect(response.status()).toBe(404);
});

test("Stage 2 parity: /ops/exclusions renders tool surface", async ({
  page,
}) => {
  const url = `${baseURL}/ops/exclusions`;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Verify heading is always present
  await expect(
    page.getByRole("heading", { name: "Exclusions", exact: true })
  ).toBeVisible();

  // Deterministic states - at least one must be visible:
  // 1. Add button (tool ready)
  // 2. Empty state message (tool ready, no data)
  // 3. Database not initialized message (CI environment)
  // 4. Database error message (connection issue)
  const addButton = page.getByTestId("add-exclusion-button");
  const emptyState = page.getByTestId("no-exclusions-message");
  const dbNotInitialized = page.getByTestId("db-not-initialized");
  const dbError = page.getByText(/database error/i);

  const hasAddButton = await addButton.isVisible().catch(() => false);
  const hasEmptyState = await emptyState.isVisible().catch(() => false);
  const hasDbNotInitialized = await dbNotInitialized
    .isVisible()
    .catch(() => false);
  const hasDbError = await dbError.isVisible().catch(() => false);

  // At least one deterministic state should be visible
  expect(
    hasAddButton || hasEmptyState || hasDbNotInitialized || hasDbError
  ).toBeTruthy();
});

test("Stage 2 parity: /api/rebuild/ops/exclusions returns 401 without auth", async ({
  request,
}) => {
  const url = `${baseURL}/api/rebuild/ops/exclusions`;

  // GET without auth cookie
  const getResponse = await request.get(url);
  expect(getResponse.status()).toBe(401);
  const getBody = await getResponse.json();
  expect(getBody.error).toBe("Unauthorized");

  // POST without auth cookie
  const postResponse = await request.post(url, {
    data: { listingId: "test", overrideType: "ALLOW" },
  });
  expect(postResponse.status()).toBe(401);
  const postBody = await postResponse.json();
  expect(postBody.error).toBe("Unauthorized");

  // DELETE without auth cookie
  const deleteResponse = await request.delete(`${url}?listingId=test`);
  expect(deleteResponse.status()).toBe(401);
  const deleteBody = await deleteResponse.json();
  expect(deleteBody.error).toBe("Unauthorized");
});

test("Stage 2 parity: /ops/blacklist renders tool surface", async ({
  page,
}) => {
  const url = `${baseURL}/ops/blacklist`;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Verify heading is always present
  await expect(
    page.getByRole("heading", { name: "Blacklist", exact: true })
  ).toBeVisible();

  // Deterministic states - at least one must be visible:
  // 1. Add button (tool ready)
  // 2. Empty state message (tool ready, no data)
  // 3. Database not initialized message (CI environment)
  // 4. Database error message (connection issue)
  const addButton = page.getByTestId("add-blacklist-button");
  const emptyState = page.getByTestId("no-blacklist-message");
  const dbNotInitialized = page.getByTestId("db-not-initialized");
  const dbError = page.getByText(/database error/i);

  const hasAddButton = await addButton.isVisible().catch(() => false);
  const hasEmptyState = await emptyState.isVisible().catch(() => false);
  const hasDbNotInitialized = await dbNotInitialized
    .isVisible()
    .catch(() => false);
  const hasDbError = await dbError.isVisible().catch(() => false);

  // At least one deterministic state should be visible
  expect(
    hasAddButton || hasEmptyState || hasDbNotInitialized || hasDbError
  ).toBeTruthy();
});

test("Stage 2 parity: /api/rebuild/ops/blacklist returns 401 without auth", async ({
  request,
}) => {
  const url = `${baseURL}/api/rebuild/ops/blacklist`;

  // GET without auth cookie
  const getResponse = await request.get(url);
  expect(getResponse.status()).toBe(401);
  const getBody = await getResponse.json();
  expect(getBody.error).toBe("Unauthorized");

  // POST without auth cookie
  const postResponse = await request.post(url, {
    data: { sellerUsername: "test_seller" },
  });
  expect(postResponse.status()).toBe(401);
  const postBody = await postResponse.json();
  expect(postBody.error).toBe("Unauthorized");

  // DELETE without auth cookie
  const deleteResponse = await request.delete(`${url}?sellerUsername=test`);
  expect(deleteResponse.status()).toBe(401);
  const deleteBody = await deleteResponse.json();
  expect(deleteBody.error).toBe("Unauthorized");
});

test("Stage 2 parity: /ops/alerts renders tool surface", async ({ page }) => {
  const url = `${baseURL}/ops/alerts`;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Verify heading is always present
  await expect(
    page.getByRole("heading", { name: "Alerts", exact: true })
  ).toBeVisible();

  // Deterministic states - at least one must be visible:
  // 1. Add button (tool ready)
  // 2. Empty state message (tool ready, no data)
  // 3. Database not initialized message (CI environment)
  // 4. Database error message (connection issue)
  const addButton = page.getByTestId("add-watch-button");
  const emptyState = page.getByTestId("no-watches-message");
  const dbNotInitialized = page.getByTestId("db-not-initialized");
  const dbError = page.getByText(/database error/i);

  const hasAddButton = await addButton.isVisible().catch(() => false);
  const hasEmptyState = await emptyState.isVisible().catch(() => false);
  const hasDbNotInitialized = await dbNotInitialized
    .isVisible()
    .catch(() => false);
  const hasDbError = await dbError.isVisible().catch(() => false);

  // At least one deterministic state should be visible
  expect(
    hasAddButton || hasEmptyState || hasDbNotInitialized || hasDbError
  ).toBeTruthy();
});

test("Stage 2 parity: /api/rebuild/ops/alerts returns 401 without auth", async ({
  request,
}) => {
  const url = `${baseURL}/api/rebuild/ops/alerts`;

  // GET without auth cookie
  const getResponse = await request.get(url);
  expect(getResponse.status()).toBe(401);
  const getBody = await getResponse.json();
  expect(getBody.error).toBe("Unauthorized");

  // POST without auth cookie
  const postResponse = await request.post(url, {
    data: {
      cardId: 1,
      condition: "raw_nm",
      thresholdType: "price_below",
      thresholdValue: 10,
    },
  });
  expect(postResponse.status()).toBe(401);
  const postBody = await postResponse.json();
  expect(postBody.error).toBe("Unauthorized");

  // DELETE without auth cookie
  const deleteResponse = await request.delete(`${url}?id=1`);
  expect(deleteResponse.status()).toBe(401);
  const deleteBody = await deleteResponse.json();
  expect(deleteBody.error).toBe("Unauthorized");
});

test("Stage 2 parity: /ops/listings renders tool surface", async ({ page }) => {
  const url = `${baseURL}/ops/listings`;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Verify heading is always present
  await expect(
    page.getByRole("heading", { name: "Listings", exact: true })
  ).toBeVisible();

  // Deterministic states - at least one must be visible:
  // 1. Add button (tool ready)
  // 2. Empty state message (tool ready, no data)
  // 3. Database not initialized message (CI environment)
  // 4. Database error message (connection issue)
  const addButton = page.getByTestId("add-override-button");
  const emptyState = page.getByTestId("no-overrides-message");
  const dbNotInitialized = page.getByTestId("db-not-initialized");
  const dbError = page.getByText(/database error/i);

  const hasAddButton = await addButton.isVisible().catch(() => false);
  const hasEmptyState = await emptyState.isVisible().catch(() => false);
  const hasDbNotInitialized = await dbNotInitialized
    .isVisible()
    .catch(() => false);
  const hasDbError = await dbError.isVisible().catch(() => false);

  // At least one deterministic state should be visible
  expect(
    hasAddButton || hasEmptyState || hasDbNotInitialized || hasDbError
  ).toBeTruthy();
});

test("Stage 2 parity: /api/rebuild/ops/listings returns 401 without auth", async ({
  request,
}) => {
  const url = `${baseURL}/api/rebuild/ops/listings`;

  // GET without auth cookie
  const getResponse = await request.get(url);
  expect(getResponse.status()).toBe(401);
  const getBody = await getResponse.json();
  expect(getBody.error).toBe("Unauthorized");

  // POST without auth cookie
  const postResponse = await request.post(url, {
    data: { listingId: "test", overrideType: "HARD_BLOCK" },
  });
  expect(postResponse.status()).toBe(401);
  const postBody = await postResponse.json();
  expect(postBody.error).toBe("Unauthorized");

  // DELETE without auth cookie
  const deleteResponse = await request.delete(`${url}?listingId=test`);
  expect(deleteResponse.status()).toBe(401);
  const deleteBody = await deleteResponse.json();
  expect(deleteBody.error).toBe("Unauthorized");
});

function extractMetaContent(body: string, name: string): string | null {
  const tagMatch = body.match(
    new RegExp(`<meta[^>]+name="${name}"[^>]*>`, "i")
  );
  if (!tagMatch) {
    return null;
  }
  const contentMatch = tagMatch[0].match(/content="([^"]+)"/i);
  return contentMatch?.[1] ?? null;
}

/**
 * Decode common HTML entities in a string.
 * Covers the entities Next.js uses for title escaping.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'") // hex entity for apostrophe
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x22;/gi, '"') // hex entity for quote
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&"); // amp last to avoid double-decode
}

function extractTitle(body: string): string | null {
  const match = body.match(/<title>([^<]+)<\/title>/i);
  if (!match?.[1]) return null;
  return decodeHtmlEntities(match[1]);
}

function extractMetaProperty(body: string, property: string): string | null {
  const tagMatch = body.match(
    new RegExp(`<meta[^>]+property="${property}"[^>]*>`, "i")
  );
  if (!tagMatch) {
    return null;
  }
  const contentMatch = tagMatch[0].match(/content="([^"]+)"/i);
  return contentMatch?.[1] ?? null;
}

function extractCanonical(body: string): string | null {
  const tagMatch = body.match(/<link[^>]+rel="canonical"[^>]*>/i);
  if (!tagMatch) {
    return null;
  }
  const hrefMatch = tagMatch[0].match(/href="([^"]+)"/i);
  return hrefMatch?.[1] ?? null;
}

function extractJsonLdObjects(body: string): Array<Record<string, unknown>> {
  const scripts = [
    ...body.matchAll(
      /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const objects: Array<Record<string, unknown>> = [];

  for (const match of scripts) {
    const json = match[1]?.trim();
    if (!json) continue;
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (item && typeof item === "object") {
          objects.push(item as Record<string, unknown>);
        }
      });
    } else if (parsed && typeof parsed === "object") {
      objects.push(parsed as Record<string, unknown>);
    }
  }

  return objects;
}

function findJsonLdByType(
  objects: Array<Record<string, unknown>>,
  type: string
): Record<string, unknown> | undefined {
  return objects.find((obj) => {
    const value = obj["@type"];
    if (Array.isArray(value)) {
      return value.includes(type);
    }
    return value === type;
  });
}

function assertSeoBasics(
  body: string,
  expected: {
    canonical: string;
    indexable: boolean;
  }
) {
  const title = extractTitle(body);
  expect(title).not.toBeNull();
  expect(title).toMatch(/^Rebuild .+ \| TCG Deal Finder$/);

  const description = extractMetaContent(body, "description");
  expect(description).not.toBeNull();
  expect(description?.trim().length).toBeGreaterThan(0);

  const ogTitle = extractMetaProperty(body, "og:title");
  const ogDescription = extractMetaProperty(body, "og:description");
  const twitterTitle = extractMetaContent(body, "twitter:title");
  const twitterDescription = extractMetaContent(body, "twitter:description");
  expect(ogTitle).not.toBeNull();
  expect(ogDescription).not.toBeNull();
  expect(twitterTitle).not.toBeNull();
  expect(twitterDescription).not.toBeNull();

  const canonical = extractCanonical(body);
  expect(canonical).toBe(expected.canonical);

  const robots = extractMetaContent(body, "robots");
  expect(robots).not.toBeNull();
  if (expected.indexable) {
    expect(robots).toMatch(/index/i);
    expect(robots).not.toMatch(/noindex/i);
  } else {
    expect(robots).toMatch(/noindex/i);
  }
}

async function assertSsrTrustSurfaces(
  request: APIRequestContext,
  url: string,
  options?: { expectFetchedAt?: boolean }
) {
  const response = await request.get(url);
  expect(response.ok()).toBeTruthy();

  const body = await response.text();
  expect(body).toContain(complianceCopy);
  expect(body).toContain("Resilience");
  expect(body).toContain('data-testid="resilience-label"');
  expect(body).toMatch(/data-tier="(LIVE|CACHED|STALE|PARTIAL|UNAVAILABLE)"/);
  expect(body).toContain("Provenance");
  if (options?.expectFetchedAt) {
    expect(body).toContain("Fetched at");
  }
}

async function assertSsrPredictiveSignals(
  request: APIRequestContext,
  url: string
) {
  const response = await request.get(url);
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("Predictive signals");
  expect(body).toContain('data-testid="predictive-signals-reasons"');
}

async function assertAlertsSsrHeading(request: APIRequestContext, url: string) {
  const response = await request.get(url);
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("Alerts");
}

async function assertOpsSsrHeading(request: APIRequestContext, url: string) {
  const response = await request.get(url);
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("Rebuild Ops");
  expect(body).toContain('data-testid="resilience-tiers-panel"');
  expect(body).toContain("Resilience Tiers (C4)");
}

async function assertUiTrustSurfaces(page: Page) {
  await expect(page.getByText(complianceCopy, { exact: true })).toBeVisible();
  const resilienceLabel = page.getByTestId("resilience-label");
  await expect(resilienceLabel).toBeVisible();
  await expect(resilienceLabel).toContainText(/Resilience/i);
  const tierAttr = await page
    .getByTestId("resilience-label")
    .getAttribute("data-tier");
  expect(["LIVE", "CACHED", "STALE", "PARTIAL", "UNAVAILABLE"]).toContain(
    tierAttr
  );
  await expect(
    page.locator("summary", { hasText: "Provenance" })
  ).toBeVisible();
}

async function assertImagesHaveDimensions(page: Page) {
  const images = page.locator("img");
  const count = await images.count();

  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    const width = await image.getAttribute("width");
    const height = await image.getAttribute("height");
    expect(Boolean(width && height)).toBeTruthy();
  }
}
async function assertProvenanceSummaryStable(page: Page) {
  const summary = page.locator("summary", { hasText: "Provenance" });
  await expect(summary).toBeVisible();

  const before = (await summary.textContent())?.trim() ?? "";
  expect(before).toContain("Fetched at");

  await page.waitForTimeout(250);

  const after = (await summary.textContent())?.trim() ?? "";
  expect(after).toBe(before);
}

async function assertUiPredictiveSignals(page: Page) {
  await expect(page.getByTestId("predictive-signals")).toBeVisible();
  await expect(
    page.getByTestId("predictive-signals-reasons").locator("li").first()
  ).toBeVisible();
}

async function assertAlertsHeading(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Alerts", exact: true })
  ).toBeVisible();
}

async function assertOpsHeading(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Rebuild Ops", exact: true })
  ).toBeVisible();
  await expect(page.getByTestId("resilience-tiers-panel")).toBeVisible();
  await expect(page.getByText("Resilience Tiers (C4)")).toBeVisible();
}

async function assertIntentPrefetchTriggered(
  page: Page,
  link: Locator,
  expectedHref: string
) {
  await page.evaluate(() => {
    (window as any).__rebuildIntentPrefetches = [];
  });

  await expect(link).toBeVisible();

  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    await link.hover();
    await link.dispatchEvent("touchstart");
    const didPrefetch = await page.evaluate(
      (href) =>
        ((window as any).__rebuildIntentPrefetches ?? []).includes(href),
      expectedHref
    );
    if (didPrefetch) {
      return;
    }
    await page.waitForTimeout(100);
  }

  expect(false).toBeTruthy();
}

function assertLoadingSkeletonSourceFile(
  pathParts: string[],
  expectedTestId: string
) {
  const body = readFileSync(join(process.cwd(), ...pathParts), "utf8");
  expect(body).toContain(`data-testid="${expectedTestId}"`);
  expect(body).toContain('from "@/components/rebuild/Skeleton"');
  expect(body).toMatch(/min-h-screen/);
  expect(body).toMatch(/<SkeletonBlock[^>]*className="[^"]*\bh-/);
}

test("rebuild synthetics: trust surfaces visible across rebuild funnel", async ({
  page,
  request,
}) => {
  const robotsResponse = await request.get(`${baseURL}/robots.txt`);
  expect(robotsResponse.ok()).toBeTruthy();
  const robotsBody = (await robotsResponse.text()).toLowerCase();
  expect(robotsBody).toContain("user-agent: *");
  expect(robotsBody).toContain("disallow: /ops");
  expect(robotsBody).toContain("disallow: /alerts");
  expect(robotsBody).toContain("sitemap:");

  const sitemapResponse = await request.get(`${baseURL}/sitemap.xml`);
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemapBody = await sitemapResponse.text();
  expect(sitemapBody).toContain(buildCanonicalUrl("/"));
  expect(sitemapBody).toContain(buildCanonicalUrl("/discovery"));
  expect(sitemapBody).toContain(buildListingCanonicalUrl(listingId));

  const discoveryQueryUrl = `${baseURL}/discovery?sort=biggest-discount&foo=bar`;
  const discoveryQueryResponse = await request.get(discoveryQueryUrl);
  expect(discoveryQueryResponse.ok()).toBeTruthy();
  const discoveryQueryBody = await discoveryQueryResponse.text();
  assertSeoBasics(discoveryQueryBody, {
    canonical: buildCanonicalDiscoveryUrl(
      new URLSearchParams("sort=biggest-discount&foo=bar")
    ),
    indexable: true,
  });

  const routes = [
    "/",
    "/discovery",
    `/listing/${encodeURIComponent(listingId)}`,
    "/alerts",
    "/ops",
  ];

  for (const route of routes) {
    const url = `${baseURL}${route}`;
    if (route === "/ops") {
      const response = await request.get(url);
      expect(response.ok()).toBeTruthy();
      const body = await response.text();
      assertSeoBasics(body, {
        canonical: buildCanonicalUrl("/ops"),
        indexable: false,
      });
      await assertOpsSsrHeading(request, url);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await assertOpsHeading(page);
      await assertImagesHaveDimensions(page);
      continue;
    }

    const expectFetchedAt = route === "/" || route === "/discovery";
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();

    if (route === "/discovery") {
      assertSeoBasics(body, {
        canonical: buildCanonicalDiscoveryUrl(),
        indexable: true,
      });
      const title = extractTitle(body);
      expect(title).toBe(buildRebuildTitle("Discovery"));
    } else if (route === "/") {
      assertSeoBasics(body, {
        canonical: buildCanonicalUrl("/"),
        indexable: true,
      });
      const jsonLd = extractJsonLdObjects(body);
      expect(findJsonLdByType(jsonLd, "WebApplication")).toBeTruthy();
      const title = extractTitle(body);
      expect(title).toBe(buildRebuildTitle("Today's Best Deals"));
    } else if (route.startsWith("/listing/")) {
      assertSeoBasics(body, {
        canonical: buildListingCanonicalUrl(listingId),
        indexable: true,
      });
      const jsonLd = extractJsonLdObjects(body);
      expect(findJsonLdByType(jsonLd, "Product")).toBeTruthy();
      const title = extractTitle(body);
      expect(title).toBe(buildListingTitle("Rebuild E2E Listing"));
    } else if (route === "/alerts") {
      assertSeoBasics(body, {
        canonical: buildCanonicalUrl("/alerts"),
        indexable: false,
      });
      const title = extractTitle(body);
      expect(title).toBe(buildRebuildTitle("Alerts"));
    }

    await assertSsrTrustSurfaces(request, url, { expectFetchedAt });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await assertUiTrustSurfaces(page);
    await assertImagesHaveDimensions(page);
    if (expectFetchedAt) {
      await assertProvenanceSummaryStable(page);
    }
    if (route.startsWith("/listing/")) {
      await assertSsrPredictiveSignals(request, url);
      await assertUiPredictiveSignals(page);
    }
    if (route === "/alerts") {
      await assertAlertsSsrHeading(request, url);
      await assertAlertsHeading(page);
    }
  }
});

test("Discovery UX contract: filters render + empty state + reset returns results", async ({
  page,
}) => {
  await page.goto(`${baseURL}/discovery?sort=newest`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("discovery-filters-bar")).toBeVisible();
  await expect(page.getByTestId("discovery-facets")).toBeVisible();
  await expect(page.getByTestId("discovery-pagination")).toBeVisible();

  await expect(page.getByTestId("discovery-results-count")).toHaveAttribute(
    "data-count",
    /[1-9]\d*/
  );

  const countAttr = await page
    .getByTestId("discovery-results-count")
    .getAttribute("data-count");
  const total = Number(countAttr ?? "0");

  const pageSizeAttr = await page
    .getByTestId("discovery-pagination-page-size")
    .inputValue();
  const pageSize = Number(pageSizeAttr ?? "25") || 25;

  const next = page.getByTestId("discovery-pagination-next");
  const prev = page.getByTestId("discovery-pagination-prev");
  await expect(next).toBeVisible();
  await expect(prev).toBeVisible();

  let didGoToPage2 = false;
  if (total > pageSize) {
    await expect(next).toBeEnabled();
    await Promise.all([
      page.waitForURL(/[?&]page=2\b/, { timeout: 15000, waitUntil: "commit" }),
      next.click(),
    ]);
    await expect(page).toHaveURL(/[?&]page=2\b/);
    await expect(page.getByTestId("discovery-pagination-page")).toContainText(
      "Page 2"
    );
    didGoToPage2 = true;
  } else {
    await expect(next).toBeDisabled();
  }

  await expect(page.getByTestId("discovery-results-count")).toHaveAttribute(
    "data-count",
    /\d+/
  );

  if (didGoToPage2) {
    await expect(prev).toBeEnabled();
    await prev.click();
    await expect(page.getByTestId("discovery-pagination-page")).toContainText(
      "Page 1"
    );
  } else {
    await expect(prev).toBeDisabled();
  }

  await page.goto(
    `${baseURL}/discovery?sort=newest&minPriceCad=99999999&maxPriceCad=99999999`,
    { waitUntil: "domcontentloaded" }
  );

  await expect(page.getByTestId("discovery-results-count")).toHaveAttribute(
    "data-count",
    "0"
  );
  await expect(page.getByTestId("discovery-empty-state")).toBeVisible({
    timeout: 15000,
  });

  await page.goto(`${baseURL}/discovery?sort=newest`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("discovery-results-count")).toHaveAttribute(
    "data-count",
    /[1-9]\d*/
  );
});

test("rebuild perceived speed: skeletons + priority hydration + intent prefetch", async ({
  page,
  request,
}) => {
  const homeUrl = `${baseURL}/`;
  const discoveryUrl = `${baseURL}/discovery`;
  const alertsUrl = `${baseURL}/alerts`;
  const opsUrl = `${baseURL}/ops`;
  const listingPath = `/listing/${encodeURIComponent(listingId)}`;
  const listingUrl = `${baseURL}${listingPath}`;

  assertLoadingSkeletonSourceFile(
    ["app", "loading.tsx"],
    "rebuild-loading-home"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "discovery", "loading.tsx"],
    "rebuild-loading-discovery"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "listing", "[id]", "loading.tsx"],
    "rebuild-loading-listing"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "alerts", "loading.tsx"],
    "rebuild-loading-alerts"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "ops", "loading.tsx"],
    "rebuild-loading-ops"
  );

  const homeResponse = await request.get(homeUrl);
  expect(homeResponse.ok()).toBeTruthy();
  const homeBody = await homeResponse.text();
  expect(homeBody).toContain('data-testid="rebuild-home-deferred-skeleton"');
  expect(homeBody).not.toContain('data-testid="rebuild-home-deferred-content"');

  const listingResponse = await request.get(listingUrl);
  expect(listingResponse.ok()).toBeTruthy();
  const listingBody = await listingResponse.text();
  expect(listingBody).toContain(
    'data-testid="rebuild-listing-deferred-skeleton"'
  );
  expect(listingBody).not.toContain(
    'data-testid="rebuild-listing-deferred-content"'
  );

  await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

  await expect(page.getByText(complianceCopy, { exact: true })).toBeVisible();
  await expect(page.getByTestId("resilience-label")).toBeVisible();
  await expect(
    page.locator("summary", { hasText: "Provenance" })
  ).toBeVisible();

  // Home deferred skeleton is allowed to be skipped if the page resolves quickly.
  // The contract here is: the deferred section eventually loads, and if a skeleton is
  // rendered, it is not required to be measurable.
  const homeDeferredSkeleton = page.locator(
    '[data-testid="rebuild-home-deferred-skeleton"]'
  );
  const homeDeferredContentReady = page.locator(
    '[data-testid="rebuild-home-deferred-content"]'
  );

  try {
    await Promise.race([
      homeDeferredSkeleton
        .first()
        .waitFor({ state: "attached", timeout: 5000 }),
      homeDeferredContentReady
        .first()
        .waitFor({ state: "attached", timeout: 5000 }),
    ]);
  } catch {
    // Fall through to the final "deferred content is visible" assertion.
  }

  await expect(homeDeferredContentReady.first()).toBeVisible({
    timeout: 15000,
  });

  const homeNav = page.getByTestId("rebuild-home-nav");
  const browseDealsLink = homeNav.getByRole("link", { name: "Browse deals" });
  await expect(browseDealsLink).toHaveAttribute("data-intent-prefetch", "true");
  const alertsLink = homeNav.getByRole("link", { name: "Alerts" });
  await expect(alertsLink).toHaveAttribute("data-intent-prefetch", "true");
  const opsLink = homeNav.getByRole("link", { name: "Ops" });
  await expect(opsLink).toHaveAttribute("data-intent-prefetch", "true");

  await assertIntentPrefetchTriggered(page, browseDealsLink, "/discovery");
  await assertIntentPrefetchTriggered(page, alertsLink, "/alerts");
  await assertIntentPrefetchTriggered(page, opsLink, "/ops");

  await alertsLink.click();
  await page.waitForURL(alertsUrl, { waitUntil: "domcontentloaded" });

  await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

  await browseDealsLink.click();
  await page.waitForURL(discoveryUrl, { waitUntil: "domcontentloaded" });

  const firstListingLink = page
    .locator('[data-intent-prefetch="true"][href^="/listing/"]')
    .first();
  await expect(firstListingLink).toHaveAttribute(
    "data-intent-prefetch",
    "true"
  );
  const firstListingHref = await firstListingLink.getAttribute("href");
  expect(firstListingHref).not.toBeNull();

  if (firstListingHref) {
    await assertIntentPrefetchTriggered(
      page,
      firstListingLink,
      firstListingHref
    );
  }

  await firstListingLink.click();
  await page.waitForURL(/\/listing\//, {
    waitUntil: "domcontentloaded",
  });

  // Listing deferred skeleton is allowed to be skipped if the page resolves quickly.
  // The contract here is: the deferred section eventually loads, and if a skeleton is
  // rendered, it is not required to be measurable.
  const listingDeferredSkeleton = page.locator(
    '[data-testid="rebuild-listing-deferred-skeleton"]'
  );
  const deferredContentReady = page.locator(
    '[data-testid="rebuild-listing-deferred-content"]'
  );

  try {
    await Promise.race([
      listingDeferredSkeleton
        .first()
        .waitFor({ state: "attached", timeout: 5000 }),
      deferredContentReady
        .first()
        .waitFor({ state: "attached", timeout: 5000 }),
    ]);
  } catch {
    // Fall through to the final "deferred content is visible" assertion.
  }

  await expect(deferredContentReady.first()).toBeVisible({ timeout: 15000 });

  const backToDiscovery = page.getByRole("link", { name: "Back to Discovery" });
  await expect(backToDiscovery).toHaveAttribute("data-intent-prefetch", "true");
  await backToDiscovery.click();
  await page.waitForURL(discoveryUrl, { waitUntil: "domcontentloaded" });

  await page.goto(alertsUrl, { waitUntil: "domcontentloaded" });
  const exampleListing = page.getByRole("link", {
    name: "View example listing",
  });
  await expect(exampleListing).toHaveAttribute("data-intent-prefetch", "true");

  await assertIntentPrefetchTriggered(
    page,
    exampleListing,
    "/listing/rebuild-e2e-1"
  );

  await exampleListing.click();
  await page.waitForURL(listingUrl, { waitUntil: "domcontentloaded" });

  await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

  await opsLink.click();
  await page.waitForURL(opsUrl, { waitUntil: "domcontentloaded" });
});
