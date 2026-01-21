import { expect, test } from "@playwright/test";

test("rebuild discovery: ends indicator reveals absolute UTC timestamp", async ({
  page,
}) => {
  await page.goto("/rebuild/discovery?sort=newest", {
    waitUntil: "domcontentloaded",
  });

  const indicator = page.getByTestId("rebuild-ends-indicator").first();
  await expect(indicator).toBeVisible({ timeout: 15000 });

  await indicator.focus();

  const tooltip = page.getByTestId("rebuild-ends-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Ends at:");
  await expect(tooltip).toContainText("UTC");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("rebuild-ends-tooltip")).toHaveCount(0);
});
