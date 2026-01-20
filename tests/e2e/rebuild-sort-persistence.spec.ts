import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("rebuild discovery: sort selection updates URL and persists on reload", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  await page.goto(`${baseURL}/rebuild/discovery?sort=newest`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle");

  const sortSelect = page.getByTestId("discovery-sort-select");
  await expect(sortSelect).toBeVisible();

  try {
    await Promise.all([
      page.waitForURL(/[?&]sort=biggest-discount\b/, {
        timeout: 15000,
        waitUntil: "commit",
      }),
      sortSelect.selectOption("biggest-discount"),
    ]);
  } catch (error) {
    throw new Error(
      `Timed out waiting for sort param update. Page errors: ${pageErrors.join(
        " | "
      )}`,
      { cause: error }
    );
  }
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(sortSelect).toHaveValue("biggest-discount");
  expect(page.url()).toMatch(/[?&]sort=biggest-discount\b/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("discovery-sort-select")).toHaveValue(
    "biggest-discount"
  );
  expect(page.url()).toMatch(/[?&]sort=biggest-discount\b/);

  const sortSelectAfterReload = page.getByTestId("discovery-sort-select");
  await Promise.all([
    page.waitForURL(/[?&]sort=endingSoon\b/, {
      timeout: 15000,
      waitUntil: "commit",
    }),
    sortSelectAfterReload.selectOption("endingSoon"),
  ]);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(sortSelectAfterReload).toHaveValue("endingSoon");
  expect(page.url()).toMatch(/[?&]sort=endingSoon\b/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("discovery-sort-select")).toHaveValue(
    "endingSoon"
  );
  expect(page.url()).toMatch(/[?&]sort=endingSoon\b/);
});

test("rebuild home: sort selection updates URL and persists on reload", async ({
  page,
}) => {
  await page.goto(`${baseURL}/rebuild`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  const sortSelect = page.getByLabel("Sort");
  await expect(sortSelect).toBeVisible();

  await sortSelect.selectOption("biggest-discount");
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(sortSelect).toHaveValue("biggest-discount");
  await page.waitForURL(/[?&]sort=biggest-discount\b/, {
    timeout: 15000,
    waitUntil: "commit",
  });
  await expect(sortSelect).toHaveValue("biggest-discount");
  expect(page.url()).toMatch(/[?&]sort=biggest-discount\b/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Sort")).toHaveValue("biggest-discount");
  expect(page.url()).toMatch(/[?&]sort=biggest-discount\b/);
});
