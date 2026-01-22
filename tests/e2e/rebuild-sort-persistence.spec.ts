import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test("rebuild discovery: cross-session persistence (localStorage) and clear resets storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem("rebuild.discovery.v1");
    } catch {
      // ignore
    }
  });

  await page.goto(`${baseURL}/rebuild/discovery?sort=newest`, {
    waitUntil: "domcontentloaded",
  });

  const sortSelect = page.getByTestId("discovery-sort-select");
  await expect(sortSelect).toBeVisible();

  await Promise.all([
    page.waitForURL(/[?&]sort=biggest-discount\b/, {
      timeout: 15000,
      waitUntil: "commit",
    }),
    sortSelect.selectOption("biggest-discount"),
  ]);
  await expect(sortSelect).toHaveValue("biggest-discount");

  const pageSizeSelect = page.getByTestId("discovery-pagination-page-size");
  await expect(pageSizeSelect).toBeVisible();
  await Promise.all([
    page.waitForURL(/[?&]pageSize=50\b/, {
      timeout: 15000,
      waitUntil: "commit",
    }),
    pageSizeSelect.selectOption("50"),
  ]);
  await expect(pageSizeSelect).toHaveValue("50");

  const marketSelect = page.getByTestId("discovery-filter-market");
  await expect(marketSelect).toBeVisible();
  await marketSelect.selectOption("US");

  const applyButton = page.getByTestId("discovery-filters-apply");
  await Promise.all([
    page.waitForURL(/[?&]market=US\b/, { timeout: 15000, waitUntil: "commit" }),
    applyButton.click(),
  ]);
  await expect(page.getByTestId("discovery-filter-market")).toHaveValue("US");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("discovery-sort-select")).toHaveValue(
    "biggest-discount"
  );
  await expect(page.getByTestId("discovery-pagination-page-size")).toHaveValue(
    "50"
  );
  await expect(page.getByTestId("discovery-filter-market")).toHaveValue("US");

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        try {
          return window.localStorage.getItem("rebuild.discovery.v1");
        } catch {
          return null;
        }
      });
    })
    .not.toBeNull();

  const persistedRaw = await page.evaluate(() => {
    try {
      return window.localStorage.getItem("rebuild.discovery.v1");
    } catch {
      return null;
    }
  });
  expect(persistedRaw).toContain('"preset":"biggest-discount"');
  expect(persistedRaw).toContain('"pageSize":50');
  expect(persistedRaw).toContain('"market":"US"');

  const storageState = await page.context().storageState();
  const browser = page.context().browser();
  if (!browser) {
    throw new Error("Browser instance not available for storage-state test.");
  }

  const context2 = await browser.newContext({ storageState });
  const page2 = await context2.newPage();

  await page2.goto(`${baseURL}/rebuild/discovery`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page2).toHaveURL(/[?&]sort=biggest-discount\b/, {
    timeout: 15000,
  });
  await expect(page2.getByTestId("discovery-sort-select")).toHaveValue(
    "biggest-discount"
  );
  await expect(page2.getByTestId("discovery-pagination-page-size")).toHaveValue(
    "50"
  );
  await expect(page2.getByTestId("discovery-filter-market")).toHaveValue("US");

  const clearButton = page2.getByTestId("discovery-filters-clear");
  await clearButton.click();
  await expect(page2).toHaveURL(/\/rebuild\/discovery$/, { timeout: 15000 });
  await expect(page2.getByTestId("discovery-sort-select")).toHaveValue(
    "newest"
  );
  await expect(page2.getByTestId("discovery-pagination-page-size")).toHaveValue(
    "25"
  );
  await expect(page2.getByTestId("discovery-filter-market")).toHaveValue("");

  const clearedValue = await page2.evaluate(() => {
    try {
      return window.localStorage.getItem("rebuild.discovery.v1");
    } catch {
      return null;
    }
  });
  expect(clearedValue).toBeNull();

  const storageAfterClear = await page2.context().storageState();
  await context2.close();

  const context3 = await browser.newContext({
    storageState: storageAfterClear,
  });
  const page3 = await context3.newPage();
  await page3.goto(`${baseURL}/rebuild/discovery`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page3.getByTestId("discovery-filters-bar")).toBeVisible();
  expect(page3.url()).toMatch(/\/rebuild\/discovery$/);
  await expect(page3.getByTestId("discovery-sort-select")).toHaveValue(
    "newest"
  );
  await expect(page3.getByTestId("discovery-pagination-page-size")).toHaveValue(
    "25"
  );
  await expect(page3.getByTestId("discovery-filter-market")).toHaveValue("");

  await context3.close();
});

test("rebuild discovery: URL params override persisted localStorage state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "rebuild.discovery.v1",
        JSON.stringify({
          v: 1,
          preset: "biggest-discount",
          pageSize: 50,
          filters: {
            priceMinCad: null,
            priceMaxCad: null,
            condition: null,
            language: null,
            market: "US",
            minConfidence: "any",
            seller: null,
          },
        })
      );
    } catch {
      // ignore
    }
  });

  await page.goto(`${baseURL}/rebuild/discovery?sort=endingSoon`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("discovery-sort-select")).toHaveValue(
    "endingSoon"
  );
  await expect(page.getByTestId("discovery-filter-market")).toHaveValue("");
  await expect(page.getByTestId("discovery-pagination-page-size")).toHaveValue(
    "25"
  );
  expect(page.url()).toMatch(/[?&]sort=endingSoon\b/);
});

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
