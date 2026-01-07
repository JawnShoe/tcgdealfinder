import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const listingId = "rebuild-e2e-1";
const clsBudget = 0.01;

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild CLS.");

test("rebuild listing CLS budget", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          (window as any).__cls += entry.value || 0;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const routeUrl = `${baseURL}/rebuild/listing/${encodeURIComponent(listingId)}`;
  await page.goto(routeUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const cls = await page.evaluate(() => (window as any).__cls || 0);
  expect(cls).toBeLessThanOrEqual(clsBudget);
});
