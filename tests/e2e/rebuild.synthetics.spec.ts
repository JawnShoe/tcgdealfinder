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
  return buildDiscoveryCanonicalUrl(searchParams).replace(
    "/rebuild/discovery",
    "/discovery"
  );
}

test("Stage 1 decommission: /top-deals redirects to /discovery (top deals preset)", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/top-deals`;
  const expectedPath = "/discovery?sort=biggest-discount";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(
    new RegExp(`/discovery\\?sort=biggest-discount`)
  );
  await expect(page.getByLabel("Sort")).toHaveValue("biggest-discount");
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: /newest redirects to /discovery (newest preset)", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/newest`;
  const expectedPath = "/discovery?sort=newest";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/discovery\\?sort=newest`));
  await expect(page.getByLabel("Sort")).toHaveValue("newest");
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: /ending-soon redirects to /discovery (endingSoon preset)", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/ending-soon`;
  const expectedPath = "/discovery?sort=endingSoon";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/discovery\\?sort=endingSoon`));
  await expect(page.getByLabel("Sort")).toHaveValue("endingSoon");
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: /search redirects to /rebuild/discovery", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/search`;
  const expectedPath = "/rebuild/discovery";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/discovery`));
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: /sets redirects to /rebuild/discovery", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/sets`;
  const expectedPath = "/rebuild/discovery";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/discovery`));
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: /sets/[setId] redirects to /rebuild/discovery", async ({
  page,
  request,
}) => {
  // Use any setId - redirect is unconditional (degraded parity: set filter not supported)
  const legacyUrl = `${baseURL}/sets/1`;
  const expectedPath = "/rebuild/discovery";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/discovery`));
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: /alerts redirects to /rebuild/alerts", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/alerts`;
  const expectedPath = "/rebuild/alerts";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/alerts`));
  await assertUiTrustSurfaces(page);
  await assertAlertsHeading(page);
});

test("Stage 1 decommission: /alerts/unsubscribe page redirects to rebuild API endpoint", async ({
  request,
}) => {
  const testToken = "test-token-e2e-page-redirect";
  const legacyUrl = `${baseURL}/alerts/unsubscribe?token=${testToken}`;
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

test("Stage 1 decommission: /alerts/unsubscribe page handles missing token gracefully", async ({
  request,
}) => {
  const legacyUrl = `${baseURL}/alerts/unsubscribe`;
  const expectedPath = `/api/rebuild/alerts/unsubscribe`;

  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
    // Ensure no token param when none provided
    expect(resolvedLocation).not.toContain("token=");
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }
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

test("Stage 1 decommission: /watchlist redirects to /rebuild/discovery", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/watchlist`;
  const expectedPath = "/rebuild/discovery";

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

  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/discovery`));
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: header does not contain Watchlist link", async ({
  page,
}) => {
  await page.goto(`${baseURL}/rebuild`, { waitUntil: "domcontentloaded" });
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect(banner.getByRole("link", { name: "Watchlist" })).toHaveCount(0);
});

test("Stage 1 decommission: no watchlist star buttons on discovery page", async ({
  page,
}) => {
  await page.goto(`${baseURL}/rebuild/discovery`, {
    waitUntil: "domcontentloaded",
  });
  // Star buttons used aria-label "Watch this card" or similar
  await expect(page.locator('[aria-label*="watchlist"]')).toHaveCount(0);
  await expect(page.locator('[aria-label*="Watch this card"]')).toHaveCount(0);
  // The star unicode characters used by watchlist
  await expect(page.locator('button:has-text("☆")')).toHaveCount(0);
  await expect(page.locator('button:has-text("★")')).toHaveCount(0);
});

// Seed data uses card_id=99999 linked to listing_id='rebuild-e2e-1'
const seedCardId = 99999;
const seedListingId = "rebuild-e2e-1";

test("Stage 1 decommission: /cards/[cardId] redirects to /rebuild/listing/[id]", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/cards/${seedCardId}`;
  const expectedPath = `/rebuild/listing/${seedListingId}`;

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }

  // Verify browser navigation lands on rebuild listing and passes trust surface assertions
  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/listing/${seedListingId}`));
  await assertUiTrustSurfaces(page);
});

test("Stage 1 decommission: /cards/[cardId] returns 404 for unknown cardId", async ({
  request,
}) => {
  // Use a cardId that doesn't exist in seed data
  const unknownCardId = 1;
  const legacyUrl = `${baseURL}/cards/${unknownCardId}`;

  const response = await request.get(legacyUrl);
  expect(response.status()).toBe(404);
});

test("Stage 1 decommission: /cards/[cardId] returns 404 for invalid cardId", async ({
  request,
}) => {
  // Invalid cardId (not a number)
  const invalidUrl = `${baseURL}/cards/invalid`;

  const response = await request.get(invalidUrl);
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

test("Stage 2 migrate: /admin/exclusions redirects to /rebuild/ops/exclusions", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/admin/exclusions`;
  const expectedPath = "/rebuild/ops/exclusions";

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }

  // Verify browser navigation lands on rebuild ops exclusions and renders SSR heading
  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/ops/exclusions`));
  await expect(
    page.getByRole("heading", { name: "Exclusions", exact: true })
  ).toBeVisible();
});

test("Stage 2 migrate: /admin/blacklist redirects to /rebuild/ops/blacklist", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/admin/blacklist`;
  const expectedPath = "/rebuild/ops/blacklist";

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }

  // Verify browser navigation lands on rebuild ops blacklist and renders SSR heading
  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/ops/blacklist`));
  await expect(
    page.getByRole("heading", { name: "Blacklist", exact: true })
  ).toBeVisible();
});

test("Stage 2 migrate: /admin/alerts redirects to /rebuild/ops/alerts", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/admin/alerts`;
  const expectedPath = "/rebuild/ops/alerts";

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }

  // Verify browser navigation lands on rebuild ops alerts and renders SSR heading
  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/ops/alerts`));
  await expect(
    page.getByRole("heading", { name: "Alerts", exact: true })
  ).toBeVisible();
});

test("Stage 2 migrate: /admin/listings redirects to /rebuild/ops/listings", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/admin/listings`;
  const expectedPath = "/rebuild/ops/listings";

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }

  // Verify browser navigation lands on rebuild ops listings and renders SSR heading
  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/ops/listings`));
  await expect(
    page.getByRole("heading", { name: "Listings", exact: true })
  ).toBeVisible();
});

test("Stage 2 migrate: /debug/login redirects to /api/rebuild/ops/login", async ({
  request,
}) => {
  const testToken = "test-token-e2e-debug-login";
  const legacyUrl = `${baseURL}/debug/login?token=${testToken}`;
  const expectedPath = `/api/rebuild/ops/login?token=${testToken}`;

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }
});

test("Stage 2 migrate: /debug/login preserves redirect query param", async ({
  request,
}) => {
  const testToken = "test-token-e2e-debug-login-redirect";
  const redirectTarget = "/rebuild/ops/exclusions";
  const legacyUrl = `${baseURL}/debug/login?token=${testToken}&redirect=${encodeURIComponent(redirectTarget)}`;
  const expectedPath = `/api/rebuild/ops/login?token=${testToken}&redirect=${encodeURIComponent(redirectTarget)}`;

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }
});

test("Stage 2 migrate: rebuild ops login returns 404 for invalid token", async ({
  request,
}) => {
  const invalidToken = "invalid-token-does-not-exist";
  const url = `${baseURL}/api/rebuild/ops/login?token=${invalidToken}`;

  const response = await request.get(url);
  expect(response.status()).toBe(404);
});

test("Stage 2 migrate: /debug/exclusions redirects to /rebuild/ops/exclusions", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/debug/exclusions`;
  const expectedPath = "/rebuild/ops/exclusions";

  // Verify 308 redirect with maxRedirects: 0
  const response = await request.get(legacyUrl, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const location = response.headers()["location"];
  expect(location).toBeTruthy();

  // Location can be absolute or relative
  const resolvedLocation = location ?? "";
  if (resolvedLocation.startsWith("http")) {
    expect(resolvedLocation).toContain(expectedPath);
  } else {
    expect(resolvedLocation).toBe(expectedPath);
  }

  // Verify browser navigation lands on rebuild ops exclusions and renders SSR heading
  await page.goto(legacyUrl, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/rebuild/ops/exclusions`));
  await expect(
    page.getByRole("heading", { name: "Exclusions", exact: true })
  ).toBeVisible();
});

test("Stage 2 parity: /rebuild/ops/exclusions renders tool surface", async ({
  page,
}) => {
  const url = `${baseURL}/rebuild/ops/exclusions`;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Verify heading
  await expect(
    page.getByRole("heading", { name: "Exclusions", exact: true })
  ).toBeVisible();

  // Verify tool surface elements exist (either Add button or empty state)
  const addButton = page.getByTestId("add-exclusion-button");
  const emptyState = page.getByTestId("no-exclusions-message");

  // At least one of these should be visible (real tool surface)
  const hasAddButton = await addButton.isVisible().catch(() => false);
  const hasEmptyState = await emptyState.isVisible().catch(() => false);

  expect(hasAddButton || hasEmptyState).toBeTruthy();
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

function extractTitle(body: string): string | null {
  const match = body.match(/<title>([^<]+)<\/title>/i);
  return match?.[1] ?? null;
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
  expect(robotsBody).toContain("disallow: /rebuild/ops");
  expect(robotsBody).toContain("disallow: /rebuild/alerts");
  expect(robotsBody).toContain("sitemap:");

  const sitemapResponse = await request.get(`${baseURL}/sitemap.xml`);
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemapBody = await sitemapResponse.text();
  expect(sitemapBody).toContain(buildCanonicalUrl("/rebuild"));
  expect(sitemapBody).toContain(buildCanonicalUrl("/rebuild/discovery"));
  expect(sitemapBody).toContain(buildListingCanonicalUrl(listingId));

  const discoveryQueryUrl = `${baseURL}/rebuild/discovery?sort=biggest-discount&foo=bar`;
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
    "/rebuild",
    "/rebuild/discovery",
    `/rebuild/listing/${encodeURIComponent(listingId)}`,
    "/rebuild/alerts",
    "/rebuild/ops",
  ];

  for (const route of routes) {
    const url = `${baseURL}${route}`;
    if (route === "/rebuild/ops") {
      const response = await request.get(url);
      expect(response.ok()).toBeTruthy();
      const body = await response.text();
      assertSeoBasics(body, {
        canonical: buildCanonicalUrl("/rebuild/ops"),
        indexable: false,
      });
      await assertOpsSsrHeading(request, url);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await assertOpsHeading(page);
      await assertImagesHaveDimensions(page);
      continue;
    }

    const expectFetchedAt =
      route === "/" ||
      route === "/discovery" ||
      route === "/rebuild" ||
      route === "/rebuild/discovery";
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();

    if (
      route === "/" ||
      route === "/discovery" ||
      route === "/rebuild/discovery"
    ) {
      assertSeoBasics(body, {
        canonical: buildCanonicalDiscoveryUrl(),
        indexable: true,
      });
      const title = extractTitle(body);
      expect(title).toBe(buildRebuildTitle("Discovery"));
    } else if (route === "/rebuild") {
      assertSeoBasics(body, {
        canonical: buildCanonicalUrl("/rebuild"),
        indexable: true,
      });
      const jsonLd = extractJsonLdObjects(body);
      expect(findJsonLdByType(jsonLd, "WebApplication")).toBeTruthy();
      const title = extractTitle(body);
      expect(title).toBe(buildRebuildTitle("Home"));
    } else if (route.startsWith("/rebuild/listing/")) {
      assertSeoBasics(body, {
        canonical: buildListingCanonicalUrl(listingId),
        indexable: true,
      });
      const jsonLd = extractJsonLdObjects(body);
      expect(findJsonLdByType(jsonLd, "Product")).toBeTruthy();
      const title = extractTitle(body);
      expect(title).toBe(buildListingTitle("Rebuild E2E Listing"));
    } else if (route === "/rebuild/alerts") {
      assertSeoBasics(body, {
        canonical: buildCanonicalUrl("/rebuild/alerts"),
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
    if (route.startsWith("/rebuild/listing/")) {
      await assertSsrPredictiveSignals(request, url);
      await assertUiPredictiveSignals(page);
    }
    if (route === "/rebuild/alerts") {
      await assertAlertsSsrHeading(request, url);
      await assertAlertsHeading(page);
    }
  }
});

test("rebuild perceived speed: skeletons + priority hydration + intent prefetch", async ({
  page,
  request,
}) => {
  const homeUrl = `${baseURL}/rebuild`;
  const discoveryUrl = `${baseURL}/rebuild/discovery`;
  const alertsUrl = `${baseURL}/rebuild/alerts`;
  const opsUrl = `${baseURL}/rebuild/ops`;
  const listingPath = `/rebuild/listing/${encodeURIComponent(listingId)}`;
  const listingUrl = `${baseURL}${listingPath}`;

  assertLoadingSkeletonSourceFile(
    ["app", "rebuild", "loading.tsx"],
    "rebuild-loading-home"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "rebuild", "discovery", "loading.tsx"],
    "rebuild-loading-discovery"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "rebuild", "listing", "[id]", "loading.tsx"],
    "rebuild-loading-listing"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "rebuild", "alerts", "loading.tsx"],
    "rebuild-loading-alerts"
  );
  assertLoadingSkeletonSourceFile(
    ["app", "rebuild", "ops", "loading.tsx"],
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

  const deferredSkeleton = page.getByTestId("rebuild-home-deferred-skeleton");
  await expect(deferredSkeleton).toBeVisible();
  await expect(page.getByTestId("rebuild-home-deferred-content")).toHaveCount(
    0
  );
  const homeSkeletonBox = await deferredSkeleton.boundingBox();
  expect(homeSkeletonBox?.height).toBeGreaterThan(0);

  await page.waitForTimeout(1400);

  const homeDeferredContent = page.getByTestId("rebuild-home-deferred-content");
  await expect(homeDeferredContent).toBeVisible();
  const homeContentBox = await homeDeferredContent.boundingBox();
  expect(homeContentBox?.height).toBeGreaterThan(0);
  if (homeSkeletonBox && homeContentBox) {
    expect(
      Math.abs(homeContentBox.height - homeSkeletonBox.height)
    ).toBeLessThanOrEqual(8);
  }

  const homeNav = page.getByTestId("rebuild-home-nav");
  const browseDealsLink = homeNav.getByRole("link", { name: "Browse deals" });
  await expect(browseDealsLink).toHaveAttribute("data-intent-prefetch", "true");
  const alertsLink = homeNav.getByRole("link", { name: "Alerts" });
  await expect(alertsLink).toHaveAttribute("data-intent-prefetch", "true");
  const opsLink = homeNav.getByRole("link", { name: "Ops" });
  await expect(opsLink).toHaveAttribute("data-intent-prefetch", "true");

  await assertIntentPrefetchTriggered(
    page,
    browseDealsLink,
    "/rebuild/discovery"
  );
  await assertIntentPrefetchTriggered(page, alertsLink, "/rebuild/alerts");
  await assertIntentPrefetchTriggered(page, opsLink, "/rebuild/ops");

  await alertsLink.click();
  await page.waitForURL(alertsUrl, { waitUntil: "domcontentloaded" });

  await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

  await browseDealsLink.click();
  await page.waitForURL(discoveryUrl, { waitUntil: "domcontentloaded" });

  const firstListingLink = page
    .locator('[data-intent-prefetch="true"][href^="/rebuild/listing/"]')
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
  await page.waitForURL(/\/rebuild\/listing\//, {
    waitUntil: "domcontentloaded",
  });

  const listingDeferredSkeleton = page.getByTestId(
    "rebuild-listing-deferred-skeleton"
  );
  const skeletonCount = await listingDeferredSkeleton.count();
  const skeletonBox =
    skeletonCount > 0 ? await listingDeferredSkeleton.boundingBox() : null;
  if (skeletonBox) {
    expect(skeletonBox.height).toBeGreaterThan(0);
  }

  await page.waitForTimeout(1400);

  const listingDeferredContent = page.getByTestId(
    "rebuild-listing-deferred-content"
  );
  await expect(listingDeferredContent).toBeVisible();
  const contentBox = await listingDeferredContent.boundingBox();
  expect(contentBox?.height).toBeGreaterThan(0);
  if (skeletonBox && contentBox) {
    expect(
      Math.abs(contentBox.height - skeletonBox.height)
    ).toBeLessThanOrEqual(8);
  }

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
    "/rebuild/listing/rebuild-e2e-1"
  );

  await exampleListing.click();
  await page.waitForURL(listingUrl, { waitUntil: "domcontentloaded" });

  await page.goto(homeUrl, { waitUntil: "domcontentloaded" });

  await opsLink.click();
  await page.waitForURL(opsUrl, { waitUntil: "domcontentloaded" });
});
