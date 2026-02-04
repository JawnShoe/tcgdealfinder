import { expect, test } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL;

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild E2E.");

test("Expandable rows: row=inspect, title=act, single expanded, keyboard", async ({
  page,
}) => {
  await page.goto("/rebuild/discovery?sort=newest", {
    waitUntil: "domcontentloaded",
  });

  const rows = page.getByTestId("rebuild-deal-row");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(2);

  const row1 = rows.nth(0);
  const row2 = rows.nth(1);

  await row1.click();
  await expect(row1).toHaveAttribute("aria-expanded", "true");
  await expect(row1.getByTestId("rebuild-deal-row-expanded")).toBeVisible();
  await expect(row1.getByTestId("rebuild-deal-row-expanded")).toHaveClass(
    /rebuild-inspection-panel/
  );

  await row2.click();
  await expect(row1).toHaveAttribute("aria-expanded", "false");
  await expect(row1.getByTestId("rebuild-deal-row-expanded")).toHaveCount(0);
  await expect(row2).toHaveAttribute("aria-expanded", "true");

  await row2.focus();
  await page.keyboard.press("Enter");
  await expect(row2).toHaveAttribute("aria-expanded", "false");

  await row2.focus();
  await page.keyboard.press("Enter");
  await expect(row2).toHaveAttribute("aria-expanded", "true");

  await row2.focus();
  await page.keyboard.press("Escape");
  await expect(row2).toHaveAttribute("aria-expanded", "false");

  await page.route("**/rebuild/listing/**", (route) => route.abort());
  await expect(row1).toHaveAttribute("aria-expanded", "false");
  await row1.getByTestId("rebuild-deal-row-title").click();
  await expect(row1).toHaveAttribute("aria-expanded", "false");
  await expect(row1.getByTestId("rebuild-deal-row-expanded")).toHaveCount(0);
});

test("Expandable rows: rebuild home recent deals supports inspection mode", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const rows = page.getByTestId("rebuild-deal-row");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(1);

  const row1 = rows.nth(0);
  await row1.click();
  await expect(row1).toHaveAttribute("aria-expanded", "true");
  await expect(row1.getByTestId("rebuild-deal-row-expanded")).toBeVisible();

  await row1.focus();
  await page.keyboard.press("Escape");
  await expect(row1).toHaveAttribute("aria-expanded", "false");
});
