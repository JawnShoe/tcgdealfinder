import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

// Canonical home signature (anchored to HOME_CANONICAL_SHA=f02b8f2):
// - H1 "Today's Best Deals"
// - Resilience label renders with a stable test id
test("home canonical gate: / renders the anchored homepage surface", async ({
  page,
}) => {
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Today's Best Deals" })
  ).toBeVisible();
  await expect(page.getByTestId("resilience-label")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Discovery" })).toHaveCount(0);
});
