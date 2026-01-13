import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
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
  expect(body).toContain("Resilience:");
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
}

async function assertUiTrustSurfaces(page: Page) {
  await expect(page.getByText(complianceCopy, { exact: true })).toBeVisible();
  await expect(page.getByText(/Resilience:/)).toBeVisible();
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
}

test("rebuild synthetics: trust surfaces visible across rebuild funnel", async ({
  page,
  request,
}) => {
  const robotsResponse = await request.get(`${baseURL}/robots.txt`);
  expect(robotsResponse.ok()).toBeTruthy();
  const robotsBody = await robotsResponse.text();
  expect(robotsBody).toContain("User-agent: *");
  expect(robotsBody).toContain("Disallow: /rebuild/ops");
  expect(robotsBody).toContain("Disallow: /rebuild/alerts");
  expect(robotsBody).toContain("Sitemap:");

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
    canonical: buildDiscoveryCanonicalUrl(
      new URLSearchParams("sort=biggest-discount&foo=bar")
    ),
    indexable: true,
  });

  const routes = [
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
      route === "/rebuild" || route === "/rebuild/discovery";
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    const body = await response.text();

    if (route === "/rebuild") {
      assertSeoBasics(body, {
        canonical: buildCanonicalUrl("/rebuild"),
        indexable: true,
      });
      const jsonLd = extractJsonLdObjects(body);
      expect(findJsonLdByType(jsonLd, "WebApplication")).toBeTruthy();
      const title = extractTitle(body);
      expect(title).toBe(buildRebuildTitle("Home"));
    } else if (route === "/rebuild/discovery") {
      assertSeoBasics(body, {
        canonical: buildDiscoveryCanonicalUrl(),
        indexable: true,
      });
      const title = extractTitle(body);
      expect(title).toBe(buildRebuildTitle("Discovery"));
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
