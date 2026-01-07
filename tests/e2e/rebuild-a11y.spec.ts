import { test } from "@playwright/test";
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
