import { expect, test } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const listingId = "rebuild-e2e-1";
const clsBudget = 0.01;
const routes = [
  "/",
  "/rebuild/discovery",
  `/rebuild/listing/${encodeURIComponent(listingId)}`,
  "/rebuild/alerts",
  "/rebuild/ops",
];

test.skip(!databaseUrl, "DATABASE_URL not set for rebuild CLS.");

test("rebuild CLS budget", async ({ page }) => {
  const context = page.context();

  for (const route of routes) {
    const clsPage = await context.newPage();
    await clsPage.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            (window as any).__cls += entry.value || 0;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    const routeUrl = `${baseURL}${route}`;
    await clsPage.goto(routeUrl, { waitUntil: "networkidle" });
    await clsPage.waitForTimeout(500);

    const cls = await clsPage.evaluate(() => (window as any).__cls || 0);
    expect(cls).toBeLessThanOrEqual(clsBudget);
    await clsPage.close();
  }
});
