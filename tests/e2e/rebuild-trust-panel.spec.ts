import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const routePath = "/rebuild/listing/TEST_ID";
const routeUrl = `${baseURL}${routePath}`;

test("rebuild trust panel is SSR-visible and stable", async ({
  page,
  request,
}) => {
  const response = await request.get(routeUrl);
  expect(response.ok()).toBeTruthy();

  const body = await response.text();
  expect(body).toContain("Confidence");
  expect(body).toContain("Source");
  expect(body).toContain("Fetched at");
  expect(body).toContain("Data age");
  expect(body).toContain('data-testid="trust-confidence"');
  expect(body).toContain('data-testid="trust-source"');
  expect(body).toContain('data-testid="trust-fetched-at"');
  expect(body).toContain('data-testid="trust-data-age"');
  expect(body).toContain("72 / 100 (placeholder)");
  expect(body).toContain("placeholder-source");
  expect(body).toContain("2026-01-05T12:00:00Z");
  expect(body).toContain("5m");

  await page.goto(routeUrl);

  const trustPanel = page.getByTestId("trust-panel");
  const confidence = page.getByTestId("trust-confidence");
  const source = page.getByTestId("trust-source");
  const fetchedAt = page.getByTestId("trust-fetched-at");
  const dataAge = page.getByTestId("trust-data-age");

  await expect(trustPanel).toBeVisible();
  await expect(confidence).toBeVisible();
  await expect(source).toBeVisible();
  await expect(fetchedAt).toBeVisible();
  await expect(dataAge).toBeVisible();

  const before = {
    confidence: (await confidence.textContent())?.trim() ?? "",
    source: (await source.textContent())?.trim() ?? "",
    fetchedAt: (await fetchedAt.textContent())?.trim() ?? "",
    dataAge: (await dataAge.textContent())?.trim() ?? "",
  };

  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(250);

  const after = {
    confidence: (await confidence.textContent())?.trim() ?? "",
    source: (await source.textContent())?.trim() ?? "",
    fetchedAt: (await fetchedAt.textContent())?.trim() ?? "",
    dataAge: (await dataAge.textContent())?.trim() ?? "",
  };

  expect(after).toEqual(before);
});
