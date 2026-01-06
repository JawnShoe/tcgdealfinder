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
  expect(body).toContain("Transparency log");
  expect(body).toContain("Confidence inputs");
  expect(body).toContain('data-testid="transparency-panel"');
  expect(body).toContain('data-testid="transparency-sources"');
  expect(body).toContain('data-testid="transparency-pipeline-version"');
  expect(body).toContain('data-testid="explainability-inputs"');

  await page.goto(routeUrl);

  const trustPanel = page.getByTestId("trust-panel");
  const transparencyPanel = page.getByTestId("transparency-panel");
  const explainabilityPanel = page.getByTestId("explainability-panel");
  const confidence = page.getByTestId("trust-confidence");
  const source = page.getByTestId("trust-source");
  const fetchedAt = page.getByTestId("trust-fetched-at");
  const dataAge = page.getByTestId("trust-data-age");
  const transparencySources = page.getByTestId("transparency-sources");
  const transparencyFetchedAt = page.getByTestId("transparency-fetched-at");
  const transparencyComputedAt = page.getByTestId("transparency-computed-at");
  const transparencyPipelineVersion = page.getByTestId(
    "transparency-pipeline-version"
  );
  const explainabilityInputs = page.getByTestId("explainability-inputs");

  await expect(trustPanel).toBeVisible();
  await expect(transparencyPanel).toBeVisible();
  await expect(explainabilityPanel).toBeVisible();
  await expect(confidence).toBeVisible();
  await expect(source).toBeVisible();
  await expect(fetchedAt).toBeVisible();
  await expect(dataAge).toBeVisible();
  await expect(transparencySources).toBeVisible();
  await expect(transparencyFetchedAt).toBeVisible();
  await expect(transparencyComputedAt).toBeVisible();
  await expect(transparencyPipelineVersion).toBeVisible();
  await expect(explainabilityInputs).toBeVisible();

  const before = {
    confidence: (await confidence.textContent())?.trim() ?? "",
    source: (await source.textContent())?.trim() ?? "",
    fetchedAt: (await fetchedAt.textContent())?.trim() ?? "",
    dataAge: (await dataAge.textContent())?.trim() ?? "",
    transparencySources:
      (await transparencySources.textContent())?.trim() ?? "",
    transparencyFetchedAt:
      (await transparencyFetchedAt.textContent())?.trim() ?? "",
    transparencyComputedAt:
      (await transparencyComputedAt.textContent())?.trim() ?? "",
    transparencyPipelineVersion:
      (await transparencyPipelineVersion.textContent())?.trim() ?? "",
    explainabilityInputs:
      (await explainabilityInputs.textContent())?.trim() ?? "",
  };

  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(250);

  const after = {
    confidence: (await confidence.textContent())?.trim() ?? "",
    source: (await source.textContent())?.trim() ?? "",
    fetchedAt: (await fetchedAt.textContent())?.trim() ?? "",
    dataAge: (await dataAge.textContent())?.trim() ?? "",
    transparencySources:
      (await transparencySources.textContent())?.trim() ?? "",
    transparencyFetchedAt:
      (await transparencyFetchedAt.textContent())?.trim() ?? "",
    transparencyComputedAt:
      (await transparencyComputedAt.textContent())?.trim() ?? "",
    transparencyPipelineVersion:
      (await transparencyPipelineVersion.textContent())?.trim() ?? "",
    explainabilityInputs:
      (await explainabilityInputs.textContent())?.trim() ?? "",
  };

  expect(after).toEqual(before);
});
