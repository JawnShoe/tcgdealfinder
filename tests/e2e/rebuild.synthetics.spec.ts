import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const listingId = "rebuild-e2e-1";

const complianceCopy = "We may earn a commission from qualifying purchases.";

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild synthetics.");

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
      await assertOpsSsrHeading(request, url);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await assertOpsHeading(page);
      await assertImagesHaveDimensions(page);
      continue;
    }

    const expectFetchedAt =
      route === "/rebuild" || route === "/rebuild/discovery";
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
