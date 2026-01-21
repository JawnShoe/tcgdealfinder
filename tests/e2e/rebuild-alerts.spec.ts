import { expect, test } from "@playwright/test";

test("rebuild alerts: recent alerts empty state", async ({ page }) => {
  await page.route("**/api/rebuild/alerts/history", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        alerts: [],
        limit: 50,
        windowHours: 36,
      }),
    });
  });

  await page.goto("/rebuild/alerts", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("rebuild-alerts-history")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("rebuild-alerts-history-empty")).toBeVisible();
  await expect(page.getByTestId("rebuild-alerts-history-empty")).toContainText(
    "No alerts triggered recently."
  );
});

test("rebuild alerts: recent alerts populated state", async ({ page }) => {
  await page.route("**/api/rebuild/alerts/history", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        limit: 50,
        windowHours: 36,
        alerts: [
          {
            summary: "Charizard • Base Set • #4/102",
            occurredAtISO: "2026-01-21T18:00:00.000Z",
            triggered: { condition: "NM", discountPercent: 18.1 },
          },
          {
            summary: "Blastoise • Base Set • #2/102",
            occurredAtISO: "2026-01-21T17:30:00.000Z",
            triggered: { condition: null, discountPercent: null },
          },
        ],
      }),
    });
  });

  await page.goto("/rebuild/alerts", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("rebuild-alerts-history-list")).toBeVisible({
    timeout: 15000,
  });

  const items = page.getByTestId("rebuild-alerts-history-item");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText("UTC");
});

test("rebuild alerts: subscription form submits and shows success state", async ({
  page,
}) => {
  let lastPayload: unknown = null;

  await page.route("**/api/rebuild/alerts/subscribe", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    try {
      lastPayload = route.request().postDataJSON();
    } catch {
      lastPayload = null;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/rebuild/alerts/history", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        alerts: [],
        limit: 50,
        windowHours: 36,
      }),
    });
  });

  await page.goto("/rebuild/alerts", { waitUntil: "domcontentloaded" });

  const form = page.getByTestId("rebuild-alerts-subscribe-form");
  await expect(form).toBeVisible({ timeout: 15000 });

  await page.getByTestId("rebuild-alerts-card-id").fill("1");
  await page.getByTestId("rebuild-alerts-email").fill("test@example.com");
  await expect(page.getByTestId("rebuild-alerts-min-discount")).toHaveValue(
    /\d+/
  );

  await page.getByTestId("rebuild-alerts-submit").click();

  await expect(page.getByTestId("rebuild-alerts-success")).toBeVisible();
  await expect(page.getByTestId("rebuild-alerts-success")).toContainText(
    "You'll only be emailed when a deal meets these conditions."
  );

  expect(lastPayload).toEqual({
    cardId: 1,
    email: "test@example.com",
    minDiscountPercent: 10,
  });
});
