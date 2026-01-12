import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const listingId = "rebuild-e2e-1";

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild a11y.");

test("rebuild listing a11y smoke", async ({ page }) => {
  const routeUrl = `${baseURL}/rebuild/listing/${encodeURIComponent(listingId)}`;
  await page.goto(routeUrl, { waitUntil: "networkidle" });

  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious"
  );

  if (violations.length > 0) {
    const summary = violations
      .map((violation) => `${violation.id} (${violation.impact})`)
      .join("\n");
    throw new Error(`A11y violations:\n${summary}`);
  }
});

test("rebuild keyboard essentials", async ({ page }) => {
  await page.goto(`${baseURL}/rebuild`, { waitUntil: "networkidle" });

  const browseLink = page.getByRole("link", { name: "Browse deals" });
  await browseLink.focus();
  await expect(browseLink).toBeFocused();

  const homeSummary = page.locator("details summary").first();
  await homeSummary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");

  await page.goto(`${baseURL}/rebuild/discovery`, { waitUntil: "networkidle" });

  const sortSelect = page.getByLabel("Sort");
  await sortSelect.focus();
  await expect(sortSelect).toBeFocused();

  const discoverySummary = page.locator("details summary").first();
  await discoverySummary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");

  await page.goto(
    `${baseURL}/rebuild/listing/${encodeURIComponent(listingId)}`,
    {
      waitUntil: "networkidle",
    }
  );

  const backLink = page.getByRole("link", { name: "Back to Discovery" });
  await backLink.focus();
  await expect(backLink).toBeFocused();

  const outboundLink = page.getByRole("link", {
    name: "View original listing",
  });
  await outboundLink.focus();
  await expect(outboundLink).toBeFocused();

  const listingSummary = page.locator("details summary").first();
  await listingSummary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
});
