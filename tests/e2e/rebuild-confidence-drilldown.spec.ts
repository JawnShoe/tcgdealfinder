import { expect, test } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL;

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild E2E.");

test("rebuild home: confidence badge opens inline drilldown in expanded row", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const row = page.getByTestId("rebuild-deal-row").first();
  await expect(row).toBeVisible({ timeout: 15000 });

  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await expect(row.getByTestId("rebuild-deal-row-expanded")).toBeVisible();

  const confidenceButton = row.getByTestId("rebuild-confidence-button");
  await expect(confidenceButton).toBeVisible();

  await confidenceButton.click();
  const panel = row.getByTestId("rebuild-confidence-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Confidence");

  await page.keyboard.press("Escape");
  await expect(row.getByTestId("rebuild-confidence-panel")).toHaveCount(0);
  await expect(row).toHaveAttribute("aria-expanded", "true");

  await confidenceButton.focus();
  await page.keyboard.press("Enter");
  await expect(row.getByTestId("rebuild-confidence-panel")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(row.getByTestId("rebuild-confidence-panel")).toHaveCount(0);
  await expect(row).toHaveAttribute("aria-expanded", "true");
});
