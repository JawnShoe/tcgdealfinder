import { expect, test } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL;

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild E2E.");

test("rebuild discovery: market filter updates URL and persists; rows show market + verified badge when present", async ({
  page,
}) => {
  await page.goto("/rebuild/discovery?sort=newest", {
    waitUntil: "domcontentloaded",
  });

  const market = page.getByTestId("discovery-filter-market");
  await expect(market).toBeVisible({ timeout: 15000 });
  await market.focus();
  await expect(market).toBeFocused();

  const apply = page.getByTestId("discovery-filters-apply");

  await market.selectOption("US");
  await Promise.all([
    page.waitForURL(/[?&]market=US\b/, { timeout: 15000, waitUntil: "commit" }),
    apply.click(),
  ]);
  await expect(page).toHaveURL(/[?&]market=US\b/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("discovery-filter-market")).toHaveValue("US");

  await page.getByTestId("discovery-filter-market").selectOption("CA");
  await Promise.all([
    page.waitForURL(/[?&]market=CA\b/, { timeout: 15000, waitUntil: "commit" }),
    page.getByTestId("discovery-filters-apply").click(),
  ]);
  await expect(page).toHaveURL(/[?&]market=CA\b/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("discovery-filter-market")).toHaveValue("CA");

  const firstRow = page.getByTestId("rebuild-deal-row").first();
  await expect(firstRow).toBeVisible({ timeout: 15000 });
  await expect(firstRow.getByTestId("rebuild-market-indicator")).toBeVisible();

  const badges = page.getByTestId("rebuild-trusted-badge");
  const badgeCount = await badges.count();
  if (badgeCount > 0) {
    await expect(badges.first()).toBeVisible();
  } else {
    await expect(badges).toHaveCount(0);
  }
});
