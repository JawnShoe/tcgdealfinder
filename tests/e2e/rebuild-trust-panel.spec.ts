import { expect, test } from "@playwright/test";
import { Client } from "pg";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const expectedPipelineVersion = "rebuild-db-v1";

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild E2E.");

async function fetchListingId() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{
      listing_id: string;
    }>(
      `
        SELECT listing_id
        FROM listings
        WHERE listing_id IS NOT NULL
        ORDER BY updated_at DESC NULLS LAST
        LIMIT 1;
      `
    );
    const listingId = result.rows[0]?.listing_id;
    if (!listingId) {
      throw new Error("No listings found for rebuild E2E test.");
    }
    return listingId;
  } finally {
    await client.end();
  }
}

test("rebuild trust panel is SSR-visible and stable", async ({
  page,
  request,
}) => {
  const listingId = await fetchListingId();
  const routePath = `/rebuild/listing/${encodeURIComponent(listingId)}`;
  const routeUrl = `${baseURL}${routePath}`;

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
  expect(body).toContain(expectedPipelineVersion);
  expect(body).toMatch(/data-testid="trust-source">\\s*[^<]+/);
  expect(body).toMatch(/data-testid="transparency-sources">\\s*[^<]+/);

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });

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
  expect(consoleErrors).toEqual([]);
});
