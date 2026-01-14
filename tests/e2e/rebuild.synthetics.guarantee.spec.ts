import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const listingId = "rebuild-e2e-1";

const complianceCopy = "We may earn a commission from qualifying purchases.";
const allowedResilienceTiers = new Set([
  "LIVE",
  "CACHED",
  "STALE",
  "PARTIAL",
  "UNAVAILABLE",
]);

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild synthetics.");

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

async function assertSsrIsNotShellOnly(
  request: APIRequestContext,
  url: string,
  {
    routeLabel,
    expectCompliance = true,
  }: { routeLabel: string; expectCompliance?: boolean }
) {
  const response = await request.get(url);
  expect(response.status(), `${routeLabel}: expected 200`).toBe(200);
  const body = await response.text();
  expect(body, `${routeLabel}: expected rebuild banner SSR`).toContain(
    "Rebuild lane"
  );
  if (expectCompliance) {
    expect(body, `${routeLabel}: expected compliance disclosure SSR`).toContain(
      complianceCopy
    );
  }
  return body;
}

async function assertTrustSurfacesUi(page: Page, routeLabel: string) {
  await expect(
    page.getByText(complianceCopy, { exact: true }),
    `${routeLabel}: compliance disclosure visible`
  ).toBeVisible();

  const resilience = page.getByTestId("resilience-label");
  await expect(
    resilience,
    `${routeLabel}: resilience label visible`
  ).toBeVisible();
  const tier = (await resilience.getAttribute("data-tier")) ?? "";
  expect(
    allowedResilienceTiers.has(tier),
    `${routeLabel}: unexpected resilience tier '${tier}'`
  ).toBeTruthy();

  await expect(
    page.locator("summary", { hasText: "Provenance" }),
    `${routeLabel}: provenance drilldown visible`
  ).toBeVisible();
}

async function assertImagesHaveDimensions(page: Page, routeLabel: string) {
  const images = page.locator("img");
  const count = await images.count();
  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    const width = await image.getAttribute("width");
    const height = await image.getAttribute("height");
    expect(
      Boolean(width && height),
      `${routeLabel}: image missing width/height`
    ).toBeTruthy();
  }
}

async function assertListingTrustSurfaces(
  request: APIRequestContext,
  page: Page,
  url: string,
  routeLabel: string
) {
  const body = await assertSsrIsNotShellOnly(request, url, { routeLabel });
  expect(body, `${routeLabel}: priority hydration marker SSR`).toContain(
    'data-testid="rebuild-listing-deferred-skeleton"'
  );
  expect(body, `${routeLabel}: priority hydration marker SSR`).not.toContain(
    'data-testid="rebuild-listing-deferred-content"'
  );
  expect(body, `${routeLabel}: trust panel SSR`).toContain(
    'data-testid="trust-confidence"'
  );
  expect(body, `${routeLabel}: trust panel SSR`).toContain(
    'data-testid="trust-data-age"'
  );
  expect(body, `${routeLabel}: trust panel SSR`).toContain(
    'data-testid="trust-fetched-at"'
  );

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await assertTrustSurfacesUi(page, routeLabel);
  await assertImagesHaveDimensions(page, routeLabel);

  await expect(
    page.getByTestId("trust-confidence"),
    `${routeLabel}: confidence visible`
  ).toBeVisible();
  await expect(
    page.getByTestId("trust-data-age"),
    `${routeLabel}: data age visible`
  ).toBeVisible();
}

async function assertOutboundSafety(page: Page, routeLabel: string) {
  const link = page.getByRole("link", { name: "View original listing" });
  await expect(link, `${routeLabel}: outbound link present`).toBeVisible();
  await expect(link, `${routeLabel}: outbound link target`).toHaveAttribute(
    "target",
    "_blank"
  );
  await expect(link, `${routeLabel}: outbound link rel`).toHaveAttribute(
    "rel",
    /nofollow/
  );

  const href = (await link.getAttribute("href")) ?? "";
  expect(
    href.startsWith("http"),
    `${routeLabel}: outbound href is http(s)`
  ).toBeTruthy();
  expect(
    href.toLowerCase().startsWith("javascript:"),
    `${routeLabel}: outbound href must not be javascript:`
  ).toBeFalsy();

  return { href };
}

async function recordOutboundClick(
  request: APIRequestContext,
  url: string,
  routeLabel: string
) {
  const response = await request.post(`${baseURL}/api/rebuild/outbound-click`, {
    data: {
      url,
      listingId,
    },
  });
  expect(response.status(), `${routeLabel}: outbound click API status`).toBe(
    200
  );
  const json = await response.json();
  expect(json, `${routeLabel}: outbound click API response`).toEqual({
    ok: true,
  });
}

test("Journey A - Discovery path", async ({ page, request }) => {
  const homeUrl = `${baseURL}/rebuild`;
  const discoveryUrl = `${baseURL}/rebuild/discovery`;
  const listingUrl = `${baseURL}/rebuild/listing/${encodeURIComponent(listingId)}`;

  await test.step("Home: availability + SSR trust surfaces", async () => {
    assertLoadingSkeletonSourceFile(
      ["app", "rebuild", "loading.tsx"],
      "rebuild-loading-home"
    );
    const body = await assertSsrIsNotShellOnly(request, homeUrl, {
      routeLabel: "Journey A /rebuild",
    });
    expect(body).toContain('data-testid="resilience-label"');
    expect(body).toContain("Provenance");
    expect(body).toContain('data-testid="rebuild-home-deferred-skeleton"');
    expect(body).not.toContain('data-testid="rebuild-home-deferred-content"');

    await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
    await assertTrustSurfacesUi(page, "Journey A /rebuild");
    await assertImagesHaveDimensions(page, "Journey A /rebuild");
  });

  await test.step("Discovery: availability + SSR trust surfaces", async () => {
    assertLoadingSkeletonSourceFile(
      ["app", "rebuild", "discovery", "loading.tsx"],
      "rebuild-loading-discovery"
    );
    const body = await assertSsrIsNotShellOnly(request, discoveryUrl, {
      routeLabel: "Journey A /rebuild/discovery",
    });
    expect(body).toContain('data-testid="resilience-label"');
    expect(body).toContain("Provenance");

    await page.goto(discoveryUrl, { waitUntil: "domcontentloaded" });
    await assertTrustSurfacesUi(page, "Journey A /rebuild/discovery");
    await assertImagesHaveDimensions(page, "Journey A /rebuild/discovery");
  });

  await test.step("Listing: availability + trust + outbound", async () => {
    assertLoadingSkeletonSourceFile(
      ["app", "rebuild", "listing", "[id]", "loading.tsx"],
      "rebuild-loading-listing"
    );

    await assertListingTrustSurfaces(
      request,
      page,
      listingUrl,
      "Journey A /rebuild/listing/[id]"
    );

    const { href } = await assertOutboundSafety(
      page,
      "Journey A /rebuild/listing/[id]"
    );
    await recordOutboundClick(request, href, "Journey A outbound click");
  });
});

test("Journey B - Alerts path", async ({ page, request }) => {
  const alertsUrl = `${baseURL}/rebuild/alerts`;
  const listingUrl = `${baseURL}/rebuild/listing/${encodeURIComponent(listingId)}`;

  await test.step("Alerts: availability + SSR trust surfaces", async () => {
    assertLoadingSkeletonSourceFile(
      ["app", "rebuild", "alerts", "loading.tsx"],
      "rebuild-loading-alerts"
    );
    const body = await assertSsrIsNotShellOnly(request, alertsUrl, {
      routeLabel: "Journey B /rebuild/alerts",
    });
    expect(body).toContain('data-testid="resilience-label"');
    expect(body).toContain("Provenance");

    await page.goto(alertsUrl, { waitUntil: "domcontentloaded" });
    await assertTrustSurfacesUi(page, "Journey B /rebuild/alerts");
    await assertImagesHaveDimensions(page, "Journey B /rebuild/alerts");
  });

  await test.step("Listing: availability + trust + outbound", async () => {
    await assertListingTrustSurfaces(
      request,
      page,
      listingUrl,
      "Journey B /rebuild/listing/[id]"
    );

    const { href } = await assertOutboundSafety(
      page,
      "Journey B /rebuild/listing/[id]"
    );
    await recordOutboundClick(request, href, "Journey B outbound click");
  });
});

test("Journey C - Health / Ops", async ({ page, request }) => {
  const opsUrl = `${baseURL}/rebuild/ops`;

  await test.step("Ops: availability + resilience tiers + freshness indicators", async () => {
    assertLoadingSkeletonSourceFile(
      ["app", "rebuild", "ops", "loading.tsx"],
      "rebuild-loading-ops"
    );
    const body = await assertSsrIsNotShellOnly(request, opsUrl, {
      routeLabel: "Journey C /rebuild/ops",
      expectCompliance: false,
    });
    expect(body).toContain('data-testid="resilience-tiers-panel"');
    expect(body).toContain("Job freshness");

    await page.goto(opsUrl, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Rebuild Ops", exact: true }),
      "Journey C /rebuild/ops heading"
    ).toBeVisible();
    await expect(
      page.getByTestId("resilience-tiers-panel"),
      "Journey C /rebuild/ops resilience tiers panel"
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Job freshness" }),
      "Journey C /rebuild/ops job freshness heading"
    ).toBeVisible();
  });
});
