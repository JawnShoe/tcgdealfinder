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

test("Stage 1 decommission: /top-deals redirects to /rebuild/discovery (top deals preset)", async ({
  page,
  request,
}) => {
  const legacyUrl = `${baseURL}/top-deals`;
  const expectedPath = "/rebuild/discovery?sort=biggest-discount";

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
    new RegExp(`/rebuild/discovery\\?sort=biggest-discount`)
  );
  await expect(page.getByLabel("Sort")).toHaveValue("biggest-discount");
  await assertUiTrustSurfaces(page);
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
