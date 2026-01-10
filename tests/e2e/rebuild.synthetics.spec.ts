import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const listingId = "rebuild-e2e-1";

const complianceCopy = "We may earn a commission from qualifying purchases.";

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild synthetics.");

async function assertSsrTrustSurfaces(request: APIRequestContext, url: string) {
  const response = await request.get(url);
  expect(response.ok()).toBeTruthy();

  const body = await response.text();
  expect(body).toContain(complianceCopy);
  expect(body).toContain("Resilience:");
  expect(body).toContain("Provenance");
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

async function assertUiTrustSurfaces(page: Page) {
  await expect(page.getByText(complianceCopy, { exact: true })).toBeVisible();
  await expect(page.getByText(/Resilience:/)).toBeVisible();
  await expect(
    page.locator("summary", { hasText: "Provenance" })
  ).toBeVisible();
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

test("rebuild synthetics: trust surfaces visible across rebuild funnel", async ({
  page,
  request,
}) => {
  const routes = [
    "/rebuild",
    "/rebuild/discovery",
    `/rebuild/listing/${encodeURIComponent(listingId)}`,
    "/rebuild/alerts",
  ];

  for (const route of routes) {
    const url = `${baseURL}${route}`;
    await assertSsrTrustSurfaces(request, url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await assertUiTrustSurfaces(page);
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
